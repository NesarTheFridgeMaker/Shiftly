import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

type RegisterEmployeeBody = {
  inviteCode?: string;
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  let createdUserId: string | null = null;

  try {
    const body = (await request.json()) as RegisterEmployeeBody;

    const inviteCode = body.inviteCode?.trim().toUpperCase();
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";

    if (!inviteCode || !email || !password) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Einladungscode, E-Mail-Adresse und Passwort sind erforderlich.",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          message: "Das Passwort muss mindestens 8 Zeichen lang sein.",
        },
        { status: 400 }
      );
    }

    if (!/[A-ZÄÖÜ]/.test(password)) {
      return NextResponse.json(
        {
          success: false,
          message: "Das Passwort muss mindestens einen Großbuchstaben enthalten.",
        },
        { status: 400 }
      );
    }

    if (!/\d/.test(password)) {
      return NextResponse.json(
        {
          success: false,
          message: "Das Passwort muss mindestens eine Zahl enthalten.",
        },
        { status: 400 }
      );
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      return NextResponse.json(
        {
          success: false,
          message: "Das Passwort muss mindestens ein Sonderzeichen enthalten.",
        },
        { status: 400 }
      );
    }

    /*
     * 1. Einladung und zugehörigen Mitarbeiter laden
     */
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from("employee_invites")
      .select(`
        id,
        employee_id,
        business_id,
        invite_code,
        used_at,
        employees (
          id,
          role
        )
      `)
      .eq("invite_code", inviteCode)
      .is("used_at", null)
      .maybeSingle();

    if (invitationError) {
      console.error(
        "EMPLOYEE INVITATION LOAD ERROR:",
        invitationError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Der Einladungscode konnte nicht geprüft werden. Bitte versuche es erneut.",
        },
        { status: 500 }
      );
    }

    if (!invitation) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Der Einladungscode ist ungültig oder wurde bereits verwendet.",
        },
        { status: 400 }
      );
    }

    const employee = Array.isArray(invitation.employees)
      ? invitation.employees[0]
      : invitation.employees;

    if (!employee) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Der zu dieser Einladung gehörende Mitarbeiter konnte nicht gefunden werden.",
        },
        { status: 404 }
      );
    }

    /*
     * 2. Prüfen, ob für den Mitarbeiter bereits ein Profil existiert
     */
    const { data: existingEmployeeProfile, error: profileCheckError } =
      await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("employee_id", invitation.employee_id)
        .maybeSingle();

    if (profileCheckError) {
      console.error(
        "EMPLOYEE PROFILE CHECK ERROR:",
        profileCheckError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Der Mitarbeiter-Zugang konnte nicht geprüft werden.",
        },
        { status: 500 }
      );
    }

    if (existingEmployeeProfile) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Für diesen Mitarbeiter existiert bereits ein Dipera-Zugang.",
        },
        { status: 409 }
      );
    }

    /*
     * 3. Bestätigten Supabase-Auth-Benutzer erstellen
     *
     * email_confirm: true verhindert die zusätzliche
     * Bestätigungsmail.
     */
    const { data: createdUserData, error: createUserError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          registration_type: "employee_invite",
          invite_code: inviteCode,
        },
      });

    if (createUserError || !createdUserData.user) {
      console.error(
        "EMPLOYEE AUTH USER CREATE ERROR:",
        createUserError
      );

      const errorMessage =
        createUserError?.message?.toLowerCase() ?? "";

      if (
        errorMessage.includes("already") ||
        errorMessage.includes("registered") ||
        errorMessage.includes("exists")
      ) {
        return NextResponse.json(
          {
            success: false,
            code: "EMAIL_ALREADY_EXISTS",
            message:
              "Für diese E-Mail-Adresse existiert bereits ein Dipera-Konto. Bitte verwende eine andere E-Mail-Adresse oder melde dich mit deinem bestehenden Konto an.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message:
            createUserError?.message ??
            "Der Mitarbeiter-Zugang konnte nicht erstellt werden.",
        },
        { status: 500 }
      );
    }

    createdUserId = createdUserData.user.id;

    /*
     * 4. Dipera-Rolle bestimmen
     */
    const assignedRole =
      employee.role === "Admin"
        ? "admin"
        : employee.role === "Owner"
          ? "owner"
          : "employee";

    /*
     * 5. Profil mit dem vorbereiteten Mitarbeiter verknüpfen
     */
    const { error: profileInsertError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: createdUserId,
        role: assignedRole,
        employee_id: invitation.employee_id,
        business_id: invitation.business_id,
      });

    if (profileInsertError) {
      console.error(
        "EMPLOYEE PROFILE INSERT ERROR:",
        profileInsertError
      );

      /*
       * Auth-Benutzer wieder entfernen, damit kein unvollständiges
       * Konto zurückbleibt.
       */
      await supabaseAdmin.auth.admin.deleteUser(createdUserId);
      createdUserId = null;

      return NextResponse.json(
        {
          success: false,
          message:
            "Das Konto wurde erstellt, konnte aber nicht mit dem Mitarbeiterprofil verbunden werden. Bitte versuche es erneut.",
        },
        { status: 500 }
      );
    }

    /*
     * 6. Einladung als verwendet markieren
     *
     * Die zusätzliche Bedingung used_at IS NULL verhindert,
     * dass eine parallel bereits verwendete Einladung überschrieben wird.
     */
    const { data: consumedInvite, error: inviteUpdateError } =
      await supabaseAdmin
        .from("employee_invites")
        .update({
          used_at: new Date().toISOString(),
        })
        .eq("id", invitation.id)
        .is("used_at", null)
        .select("id")
        .maybeSingle();

    if (inviteUpdateError || !consumedInvite) {
      console.error(
        "EMPLOYEE INVITATION UPDATE ERROR:",
        inviteUpdateError
      );

      await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", createdUserId);

      await supabaseAdmin.auth.admin.deleteUser(createdUserId);
      createdUserId = null;

      return NextResponse.json(
        {
          success: false,
          message:
            "Die Einladung konnte nicht abgeschlossen werden. Bitte versuche es erneut.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Dein Mitarbeiter-Zugang wurde erfolgreich erstellt.",
      role: assignedRole,
    });
  } catch (error) {
    console.error("EMPLOYEE REGISTER API ERROR:", error);

    /*
     * Sicherheitsnetz für unerwartete Fehler nach der Benutzererstellung.
     */
    if (createdUserId) {
      await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", createdUserId);

      await supabaseAdmin.auth.admin.deleteUser(createdUserId);
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Bei der Registrierung ist ein unerwarteter Fehler aufgetreten. Bitte versuche es erneut.",
      },
      { status: 500 }
    );
  }
}