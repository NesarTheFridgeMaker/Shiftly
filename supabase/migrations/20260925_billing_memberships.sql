-- Dipera billing membership model
-- Repository migration for database changes already applied to the live database on 2026-09-25.
-- Do not re-run manually against the already-updated live database.

-- ---------------------------------------------------------------------------
-- 1. Stripe billing period start
-- ---------------------------------------------------------------------------

alter table public.businesses
  add column if not exists current_period_start timestamptz;


-- ---------------------------------------------------------------------------
-- 2. Durable employee billing memberships
-- ---------------------------------------------------------------------------

create table if not exists public.employee_billing_memberships (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint employee_billing_memberships_valid_period
    check (ended_at is null or ended_at >= started_at)
);

create unique index if not exists employee_billing_memberships_one_open_per_employee
  on public.employee_billing_memberships(employee_id)
  where ended_at is null;

create index if not exists employee_billing_memberships_business_id_idx
  on public.employee_billing_memberships(business_id);

create index if not exists employee_billing_memberships_employee_id_idx
  on public.employee_billing_memberships(employee_id);

alter table public.employee_billing_memberships enable row level security;


-- ---------------------------------------------------------------------------
-- 3. One Dipera profile per employee
-- ---------------------------------------------------------------------------

create unique index if not exists profiles_employee_id_unique
  on public.profiles(employee_id)
  where employee_id is not null;


-- ---------------------------------------------------------------------------
-- 4. Remove legacy fixed employee-limit enforcement
-- ---------------------------------------------------------------------------

drop trigger if exists trg_enforce_employee_limit
  on public.employees;

drop function if exists public.enforce_employee_limit();


-- ---------------------------------------------------------------------------
-- 5. Invitation completion opens the first billing membership
-- ---------------------------------------------------------------------------

