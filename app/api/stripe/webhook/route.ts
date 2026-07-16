import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseServer";

type ExistingProfile = {
  id: string;
  business_id: string | null;
};

type PendingBusinessSetup = {
  id: string;
  user_id: string;
  business_name: string;
  admin_name: string;
  admin_pin: string;
  status: string;
  plan_key: string | null;
  employee_limit: number | null;
};

function toIsoDate(unixTimestamp: number | null | undefined) {
  return unixTimestamp
    ? new Date(unixTimestamp * 1000).toISOString()
    : null;
}

function getCurrentPeriodEnd(subscription: Stripe.Subscription) {
  return toIsoDate(
    subscription.items.data[0]?.current_period_end
  );
}

async function markEventProcessed(eventId: string) {
  const { error } = await supabaseAdmin
    .from("stripe_events")
    .update({
      processed_at: new Date().toISOString(),
    })
    .eq("id", eventId);

  if (error) {
    throw error;
  }
}

async function updateBusinessSubscription(
  businessId: string,
  subscription: Stripe.Subscription,
  customerId?: string,
  plan?: {
    planKey: string;
    employeeLimit: number;
  }
) {
  const updateValue: Record<string, unknown> = {
    stripe_subscription_id: subscription.id,
    subscription_status: subscription.status,
    trial_ends_at: toIsoDate(subscription.trial_end),
    current_period_end: getCurrentPeriodEnd(subscription),
  };

  if (customerId) {
    updateValue.stripe_customer_id = customerId;
  }

  if (plan) {
    updateValue.plan_key = plan.planKey;
    updateValue.employee_limit = plan.employeeLimit;
  }

  const { error } = await supabaseAdmin
    .from("businesses")
    .update(updateValue)
    .eq("id", businessId);

  if (error) {
    throw error;
  }
}

async function updateBusinessSubscriptionBySubscriptionId(
  subscription: Stripe.Subscription
) {
  const { error } = await supabaseAdmin
    .from("businesses")
    .update({
      subscription_status: subscription.status,
      trial_ends_at: toIsoDate(subscription.trial_end),
      current_period_end: getCurrentPeriodEnd(subscription),
    })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    throw error;
  }
}

