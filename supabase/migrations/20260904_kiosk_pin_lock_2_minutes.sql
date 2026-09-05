create or replace function public.record_kiosk_pin_attempt(
  p_business_id uuid,
  p_actor_user_id uuid,
  p_success boolean
)
returns table(
  is_locked boolean,
  retry_after_seconds integer,
  failed_attempts integer
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_failed integer := 0;
  v_window_start timestamptz;
  v_locked_until timestamptz;
  v_now timestamptz := now();
begin
  insert into public.kiosk_pin_rate_limits (
    business_id,
    actor_user_id,
    failed_attempts,
    updated_at
  )
  values (
    p_business_id,
    p_actor_user_id,
    0,
    v_now
  )
  on conflict (business_id, actor_user_id) do nothing;

  select
    k.failed_attempts,
    k.window_started_at,
    k.locked_until
  into
    v_failed,
    v_window_start,
    v_locked_until
  from public.kiosk_pin_rate_limits k
  where k.business_id = p_business_id
    and k.actor_user_id = p_actor_user_id
  for update;

  if p_success then
    update public.kiosk_pin_rate_limits k
    set
      failed_attempts = 0,
      window_started_at = null,
      locked_until = null,
      updated_at = v_now
    where k.business_id = p_business_id
      and k.actor_user_id = p_actor_user_id;

    return query select false, 0, 0;
    return;
  end if;

  if v_locked_until is not null
     and v_locked_until > v_now then
    return query
    select
      true,
      greatest(
        1,
        ceil(extract(epoch from (v_locked_until - v_now)))::integer
      ),
      v_failed;
    return;
  end if;

  if v_window_start is null
     or v_window_start < v_now - interval '5 minutes' then
    v_failed := 1;
    v_window_start := v_now;
  else
    v_failed := v_failed + 1;
  end if;

  if v_failed >= 5 then
    v_locked_until := v_now + interval '2 minutes';
  else
    v_locked_until := null;
  end if;

  update public.kiosk_pin_rate_limits k
  set
    failed_attempts = v_failed,
    window_started_at = v_window_start,
    locked_until = v_locked_until,
    updated_at = v_now
  where k.business_id = p_business_id
    and k.actor_user_id = p_actor_user_id;

  return query
  select
    (v_locked_until is not null and v_locked_until > v_now),
    case
      when v_locked_until is not null and v_locked_until > v_now
      then greatest(
        1,
        ceil(extract(epoch from (v_locked_until - v_now)))::integer
      )
      else 0
    end,
    v_failed;
end;
$function$;
