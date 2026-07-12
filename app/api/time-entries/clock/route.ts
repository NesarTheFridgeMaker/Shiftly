import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseServer";
import { calculateDistanceMeters } from "@/lib/location/distance";

const VALID_ACTIONS = [
  "check_in",
  "break_start",
  "break_end",
  "check_out",
] as const;

type ClockAction = (typeof VALID_ACTIONS)[number];

type LocationTrackingMode =
  | "required"
  | "remote_allowed"
  | "disabled";

type ClockRequestBody = {
  action?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  accuracy?: unknown;
  capturedAt?: unknown;
  exceptionReason?: unknown;
};

type Profile = {
  id: string;
  role: string;
  business_id: string | null;
  employee_id: string | null;
};

type Employee = {
  id: string;
  business_id: string;
  name: string;
  status: string;
  account_status: string | null;
  location_tracking_mode: LocationTrackingMode | null;
  location_tracking_note: string | null;
};

type BusinessLocation = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
};

type NearestLocationResult = {
  location: BusinessLocation;
  distanceMeters: number;
};

const MAX_GPS_ACCURACY_METERS = 100;
const MAX_POSITION_AGE_MILLISECONDS = 2 * 60 * 1000;
const MAX_FUTURE_OFFSET_MILLISECONDS = 30 * 1000;

function jsonError(
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>
) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
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

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function getNextEmployeeStatus(
  currentStatus: string,
  action: ClockAction
) {
  if (
    currentStatus === "not_checked_in" &&
    action === "check_in"
  ) {
    return "checked_in";
  }

  if (
    currentStatus === "checked_in" &&
    action === "break_start"
  ) {
    return "on_break";
  }

  if (
    currentStatus === "checked_in" &&
    action === "check_out"
  ) {
    return "not_checked_in";
  }

  if (
    currentStatus === "on_break" &&
    action === "break_end"
  ) {
    return "checked_in";
  }

  return null;
}

function findNearestLocation(
  latitude: number,
  longitude: number,
  locations: BusinessLocation[]
): NearestLocationResult | null {
  if (locations.length === 0) {
    return null;
  }

  return locations.reduce<NearestLocationResult | null>(
    (nearest, location) => {
      const distanceMeters = calculateDistanceMeters(
        latitude,
        longitude,
        location.latitude,
        location.longitude
      );

      if (
        !nearest ||
        distanceMeters < nearest.distanceMeters
      ) {
        return {
          location,
          distanceMeters,
        };
      }

      return nearest;
    },
    null
  );
}

