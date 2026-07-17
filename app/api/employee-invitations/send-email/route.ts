import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resend } from "@/lib/resend";
import EmployeeInviteEmail from "@/app/emails/EmployeeInviteEmail";

type SendInviteBody = {
  employeeId?: string;
  email?: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }

    const accessToken = authorization.slice("Bearer ".length);
    const body = (await request.json()) as SendInviteBody;
    const employeeId = body.employeeId?.trim();
    const email = body.email?.trim().toLowerCase();

    if (!employeeId || !email) {
      return NextResponse.json(
        { error: "Mitarbeiter und E-Mail-Adresse sind erforderlich." },
        { status: 400 },
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Bitte gib eine gültige E-Mail-Adresse ein." },
        { status: 400 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;

    if (!supabaseUrl || !supabaseAnonKey || !fromEmail) {
      console.error("Fehlende Server-Konfiguration für Einladungsmails.");
      return NextResponse.json(
        {
          error: "Der E-Mail-Versand ist noch nicht vollständig konfiguriert.",
        },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        { error: "Deine Anmeldung ist abgelaufen." },
        { status: 401 },
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("business_id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.business_id) {
      return NextResponse.json(
        { error: "Dein Betriebsprofil konnte nicht geladen werden." },
        { status: 403 },
      );
    }

    if (profile.role !== "owner" && profile.role !== "admin") {
      return NextResponse.json(
        { error: "Du darfst keine Mitarbeitereinladungen versenden." },
        { status: 403 },
      );
    }

    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, name, business_id")
      .eq("id", employeeId)
      .eq("business_id", profile.business_id)
      .single();

    if (employeeError || !employee) {
      return NextResponse.json(
        { error: "Der Mitarbeiter wurde nicht gefunden." },
        { status: 404 },
      );
    }

    const { data: invite, error: inviteError } = await supabase
      .from("employee_invites")
      .select("invite_code, used_at")
      .eq("employee_id", employee.id)
      .eq("business_id", profile.business_id)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: "Für diesen Mitarbeiter wurde keine Einladung gefunden." },
        { status: 404 },
      );
    }

    if (invite.used_at) {
      return NextResponse.json(
        { error: "Diese Einladung wurde bereits verwendet." },
        { status: 409 },
      );
    }

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("name")
      .eq("id", profile.business_id)
      .single();

    if (businessError || !business) {
      return NextResponse.json(
        { error: "Der Betriebsname konnte nicht geladen werden." },
        { status: 500 },
      );
    }

    const appUrl = (
      process.env.NEXT_PUBLIC_APP_URL || "https://app.dipera.de"
    ).replace(/\/$/, "");

    const inviteUrl = `${appUrl}/employee-register?invite=${encodeURIComponent(
      invite.invite_code,
    )}`;

    const { data, error } = await resend.emails.send({
      from: `Dipera <${fromEmail}>`,
      to: email,
      subject: `${business.name} lädt dich zu Dipera ein`,
      react: EmployeeInviteEmail({
        employeeName: employee.name,
        businessName: business.name,
        inviteCode: invite.invite_code,
        inviteUrl,
      }),
    });

    if (error) {
      console.error("RESEND EMPLOYEE INVITE ERROR:", error);
      return NextResponse.json(
        {
          error:
            error.message || "Die Einladung konnte nicht versendet werden.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      emailId: data?.id,
    });
  } catch (error) {
    console.error("SEND EMPLOYEE INVITE ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Die Einladung konnte nicht versendet werden.",
      },
      { status: 500 },
    );
  }
}
