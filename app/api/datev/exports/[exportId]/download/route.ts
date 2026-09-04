import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PayrollSystem = "datev_lug" | "datev_lodas";

type ExportRow = {
  id: string;
  business_id: string;
  file_name: string;
  payload_bytes: string | null;
  encoding_name: string;
  payroll_system: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function decodePostgresBytea(value: string | null): Uint8Array {
  if (!value) {
    throw new Error("DATEV export payload is empty.");
  }

  if (value.startsWith("\\x")) {
    const hex = value.slice(2);

    if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(hex)) {
      throw new Error("DATEV export payload contains invalid bytea hex data.");
    }

    return Uint8Array.from(Buffer.from(hex, "hex"));
  }

  return Uint8Array.from(Buffer.from(value, "base64"));
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[\r\n"]/g, "_");
}

function isSupportedPayrollSystem(value: string): value is PayrollSystem {
  return value === "datev_lug" || value === "datev_lodas";
}

function getDownloadEventReason(payrollSystem: PayrollSystem) {
  switch (payrollSystem) {
    case "datev_lug":
      return "DATEV Lohn & Gehalt export downloaded";

    case "datev_lodas":
      return "DATEV LODAS export downloaded";
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ exportId: string }> },
) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return Response.json(
        { error: "Anmeldung erforderlich." },
        { status: 401 },
      );
    }

    const accessToken = authorization.slice("Bearer ".length).trim();

    if (!accessToken) {
      return Response.json(
        { error: "Anmeldung erforderlich." },
        { status: 401 },
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !user) {
      return Response.json(
        { error: "Die Sitzung ist ungültig oder abgelaufen." },
        { status: 401 },
      );
    }

    const { exportId } = await context.params;

    if (!exportId || !UUID_RE.test(exportId)) {
      return Response.json(
        { error: "Ungültige Export-ID." },
        { status: 400 },
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, business_id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return Response.json(
        { error: "Benutzerprofil konnte nicht geprüft werden." },
        { status: 403 },
      );
    }

    if (!["admin", "owner"].includes(profile.role)) {
      return Response.json(
        { error: "Keine Berechtigung für DATEV-Downloads." },
        { status: 403 },
      );
    }

    const { data: exportRow, error: exportError } = await supabaseAdmin
      .from("datev_payroll_exports")
      .select(
        "id, business_id, file_name, payload_bytes, encoding_name, payroll_system",
      )
      .eq("id", exportId)
      .single<ExportRow>();

    if (exportError || !exportRow) {
      return Response.json(
        { error: "DATEV-Export wurde nicht gefunden." },
        { status: 404 },
      );
    }

    if (exportRow.business_id !== profile.business_id) {
      return Response.json(
        { error: "Keine Berechtigung für diesen DATEV-Export." },
        { status: 403 },
      );
    }

    if (!isSupportedPayrollSystem(exportRow.payroll_system)) {
      return Response.json(
        { error: "Dieser DATEV-Exporttyp wird nicht unterstützt." },
        { status: 409 },
      );
    }

    if (exportRow.encoding_name !== "windows-1252") {
      return Response.json(
        { error: "Der Export besitzt eine unerwartete Zeichenkodierung." },
        { status: 409 },
      );
    }

    const { data: invalidationEvent, error: invalidationError } =
      await supabaseAdmin
        .from("datev_payroll_export_events")
        .select("id")
        .eq("export_id", exportId)
        .eq("event_type", "invalidated_after_reopen")
        .limit(1)
        .maybeSingle();

    if (invalidationError) {
      console.error(
        "DATEV EXPORT INVALIDATION CHECK ERROR:",
        invalidationError,
      );

      return Response.json(
        { error: "Exportstatus konnte nicht geprüft werden." },
        { status: 500 },
      );
    }

    if (invalidationEvent) {
      return Response.json(
        {
          error:
            "Dieser DATEV-Export wurde durch ein Wiederöffnen der Abrechnungsperiode ungültig und kann nicht mehr heruntergeladen werden.",
        },
        { status: 409 },
      );
    }

    let payload: Uint8Array;

    try {
      payload = decodePostgresBytea(exportRow.payload_bytes);
    } catch (error) {
      console.error("DATEV BYTE PAYLOAD ERROR:", error);

      return Response.json(
        { error: "Das gespeicherte DATEV-Dateiartefakt ist ungültig." },
        { status: 500 },
      );
    }

    const { error: downloadEventError } = await supabaseAdmin
      .from("datev_payroll_export_events")
      .insert({
        export_id: exportRow.id,
        business_id: exportRow.business_id,
        event_type: "downloaded",
        event_reason: getDownloadEventReason(exportRow.payroll_system),
        created_by: user.id,
      });

    if (downloadEventError) {
      console.error("DATEV DOWNLOAD EVENT ERROR:", downloadEventError);

      return Response.json(
        { error: "Der DATEV-Download konnte nicht protokolliert werden." },
        { status: 500 },
      );
    }

    const fileName = sanitizeFileName(exportRow.file_name);

    /*
     * Next.js/TypeScript's BodyInit typing does not accept
     * Uint8Array<ArrayBufferLike> directly.
     *
     * Copy into a plain ArrayBuffer without changing
     * a single payload byte.
     */
    const responseBody = Uint8Array.from(payload).buffer;

    return new Response(responseBody, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=windows-1252",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(payload.byteLength),
        "Cache-Control": "private, no-store, max-age=0",
        Pragma: "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("DATEV EXPORT DOWNLOAD ERROR:", error);

    return Response.json(
      { error: "DATEV-Export konnte nicht heruntergeladen werden." },
      { status: 500 },
    );
  }
}