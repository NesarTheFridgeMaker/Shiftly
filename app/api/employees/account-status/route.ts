import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { syncEmployeeBilling } from "@/lib/billing/syncEmployeeBilling";

type AccountStatusRequestBody = {
  employeeId?: string;
  newStatus?: "active" | "inactive";
};

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

    let body: AccountStatusRequestBody;

    try {
      body =
        (await request.json()) as AccountStatusRequestBody;
    } catch {
      return NextResponse.json(
        { error: "Ungültige Anfrage." },
        { status: 400 }
      );
    }

    const employeeId = body.employeeId;
    const newStatus = body.newStatus;

    if (!employeeId) {
      return NextResponse.json(
        { error: "employeeId fehlt." },
        { status: 400 }
      );
    }

    if (
      newStatus !== "active" &&
      newStatus !== "inactive"
    ) {
      return NextResponse.json(
        { error: "Ungültiger Kontostatus." },
        { status: 400 }
      );
    }

    /*
     * set_employee_account_status() prüft intern auth.uid()
     * und die Rolle des aufrufenden Benutzers.
     *
     * Deshalb wird der RPC mit dem echten Bearer-Token
     * ausgeführt und nicht mit dem Service-Role-Client.
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

    /*
     * Die business_id wird vor dem Statuswechsel aus dem
     * Profil des aufrufenden Benutzers geladen.
     *
     * Die eigentliche Berechtigungsprüfung für den Mitarbeiter
     * bleibt weiterhin zentral im DB-RPC.
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
        "EMPLOYEE STATUS PROFILE ERROR:",
        profileError
      );

      return NextResponse.json(
        {
          error:
            "Das Benutzerprofil konnte nicht geladen werden.",
        },
        { status: 400 }
      );
    }

    const { error: statusError } =
      await supabase.rpc(
        "set_employee_account_status",
        {
          p_employee_id: employeeId,
          p_new_status: newStatus,
        }
      );

    if (statusError) {
      console.error(
        "EMPLOYEE STATUS RPC ERROR:",
        statusError
      );

      return NextResponse.json(
        {
          error:
            statusError.message ||
            "Der Mitarbeiterstatus konnte nicht geändert werden.",
        },
        { status: 400 }
      );
    }

    /*
     * Nach dem erfolgreichen DB-Statuswechsel wird Stripe
     * synchronisiert.
     *
     * Auch bei einer Deaktivierung verwenden wir "activation":
     * Die geschlossene Membership berührt weiterhin den laufenden
     * Stripe-Zeitraum und bleibt deshalb für diesen Zeitraum
     * abrechnungsrelevant. Eine Verringerung wird zusätzlich vom
     * activation-Modus blockiert.
     *
     * Bei einer Reaktivierung kann die Menge dagegen sofort steigen
     * und Stripe erzeugt die anteilige Proration.
     */
    try {
      const billing =
        await syncEmployeeBilling(
          profile.business_id,
          "activation"
        );

      return NextResponse.json({
        success: true,
        status: newStatus,
        billing,
      });
    } catch (billingError) {
      console.error(
        "EMPLOYEE STATUS BILLING SYNC ERROR:",
        billingError
      );

      /*
       * Der Datenbank-Statuswechsel ist bereits abgeschlossen.
       * Deshalb wird dieser Zustand ausdrücklich mitgeteilt.
       *
       * Ein erneuter Aufruf mit demselben Status ist durch den
       * idempotenten DB-RPC möglich und kann den Stripe-Sync
       * nachholen.
       */
      return NextResponse.json(
        {
          error:
            "Der Mitarbeiterstatus wurde geändert, aber die Abrechnung konnte noch nicht synchronisiert werden. Bitte versuche es erneut.",
          statusChanged: true,
          status: newStatus,
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error(
      "EMPLOYEE ACCOUNT STATUS ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Beim Ändern des Mitarbeiterstatus ist ein unerwarteter Fehler aufgetreten.",
      },
      { status: 500 }
    );
  }
}
