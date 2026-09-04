import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PayrollSystem = "datev_lug" | "datev_lodas";

type RouteContext = {
  params: Promise<{
    payrollPeriodId: string;
  }>;
};

type ProfileRow = {
  business_id: string | null;
  role: string | null;
};

type PayrollPeriodRow = {
  id: string;
  business_id: string;
  status: string | null;
};

type DatevValidationRow = {
  is_valid: boolean;
  error_code: string | null;
  message: string | null;
  employee_id: string | null;
  source_id: string | null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      ...(details !== undefined ? { details } : {}),
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function getBearerToken(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);

  return match?.[1]?.trim() || null;
}

function getPayrollSystem(request: NextRequest): PayrollSystem | null {
  const value = request.nextUrl.searchParams.get("system");

  if (value === "datev_lug" || value === "datev_lodas") {
    return value;
  }

  return null;
}

function getGenerateRpcName(payrollSystem: PayrollSystem) {
  switch (payrollSystem) {
    case "datev_lug":
      return "generate_datev_lug_export";

    case "datev_lodas":
      return "generate_datev_lodas_export";
  }
}

async function authorizeAdminForPayrollPeriod(
  request: NextRequest,
  payrollPeriodId: string,
): Promise<
  | {
      ok: true;
      userId: string;
      businessId: string;
      payrollPeriod: PayrollPeriodRow;
    }
  | {
      ok: false;
      response: NextResponse;
    }
> {
  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return {
      ok: false,
      response: jsonError("Nicht authentifiziert.", 401),
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (userError || !user) {
    return {
      ok: false,
      response: jsonError("Ungültige oder abgelaufene Sitzung.", 401),
    };
  }

  const { data: profileData, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("business_id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("DATEV profile lookup failed:", profileError);

    return {
      ok: false,
      response: jsonError(
        "Benutzerprofil konnte nicht geprüft werden.",
        500,
      ),
    };
  }

  const profile = profileData as ProfileRow | null;

  if (
    !profile?.business_id ||
    !profile.role ||
    !["admin", "owner"].includes(profile.role)
  ) {
    return {
      ok: false,
      response: jsonError("Keine Berechtigung für DATEV-Exporte.", 403),
    };
  }

  const { data: payrollPeriodData, error: payrollPeriodError } =
    await supabaseAdmin
      .from("payroll_periods")
      .select("id, business_id, status")
      .eq("id", payrollPeriodId)
      .maybeSingle();

  if (payrollPeriodError) {
    console.error(
      "DATEV payroll period lookup failed:",
      payrollPeriodError,
    );

    return {
      ok: false,
      response: jsonError(
        "Abrechnungszeitraum konnte nicht geprüft werden.",
        500,
      ),
    };
  }

  const payrollPeriod = payrollPeriodData as PayrollPeriodRow | null;

  if (!payrollPeriod) {
    return {
      ok: false,
      response: jsonError(
        "Abrechnungszeitraum nicht gefunden.",
        404,
      ),
    };
  }

  if (payrollPeriod.business_id !== profile.business_id) {
    return {
      ok: false,
      response: jsonError(
        "Kein Zugriff auf diesen Abrechnungszeitraum.",
        403,
      ),
    };
  }

  return {
    ok: true,
    userId: user.id,
    businessId: profile.business_id,
    payrollPeriod,
  };
}

async function runDatevPreflight(
  payrollPeriodId: string,
  payrollSystem: PayrollSystem,
) {
  const { data, error } = await supabaseAdmin.rpc(
    "validate_datev_payroll_export",
    {
      p_payroll_period_id: payrollPeriodId,
      p_payroll_system: payrollSystem,
    },
  );

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as DatevValidationRow[];

  return {
    rows,
    isValid: rows.length > 0 && rows.every((row) => row.is_valid),
  };
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  const { payrollPeriodId } = await context.params;

  if (!UUID_RE.test(payrollPeriodId)) {
    return jsonError("Ungültige Abrechnungszeitraum-ID.", 400);
  }

  const payrollSystem = getPayrollSystem(request);

  if (!payrollSystem) {
    return jsonError(
      "Ungültiges oder fehlendes DATEV-System. Erlaubt sind datev_lug und datev_lodas.",
      400,
    );
  }

  const auth = await authorizeAdminForPayrollPeriod(
    request,
    payrollPeriodId,
  );

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const preflight = await runDatevPreflight(
      payrollPeriodId,
      payrollSystem,
    );

    return NextResponse.json(
      {
        ok: true,
        payrollSystem,
        payrollPeriodId,
        periodStatus: auth.payrollPeriod.status,
        isValid: preflight.isValid,
        results: preflight.rows,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("DATEV preflight failed:", error);

    return jsonError(
      "DATEV-Prüfung konnte nicht durchgeführt werden.",
      500,
    );
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  const { payrollPeriodId } = await context.params;

  if (!UUID_RE.test(payrollPeriodId)) {
    return jsonError("Ungültige Abrechnungszeitraum-ID.", 400);
  }

  const payrollSystem = getPayrollSystem(request);

  if (!payrollSystem) {
    return jsonError(
      "Ungültiges oder fehlendes DATEV-System. Erlaubt sind datev_lug und datev_lodas.",
      400,
    );
  }

  const auth = await authorizeAdminForPayrollPeriod(
    request,
    payrollPeriodId,
  );

  if (!auth.ok) {
    return auth.response;
  }

  if (auth.payrollPeriod.status !== "closed") {
    return jsonError(
      "Ein DATEV-Export kann nur für einen geschlossenen Abrechnungszeitraum erstellt werden.",
      409,
    );
  }

  try {
    const preflight = await runDatevPreflight(
      payrollPeriodId,
      payrollSystem,
    );

    if (!preflight.isValid) {
      return NextResponse.json(
        {
          ok: false,
          error: "DATEV-Prüfung fehlgeschlagen.",
          payrollSystem,
          payrollPeriodId,
          isValid: false,
          results: preflight.rows,
        },
        {
          status: 422,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const rpcName = getGenerateRpcName(payrollSystem);

    const { data: exportId, error: generateError } =
      await supabaseAdmin.rpc(rpcName, {
        p_payroll_period_id: payrollPeriodId,
        p_generated_by: auth.userId,
      });

    if (generateError) {
      console.error(
        `DATEV ${payrollSystem} export generation failed:`,
        generateError,
      );

      return jsonError(
        "DATEV-Export konnte nicht erstellt werden.",
        500,
      );
    }

    if (typeof exportId !== "string" || !UUID_RE.test(exportId)) {
      console.error(
        "DATEV export generation returned invalid UUID:",
        exportId,
      );

      return jsonError(
        "DATEV-Export wurde ohne gültige Export-ID erzeugt.",
        500,
      );
    }

    return NextResponse.json(
      {
        ok: true,
        payrollSystem,
        payrollPeriodId,
        exportId,
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("DATEV export request failed:", error);

    return jsonError(
      "DATEV-Export konnte nicht verarbeitet werden.",
      500,
    );
  }
}