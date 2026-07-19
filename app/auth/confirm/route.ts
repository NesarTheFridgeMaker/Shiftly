import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createSupabaseServerAuthClient } from "@/lib/supabaseServerAuth";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  const tokenHash =
    requestUrl.searchParams.get("token_hash");

  const type =
    requestUrl.searchParams.get("type") as
      | EmailOtpType
      | null;

  const next =
    requestUrl.searchParams.get("next") ??
    "/employee-setup";

  if (!tokenHash || !type) {
    return NextResponse.redirect(
      new URL(
        "/auth/callback?error=missing_confirmation_data",
        requestUrl.origin,
      ),
    );
  }

  const supabase =
    await createSupabaseServerAuthClient();

  const { data, error } =
    await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

  if (error || !data.user) {
    console.error(
      "EMPLOYEE EMAIL CONFIRMATION ERROR:",
      error,
    );

    return NextResponse.redirect(
      new URL(
        `/auth/callback?error=${encodeURIComponent(
          error?.message ??
            "confirmation_failed",
        )}`,
        requestUrl.origin,
      ),
    );
  }

  const metadata =
    data.user.user_metadata ?? {};

  const isEmployeeRegistration =
    metadata.registration_type ===
      "employee_invite" ||
    Boolean(metadata.invite_code) ||
    Boolean(metadata.invite_id) ||
    Boolean(metadata.employee_id);

  if (isEmployeeRegistration) {
    return NextResponse.redirect(
      new URL("/employee-setup", requestUrl.origin),
    );
  }

  return NextResponse.redirect(
    new URL(next, requestUrl.origin),
  );
}