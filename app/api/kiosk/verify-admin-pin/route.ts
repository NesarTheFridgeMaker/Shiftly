import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseServer";

type VerifyAdminPinBody = {
  pin?: unknown;
};

type Profile = {
  id: string;
  role: string;
  business_id: string | null;
  admin_pin: string | null;
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

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
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
    console.error("KIOSK ADMIN PIN AUTH ERROR:", userError);

    return jsonError(
      401,
      "AUTH_INVALID",
      "Die Admin-Anmeldung ist nicht mehr gültig."
    );
  }

  let body: VerifyAdminPinBody;

  try {
    body = (await request.json()) as VerifyAdminPinBody;
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
      "Bitte gib eine gültige 4-stellige Admin-PIN ein."
    );
  }

  const { data: profileData, error: profileError } =
    await supabaseAdmin
      .from("profiles")
      .select("id, role, business_id, admin_pin")
      .eq("id", user.id)
      .single();

  if (profileError || !profileData) {
    console.error("KIOSK ADMIN PIN PROFILE ERROR:", profileError);

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
      "Der Kiosk kann nur von einem Admin oder Owner verlassen werden."
    );
  }

  if (!profile.admin_pin) {
    return jsonError(
      409,
      "ADMIN_PIN_NOT_SET",
      "Für diesen Admin wurde noch keine PIN festgelegt."
    );
  }

  if (!safeEqual(body.pin, profile.admin_pin)) {
    return jsonError(
      403,
      "INVALID_ADMIN_PIN",
      "Falsche PIN."
    );
  }

  return NextResponse.json({
    success: true,
  });
}
