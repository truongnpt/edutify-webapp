/*
 * LMS SaaS Core Schema
 * Sprint 1: Organization, Plans, Subscriptions, Members
 * Sprint 2: Question Banks, Questions, Question Options
 */

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$ begin
    create type public.organization_role as enum (
        'owner',
        'admin',
        'teacher',
        'student'
    );
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type public.member_status as enum (
        'active',
        'invited',
        'suspended'
    );
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type public.question_type as enum (
        'single_choice',
        'multiple_choice',
        'true_false',
        'essay',
        'fill_blank'
    );
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type public.subscription_status as enum (
        'active',
        'cancelled',
        'expired',
        'trialing'
    );
exception
    when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Utility: updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.trigger_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Utility: slugify
-- ---------------------------------------------------------------------------

create or replace function kit.slugify(value text)
returns text
language sql
immutable
set search_path = ''
as $$
    select lower(
        regexp_replace(
            regexp_replace(
                trim(
                    regexp_replace(
                        kit.unaccent(coalesce(value, '')),
                        '[^a-zA-Z0-9\s-]', '', 'g'
                    )
                ),
                '\s+', '-', 'g'
            ),
            '-+', '-', 'g'
        )
    );
$$;

-- ---------------------------------------------------------------------------
-- Plans (global, no tenant)
-- ---------------------------------------------------------------------------