create or replace function public.complete_employee_invite_from_metadata()
returns text
language plpgsql
security definer
set search_path to ''
as $function$
declare
  current_user_id uuid;
  current_user_email text;
  stored_invite_id uuid;
  stored_invite_code text;
  found_invite record;
  assigned_role text;
  assigned_admin_pin text;
  existing_role text;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception
      'Du musst eingeloggt sein, um den Zugang zu aktivieren.';
  end if;

  current_user_email :=
    lower(
      trim(
        coalesce(
          auth.jwt() ->> 'email',
          ''
        )
      )
    );

  /*
   * Wiederholte Ausführung bleibt idempotent.
   *
   * Existiert bereits ein Profil, wurde die Einladung bereits
   * erfolgreich abgeschlossen. Es wird deshalb insbesondere
   * keine zweite Billing-Membership erzeugt.
   */
  select p.role
  into existing_role
  from public.profiles p
  where p.id = current_user_id;

  if found then
    return existing_role;
  end if;

  /*
   * Die E-Mail-Einladung enthält invite_id und invite_code.
   * Der WhatsApp-Flow benötigt mindestens invite_code.
   */
  begin
    stored_invite_id :=
      nullif(
        trim(
          coalesce(
            auth.jwt() -> 'user_metadata' ->> 'invite_id',
            ''
          )
        ),
        ''
      )::uuid;
  exception
    when invalid_text_representation then
      stored_invite_id := null;
  end;

  stored_invite_code :=
    upper(
      trim(
        coalesce(
          auth.jwt() -> 'user_metadata' ->> 'invite_code',
          ''
        )
      )
    );

  if stored_invite_id is null and stored_invite_code = '' then
    raise exception
      'In deinem Konto wurde keine Mitarbeitereinladung gefunden.';
  end if;

  /*
   * Einladung sperren, damit sie nicht parallel von zwei Konten
   * übernommen werden kann.
   */
  select
    ei.id as invite_id,
    ei.employee_id,
    ei.business_id,
    ei.invite_code,
    ei.email as invite_email,
    ei.delivery_method,
    ei.auth_user_id,
    e.role as employee_role,
    e.pin as employee_pin,
    e.account_status
  into found_invite
  from public.employee_invites ei
  join public.employees e
    on e.id = ei.employee_id
   and e.business_id = ei.business_id
  where ei.used_at is null
    and (
      (
        stored_invite_id is not null
        and ei.id = stored_invite_id
      )
      or
      (
        stored_invite_code <> ''
        and upper(trim(ei.invite_code)) = stored_invite_code
      )
    )
  order by
    case
      when stored_invite_id is not null
       and ei.id = stored_invite_id
      then 0
      else 1
    end
  limit 1
  for update of ei;

  if not found then
    raise exception
      'Der Einladungscode ist ungültig oder wurde bereits verwendet.';
  end if;

  if found_invite.account_status <> 'active' then
    raise exception
      'Dieser Mitarbeiter-Zugang ist derzeit deaktiviert.';
  end if;

  if found_invite.delivery_method = 'email' then
    if found_invite.auth_user_id is null then
      raise exception
        'Die E-Mail-Einladung ist nicht vollständig vorbereitet.';
    end if;

    if found_invite.auth_user_id <> current_user_id then
      raise exception
        'Diese Einladung gehört zu einem anderen Benutzerkonto.';
    end if;

    if found_invite.invite_email is not null
       and lower(trim(found_invite.invite_email)) <> current_user_email then
      raise exception
        'Diese Einladung gehört zu einer anderen E-Mail-Adresse.';
    end if;
  end if;

  if found_invite.delivery_method = 'whatsapp' then
    if found_invite.auth_user_id is not null
       and found_invite.auth_user_id <> current_user_id then
      raise exception
        'Diese Einladung wurde bereits von einem anderen Konto übernommen.';
    end if;

    update public.employee_invites
    set
      auth_user_id = current_user_id,
      email = nullif(current_user_email, ''),
      claimed_at = coalesce(claimed_at, now())
    where id = found_invite.invite_id
      and used_at is null
      and (
        auth_user_id is null
        or auth_user_id = current_user_id
      );

    if not found then
      raise exception
        'Diese Einladung wurde bereits von einem anderen Konto übernommen.';
    end if;
  else
    update public.employee_invites
    set claimed_at = coalesce(claimed_at, now())
    where id = found_invite.invite_id
      and used_at is null
      and auth_user_id = current_user_id;

    if not found then
      raise exception
        'Die E-Mail-Einladung konnte nicht bestätigt werden.';
    end if;
  end if;

  assigned_role :=
    case
      when lower(found_invite.employee_role) = 'admin'
        then 'admin'
      when lower(found_invite.employee_role) = 'owner'
        then 'owner'
      else 'employee'
    end;

  assigned_admin_pin :=
    case
      when assigned_role in ('admin', 'owner')
        then found_invite.employee_pin
      else null
    end;

  insert into public.profiles (
    id,
    role,
    employee_id,
    business_id,
    admin_pin
  )
  values (
    current_user_id,
    assigned_role,
    found_invite.employee_id,
    found_invite.business_id,
    assigned_admin_pin
  );

  update public.employee_invites
  set used_at = now()
  where id = found_invite.invite_id
    and used_at is null
    and auth_user_id = current_user_id;

  if not found then
    raise exception
      'Der Einladungscode wurde bereits durch ein anderes Konto verwendet.';
  end if;

  insert into public.employee_billing_memberships (
    business_id,
    employee_id,
    started_at
  )
  values (
    found_invite.business_id,
    found_invite.employee_id,
    now()
  );

  return assigned_role;
end;
$function$;


-- ---------------------------------------------------------------------------
-- 6. Account status changes maintain billing membership intervals
-- ---------------------------------------------------------------------------

