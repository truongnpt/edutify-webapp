/*
 * Sprint D: organization invites, bank-transfer payments, platform admins
 */

-- ---------------------------------------------------------------------------
-- Platform admins (approve payments across tenants)
-- ---------------------------------------------------------------------------

create table if not exists public.platform_admins (
    user_id uuid primary key references auth.users (id) on delete cascade,
    created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

create policy platform_admins_select on public.platform_admins
    for select to authenticated
    using (user_id = auth.uid());

grant select on public.platform_admins to authenticated, service_role;
grant all on public.platform_admins to service_role;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.platform_admins pa
        where pa.user_id = auth.uid()
    );
$$;

grant execute on function public.is_platform_admin() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Organization invites
-- ---------------------------------------------------------------------------

create type public.invite_status as enum (
    'pending',
    'accepted',
    'cancelled',
    'expired'
);

create table if not exists public.organization_invites (
    id uuid primary key default extensions.uuid_generate_v4(),
    organization_id uuid not null references public.organizations (id) on delete cascade,
    email varchar(255) not null,
    role public.organization_role not null default 'teacher',
    token varchar(64) not null unique,
    status public.invite_status not null default 'pending',
    invited_by uuid references auth.users (id),
    expires_at timestamptz not null,
    accepted_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index idx_organization_invites_org_id on public.organization_invites (organization_id);
create index idx_organization_invites_email on public.organization_invites (lower(email));
create index idx_organization_invites_token on public.organization_invites (token);
create index idx_organization_invites_status on public.organization_invites (status);
create index idx_organization_invites_deleted_at on public.organization_invites (deleted_at);

create unique index idx_organization_invites_pending_email
    on public.organization_invites (organization_id, lower(email))
    where status = 'pending' and deleted_at is null;

create trigger organization_invites_set_updated_at
    before update on public.organization_invites
    for each row execute function public.trigger_set_updated_at();

alter table public.organization_invites enable row level security;

create policy organization_invites_select on public.organization_invites
    for select to authenticated
    using (
        organization_id in (select public.get_auth_user_org_ids())
        and deleted_at is null
    );

create policy organization_invites_insert on public.organization_invites
    for insert to authenticated
    with check (
        public.user_has_org_role(
            organization_id,
            array['owner', 'admin']::public.organization_role[]
        )
    );

create policy organization_invites_update on public.organization_invites
    for update to authenticated
    using (
        public.user_has_org_role(
            organization_id,
            array['owner', 'admin']::public.organization_role[]
        )
        and deleted_at is null
    )
    with check (
        public.user_has_org_role(
            organization_id,
            array['owner', 'admin']::public.organization_role[]
        )
    );

grant select, insert, update on public.organization_invites to authenticated, service_role;

-- Accept invite (links user to organization)
create or replace function public.accept_organization_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_invite public.organization_invites%rowtype;
    v_user_email text;
    v_member_id uuid;
begin
    select email into v_user_email
    from auth.users
    where id = auth.uid();

    if v_user_email is null then
        raise exception 'Not authenticated'
            using errcode = '42501';
    end if;

    select *
    into v_invite
    from public.organization_invites
    where token = p_token
      and status = 'pending'
      and deleted_at is null
    for update;

    if not found then
        raise exception 'Invite not found or already used'
            using errcode = 'P0002';
    end if;

    if v_invite.expires_at < now() then
        update public.organization_invites
        set status = 'expired'
        where id = v_invite.id;

        raise exception 'Invite has expired'
            using errcode = '22023';
    end if;

    if lower(v_invite.email) <> lower(v_user_email) then
        raise exception 'This invite was sent to a different email address'
            using errcode = '42501';
    end if;

    insert into public.organization_members (
        organization_id,
        user_id,
        role,
        status,
        created_by
    )
    values (
        v_invite.organization_id,
        auth.uid(),
        v_invite.role,
        'active',
        v_invite.invited_by
    )
    on conflict (organization_id, user_id) do update
    set
        role = excluded.role,
        status = 'active',
        deleted_at = null,
        updated_at = now()
    returning id into v_member_id;

    update public.organization_invites
    set
        status = 'accepted',
        accepted_at = now()
    where id = v_invite.id;

    return v_member_id;
end;
$$;

grant execute on function public.accept_organization_invite(text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Payments (bank transfer)
-- ---------------------------------------------------------------------------

create type public.payment_status as enum (
    'pending',
    'approved',
    'rejected'
);

create table if not exists public.payments (
    id uuid primary key default extensions.uuid_generate_v4(),
    organization_id uuid not null references public.organizations (id) on delete cascade,
    plan_id uuid not null references public.plans (id),
    amount numeric(10, 2) not null,
    status public.payment_status not null default 'pending',
    proof_image_url text not null,
    created_by uuid references auth.users (id),
    reviewed_by uuid references auth.users (id),
    reviewed_at timestamptz,
    rejection_reason text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_payments_org_id on public.payments (organization_id);
create index idx_payments_status on public.payments (status);
create index idx_payments_created_at on public.payments (created_at desc);

create trigger payments_set_updated_at
    before update on public.payments
    for each row execute function public.trigger_set_updated_at();

alter table public.payments enable row level security;

create policy payments_select_org on public.payments
    for select to authenticated
    using (
        organization_id in (select public.get_auth_user_org_ids())
        or public.is_platform_admin()
    );

create policy payments_insert_org on public.payments
    for insert to authenticated
    with check (
        public.user_can_manage_organization(organization_id)
    );

create policy payments_update_platform on public.payments
    for update to authenticated
    using (public.is_platform_admin())
    with check (public.is_platform_admin());

grant select, insert, update on public.payments to authenticated, service_role;

-- Approve payment → activate Pro (or target plan)
create or replace function public.approve_payment(p_payment_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_payment public.payments%rowtype;
begin
    if not public.is_platform_admin() then
        raise exception 'Permission denied'
            using errcode = '42501';
    end if;

    select *
    into v_payment
    from public.payments
    where id = p_payment_id
    for update;

    if not found then
        raise exception 'Payment not found'
            using errcode = 'P0002';
    end if;

    if v_payment.status <> 'pending' then
        raise exception 'Payment is not pending'
            using errcode = '22023';
    end if;

    update public.subscriptions
    set status = 'cancelled'
    where organization_id = v_payment.organization_id
      and status = 'active'
      and deleted_at is null;

    insert into public.subscriptions (
        organization_id,
        plan_id,
        status,
        started_at,
        created_by
    )
    values (
        v_payment.organization_id,
        v_payment.plan_id,
        'active',
        now(),
        auth.uid()
    );

    update public.payments
    set
        status = 'approved',
        reviewed_by = auth.uid(),
        reviewed_at = now()
    where id = p_payment_id;

    return true;
end;
$$;

create or replace function public.reject_payment(
    p_payment_id uuid,
    p_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_payment public.payments%rowtype;
begin
    if not public.is_platform_admin() then
        raise exception 'Permission denied'
            using errcode = '42501';
    end if;

    select *
    into v_payment
    from public.payments
    where id = p_payment_id
    for update;

    if not found then
        raise exception 'Payment not found'
            using errcode = 'P0002';
    end if;

    if v_payment.status <> 'pending' then
        raise exception 'Payment is not pending'
            using errcode = '22023';
    end if;

    update public.payments
    set
        status = 'rejected',
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        rejection_reason = p_reason
    where id = p_payment_id;

    return true;
end;
$$;

grant execute on function public.approve_payment(uuid) to authenticated, service_role;
grant execute on function public.reject_payment(uuid, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Payment proof storage (see seed.sql when storage is not ready yet)
-- ---------------------------------------------------------------------------

do $payment_proofs_storage$
begin
    if not exists (
        select 1
        from information_schema.tables
        where table_schema = 'storage'
          and table_name = 'buckets'
    ) then
        return;
    end if;

    insert into storage.buckets (id, name, public)
    values ('payment_proofs', 'payment_proofs', false)
    on conflict (id) do nothing;

    drop policy if exists payment_proofs_insert on storage.objects;
    drop policy if exists payment_proofs_select on storage.objects;

    create policy payment_proofs_insert on storage.objects
        for insert to authenticated
        with check (
            bucket_id = 'payment_proofs'
            and (storage.foldername(name))[1] in (
                select om.organization_id::text
                from public.organization_members om
                where om.user_id = auth.uid()
                  and om.role = 'owner'
                  and om.deleted_at is null
            )
        );

    create policy payment_proofs_select on storage.objects
        for select to authenticated
        using (
            bucket_id = 'payment_proofs'
            and (
                (storage.foldername(name))[1] in (
                    select om.organization_id::text
                    from public.organization_members om
                    where om.user_id = auth.uid()
                      and om.deleted_at is null
                )
                or public.is_platform_admin()
            )
        );
end $payment_proofs_storage$;

-- Seed: first auth user as platform admin (local dev convenience)
insert into public.platform_admins (user_id)
select id from auth.users
order by created_at
limit 1
on conflict do nothing;
