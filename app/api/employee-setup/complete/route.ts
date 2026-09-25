import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { syncEmployeeBilling } from "@/lib/billing/syncEmployeeBilling";

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Server-Konfiguration unvollständig." },
        { status: 500 }
      );
    }

    const authHeader =
      request.headers.get("authorization");

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      return NextResponse.json(
        { error: "Nicht angemeldet." },
        { status: 401 }
      );
    }

    /*
     * Wichtig:
     * Der RPC complete_employee_invite_from_metadata()
     * verwendet auth.uid() und auth.jwt().
     *
     * Deshalb muss er mit dem echten Benutzer-Token
     * ausgeführt werden und ausdrücklich NICHT über
     * den Service-Role-Client.
     */
    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
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
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error:
            "Benutzer konnte nicht geprüft werden.",
        },
        { status: 401 }
      );
    }

    if (!user.email_confirmed_at) {
      return NextResponse.json(
        {
          error:
            "Die E-Mail-Adresse wurde noch nicht bestätigt.",
        },
        { status: 403 }
      );
    }

    /*
     * Der RPC ist idempotent:
     * Existiert das Profil bereits, liefert er die
     * vorhandene Rolle zurück. Dadurch kann die Route
     * nach einem Netzwerk- oder Stripe-Fehler sicher
     * erneut aufgerufen werden.
     */
    const {
      data: assignedRole,
      error: inviteError,
    } = await supabase.rpc(
      "complete_employee_invite_from_metadata"
    );

    if (inviteError) {
      console.error(
        "EMPLOYEE SETUP INVITE RPC ERROR:",
        inviteError
      );

      return NextResponse.json(
        {
          error:
            inviteError.message ||
            "Die Mitarbeitereinladung konnte nicht abgeschlossen werden.",
        },
        { status: 400 }
      );
    }

    if (
      assignedRole !== "owner" &&
      assignedRole !== "admin" &&
      assignedRole !== "employee"
    ) {
      console.error(
        "EMPLOYEE SETUP INVALID ROLE:",
        assignedRole
      );

      return NextResponse.json(
        {
          error:
            "Die Benutzerrolle konnte nicht bestimmt werden.",
        },
        { status: 500 }
      );
    }

    /*
     * Nach erfolgreichem RPC existiert das Profil.
     * Die business_id laden wir weiterhin im Kontext
     * des eingeloggten Benutzers.
     */
    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("business_id, role")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !profile?.business_id
    ) {
      console.error(
        "EMPLOYEE SETUP PROFILE ERROR:",
        profileError
      );

      return NextResponse.json(
        {
          error:
            "Das Benutzerprofil konnte nach der Aktivierung nicht geladen werden.",
        },
        { status: 500 }
      );
    }

    /*
     * Die Datenbank-Aktivierung ist zu diesem Zeitpunkt
     * bereits abgeschlossen.
     *
     * Falls Stripe vorübergehend nicht erreichbar ist,
     * geben wir einen Fehler zurück. Der vorhandene
     * Retry-Button kann die Route erneut aufrufen.
     * Der Invite-RPC erzeugt dabei keine zweite
     * Membership; anschließend wird der Billing-Sync
     * erneut versucht.
     */
    try {
      const billing =
        await syncEmployeeBilling(
          profile.business_id,
          "activation"
        );

      return NextResponse.json({
        role: profile.role ?? assignedRole,
        billing,
      });
    } catch (billingError) {
      console.error(
        "EMPLOYEE SETUP BILLING SYNC ERROR:",
        billingError
      );

      return NextResponse.json(
        {
          error:
            "Dein Mitarbeiterkonto wurde aktiviert, aber die Abrechnung konnte noch nicht synchronisiert werden. Bitte versuche es erneut.",
          activationCompleted: true,
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error(
      "EMPLOYEE SETUP COMPLETE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Bei der Aktivierung ist ein unerwarteter Fehler aufgetreten.",
      },
      { status: 500 }
    );
  }
}
