import "server-only";

import Stripe from "stripe";

import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseServer";

const INCLUDED_EMPLOYEE_ACCOUNTS = 10;

export type EmployeeBillingSyncMode = "activation" | "period_renewal";

export type EmployeeBillingSyncResult = {
  businessId: string;
  mode: EmployeeBillingSyncMode;
  billableEmployeeCount: number;
  desiredAdditionalQuantity: number;
  stripeAdditionalQuantityBefore: number;
  stripeAdditionalQuantityAfter: number;
  action:
    | "created"
    | "increased"
    | "decreased"
    | "removed"
    | "unchanged"
    | "decrease_deferred"
    | "not_configured";
};

type BusinessBillingData = {
  id: string;
  stripe_subscription_id: string | null;
};

function requireBasePriceId() {
  const priceId = process.env.STRIPE_PRICE_BASE;

  if (!priceId) {
    throw new Error("STRIPE_PRICE_BASE fehlt in den Environment Variables.");
  }

  return priceId;
}

function requireAdditionalEmployeePriceId() {
  const priceId = process.env.STRIPE_PRICE_ADDITIONAL_EMPLOYEE;

  if (!priceId) {
    throw new Error(
      "STRIPE_PRICE_ADDITIONAL_EMPLOYEE fehlt in den Environment Variables.",
    );
  }

  return priceId;
}

function getCurrentPeriodStart(subscription: Stripe.Subscription) {
  return subscription.items.data[0]?.current_period_start ?? null;
}

function getCurrentPeriodEnd(subscription: Stripe.Subscription) {
  return subscription.items.data[0]?.current_period_end ?? null;
}

async function loadBusinessBillingData(
  businessId: string,
): Promise<BusinessBillingData> {
  const { data, error } = await supabaseAdmin
    .from("businesses")
    .select("id, stripe_subscription_id")
    .eq("id", businessId)
    .single();

  if (error || !data) {
    throw (
      error ??
      new Error("Der Betrieb konnte für die Abrechnung nicht geladen werden.")
    );
  }

  return data as BusinessBillingData;
}

