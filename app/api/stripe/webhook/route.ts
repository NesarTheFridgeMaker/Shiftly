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
  contact_name: string;
  phone: string;
  street: string;
  house_number: string;
  postal_code: string;
  city: string;
  country_code: string;
  support_email: string;
  billing_email: string;
  website: string | null;
  vat_id: string | null;
  legal_form: string | null;
  plan_key: string | null;
  employee_limit: number | null;
};

function toIsoDate(unixTimestamp: number | null | undefined) {
  return unixTimestamp
    ? new Date(unixTimestamp * 1000).toISOString()
    : null;
}

function getCurrentPeriodEnd(subscription: Stripe.Subscription) {
  return toIsoDate(subscription.items.data[0]?.current_period_end);
}

function validatePendingSetup(pendingSetup: PendingBusinessSetup) {
  const requiredValues = [
    pendingSetup.business_name,
    pendingSetup.admin_name,
    pendingSetup.admin_pin,
    pendingSetup.contact_name,
    pendingSetup.phone,
    pendingSetup.street,
    pendingSetup.house_number,
    pendingSetup.postal_code,
    pendingSetup.city,
    pendingSetup.country_code,
    pendingSetup.support_email,
    pendingSetup.billing_email,
  ];

  if (
    requiredValues.some(
      (value) => typeof value !== "string" || !value.trim()
    )
  ) {
    throw new Error(
      "Das Pending Setup enthält unvollständige Unternehmensdaten."
    );
  }

  if (!/^\d{4}$/.test(pendingSetup.admin_pin)) {
    throw new Error(
      "Das Pending Setup enthält eine ungültige Admin-PIN."
    );
  }

  if (!/^[A-Z]{2}$/.test(pendingSetup.country_code)) {
    throw new Error(
      "Das Pending Setup enthält einen ungültigen Ländercode."
    );
  }

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
}