create or replace function public.set_employee_account_status(
  p_employee_id uuid,
  p_new_status text
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid;
  v_actor_role text;
  v_actor_business_id uuid;

  v_employee_business_id uuid;
  v_employee_role text;
  v_current_account_status text;
  v_clock_status text;

  v_has_profile boolean;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_new_status not in ('active', 'inactive') then
    raise exception 'INVALID_ACCOUNT_STATUS';
  end if;

  select
    p.role,
    p.business_id
  into
    v_actor_role,
    v_actor_business_id
  from public.profiles p
  where p.id = v_user_id;

  if not found
     or v_actor_business_id is null
     or v_actor_role not in ('owner', 'admin')
  then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select
    e.business_id,
    e.role,
    e.account_status,
    e.status
  into
    v_employee_business_id,
    v_employee_role,
    v_current_account_status,
    v_clock_status
  from public.employees e
  where e.id = p_employee_id
  for update;

  if not found then
    raise exception 'EMPLOYEE_NOT_FOUND';
  end if;

  if v_employee_business_id is distinct from v_actor_business_id then
    raise exception 'EMPLOYEE_NOT_FOUND';
  end if;

  if lower(v_employee_role) = 'owner' then
    raise exception 'OWNER_CANNOT_BE_DEACTIVATED';
  end if;

  if lower(v_employee_role) = 'admin'
     and v_actor_role <> 'owner'
  then
    raise exception 'ADMIN_STATUS_REQUIRES_OWNER';
  end if;

  if v_current_account_status = p_new_status then
    return;
  end if;

  if p_new_status = 'inactive' then
    if v_clock_status <> 'not_checked_in' then
      raise exception 'EMPLOYEE_STILL_CLOCKED_IN';
    end if;

    update public.employees
    set account_status = 'inactive'
    where id = p_employee_id;

    update public.employee_billing_memberships
    set ended_at = now()
    where employee_id = p_employee_id
      and business_id = v_actor_business_id
      and ended_at is null;

    return;
  end if;

  update public.employees
  set account_status = 'active'
  where id = p_employee_id;

  select exists (
    select 1
    from public.profiles p
    where p.employee_id = p_employee_id
      and p.business_id = v_actor_business_id
  )
  into v_has_profile;

  if v_has_profile then
    insert into public.employee_billing_memberships (
      business_id,
      employee_id,
      started_at
    )
    select
      v_actor_business_id,
      p_employee_id,
      now()
    where not exists (
      select 1
      from public.employee_billing_memberships ebm
      where ebm.employee_id = p_employee_id
        and ebm.ended_at is null
    );
  end if;
end;
$function$;

revoke all on function public.set_employee_account_status(uuid,text) from public;
revoke all on function public.set_employee_account_status(uuid,text) from anon;
grant execute on function public.set_employee_account_status(uuid,text) to authenticated;


-- ---------------------------------------------------------------------------
-- 7. A newly created business owner is billing-relevant immediately
-- ---------------------------------------------------------------------------

create or replace function public.create_business_with_owner_for_user(
  p_user_id uuid,
  p_business_name text,
  p_admin_name text,
  p_admin_pin text,
  p_contact_name text,
  p_phone text,
  p_street text,
  p_house_number text,
  p_postal_code text,
  p_city text,
  p_country_code text,
  p_support_email text,
  p_billing_email text,
  p_website text,
  p_vat_id text,
  p_legal_form text
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_business_id uuid;
  v_employee_id uuid;
  v_country_code text;
begin
  if p_user_id is null then
    raise exception 'User-ID fehlt.';
  end if;

  if exists (
    select 1
    from public.profiles
    where id = p_user_id
  ) then
    raise exception
      'Für diesen Benutzer existiert bereits ein Profil.';
  end if;

  if nullif(trim(p_business_name), '') is null then
    raise exception 'Firmenname fehlt.';
  end if;

  if nullif(trim(p_admin_name), '') is null then
    raise exception 'Name des Administrators fehlt.';
  end if;

  if p_admin_pin !~ '^[0-9]{4}$' then
    raise exception
      'Die Admin-PIN muss aus genau vier Zahlen bestehen.';
  end if;

  if nullif(trim(p_contact_name), '') is null then
    raise exception 'Ansprechpartner fehlt.';
  end if;

  if nullif(trim(p_phone), '') is null then
    raise exception 'Telefonnummer fehlt.';
  end if;

  if nullif(trim(p_street), '') is null then
    raise exception 'Straße fehlt.';
  end if;

  if nullif(trim(p_house_number), '') is null then
    raise exception 'Hausnummer fehlt.';
  end if;

  if nullif(trim(p_postal_code), '') is null then
    raise exception 'Postleitzahl fehlt.';
  end if;

  if nullif(trim(p_city), '') is null then
    raise exception 'Ort fehlt.';
  end if;

  v_country_code := upper(trim(p_country_code));

  if v_country_code !~ '^[A-Z]{2}$' then
    raise exception 'Ungültiger Ländercode.';
  end if;

  if nullif(trim(p_support_email), '') is null then
    raise exception 'Support-E-Mail fehlt.';
  end if;

  if nullif(trim(p_billing_email), '') is null then
    raise exception 'Rechnungs-E-Mail fehlt.';
  end if;

  insert into public.businesses (
    name,
    subscription_status,
    system_start_date,
    contact_name,
    phone,
    street,
    house_number,
    postal_code,
    city,
    country_code,
    support_email,
    billing_email,
    website,
    vat_id,
    legal_form
  )
  values (
    trim(p_business_name),
    'trialing',
    (now() at time zone 'Europe/Berlin')::date,
    trim(p_contact_name),
    trim(p_phone),
    trim(p_street),
    trim(p_house_number),
    trim(p_postal_code),
    trim(p_city),
    v_country_code,
    lower(trim(p_support_email)),
    lower(trim(p_billing_email)),
    nullif(trim(p_website), ''),
    nullif(trim(p_vat_id), ''),
    nullif(trim(p_legal_form), '')
  )
  returning id into v_business_id;

  insert into public.absence_types (
    business_id,
    code,
    name,
    category,
    is_paid,
    credits_time_account,
    requires_approval,
    requires_document,
    datev_absence_code,
    active,
    sort_order,
    subtract_worked_minutes,
    credit_mode,
    paid_for_hourly,
    reduces_fixed_pay
  )
  values
    (
      v_business_id, 'vacation', 'Urlaub', 'vacation',
      true, true, true, false, null, true, 10,
      false, 'calculated', true, false
    ),
    (
      v_business_id, 'sick', 'Krankheit', 'sickness',
      true, true, false, false, null, true, 20,
      true, 'calculated', true, false
    ),
    (
      v_business_id, 'sick_child', 'Kind krank', 'child_sickness',
      true, true, false, true, null, true, 30,
      true, 'calculated', false, false
    ),
    (
      v_business_id, 'work_accident', 'Arbeitsunfall', 'work_accident',
      true, true, false, true, null, true, 40,
      true, 'calculated', true, false
    ),
    (
      v_business_id, 'paid_leave', 'Bezahlte Freistellung', 'paid_leave',
      true, true, true, false, null, true, 50,
      false, 'calculated', true, false
    ),
    (
      v_business_id, 'unpaid_leave', 'Unbezahlte Freistellung', 'unpaid_leave',
      false, true, true, false, null, true, 60,
      false, 'calculated', false, true
    ),
    (
      v_business_id, 'other', 'Sonstige Abwesenheit', 'other',
      false, false, true, false, null, true, 70,
      false, 'none', false, false
    );

  insert into public.employees (
    business_id,
    name,
    role,
    pin,
    account_status,
    status
  )
  values (
    v_business_id,
    trim(p_admin_name),
    'Owner',
    p_admin_pin,
    'active',
    'not_checked_in'
  )
  returning id into v_employee_id;

  insert into public.employee_target_hours (
    employee_id,
    weekly_hours,
    monthly_hours
  )
  values (
    v_employee_id,
    0,
    0
  );

  insert into public.profiles (
    id,
    business_id,
    employee_id,
    role,
    admin_pin
  )
  values (
    p_user_id,
    v_business_id,
    v_employee_id,
    'owner',
    p_admin_pin
  );

  insert into public.employee_billing_memberships (
    business_id,
    employee_id,
    started_at
  )
  values (
    v_business_id,
    v_employee_id,
    now()
  );

  return v_business_id;
end;
$function$;