async function countEmployeesTouchingPeriod(
  businessId: string,
  periodStart: number,
  periodEnd: number,
) {
  const periodStartIso = new Date(periodStart * 1000).toISOString();
  const periodEndIso = new Date(periodEnd * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from("employee_billing_memberships")
    .select("employee_id")
    .eq("business_id", businessId)
    .lt("started_at", periodEndIso)
    .or(`ended_at.is.null,ended_at.gte.${periodStartIso}`);

  if (error) {
    throw error;
  }

  return new Set((data ?? []).map((row) => row.employee_id)).size;
}

async function countEmployeesActiveAtPeriodStart(
  businessId: string,
  periodStart: number,
) {
  const periodStartIso = new Date(periodStart * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from("employee_billing_memberships")
    .select("employee_id")
    .eq("business_id", businessId)
    .lte("started_at", periodStartIso)
    .or(`ended_at.is.null,ended_at.gt.${periodStartIso}`);

  if (error) {
    throw error;
  }

  return new Set((data ?? []).map((row) => row.employee_id)).size;
}

function subscriptionUsesBasePrice(
  subscription: Stripe.Subscription,
  basePriceId: string,
) {
  return subscription.items.data.some((item) => item.price.id === basePriceId);
}

function findAdditionalEmployeeItem(
  subscription: Stripe.Subscription,
  additionalEmployeePriceId: string,
) {
  const matches = subscription.items.data.filter(
    (item) => item.price.id === additionalEmployeePriceId,
  );

  if (matches.length > 1) {
    throw new Error(
      "Die Stripe-Subscription enthält den Zusatzmitarbeiter-Preis mehrfach.",
    );
  }

  return matches[0] ?? null;
}

async function storeCurrentPeriod(
  businessId: string,
  subscription: Stripe.Subscription,
) {
  const periodStart = getCurrentPeriodStart(subscription);
  const periodEnd = getCurrentPeriodEnd(subscription);

  if (!periodStart || !periodEnd) {
    throw new Error("Stripe liefert keinen gültigen Abrechnungszeitraum.");
  }

  const { error } = await supabaseAdmin
    .from("businesses")
    .update({
      subscription_status: subscription.status,
      current_period_start: new Date(periodStart * 1000).toISOString(),
      current_period_end: new Date(periodEnd * 1000).toISOString(),
    })
    .eq("id", businessId);

  if (error) {
    throw error;
  }
}

async function getBillableEmployeeCount(
  businessId: string,
  subscription: Stripe.Subscription,
  mode: EmployeeBillingSyncMode,
) {
  const periodStart = getCurrentPeriodStart(subscription);
  const periodEnd = getCurrentPeriodEnd(subscription);

  if (!periodStart || !periodEnd) {
    throw new Error("Stripe liefert keinen gültigen Abrechnungszeitraum.");
  }

  if (mode === "period_renewal") {
    /*
     * Beim Beginn eines neuen Stripe-Zeitraums zählt nur,
     * wer zu Beginn dieses Zeitraums tatsächlich aktiv war.
     *
     * Dadurch wirken Deaktivierungen aus dem vorherigen Zeitraum
     * jetzt auf die neue Monatsmenge.
     */
    return countEmployeesActiveAtPeriodStart(businessId, periodStart);
  }

  /*
   * Während eines laufenden Zeitraums zählt jede Person, deren
   * Billing-Membership diesen Zeitraum berührt hat.
   *
   * Dadurch:
   * - zählt eine neue Aktivierung sofort,
   * - bleibt eine spätere Deaktivierung für den aktuellen Zeitraum
   *   abrechnungsrelevant,
   * - erzeugt eine Reaktivierung derselben Person keinen Doppelzähler.
   */
  return countEmployeesTouchingPeriod(businessId, periodStart, periodEnd);
}

async function createAdditionalItem(
  subscriptionId: string,
  priceId: string,
  quantity: number,
  mode: EmployeeBillingSyncMode,
) {
  await stripe.subscriptionItems.create({
    subscription: subscriptionId,
    price: priceId,
    quantity,
    proration_behavior: mode === "activation" ? "create_prorations" : "none",
  });
}

async function updateAdditionalItem(
  itemId: string,
  quantity: number,
  mode: EmployeeBillingSyncMode,
) {
  await stripe.subscriptionItems.update(itemId, {
    quantity,
    proration_behavior: mode === "activation" ? "create_prorations" : "none",
  });
}

async function deleteAdditionalItem(itemId: string) {
  await stripe.subscriptionItems.del(itemId, {
    proration_behavior: "none",
  });
}

/**
 * Synchronisiert die abrechnungsrelevanten Mitarbeiterkonten eines
 * Betriebs mit der Stripe-Subscription.
 *
 * Regeln:
 * - Der Owner zählt mit.
 * - 10 Konten sind im Grundpreis enthalten.
 * - Ab dem 11. Konto gilt +3,49 € netto/Monat je Konto.
 *
 * mode = "activation":
 * - wird nach Aktivierung/Reaktivierung verwendet,
 * - Erhöhungen werden sofort mit Stripe-Proration übernommen,
 * - Verringerungen werden niemals mitten im Zeitraum an Stripe
 *   weitergegeben.
 *
 * mode = "period_renewal":
 * - wird beim Beginn eines neuen Stripe-Abrechnungszeitraums verwendet,
 * - die zu Periodenbeginn aktive Mitarbeiterzahl wird als neue
 *   Monatsmenge gesetzt,
 * - Senkungen erfolgen ohne Proration/Gutschrift.
 */
export async function syncEmployeeBilling(
  businessId: string,
  mode: EmployeeBillingSyncMode,
): Promise<EmployeeBillingSyncResult> {
  if (!businessId) {
    throw new Error("businessId fehlt für die Mitarbeiterabrechnung.");
  }

  if (mode !== "activation" && mode !== "period_renewal") {
    throw new Error("Ungültiger Modus für die Mitarbeiterabrechnung.");
  }

  const basePriceId = requireBasePriceId();

  const additionalEmployeePriceId = requireAdditionalEmployeePriceId();

  const business = await loadBusinessBillingData(businessId);

  /*
   * Direkt während der Betriebserstellung kann die Stripe-ID für
   * einen kurzen Moment noch nicht in businesses gespeichert sein.
   */
  if (!business.stripe_subscription_id) {
    return {
      businessId,
      mode,
      billableEmployeeCount: 0,
      desiredAdditionalQuantity: 0,
      stripeAdditionalQuantityBefore: 0,
      stripeAdditionalQuantityAfter: 0,
      action: "not_configured",
    };
  }

  const subscription = await stripe.subscriptions.retrieve(
    business.stripe_subscription_id,
  );

  if (!subscriptionUsesBasePrice(subscription, basePriceId)) {
    return {
      businessId,
      mode,
      billableEmployeeCount: 0,
      desiredAdditionalQuantity: 0,
      stripeAdditionalQuantityBefore: 0,
      stripeAdditionalQuantityAfter: 0,
      action: "not_configured",
    };
  }

  await storeCurrentPeriod(businessId, subscription);

  const billableEmployeeCount = await getBillableEmployeeCount(
    businessId,
    subscription,
    mode,
  );

  const desiredAdditionalQuantity = Math.max(
    billableEmployeeCount - INCLUDED_EMPLOYEE_ACCOUNTS,
    0,
  );

  const additionalItem = findAdditionalEmployeeItem(
    subscription,
    additionalEmployeePriceId,
  );

  const stripeAdditionalQuantityBefore = additionalItem?.quantity ?? 0;

  if (desiredAdditionalQuantity === stripeAdditionalQuantityBefore) {
    return {
      businessId,
      mode,
      billableEmployeeCount,
      desiredAdditionalQuantity,
      stripeAdditionalQuantityBefore,
      stripeAdditionalQuantityAfter: stripeAdditionalQuantityBefore,
      action: "unchanged",
    };
  }

  /*
   * Im Aktivierungsmodus sind nur Erhöhungen zulässig.
   * Eine Deaktivierung darf im aktuellen Zeitraum niemals
   * einen Stripe-Credit erzeugen.
   */
  if (
    mode === "activation" &&
    desiredAdditionalQuantity < stripeAdditionalQuantityBefore
  ) {
    return {
      businessId,
      mode,
      billableEmployeeCount,
      desiredAdditionalQuantity,
      stripeAdditionalQuantityBefore,
      stripeAdditionalQuantityAfter: stripeAdditionalQuantityBefore,
      action: "decrease_deferred",
    };
  }

  if (desiredAdditionalQuantity === 0) {
    if (!additionalItem) {
      return {
        businessId,
        mode,
        billableEmployeeCount,
        desiredAdditionalQuantity,
        stripeAdditionalQuantityBefore: 0,
        stripeAdditionalQuantityAfter: 0,
        action: "unchanged",
      };
    }

    /*
     * Nur period_renewal kann hier sinnvoll landen:
     * Die Zusatzposition wird zum neuen Zeitraum ohne Gutschrift
     * vollständig entfernt.
     */
    await deleteAdditionalItem(additionalItem.id);

    return {
      businessId,
      mode,
      billableEmployeeCount,
      desiredAdditionalQuantity,
      stripeAdditionalQuantityBefore,
      stripeAdditionalQuantityAfter: 0,
      action: "removed",
    };
  }

  if (!additionalItem) {
    await createAdditionalItem(
      subscription.id,
      additionalEmployeePriceId,
      desiredAdditionalQuantity,
      mode,
    );

    return {
      businessId,
      mode,
      billableEmployeeCount,
      desiredAdditionalQuantity,
      stripeAdditionalQuantityBefore: 0,
      stripeAdditionalQuantityAfter: desiredAdditionalQuantity,
      action: "created",
    };
  }

  await updateAdditionalItem(
    additionalItem.id,
    desiredAdditionalQuantity,
    mode,
  );

  return {
    businessId,
    mode,
    billableEmployeeCount,
    desiredAdditionalQuantity,
    stripeAdditionalQuantityBefore,
    stripeAdditionalQuantityAfter: desiredAdditionalQuantity,
    action:
      desiredAdditionalQuantity > stripeAdditionalQuantityBefore
        ? "increased"
        : "decreased",
  };
}
