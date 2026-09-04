"use server";

import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseServer";

type Profile = {
  id: string;
  role: string;
  business_id: string | null;
};

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json(
    {
      success: false,
      error: { code, message },
    },
    { status }
  );
}

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();

  return token || null;
}

export async function GET(request: NextRequest) {
  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return jsonError(
      401,
      "AUTH_TOKEN_MISSING",
      "Keine gültige Terminal-Anmeldung vorhanden."
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (userError || !user) {
    console.error("KIOSK STATUS AUTH ERROR:", userError);

    return jsonError(
      401,
      "AUTH_INVALID",
      "Die Terminal-Anmeldung ist nicht mehr gültig."
    );
  }

  const { data: profileData, error: profileError } =
    await supabaseAdmin
      .from("profiles")
      .select("id, role, business_id")
      .eq("id", user.id)
      .single();

  if (profileError || !profileData) {
    console.error("KIOSK STATUS PROFILE ERROR:", profileError);

    return jsonError(
      403,
      "PROFILE_NOT_FOUND",
      "Das Admin-Profil konnte nicht geladen werden."
    );
  }

  const profile = profileData as Profile;

  if (
    !["admin", "owner"].includes(profile.role) ||
    !profile.business_id
  ) {
    return jsonError(
      403,
      "ADMIN_ACCESS_REQUIRED",
      "Das Terminal kann nur von einem Admin oder Owner verwendet werden."
    );
  }

  const { data: businessData, error: businessError } =
    await supabaseAdmin
      .from("businesses")
      .select("id, name, status")
      .eq("id", profile.business_id)
      .single();

  if (businessError || !businessData) {
    console.error("KIOSK STATUS BUSINESS ERROR:", businessError);

    return jsonError(
      403,
      "BUSINESS_NOT_FOUND",
      "Der zugehörige Betrieb konnte nicht geladen werden."
    );
  }

  if (businessData.status === "suspended") {
    return jsonError(
      403,
      "BUSINESS_SUSPENDED",
      "Die Zeiterfassung dieses Betriebs ist momentan gesperrt."
    );
  }

  const { data: employees, error: employeesError } =
    await supabaseAdmin
      .from("employees")
      .select("id, name, status")
      .eq("business_id", profile.business_id)
      .eq("account_status", "active")
      .order("name", { ascending: true });

  if (employeesError) {
    console.error("KIOSK STATUS EMPLOYEES ERROR:", employeesError);

    return jsonError(
      500,
      "EMPLOYEES_LOAD_FAILED",
      "Der Teamstatus konnte nicht geladen werden."
    );
  }

  const team = (employees || []).map((employee) => ({
    id: employee.id,
    name: employee.name,
    status: employee.status,
  }));

  const working = team.filter(
    (employee) => employee.status === "checked_in"
  );

  const onBreak = team.filter(
    (employee) => employee.status === "on_break"
  );

  const absent = team.filter(
    (employee) =>
      employee.status !== "checked_in" &&
      employee.status !== "on_break"
  );

  return NextResponse.json({
    success: true,
    business: {
      id: businessData.id,
      name: businessData.name,
    },
    counts: {
      total: team.length,
      working: working.length,
      onBreak: onBreak.length,
      absent: absent.length,
    },
    working,
    onBreak,
    absent,
  });
}
