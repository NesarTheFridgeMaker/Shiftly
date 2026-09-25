import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { syncEmployeeBilling } from "@/lib/billing/syncEmployeeBilling";

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Server-Konfiguration unvollständig." },
        { status: 500 },
      );
    }

    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Nicht angemeldet." },
        { status: 401 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Benutzer konnte nicht geprüft werden." },
        { status: 401 },
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("business_id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.business_id) {
      console.error("EMPLOYEE BILLING SYNC PROFILE ERROR:", profileError);

      return NextResponse.json(
        { error: "Das Benutzerprofil konnte nicht geladen werden." },
        { status: 400 },
      );
    }

    if (profile.role !== "owner" && profile.role !== "admin") {
      return NextResponse.json(
        { error: "Keine Berechtigung." },
        { status: 403 },
      );
    }

    try {
      const billing = await syncEmployeeBilling(
        profile.business_id,
        "activation",
      );

      return NextResponse.json({
        success: true,
        billing,
      });
    } catch (billingError) {
      console.error("EMPLOYEE BILLING RETRY ERROR:", billingError);

      return NextResponse.json(
        {
          error:
            "Die Abrechnung konnte noch nicht synchronisiert werden. Bitte versuche es erneut.",
        },
        { status: 503 },
      );
    }
  } catch (error) {
    console.error("EMPLOYEE BILLING SYNC ERROR:", error);

    return NextResponse.json(
      {
        error:
          "Beim Synchronisieren der Abrechnung ist ein unerwarteter Fehler aufgetreten.",
      },
      { status: 500 },
    );
  }
}
