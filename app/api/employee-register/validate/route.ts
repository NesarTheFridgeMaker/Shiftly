import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

type ValidateInviteBody = {
  inviteCode?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ValidateInviteBody;
    const inviteCode = body.inviteCode?.trim().toUpperCase();

    if (!inviteCode) {
      return NextResponse.json(
        {
          success: false,
          message: "Bitte gib einen Einladungscode ein.",
        },
        { status: 400 }
      );
    }

    /*
     * 1. Offene Einladung samt vorbereitetem Mitarbeiter laden
     */
    const { data: invitation, error: invitationError } =
      await supabaseAdmin
        .from("employee_invites")
        .select(`
          id,
          employee_id,
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
        "EMPLOYEE INVITE VALIDATION LOAD ERROR:",
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
     * 2. Prüfen, ob bereits ein Dipera-Profil für diesen
     * vorbereiteten Mitarbeiter existiert
     */
    const { data: existingProfile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("employee_id", invitation.employee_id)
        .maybeSingle();

    if (profileError) {
      console.error(
        "EMPLOYEE INVITE VALIDATION PROFILE ERROR:",
        profileError
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

    if (existingProfile) {
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
     * 3. Die vorbereitete Rolle bestimmen
     */
    const assignedRole =
      employee.role === "Admin"
        ? "admin"
        : employee.role === "Owner"
          ? "owner"
          : "employee";

    /*
     * Keine internen IDs oder Geschäftsdaten an den Browser senden.
     */
    return NextResponse.json({
      success: true,
      message: "Der Einladungscode ist gültig.",
      role: assignedRole,
    });
  } catch (error) {
    console.error(
      "EMPLOYEE INVITE VALIDATION ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Bei der Prüfung des Einladungscodes ist ein unerwarteter Fehler aufgetreten.",
      },
      { status: 500 }
    );
  }
}