export async function POST(request: NextRequest) {
  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return jsonError(
      401,
      "AUTH_TOKEN_MISSING",
      "Du bist nicht angemeldet."
    );
  }

  /*
   * getUser(token) validiert das Access-Token beim
   * Supabase-Auth-Server. Wir vertrauen nicht auf eine
   * employee_id oder business_id aus dem Request.
   */
  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (userError || !user) {
    console.error("CLOCK AUTH ERROR:", userError);

    return jsonError(
      401,
      "AUTH_INVALID",
      "Deine Anmeldung ist nicht mehr gültig."
    );
  }

  let body: ClockRequestBody;

  try {
    body = (await request.json()) as ClockRequestBody;
  } catch {
    return jsonError(
      400,
      "INVALID_JSON",
      "Die übermittelten Daten sind ungültig."
    );
  }

  if (!isClockAction(body.action)) {
    return jsonError(
      400,
      "INVALID_ACTION",
      "Die gewünschte Stempelaktion ist ungültig."
    );
  }

  const action = body.action;

  const { data: profileData, error: profileError } =
    await supabaseAdmin
      .from("profiles")
      .select("id, role, business_id, employee_id")
      .eq("id", user.id)
      .single();

  if (profileError || !profileData) {
    console.error("CLOCK PROFILE ERROR:", profileError);

    return jsonError(
      403,
      "PROFILE_NOT_FOUND",
      "Dein Benutzerprofil konnte nicht geladen werden."
    );
  }

  const profile = profileData as Profile;

  if (
    profile.role !== "employee" ||
    !profile.employee_id ||
    !profile.business_id
  ) {
    return jsonError(
      403,
      "EMPLOYEE_ACCESS_REQUIRED",
      "Diese Stempelfunktion ist nur für Mitarbeiter verfügbar."
    );
  }

  const { data: businessData, error: businessError } =
    await supabaseAdmin
      .from("businesses")
      .select("id, status")
      .eq("id", profile.business_id)
      .single();

  if (businessError || !businessData) {
    console.error("CLOCK BUSINESS ERROR:", businessError);

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
    .select(
      `
        id,
        business_id,
        name,
        status,
        account_status,
        location_tracking_mode,
        location_tracking_note
      `
    )
    .eq("id", profile.employee_id)
    .eq("business_id", profile.business_id)
    .single();

if (employeeError || !employeeData) {
  console.error("CLOCK EMPLOYEE ERROR:", employeeError);

  return jsonError(
    403,
    "EMPLOYEE_NOT_FOUND",
    "Dein Mitarbeiterkonto konnte nicht geladen werden."
  );
}

const employee: Employee = {
  id: employeeData.id,
  business_id: employeeData.business_id,
  name: employeeData.name,
  status: employeeData.status,
  account_status: employeeData.account_status,
  location_tracking_mode:
    employeeData.location_tracking_mode as LocationTrackingMode | null,
  location_tracking_note:
    employeeData.location_tracking_note,
};

  const expectedNextStatus = getNextEmployeeStatus(
    employee.status,
    action
  );

  if (!expectedNextStatus) {
    return jsonError(
      409,
      "INVALID_STATUS_TRANSITION",
      "Diese Stempelaktion passt nicht zu deinem aktuellen Status.",
      {
        currentStatus: employee.status,
        attemptedAction: action,
      }
    );
  }

  const trackingMode =
    employee.location_tracking_mode ?? "required";

  let latitude: number | null = null;
  let longitude: number | null = null;
  let accuracy: number | null = null;
  let capturedAt: string | null = null;

  let locationId: string | null = null;
  let locationName: string | null = null;
  let distanceMeters: number | null = null;
  let locationVerified = false;

  let locationCheckStatus:
    | "verified"
    | "outside_allowed"
    | "disabled" = "disabled";

  let locationExceptionReason: string | null = null;

  if (trackingMode !== "disabled") {
    if (
      !isFiniteNumber(body.latitude) ||
      body.latitude < -90 ||
      body.latitude > 90
    ) {
      return jsonError(
        422,
        "INVALID_LATITUDE",
        "Der Breitengrad der Standortmessung ist ungültig."
      );
    }

    if (
      !isFiniteNumber(body.longitude) ||
      body.longitude < -180 ||
      body.longitude > 180
    ) {
      return jsonError(
        422,
        "INVALID_LONGITUDE",
        "Der Längengrad der Standortmessung ist ungültig."
      );
    }

    if (
      !isFiniteNumber(body.accuracy) ||
      body.accuracy < 0
    ) {
      return jsonError(
        422,
        "INVALID_ACCURACY",
        "Die GPS-Genauigkeit konnte nicht bestimmt werden."
      );
    }

    if (body.accuracy > MAX_GPS_ACCURACY_METERS) {
      return jsonError(
        422,
        "GPS_TOO_INACCURATE",
        "Dein Standort ist momentan zu ungenau. Warte kurz und versuche es erneut.",
        {
          accuracyMeters: Math.round(body.accuracy),
          maximumAccuracyMeters:
            MAX_GPS_ACCURACY_METERS,
        }
      );
    }

    if (
      typeof body.capturedAt !== "string" ||
      !body.capturedAt.trim()
    ) {
      return jsonError(
        422,
        "POSITION_TIMESTAMP_MISSING",
        "Der Zeitpunkt der Standortmessung fehlt."
      );
    }

    const capturedDate = new Date(body.capturedAt);

    if (Number.isNaN(capturedDate.getTime())) {
      return jsonError(
        422,
        "POSITION_TIMESTAMP_INVALID",
        "Der Zeitpunkt der Standortmessung ist ungültig."
      );
    }

    const positionAge =
      Date.now() - capturedDate.getTime();

    if (
      positionAge >
      MAX_POSITION_AGE_MILLISECONDS
    ) {
      return jsonError(
        422,
        "POSITION_TOO_OLD",
        "Die Standortmessung ist zu alt. Bitte ermittle deinen Standort erneut."
      );
    }

    if (
      positionAge <
      -MAX_FUTURE_OFFSET_MILLISECONDS
    ) {
      return jsonError(
        422,
        "POSITION_FROM_FUTURE",
        "Der Zeitpunkt deines Geräts scheint nicht korrekt zu sein."
      );
    }

    latitude = body.latitude;
    longitude = body.longitude;
    accuracy = body.accuracy;
    capturedAt = capturedDate.toISOString();

    const { data: locationsData, error: locationsError } =
      await supabaseAdmin
        .from("business_locations")
        .select(
          "id, name, latitude, longitude, radius_meters"
        )
        .eq("business_id", employee.business_id)
        .eq("is_active", true);

    if (locationsError) {
      console.error(
        "CLOCK LOCATIONS ERROR:",
        locationsError
      );

      return jsonError(
        500,
        "LOCATIONS_LOAD_FAILED",
        "Die Betriebsstandorte konnten nicht geprüft werden."
      );
    }

    const locations =
      (locationsData ?? []) as BusinessLocation[];

    const nearest = findNearestLocation(
      latitude,
      longitude,
      locations
    );

    if (nearest) {
      locationId = nearest.location.id;
      locationName = nearest.location.name;
      distanceMeters = nearest.distanceMeters;

      locationVerified =
        nearest.distanceMeters <=
        nearest.location.radius_meters;
    }

    if (locationVerified) {
      locationCheckStatus = "verified";
    } else if (trackingMode === "required") {
      if (!nearest) {
        return jsonError(
          403,
          "NO_ACTIVE_LOCATION",
          "Für deinen Betrieb ist kein aktiver Stempelstandort eingerichtet."
        );
      }

      return jsonError(
        403,
        "OUTSIDE_ALLOWED_RADIUS",
        "Du befindest dich außerhalb des erlaubten Betriebsstandorts.",
        {
          locationId: nearest.location.id,
          locationName: nearest.location.name,
          distanceMeters: Math.round(
            nearest.distanceMeters
          ),
          radiusMeters:
            nearest.location.radius_meters,
          accuracyMeters: Math.round(accuracy),
        }
      );
    } else {
      locationCheckStatus = "outside_allowed";

      const suppliedReason =
        typeof body.exceptionReason === "string"
          ? body.exceptionReason.trim()
          : "";

      locationExceptionReason =
        suppliedReason ||
        employee.location_tracking_note ||
        "Mobiles Arbeiten erlaubt";
    }
  } else {
    locationCheckStatus = "disabled";
    locationExceptionReason =
      employee.location_tracking_note ||
      "Standortprüfung deaktiviert";
  }

  /*
   * Die Datenbankfunktion sperrt den Mitarbeiterdatensatz,
   * prüft den Status erneut und führt Insert + Statusupdate
   * in einer einzigen Datenbanktransaktion aus.
   */
  const { data: clockResult, error: clockError } =
    await supabaseAdmin.rpc("clock_employee_action", {
      p_employee_id: employee.id,
      p_business_id: employee.business_id,
      p_employee_name: employee.name,
      p_action: action,

      p_location_id: locationId,
      p_latitude: latitude,
      p_longitude: longitude,
      p_accuracy: accuracy,
      p_distance: distanceMeters,
      p_location_verified: locationVerified,
      p_location_captured_at: capturedAt,

      p_source: "employee_web",
      p_location_check_status: locationCheckStatus,
      p_location_exception_reason:
        locationExceptionReason,
    });

  if (clockError) {
    console.error("CLOCK RPC ERROR:", clockError);

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
        ? "Dein Status wurde bereits geändert. Lade die Seite neu und versuche es erneut."
        : "Die Stempelung konnte nicht gespeichert werden."
    );
  }

  const result = Array.isArray(clockResult)
    ? clockResult[0]
    : clockResult;

  return NextResponse.json({
    success: true,

    entry: {
      id: result?.entry_id ?? null,
      action,
      createdAt:
        result?.created_at ??
        new Date().toISOString(),
    },

    employee: {
      id: employee.id,
      status:
        result?.next_status ??
        expectedNextStatus,
    },

    location: {
      trackingMode,
      checkStatus: locationCheckStatus,
      verified: locationVerified,
      locationId,
      locationName,
      distanceMeters:
        distanceMeters === null
          ? null
          : Math.round(distanceMeters),
      accuracyMeters:
        accuracy === null
          ? null
          : Math.round(accuracy),
      capturedAt,
    },
  });
}