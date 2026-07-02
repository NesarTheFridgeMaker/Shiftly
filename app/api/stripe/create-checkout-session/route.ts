import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const priceId = process.env.STRIPE_PRICE_ID;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (!priceId || !supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Server-Konfiguration unvollständig." },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Nicht angemeldet." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const { businessName, adminName, adminPin } = body;

    if (!businessName || !adminName || !adminPin) {
      return NextResponse.json(
        { error: "Bitte alle Felder ausfüllen." },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Benutzer konnte nicht geprüft werden." },
        { status: 401 }
      );
    }

    const { data: pendingSetup, error: pendingError } = await supabase
      .from("pending_business_setups")
      .insert({
        user_id: user.id,
        business_name: businessName.trim(),
        admin_name: adminName.trim(),
        admin_pin: adminPin.trim(),
        status: "pending",
      })
      .select("id")
      .single();

    if (pendingError || !pendingSetup) {
      console.error("PENDING SETUP ERROR:", pendingError);

      return NextResponse.json(
        { error: "Setup konnte nicht vorbereitet werden." },
        { status: 500 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          pending_setup_id: pendingSetup.id,
          user_id: user.id,
        },
      },
      metadata: {
        pending_setup_id: pendingSetup.id,
        user_id: user.id,
      },
      success_url: `${appUrl}/setup?checkout=success`,
      cancel_url: `${appUrl}/setup?checkout=cancelled`,
    });

    await supabase
      .from("pending_business_setups")
      .update({
        stripe_checkout_session_id: session.id,
      })
      .eq("id", pendingSetup.id);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("STRIPE CHECKOUT ERROR:", error);

    return NextResponse.json(
      { error: "Checkout konnte nicht erstellt werden." },
      { status: 500 }
    );
  }
}