create table if not exists public.plans (
    id uuid primary key default extensions.uuid_generate_v4(),
    name varchar(100) not null unique,
    slug varchar(100) not null unique,
    max_students integer not null default 20,
    max_exams integer not null default 5,
    max_questions integer not null default 100,
    price_monthly numeric(10, 2) not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create trigger plans_set_updated_at
    before update on public.plans
    for each row execute function public.trigger_set_updated_at();

alter table public.plans enable row level security;

create policy plans_read on public.plans
    for select to authenticated
    using (is_active = true);

grant select on public.plans to authenticated, service_role;

insert into public.plans (name, slug, max_students, max_exams, max_questions, price_monthly)
values
    ('Free', 'free', 20, 5, 100, 0),
    ('Pro', 'pro', 1000, 500, 10000, 29.99),
    ('Enterprise', 'enterprise', 999999, 999999, 999999, 99.99)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Organizations
-- ---------------------------------------------------------------------------

create table if not exists public.organizations (
    id uuid primary key default extensions.uuid_generate_v4(),
    name varchar(255) not null,
    slug varchar(255) not null unique,
    logo_url varchar(1000),
    owner_id uuid not null references auth.users (id) on delete restrict,
    created_by uuid references auth.users (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index idx_organizations_owner_id on public.organizations (owner_id);
create index idx_organizations_slug on public.organizations (slug);
create index idx_organizations_deleted_at on public.organizations (deleted_at);

create trigger organizations_set_updated_at
    before update on public.organizations
    for each row execute function public.trigger_set_updated_at();

alter table public.organizations enable row level security;

-- ---------------------------------------------------------------------------
-- Organization Members
-- ---------------------------------------------------------------------------

create table if not exists public.organization_members (
    id uuid primary key default extensions.uuid_generate_v4(),
    organization_id uuid not null references public.organizations (id) on delete cascade,
    user_id uuid not null references auth.users (id) on delete cascade,
    role public.organization_role not null default 'student',
    status public.member_status not null default 'active',
    created_by uuid references auth.users (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    unique (organization_id, user_id)
);

create index idx_organization_members_org_id on public.organization_members (organization_id);
create index idx_organization_members_user_id on public.organization_members (user_id);
create index idx_organization_members_deleted_at on public.organization_members (deleted_at);

create trigger organization_members_set_updated_at
    before update on public.organization_members
    for each row execute function public.trigger_set_updated_at();

alter table public.organization_members enable row level security;

-- ---------------------------------------------------------------------------
-- Subscriptions
-- ---------------------------------------------------------------------------

create table if not exists public.subscriptions (
    id uuid primary key default extensions.uuid_generate_v4(),
    organization_id uuid not null references public.organizations (id) on delete cascade,
    plan_id uuid not null references public.plans (id),
    status public.subscription_status not null default 'active',
    started_at timestamptz not null default now(),
    expired_at timestamptz,
    created_by uuid references auth.users (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index idx_subscriptions_org_id on public.subscriptions (organization_id);
create index idx_subscriptions_plan_id on public.subscriptions (plan_id);
create unique index idx_subscriptions_active_org
    on public.subscriptions (organization_id)
    where status = 'active' and deleted_at is null;

create trigger subscriptions_set_updated_at
    before update on public.subscriptions
    for each row execute function public.trigger_set_updated_at();

alter table public.subscriptions enable row level security;

-- ---------------------------------------------------------------------------
-- Question Banks
-- ---------------------------------------------------------------------------

create table if not exists public.question_banks (
    id uuid primary key default extensions.uuid_generate_v4(),
    organization_id uuid not null references public.organizations (id) on delete cascade,
    name varchar(255) not null,
    description text,
    created_by uuid references auth.users (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index idx_question_banks_org_id on public.question_banks (organization_id);
create index idx_question_banks_created_at on public.question_banks (created_at);
create index idx_question_banks_deleted_at on public.question_banks (deleted_at);

create trigger question_banks_set_updated_at
    before update on public.question_banks
    for each row execute function public.trigger_set_updated_at();

alter table public.question_banks enable row level security;

-- ---------------------------------------------------------------------------
-- Questions
-- ---------------------------------------------------------------------------

create table if not exists public.questions (
    id uuid primary key default extensions.uuid_generate_v4(),
    organization_id uuid not null references public.organizations (id) on delete cascade,
    bank_id uuid not null references public.question_banks (id) on delete cascade,
    type public.question_type not null,
    content text not null,
    explanation text,
    difficulty varchar(20) not null default 'medium',
    created_by uuid references auth.users (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index idx_questions_org_id on public.questions (organization_id);
create index idx_questions_bank_id on public.questions (bank_id);
create index idx_questions_type on public.questions (type);
create index idx_questions_created_at on public.questions (created_at);
create index idx_questions_deleted_at on public.questions (deleted_at);

create trigger questions_set_updated_at
    before update on public.questions
    for each row execute function public.trigger_set_updated_at();

alter table public.questions enable row level security;

-- ---------------------------------------------------------------------------
-- Question Options
-- ---------------------------------------------------------------------------

create table if not exists public.question_options (
    id uuid primary key default extensions.uuid_generate_v4(),
    organization_id uuid not null references public.organizations (id) on delete cascade,
    question_id uuid not null references public.questions (id) on delete cascade,
    content text not null,
    is_correct boolean not null default false,
    sort_order integer not null default 0,
    created_by uuid references auth.users (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index idx_question_options_org_id on public.question_options (organization_id);
create index idx_question_options_question_id on public.question_options (question_id);
create index idx_question_options_deleted_at on public.question_options (deleted_at);

create trigger question_options_set_updated_at
    before update on public.question_options
    for each row execute function public.trigger_set_updated_at();

alter table public.question_options enable row level security;

-- ---------------------------------------------------------------------------
-- Audit Logs (append-only)
-- ---------------------------------------------------------------------------

create table if not exists public.audit_logs (
    id uuid primary key default extensions.uuid_generate_v4(),
    organization_id uuid not null references public.organizations (id) on delete cascade,
    user_id uuid references auth.users (id),
    action varchar(100) not null,
    entity_type varchar(100) not null,
    entity_id uuid,
    old_data jsonb,
    new_data jsonb,
    created_at timestamptz not null default now()
);

create index idx_audit_logs_org_id on public.audit_logs (organization_id);
create index idx_audit_logs_user_id on public.audit_logs (user_id);
create index idx_audit_logs_created_at on public.audit_logs (created_at);

alter table public.audit_logs enable row level security;

-- ---------------------------------------------------------------------------
-- RLS Helper Functions
-- ---------------------------------------------------------------------------

create or replace function public.get_auth_user_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
    select organization_id
    from public.organization_members
    where user_id = auth.uid()
      and status = 'active'
      and deleted_at is null;
$$;

create or replace function public.user_has_org_role(
    p_organization_id uuid,
    p_roles public.organization_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.organization_members
        where organization_id = p_organization_id
          and user_id = auth.uid()
          and role = any (p_roles)
          and status = 'active'
          and deleted_at is null
    );
$$;

create or replace function public.user_can_manage_content(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select public.user_has_org_role(
        p_organization_id,
        array['owner', 'admin', 'teacher']::public.organization_role[]
    );
$$;

create or replace function public.user_can_manage_organization(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select public.user_has_org_role(
        p_organization_id,
        array['owner']::public.organization_role[]
    );
$$;

create or replace function public.get_org_question_count(p_organization_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
    select count(*)::integer
    from public.questions
    where organization_id = p_organization_id
      and deleted_at is null;
$$;

create or replace function public.check_question_quota(p_organization_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_max_questions integer;
    v_current_count integer;
begin
    select p.max_questions into v_max_questions
    from public.subscriptions s
    join public.plans p on p.id = s.plan_id
    where s.organization_id = p_organization_id
      and s.status = 'active'
      and s.deleted_at is null
    order by s.started_at desc
    limit 1;

    if v_max_questions is null then
        select max_questions into v_max_questions
        from public.plans
        where slug = 'free';
    end if;

    v_current_count := public.get_org_question_count(p_organization_id);

    return v_current_count < v_max_questions;
end;
$$;

grant execute on function public.get_auth_user_org_ids() to authenticated, service_role;
grant execute on function public.user_has_org_role(uuid, public.organization_role[]) to authenticated, service_role;
grant execute on function public.user_can_manage_content(uuid) to authenticated, service_role;
grant execute on function public.user_can_manage_organization(uuid) to authenticated, service_role;
grant execute on function public.get_org_question_count(uuid) to authenticated, service_role;
grant execute on function public.check_question_quota(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RLS Policies: organizations
-- ---------------------------------------------------------------------------

create policy organizations_select on public.organizations
    for select to authenticated
    using (
        id in (select public.get_auth_user_org_ids())
        and deleted_at is null
    );

create policy organizations_update on public.organizations
    for update to authenticated
    using (
        public.user_can_manage_organization(id)
        and deleted_at is null
    )
    with check (
        public.user_can_manage_organization(id)
        and deleted_at is null
    );

-- ---------------------------------------------------------------------------
-- RLS Policies: organization_members
-- ---------------------------------------------------------------------------

create policy organization_members_select on public.organization_members
    for select to authenticated
    using (
        organization_id in (select public.get_auth_user_org_ids())
        and deleted_at is null
    );

create policy organization_members_insert on public.organization_members
    for insert to authenticated
    with check (
        public.user_has_org_role(
            organization_id,
            array['owner', 'admin']::public.organization_role[]
        )
    );

create policy organization_members_update on public.organization_members
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

-- ---------------------------------------------------------------------------
-- RLS Policies: subscriptions
-- ---------------------------------------------------------------------------

create policy subscriptions_select on public.subscriptions
    for select to authenticated
    using (
        organization_id in (select public.get_auth_user_org_ids())
        and deleted_at is null
    );

create policy subscriptions_update on public.subscriptions
    for update to authenticated
    using (
        public.user_can_manage_organization(organization_id)
        and deleted_at is null
    )
    with check (
        public.user_can_manage_organization(organization_id)
    );

-- ---------------------------------------------------------------------------
-- RLS Policies: question_banks
-- ---------------------------------------------------------------------------

create policy question_banks_select on public.question_banks
    for select to authenticated
    using (
        organization_id in (select public.get_auth_user_org_ids())
        and deleted_at is null
    );

create policy question_banks_insert on public.question_banks
    for insert to authenticated
    with check (
        public.user_can_manage_content(organization_id)
    );

create policy question_banks_update on public.question_banks
    for update to authenticated
    using (
        public.user_can_manage_content(organization_id)
        and deleted_at is null
    )
    with check (
        public.user_can_manage_content(organization_id)
    );

-- ---------------------------------------------------------------------------
-- RLS Policies: questions
-- ---------------------------------------------------------------------------

create policy questions_select on public.questions
    for select to authenticated
    using (
        organization_id in (select public.get_auth_user_org_ids())
        and deleted_at is null
    );

create policy questions_insert on public.questions
    for insert to authenticated
    with check (
        public.user_can_manage_content(organization_id)
        and public.check_question_quota(organization_id)
    );

create policy questions_update on public.questions
    for update to authenticated
    using (
        public.user_can_manage_content(organization_id)
        and deleted_at is null
    )
    with check (
        public.user_can_manage_content(organization_id)
    );

-- ---------------------------------------------------------------------------
-- RLS Policies: question_options
-- ---------------------------------------------------------------------------

create policy question_options_select on public.question_options
    for select to authenticated
    using (
        organization_id in (select public.get_auth_user_org_ids())
        and deleted_at is null
    );

create policy question_options_insert on public.question_options
    for insert to authenticated
    with check (
        public.user_can_manage_content(organization_id)
    );

create policy question_options_update on public.question_options
    for update to authenticated
    using (
        public.user_can_manage_content(organization_id)
        and deleted_at is null
    )
    with check (
        public.user_can_manage_content(organization_id)
    );

-- ---------------------------------------------------------------------------
-- RLS Policies: audit_logs (insert + select only)
-- ---------------------------------------------------------------------------

create policy audit_logs_select on public.audit_logs
    for select to authenticated
    using (
        organization_id in (select public.get_auth_user_org_ids())
    );

create policy audit_logs_insert on public.audit_logs
    for insert to authenticated
    with check (
        organization_id in (select public.get_auth_user_org_ids())
    );

-- ---------------------------------------------------------------------------
-- Table Grants
-- ---------------------------------------------------------------------------

grant select, insert, update on public.organizations to authenticated, service_role;
grant select, insert, update on public.organization_members to authenticated, service_role;
grant select, update on public.subscriptions to authenticated, service_role;
grant select, insert, update on public.question_banks to authenticated, service_role;
grant select, insert, update on public.questions to authenticated, service_role;
grant select, insert, update on public.question_options to authenticated, service_role;
grant select, insert on public.audit_logs to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Audit log helper
-- ---------------------------------------------------------------------------

create or replace function public.write_audit_log(
    p_organization_id uuid,
    p_action varchar,
    p_entity_type varchar,
    p_entity_id uuid,
    p_old_data jsonb default null,
    p_new_data jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.audit_logs (
        organization_id,
        user_id,
        action,
        entity_type,
        entity_id,
        old_data,
        new_data
    )
    values (
        p_organization_id,
        auth.uid(),
        p_action,
        p_entity_type,
        p_entity_id,
        p_old_data,
        p_new_data
    );
end;
$$;

grant execute on function public.write_audit_log(uuid, varchar, varchar, uuid, jsonb, jsonb)
    to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Organization bootstrap on user signup
-- ---------------------------------------------------------------------------

create or replace function kit.setup_user_organization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_org_name text;
    v_org_slug text;
    v_org_id uuid;
    v_free_plan_id uuid;
    v_suffix integer := 0;
begin
    v_org_name := coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'organization_name'), ''),
        coalesce(
            nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
            split_part(new.email, '@', 1)
        ) || '''s Organization'
    );

    v_org_slug := kit.slugify(v_org_name);

    while exists (
        select 1 from public.organizations where slug = v_org_slug
    ) loop
        v_suffix := v_suffix + 1;
        v_org_slug := kit.slugify(v_org_name) || '-' || v_suffix::text;
    end loop;

    insert into public.organizations (name, slug, owner_id, created_by)
    values (v_org_name, v_org_slug, new.id, new.id)
    returning id into v_org_id;

    insert into public.organization_members (organization_id, user_id, role, status, created_by)
    values (v_org_id, new.id, 'owner', 'active', new.id);

    select id into v_free_plan_id
    from public.plans
    where slug = 'free'
    limit 1;

    if v_free_plan_id is not null then
        insert into public.subscriptions (organization_id, plan_id, status, created_by)
        values (v_org_id, v_free_plan_id, 'active', new.id);
    end if;

    perform public.write_audit_log(
        v_org_id,
        'organization.created',
        'organizations',
        v_org_id,
        null,
        jsonb_build_object('name', v_org_name, 'slug', v_org_slug)
    );

    return new;
end;
$$;

create trigger on_auth_user_created_organization
    after insert on auth.users
    for each row
execute procedure kit.setup_user_organization();

-- Bootstrap organizations for existing users without one
do $$
declare
    r record;
    v_org_name text;
    v_org_slug text;
    v_org_id uuid;
    v_free_plan_id uuid;
    v_suffix integer;
begin
    select id into v_free_plan_id from public.plans where slug = 'free' limit 1;

    for r in
        select u.id, u.email, u.raw_user_meta_data
        from auth.users u
        where not exists (
            select 1
            from public.organization_members om
            where om.user_id = u.id
              and om.deleted_at is null
        )
    loop
        v_org_name := coalesce(
            nullif(trim(r.raw_user_meta_data ->> 'name'), ''),
            split_part(r.email, '@', 1)
        ) || '''s Organization';

        v_org_slug := kit.slugify(v_org_name);
        v_suffix := 0;

        while exists (
            select 1 from public.organizations where slug = v_org_slug
        ) loop
            v_suffix := v_suffix + 1;
            v_org_slug := kit.slugify(v_org_name) || '-' || v_suffix::text;
        end loop;

        insert into public.organizations (name, slug, owner_id, created_by)
        values (v_org_name, v_org_slug, r.id, r.id)
        returning id into v_org_id;

        insert into public.organization_members (organization_id, user_id, role, status, created_by)
        values (v_org_id, r.id, 'owner', 'active', r.id);

        if v_free_plan_id is not null then
            insert into public.subscriptions (organization_id, plan_id, status, created_by)
            values (v_org_id, v_free_plan_id, 'active', r.id);
        end if;
    end loop;
end;
$$;

-- Organization logo storage bucket
insert into storage.buckets (id, name, public)
values ('organization_logos', 'organization_logos', true)
on conflict (id) do nothing;

create policy organization_logos on storage.objects
    for all to authenticated
    using (
        bucket_id = 'organization_logos'
        and (storage.foldername(name))[1]::uuid in (select public.get_auth_user_org_ids())
    )
    with check (
        bucket_id = 'organization_logos'
        and (storage.foldername(name))[1]::uuid in (select public.get_auth_user_org_ids())
        and public.user_can_manage_organization((storage.foldername(name))[1]::uuid)
    );