async function markEventProcessed(eventId: string) {
  const { error } = await supabaseAdmin
    .from("stripe_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("id", eventId);

  if (error) throw error;
}

async function updateBusinessAfterCheckout(
  businessId: string,
  pendingSetup: PendingBusinessSetup,
  subscription: Stripe.Subscription,
  customerId: string
) {
  const { error } = await supabaseAdmin
    .from("businesses")
    .update({
      contact_name: pendingSetup.contact_name,
      phone: pendingSetup.phone,
      street: pendingSetup.street,
      house_number: pendingSetup.house_number,
      postal_code: pendingSetup.postal_code,
      city: pendingSetup.city,
      country_code: pendingSetup.country_code,
      support_email: pendingSetup.support_email,
      billing_email: pendingSetup.billing_email,
      website: pendingSetup.website,
      vat_id: pendingSetup.vat_id,
      legal_form: pendingSetup.legal_form,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
      trial_ends_at: toIsoDate(subscription.trial_end),
      current_period_end: getCurrentPeriodEnd(subscription),
      plan_key: pendingSetup.plan_key,
      employee_limit: pendingSetup.employee_limit,
    })
    .eq("id", businessId);

  if (error) throw error;
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

  if (error) throw error;
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

  if (error) throw error;
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

  if (!pendingSetupId || !userId || !customerId || !subscriptionId) {
    throw new Error(
      "Checkout Session enthält unvollständige Metadaten."
    );
  }

  const { data: pendingSetupData, error: pendingSetupError } =
    await supabaseAdmin
      .from("pending_business_setups")
      .select(`
        id,
        user_id,
        business_name,
        admin_name,
        admin_pin,
        status,
        contact_name,
        phone,
        street,
        house_number,
        postal_code,
        city,
        country_code,
        support_email,
        billing_email,
        website,
        vat_id,
        legal_form,
        plan_key,
        employee_limit
      `)
      .eq("id", pendingSetupId)
      .eq("user_id", userId)
      .single();

  if (pendingSetupError || !pendingSetupData) {
    throw (
      pendingSetupError ??
      new Error("Pending Setup wurde nicht gefunden.")
    );
  }

  const pendingSetup = pendingSetupData as PendingBusinessSetup;
  validatePendingSetup(pendingSetup);

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const { data: existingProfileData, error: existingProfileError } =
    await supabaseAdmin
      .from("profiles")
      .select("id, business_id")
      .eq("id", userId)
      .maybeSingle();

  if (existingProfileError) throw existingProfileError;

  const existingProfile: ExistingProfile | null = existingProfileData
    ? {
        id: existingProfileData.id,
        business_id: existingProfileData.business_id ?? null,
      }
    : null;

  if (existingProfile) {
    if (!existingProfile.business_id) {
      throw new Error(
        "Das vorhandene Profil besitzt keine Betriebszuordnung."
      );
    }

    await updateBusinessAfterCheckout(
      existingProfile.business_id,
      pendingSetup,
      subscription,
      customerId
    );

    await completePendingSetup(
      pendingSetupId,
      userId,
      customerId,
      subscriptionId,
      pendingSetup.plan_key!,
      pendingSetup.employee_limit!
    );

    await markEventProcessed(event.id);
    return NextResponse.json({ received: true });
  }

  const { data: businessId, error: createBusinessError } =
    await supabaseAdmin.rpc("create_business_with_owner_for_user", {
      p_user_id: userId,
      p_business_name: pendingSetup.business_name,
      p_admin_name: pendingSetup.admin_name,
      p_admin_pin: pendingSetup.admin_pin,
      p_contact_name: pendingSetup.contact_name,
      p_phone: pendingSetup.phone,
      p_street: pendingSetup.street,
      p_house_number: pendingSetup.house_number,
      p_postal_code: pendingSetup.postal_code,
      p_city: pendingSetup.city,
      p_country_code: pendingSetup.country_code,
      p_support_email: pendingSetup.support_email,
      p_billing_email: pendingSetup.billing_email,
      p_website: pendingSetup.website,
      p_vat_id: pendingSetup.vat_id,
      p_legal_form: pendingSetup.legal_form,
    });

  if (createBusinessError || !businessId) {
    console.error("CREATE BUSINESS RPC ERROR:", createBusinessError);
    throw (
      createBusinessError ??
      new Error("Betrieb konnte nicht erstellt werden.")
    );
  }

  await updateBusinessAfterCheckout(
    businessId,
    pendingSetup,
    subscription,
    customerId
  );

  await completePendingSetup(
    pendingSetupId,
    userId,
    customerId,
    subscriptionId,
    pendingSetup.plan_key!,
    pendingSetup.employee_limit!
  );

  await markEventProcessed(event.id);
  return NextResponse.json({ received: true });
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice) {
  if (invoice.parent?.type !== "subscription_details") {
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
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Webhook-Konfiguration unvollständig." },
      { status: 500 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

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
    console.error("STRIPE WEBHOOK SIGNATURE ERROR:", error);

    return NextResponse.json(
      { error: "Ungültige Stripe-Signatur." },
      { status: 400 }
    );
  }

  const { data: existingEvent, error: existingEventError } =
    await supabaseAdmin
      .from("stripe_events")
      .select("id, processed_at")
      .eq("id", event.id)
      .maybeSingle();

  if (existingEventError) {
    console.error("STRIPE EVENT CHECK ERROR:", existingEventError);

    return NextResponse.json(
      { error: "Stripe-Event konnte nicht geprüft werden." },
      { status: 500 }
    );
  }

  if (existingEvent?.processed_at) {
    return NextResponse.json({ received: true });
  }

  if (!existingEvent) {
    const { error: eventInsertError } = await supabaseAdmin
      .from("stripe_events")
      .insert({
        id: event.id,
        type: event.type,
        processed_at: null,
      });

    if (eventInsertError && eventInsertError.code !== "23505") {
      console.error("STRIPE EVENT INSERT ERROR:", eventInsertError);

      return NextResponse.json(
        { error: "Stripe-Event konnte nicht gespeichert werden." },
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
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      await updateBusinessSubscriptionBySubscriptionId(
        event.data.object as Stripe.Subscription
      );
    }

    if (
      event.type === "invoice.payment_failed" ||
      event.type === "invoice.paid"
    ) {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = getInvoiceSubscriptionId(invoice);

      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(
          subscriptionId
        );

        await updateBusinessSubscriptionBySubscriptionId(subscription);
      }
    }

    await markEventProcessed(event.id);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("STRIPE WEBHOOK HANDLER ERROR:", error);

    return NextResponse.json(
      { error: "Webhook konnte nicht verarbeitet werden." },
      { status: 500 }
    );
  }
}
