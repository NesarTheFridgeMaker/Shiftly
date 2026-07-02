import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!webhookSecret || !supabaseUrl || !serviceRoleKey) {
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

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const { data: existingEvent } = await supabaseAdmin
  .from("stripe_events")
  .select("id")
  .eq("id", event.id)
  .maybeSingle();

if (existingEvent) {
  return NextResponse.json({ received: true });
}

await supabaseAdmin.from("stripe_events").insert({
  id: event.id,
  type: event.type,
});

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

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
        throw new Error("Checkout Session enthält unvollständige Metadaten.");
      }

      const { data: pendingSetup } =
      await supabaseAdmin
        .from("pending_business_setups")
        .select("*")
        .eq("id", pendingSetupId)
        .single();

    if (!pendingSetup) {
      return NextResponse.json({ received: true });
    }

    if (pendingSetup.status === "completed") {
      return NextResponse.json({ received: true });
    }

    const { data: existingProfile, error: existingProfileError } =
  await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

if (existingProfileError) {
  throw existingProfileError;
}

if (existingProfile) {
  await supabaseAdmin
    .from("pending_business_setups")
    .update({ status: "completed" })
    .eq("id", pendingSetupId);

  return NextResponse.json({ received: true });
}

      const businessId = await supabaseAdmin.rpc(
        "create_business_with_owner_for_user",
        {
          p_user_id: userId,
          p_business_name: pendingSetup.business_name,
          p_admin_name: pendingSetup.admin_name,
          p_admin_pin: pendingSetup.admin_pin,
        }
      );

      const subscription = await stripe.subscriptions.retrieve(
        subscriptionId
      );

      const { error: businessUpdateError } = await supabaseAdmin
        .from("businesses")
        .update({
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          subscription_status: subscription.status,
          trial_ends_at: subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null,
          current_period_end: subscription.items.data[0]?.current_period_end
          ? new Date(
              subscription.items.data[0].current_period_end * 1000
            ).toISOString()
          : null,
        })
        .eq("id", businessId.data);

      if (businessUpdateError) {
        throw businessUpdateError;
      }

            await supabaseAdmin
        .from("pending_business_setups")
        .update({
          status: "completed",
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
        })
        .eq("id", pendingSetupId);
    }
    
    if (
  event.type === "customer.subscription.updated" ||
  event.type === "customer.subscription.deleted"
) {
  const subscription = event.data.object as Stripe.Subscription;

  const subscriptionId = subscription.id;

  const { error: updateError } = await supabaseAdmin
    .from("businesses")
    .update({
      subscription_status: subscription.status,
      trial_ends_at: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
      current_period_end: subscription.items.data[0]?.current_period_end
        ? new Date(
            subscription.items.data[0].current_period_end * 1000
          ).toISOString()
        : null,
    })
    .eq("stripe_subscription_id", subscriptionId);

  if (updateError) {
    throw updateError;
  }
}

if (
  event.type === "invoice.payment_failed" ||
  event.type === "invoice.paid"
) {
  const invoice = event.data.object as Stripe.Invoice;

  const subscriptionId =
  invoice.parent?.type === "subscription_details"
    ? (invoice.parent.subscription_details as { subscription?: string })
        .subscription
    : null;

  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(
      subscriptionId
    );

    const { error: updateError } = await supabaseAdmin
      .from("businesses")
      .update({
        subscription_status: subscription.status,
        trial_ends_at: subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null,
        current_period_end: subscription.items.data[0]?.current_period_end
          ? new Date(
              subscription.items.data[0].current_period_end * 1000
            ).toISOString()
          : null,
      })
      .eq("stripe_subscription_id", subscriptionId);

    if (updateError) {
      throw updateError;
    }
  }
}

    await supabaseAdmin
      .from("stripe_events")
      .update({
        processed_at: new Date().toISOString(),
      })
      .eq("id", event.id);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("STRIPE WEBHOOK HANDLER ERROR:", error);

    return NextResponse.json(
      { error: "Webhook konnte nicht verarbeitet werden." },
      { status: 500 }
    );
  }
}