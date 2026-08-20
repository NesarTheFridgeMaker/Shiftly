import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseServer";

const VALID_ACTIONS = [
  "check_in",
  "break_start",
  "break_end",
  "check_out",
] as const;

type ClockAction = (typeof VALID_ACTIONS)[number];

type KioskClockBody = {
  pin?: unknown;
  action?: unknown;
};

type Profile = {
  id: string;
  role: string;
  business_id: string | null;
};

function jsonError(
  status: number,
  code: string,
  message: string
) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
      },
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

function isClockAction(value: unknown): value is ClockAction {
  return (
    typeof value === "string" &&
    VALID_ACTIONS.includes(value as ClockAction)
  );
}

export async function POST(request: NextRequest) {
  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return jsonError(
      401,
      "AUTH_TOKEN_MISSING",
      "Kein gültiger Admin-Zugriff vorhanden."
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (userError || !user) {
    console.error("KIOSK AUTH ERROR:", userError);

    return jsonError(
      401,
      "AUTH_INVALID",
      "Die Admin-Anmeldung ist nicht mehr gültig."
    );
  }

  let body: KioskClockBody;

  try {
    body = (await request.json()) as KioskClockBody;
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

  if (!isClockAction(body.action)) {
    return jsonError(
      400,
      "INVALID_ACTION",
      "Die gewünschte Stempelaktion ist ungültig."
    );
  }

  const { data: profileData, error: profileError } =
    await supabaseAdmin
      .from("profiles")
      .select("id, role, business_id")
      .eq("id", user.id)
      .single();

  if (profileError || !profileData) {
    console.error("KIOSK PROFILE ERROR:", profileError);

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
      "Der Kiosk kann nur von einem Admin oder Owner verwendet werden."
    );
  }

  const { data: businessData, error: businessError } =
    await supabaseAdmin
      .from("businesses")
      .select("id, status")
      .eq("id", profile.business_id)
      .single();

  if (businessError || !businessData) {
    console.error("KIOSK BUSINESS ERROR:", businessError);

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
    console.error("KIOSK EMPLOYEE LOOKUP ERROR:", employeeError);

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

  const { data: clockResult, error: clockError } =
    await supabaseAdmin.rpc("clock_employee_action", {
      p_employee_id: employeeData.id,
      p_business_id: employeeData.business_id,
      p_employee_name: employeeData.name,
      p_action: body.action,
      p_source: "terminal",
    });

  if (clockError) {
    console.error("KIOSK CLOCK RPC ERROR:", clockError);

    const isInvalidTransition =
      clockError.message?.includes(
        "INVALID_STATUS_TRANSITION"
      );

    return jsonError(
      isInvalidTransition ? 409 : 500,
      isInvalidTransition
        ? "INVALID_STATUS_TRANSITION"
        : "CLOCK_SAVE_FAILED",
      isInvalidTransition
        ? "Dieser Stempelschritt passt nicht zum aktuellen Mitarbeiterstatus."
        : "Der Stempelschritt konnte nicht gespeichert werden."
    );
  }

  const result = Array.isArray(clockResult)
    ? clockResult[0]
    : clockResult;

  return NextResponse.json({
    success: true,
    entry: {
      id: result?.entry_id ?? null,
      action: body.action,
      createdAt:
        result?.created_at ??
        new Date().toISOString(),
    },
    employee: {
      id: employeeData.id,
      name: employeeData.name,
      status: result?.next_status ?? employeeData.status,
    },
  });
}
