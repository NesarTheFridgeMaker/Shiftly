import { supabaseAdmin } from "@/lib/supabaseServer";

type RateLimitState = {
  isLocked: boolean;
  retryAfterSeconds: number;
  failedAttempts: number;
};

function rowOf(data: unknown) {
  if (Array.isArray(data)) return data[0] ?? null;
  return data && typeof data === "object" ? data : null;
}

export async function checkKioskPinRateLimit(
  businessId: string,
  actorUserId: string
): Promise<RateLimitState> {
  const { data, error } = await supabaseAdmin.rpc(
    "check_kiosk_pin_rate_limit",
    {
      p_business_id: businessId,
      p_actor_user_id: actorUserId,
    }
  );

  if (error) throw error;

  const row = rowOf(data) as Record<string, unknown> | null;

  return {
    isLocked: Boolean(row?.is_locked),
    retryAfterSeconds: Number(row?.retry_after_seconds ?? 0),
    failedAttempts: Number(row?.failed_attempts ?? 0),
  };
}

export async function recordKioskPinAttempt(
  businessId: string,
  actorUserId: string,
  success: boolean
): Promise<RateLimitState> {
  const { data, error } = await supabaseAdmin.rpc(
    "record_kiosk_pin_attempt",
    {
      p_business_id: businessId,
      p_actor_user_id: actorUserId,
      p_success: success,
    }
  );

  if (error) throw error;

  const row = rowOf(data) as Record<string, unknown> | null;

  return {
    isLocked: Boolean(row?.is_locked),
    retryAfterSeconds: Number(row?.retry_after_seconds ?? 0),
    failedAttempts: Number(row?.failed_attempts ?? 0),
  };
}
