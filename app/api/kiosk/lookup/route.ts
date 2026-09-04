"use server";

import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseServer";

type KioskLookupBody = {
  pin?: unknown;
};

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

function getAllowedActions(status: string) {
  switch (status) {
    case "not_checked_in":
      return ["check_in"];

    case "checked_in":
      return ["break_start", "check_out"];

    case "on_break":
      return ["break_end"];

    default:
      return [];
  }
}

export async function POST(request: NextRequest) {
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
    console.error("KIOSK LOOKUP AUTH ERROR:", userError);

    return jsonError(
      401,
      "AUTH_INVALID",
      "Die Terminal-Anmeldung ist nicht mehr gültig."
    );
  }

  let body: KioskLookupBody;

  try {
    body = (await request.json()) as KioskLookupBody;
  } catch {
    return jsonError(
      400,
      "INVALID_JSON",
      "Die übermittelten Daten sind ungültig."
    );
  }

  if (
    typeof body.pin !== "string" ||
    !/^\d{4}$/.test(body.pin)
  ) {
    return jsonError(
      422,
      "INVALID_PIN_FORMAT",
      "Bitte gib eine gültige 4-stellige Mitarbeiter-PIN ein."
    );
  }

  const { data: profileData, error: profileError } =
    await supabaseAdmin
      .from("profiles")
      .select("id, role, business_id")
      .eq("id", user.id)
      .single();

  if (profileError || !profileData) {
    console.error("KIOSK LOOKUP PROFILE ERROR:", profileError);

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
      .select("id, status")
      .eq("id", profile.business_id)
      .single();

  if (businessError || !businessData) {
    console.error("KIOSK LOOKUP BUSINESS ERROR:", businessError);

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

  const { data: employeeData, error: employeeError } =
    await supabaseAdmin
      .from("employees")
      .select("id, business_id, name, status, account_status")
      .eq("business_id", profile.business_id)
      .eq("pin", body.pin)
      .eq("account_status", "active")
      .maybeSingle();

  if (employeeError) {
    console.error("KIOSK LOOKUP EMPLOYEE ERROR:", employeeError);

    return jsonError(
      500,
      "EMPLOYEE_LOOKUP_FAILED",
      "Die Mitarbeiter-PIN konnte nicht geprüft werden."
    );
  }

  if (!employeeData) {
    return jsonError(
      403,
      "INVALID_EMPLOYEE_PIN",
      "Dieser PIN ist keinem aktiven Mitarbeiter zugeordnet."
    );
  }

  return NextResponse.json({
    success: true,
    employee: {
      id: employeeData.id,
      name: employeeData.name,
      status: employeeData.status,
      allowedActions: getAllowedActions(employeeData.status),
    },
  });
}