async function completePendingSetup(
  pendingSetupId: string,
  userId: string,
  customerId: string,
  subscriptionId: string,
  planKey: string,
  employeeLimit: number
) {
  const { error } = await supabaseAdmin
    .from("pending_business_setups")
    .update({
      status: "completed",
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      plan_key: planKey,
      employee_limit: employeeLimit,
    })
    .eq("id", pendingSetupId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

async function handleCheckoutCompleted(
  event: Stripe.Event,
  session: Stripe.Checkout.Session
) {
  const pendingSetupId = session.metadata?.pending_setup_id;
  const userId = session.metadata?.user_id;

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (
    !pendingSetupId ||
    !userId ||
    !customerId ||
    !subscriptionId
  ) {
    throw new Error(
      "Checkout Session enthält unvollständige Metadaten."
    );
  }

  const {
    data: pendingSetupData,
    error: pendingSetupError,
  } = await supabaseAdmin
    .from("pending_business_setups")
    .select(
      `
        id,
        user_id,
        business_name,
        admin_name,
        admin_pin,
        status,
        plan_key,
        employee_limit
      `
    )
    .eq("id", pendingSetupId)
    .eq("user_id", userId)
    .single();

  if (pendingSetupError || !pendingSetupData) {
    throw (
      pendingSetupError ??
      new Error("Pending Setup wurde nicht gefunden.")
    );
  }

  const pendingSetup: PendingBusinessSetup = {
    id: pendingSetupData.id,
    user_id: pendingSetupData.user_id,
    business_name: pendingSetupData.business_name,
    admin_name: pendingSetupData.admin_name,
    admin_pin: pendingSetupData.admin_pin,
    status: pendingSetupData.status,
    plan_key: pendingSetupData.plan_key,
    employee_limit: pendingSetupData.employee_limit,
  };

  if (
    typeof pendingSetup.plan_key !== "string" ||
    !pendingSetup.plan_key.trim() ||
    typeof pendingSetup.employee_limit !== "number"
  ) {
    throw new Error(
      "Das Pending Setup enthält keine gültige Paketzuordnung."
    );
  }

  if (
    pendingSetup.employee_limit < 10 ||
    pendingSetup.employee_limit >= 50 ||
    pendingSetup.employee_limit % 5 !== 0
  ) {
    throw new Error(
      "Das Pending Setup enthält ein ungültiges Mitarbeiterlimit."
    );
  }

  const subscription =
    await stripe.subscriptions.retrieve(subscriptionId);

  const {
    data: existingProfileData,
    error: existingProfileError,
  } = await supabaseAdmin
    .from("profiles")
    .select("id, business_id")
    .eq("id", userId)
    .maybeSingle();

  if (existingProfileError) {
    throw existingProfileError;
  }

  const existingProfile: ExistingProfile | null =
    existingProfileData
      ? {
          id: existingProfileData.id,
          business_id:
            existingProfileData.business_id ?? null,
        }
      : null;

  /*
   * Wiederholter oder teilweise bereits verarbeiteter Checkout:
   * kein zweiter Betrieb, sondern vorhandenen Betrieb vervollständigen.
   */
  if (existingProfile) {
    if (!existingProfile.business_id) {
      throw new Error(
        "Das vorhandene Profil besitzt keine Betriebszuordnung."
      );
    }

    await updateBusinessSubscription(
      existingProfile.business_id,
      subscription,
      customerId,
      {
        planKey: pendingSetup.plan_key,
        employeeLimit: pendingSetup.employee_limit,
      }
    );

    await completePendingSetup(
      pendingSetupId,
      userId,
      customerId,
      subscriptionId,
      pendingSetup.plan_key,
      pendingSetup.employee_limit
    );

    await markEventProcessed(event.id);

    return NextResponse.json({ received: true });
  }

  const {
    data: businessId,
    error: createBusinessError,
  } = await supabaseAdmin.rpc(
    "create_business_with_owner_for_user",
    {
      p_user_id: userId,
      p_business_name: pendingSetup.business_name,
      p_admin_name: pendingSetup.admin_name,
      p_admin_pin: pendingSetup.admin_pin,
    }
  );

  if (createBusinessError || !businessId) {
    console.error(
      "CREATE BUSINESS RPC ERROR:",
      createBusinessError
    );

    throw (
      createBusinessError ??
      new Error("Betrieb konnte nicht erstellt werden.")
    );
  }

  await updateBusinessSubscription(
    businessId,
    subscription,
    customerId,
    {
      planKey: pendingSetup.plan_key,
      employeeLimit: pendingSetup.employee_limit,
    }
  );

  await completePendingSetup(
    pendingSetupId,
    userId,
    customerId,
    subscriptionId,
    pendingSetup.plan_key,
    pendingSetup.employee_limit
  );

  await markEventProcessed(event.id);

  return NextResponse.json({ received: true });
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice) {
  if (
    invoice.parent?.type !== "subscription_details"
  ) {
    return null;
  }

  const subscription =
    invoice.parent.subscription_details?.subscription;

  if (typeof subscription === "string") {
    return subscription;
  }

  if (
    subscription &&
    typeof subscription === "object" &&
    "id" in subscription
  ) {
    return subscription.id;
  }

  return null;
}

export async function POST(request: NextRequest) {
  const webhookSecret =
    process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Webhook-Konfiguration unvollständig." },
      { status: 500 }
    );
  }

  const body = await request.text();
  const signature =
    request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Stripe-Signatur fehlt." },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (error) {
    console.error(
      "STRIPE WEBHOOK SIGNATURE ERROR:",
      error
    );

    return NextResponse.json(
      { error: "Ungültige Stripe-Signatur." },
      { status: 400 }
    );
  }

  const {
    data: existingEvent,
    error: existingEventError,
  } = await supabaseAdmin
    .from("stripe_events")
    .select("id, processed_at")
    .eq("id", event.id)
    .maybeSingle();

  if (existingEventError) {
    console.error(
      "STRIPE EVENT CHECK ERROR:",
      existingEventError
    );

    return NextResponse.json(
      {
        error:
          "Stripe-Event konnte nicht geprüft werden.",
      },
      { status: 500 }
    );
  }

  if (existingEvent?.processed_at) {
    return NextResponse.json({ received: true });
  }

  if (!existingEvent) {
    const { error: eventInsertError } =
      await supabaseAdmin
        .from("stripe_events")
        .insert({
          id: event.id,
          type: event.type,
          processed_at: null,
        });

    if (
      eventInsertError &&
      eventInsertError.code !== "23505"
    ) {
      console.error(
        "STRIPE EVENT INSERT ERROR:",
        eventInsertError
      );

      return NextResponse.json(
        {
          error:
            "Stripe-Event konnte nicht gespeichert werden.",
        },
        { status: 500 }
      );
    }
  }

  try {
    if (event.type === "checkout.session.completed") {
      return await handleCheckoutCompleted(
        event,
        event.data.object as Stripe.Checkout.Session
      );
    }

    if (
      event.type ===
        "customer.subscription.updated" ||
      event.type ===
        "customer.subscription.deleted"
    ) {
      const subscription =
        event.data.object as Stripe.Subscription;

      await updateBusinessSubscriptionBySubscriptionId(
        subscription
      );
    }

    if (
      event.type === "invoice.payment_failed" ||
      event.type === "invoice.paid"
    ) {
      const invoice =
        event.data.object as Stripe.Invoice;

      const subscriptionId =
        getInvoiceSubscriptionId(invoice);

      if (subscriptionId) {
        const subscription =
          await stripe.subscriptions.retrieve(
            subscriptionId
          );

        await updateBusinessSubscriptionBySubscriptionId(
          subscription
        );
      }
    }

    await markEventProcessed(event.id);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(
      "STRIPE WEBHOOK HANDLER ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Webhook konnte nicht verarbeitet werden.",
      },
      { status: 500 }
    );
  }
}
