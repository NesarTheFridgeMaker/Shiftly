import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { supabaseAdmin } from "@/lib/supabaseServer";

type SendInviteBody = {
  employeeId?: string;
  email?: string;
};

type Profile = {
  business_id: string | null;
  role: string | null;
};

type Employee = {
  id: string;
  name: string;
  role: string;
  business_id: string;
};

type EmployeeInvite = {
  id: string;
  employee_id: string;
  business_id: string;
  invite_code: string;
  email: string | null;
  delivery_method: "email" | "whatsapp";
  auth_user_id: string | null;
  claimed_at: string | null;
  used_at: string | null;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: NextRequest) {
  let createdAuthUserId: string | null = null;

  try {
    /*
     * 1. Angemeldeten Admin prüfen
     */
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: "Nicht angemeldet.",
        },
        {
          status: 401,
        },
      );
    }

    const accessToken = authorization.slice("Bearer ".length).trim();

    if (!accessToken) {
      return NextResponse.json(
        {
          error: "Nicht angemeldet.",
        },
        {
          status: 401,
        },
      );
    }

    /*
     * 2. Request-Daten prüfen
     */
    let body: SendInviteBody;

    try {
      body = (await request.json()) as SendInviteBody;
    } catch {
      return NextResponse.json(
        {
          error: "Die Anfrage enthält keine gültigen Daten.",
        },
        {
          status: 400,
        },
      );
    }

    const employeeId = body.employeeId?.trim();
    const email = body.email?.trim().toLowerCase();

    if (!employeeId || !email) {
      return NextResponse.json(
        {
          error: "Mitarbeiter und E-Mail-Adresse sind erforderlich.",
        },
        {
          status: 400,
        },
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        {
          error: "Bitte gib eine gültige E-Mail-Adresse ein.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * 3. Server-Konfiguration prüfen
     */
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const appUrl = (
      process.env.NEXT_PUBLIC_APP_URL || "https://app.dipera.de"
    ).replace(/\/$/, "");

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error(
        "NEXT_PUBLIC_SUPABASE_URL oder NEXT_PUBLIC_SUPABASE_ANON_KEY fehlt.",
      );

      return NextResponse.json(
        {
          error: "Die Anmeldung ist serverseitig nicht vollständig konfiguriert.",
        },
        {
          status: 500,
        },
      );
    }

    /*
     * Dieser Client arbeitet mit dem Access-Token des aktuell
     * angemeldeten Owners beziehungsweise Admins.
     */
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const {
      data: { user },
      error: userError,
    } = await userSupabase.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Deine Anmeldung ist abgelaufen. Bitte melde dich erneut an.",
        },
        {
          status: 401,
        },
      );
    }

    /*
     * 4. Rolle und Betrieb des Absenders prüfen
     */
    const { data: profileData, error: profileError } = await userSupabase
      .from("profiles")
      .select("business_id, role")
      .eq("id", user.id)
      .single();

    const profile = profileData as Profile | null;

    if (profileError || !profile?.business_id) {
      console.error("INVITE PROFILE LOAD ERROR:", profileError);

      return NextResponse.json(
        {
          error: "Dein Betriebsprofil konnte nicht geladen werden.",
        },
        {
          status: 403,
        },
      );
    }

    if (profile.role !== "owner" && profile.role !== "admin") {
      return NextResponse.json(
        {
          error: "Du darfst keine Mitarbeitereinladungen versenden.",
        },
        {
          status: 403,
        },
      );
    }

    /*
     * 5. Mitarbeiter sicher über den Betrieb prüfen
     *
     * Hier verwenden wir den Admin-Client, aber begrenzen die Abfrage
     * ausdrücklich auf den Betrieb des angemeldeten Benutzers.
     */
    const { data: employeeData, error: employeeError } = await supabaseAdmin
      .from("employees")
      .select("id, name, role, business_id")
      .eq("id", employeeId)
      .eq("business_id", profile.business_id)
      .single();

    const employee = employeeData as Employee | null;

    if (employeeError || !employee) {
      console.error("INVITE EMPLOYEE LOAD ERROR:", employeeError);

      return NextResponse.json(
        {
          error: "Der Mitarbeiter wurde nicht gefunden.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * Ein Admin darf keinen anderen Admin oder Owner einladen,
     * sofern diese Einschränkung auch beim Anlegen gilt.
     */
    if (
      profile.role !== "owner" &&
      (employee.role === "Admin" || employee.role === "Owner")
    ) {
      return NextResponse.json(
        {
          error: "Nur der Owner darf Admin-Zugänge einrichten.",
        },
        {
          status: 403,
        },
      );
    }

    /*
     * 6. Aktuelle offene Einladung laden
     *
     * limit(1) verhindert Fehler, falls aus älteren Daten versehentlich
     * mehrere Einladungen für denselben Mitarbeiter vorhanden sind.
     */
    const { data: inviteRows, error: inviteError } = await supabaseAdmin
      .from("employee_invites")
      .select(`
        id,
        employee_id,
        business_id,
        invite_code,
        email,
        delivery_method,
        auth_user_id,
        claimed_at,
        used_at
      `)
      .eq("employee_id", employee.id)
      .eq("business_id", profile.business_id)
      .is("used_at", null)
      .order("created_at", {
        ascending: false,
      })
      .limit(1);

    if (inviteError) {
      console.error("EMPLOYEE INVITE LOAD ERROR:", inviteError);

      return NextResponse.json(
        {
          error: "Die Mitarbeitereinladung konnte nicht geladen werden.",
        },
        {
          status: 500,
        },
      );
    }

    const invite = (inviteRows?.[0] ?? null) as EmployeeInvite | null;

    if (!invite) {
      return NextResponse.json(
        {
          error: "Für diesen Mitarbeiter wurde keine offene Einladung gefunden.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * Eine bereits an einen Auth-Benutzer gebundene Einladung darf nicht
     * erneut mit einer anderen Adresse verschickt werden.
     */
    if (invite.auth_user_id) {
      if (invite.email && invite.email !== email) {
        return NextResponse.json(
          {
            error:
              "Diese Einladung ist bereits mit einer anderen E-Mail-Adresse verknüpft.",
          },
          {
            status: 409,
          },
        );
      }

      return NextResponse.json(
        {
          error:
            "Für diesen Mitarbeiter wurde bereits eine E-Mail-Einladung erstellt.",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * 7. Supabase-Einladung versenden
     *
     * inviteUserByEmail erstellt einen unbestätigten Auth-Benutzer und
     * verschickt die Supabase-Einladungsmail.
     */
    const redirectTo = `${appUrl}/auth/callback?next=/employee-set-password`;

    const {
      data: authInviteData,
      error: authInviteError,
    } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: {
        employee_id: employee.id,
        employee_name: employee.name,
        business_id: profile.business_id,
        invite_id: invite.id,
        invite_code: invite.invite_code,
        dipera_role: employee.role,
      },
    });

    if (authInviteError || !authInviteData.user) {
      console.error("SUPABASE AUTH INVITE ERROR:", authInviteError);

      const normalizedMessage = authInviteError?.message?.toLowerCase() ?? "";

      if (
        normalizedMessage.includes("already") ||
        normalizedMessage.includes("registered") ||
        normalizedMessage.includes("exists")
      ) {
        return NextResponse.json(
          {
            error:
              "Für diese E-Mail-Adresse existiert bereits ein Dipera-Zugang.",
          },
          {
            status: 409,
          },
        );
      }

      return NextResponse.json(
        {
          error:
            authInviteError?.message ||
            "Die Einladung konnte nicht versendet werden.",
        },
        {
          status: 502,
        },
      );
    }

    createdAuthUserId = authInviteData.user.id;

    /*
     * 8. Auth-Benutzer sicher mit der Einladung verknüpfen
     */
    const { data: updatedInvite, error: updateInviteError } =
      await supabaseAdmin
        .from("employee_invites")
        .update({
          email,
          delivery_method: "email",
          auth_user_id: createdAuthUserId,
          claimed_at: null,
        })
        .eq("id", invite.id)
        .eq("employee_id", employee.id)
        .eq("business_id", profile.business_id)
        .is("used_at", null)
        .is("auth_user_id", null)
        .select("id")
        .maybeSingle();

    if (updateInviteError || !updatedInvite) {
      console.error("EMPLOYEE INVITE UPDATE ERROR:", updateInviteError);

      /*
       * Die E-Mail wurde möglicherweise bereits versendet. Der neu erstellte
       * Auth-Benutzer wird trotzdem entfernt, damit kein verwaistes Konto
       * bestehen bleibt.
       */
      const { error: rollbackError } =
        await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);

      if (rollbackError) {
        console.error(
          "AUTH USER ROLLBACK AFTER INVITE UPDATE ERROR:",
          rollbackError,
        );
      }

      createdAuthUserId = null;

      return NextResponse.json(
        {
          error:
            "Die Einladung konnte nicht sicher mit dem Mitarbeiter verknüpft werden.",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      success: true,
      email,
    });
  } catch (error) {
    console.error("SEND EMPLOYEE INVITE ERROR:", error);

    /*
     * Nur als zusätzliche Absicherung, falls nach der Auth-Erstellung
     * unerwartet eine Exception geworfen wurde.
     */
    if (createdAuthUserId) {
      const { error: rollbackError } =
        await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);

      if (rollbackError) {
        console.error(
          "AUTH USER ROLLBACK AFTER UNEXPECTED ERROR:",
          rollbackError,
        );
      }
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Die Einladung konnte nicht versendet werden.",
      },
      {
        status: 500,
      },
    );
  }
}