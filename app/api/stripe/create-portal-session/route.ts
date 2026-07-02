import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (!supabaseUrl || !supabaseAnonKey) {
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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("business_id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.business_id) {
      return NextResponse.json(
        { error: "Profil konnte nicht geladen werden." },
        { status: 400 }
      );
    }

    if (profile.role !== "owner") {
      return NextResponse.json(
        { error: "Nur der Owner kann das Abonnement verwalten." },
        { status: 403 }
      );
    }

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("stripe_customer_id")
      .eq("id", profile.business_id)
      .single();

    if (businessError || !business?.stripe_customer_id) {
      return NextResponse.json(
        { error: "Kein Stripe-Kunde gefunden." },
        { status: 400 }
      );
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: business.stripe_customer_id,
      return_url: `${appUrl}/admin/settings`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("STRIPE PORTAL ERROR:", error);

    return NextResponse.json(
      { error: "Kundenportal konnte nicht geöffnet werden." },
      { status: 500 }
    );
  }
}