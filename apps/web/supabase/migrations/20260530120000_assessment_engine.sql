/*
 * Assessment Engine Foundation
 * Extends LMS core with domain-agnostic assessment model
 */

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.question_status as enum ('draft', 'published', 'archived');

create type public.question_group_type as enum (
    'passage',
    'audio',
    'image',
    'video',
    'case_study',
    'document',
    'none'
);

create type public.exam_status as enum ('draft', 'published', 'archived', 'closed');

create type public.grading_mode as enum ('auto', 'manual', 'ai', 'hybrid');

create type public.attempt_status as enum (
    'not_started',
    'in_progress',
    'submitted',
    'graded',
    'expired'
);

create type public.student_status as enum ('active', 'inactive', 'suspended');

-- ---------------------------------------------------------------------------
-- Subjects
-- ---------------------------------------------------------------------------

create table if not exists public.subjects (
    id uuid primary key default extensions.uuid_generate_v4(),
    organization_id uuid not null references public.organizations (id) on delete cascade,
    name varchar(255) not null,
    code varchar(50) not null,
    description text,
    created_by uuid references auth.users (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    unique (organization_id, code)
);

create index idx_subjects_org_id on public.subjects (organization_id);
create index idx_subjects_deleted_at on public.subjects (deleted_at);

create trigger subjects_set_updated_at
    before update on public.subjects
    for each row execute function public.trigger_set_updated_at();

alter table public.subjects enable row level security;

-- ---------------------------------------------------------------------------
-- Topics (tree)
-- ---------------------------------------------------------------------------

create table if not exists public.topics (
    id uuid primary key default extensions.uuid_generate_v4(),
    organization_id uuid not null references public.organizations (id) on delete cascade,
    subject_id uuid not null references public.subjects (id) on delete cascade,
    parent_id uuid references public.topics (id) on delete set null,
    name varchar(255) not null,
    created_by uuid references auth.users (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index idx_topics_org_id on public.topics (organization_id);
create index idx_topics_subject_id on public.topics (subject_id);
create index idx_topics_parent_id on public.topics (parent_id);
create index idx_topics_deleted_at on public.topics (deleted_at);

create trigger topics_set_updated_at
    before update on public.topics
    for each row execute function public.trigger_set_updated_at();

alter table public.topics enable row level security;

-- ---------------------------------------------------------------------------
-- Tags
-- ---------------------------------------------------------------------------

create table if not exists public.tags (
    id uuid primary key default extensions.uuid_generate_v4(),
    organization_id uuid not null references public.organizations (id) on delete cascade,
    name varchar(100) not null,
    created_by uuid references auth.users (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    unique (organization_id, name)
);

create index idx_tags_org_id on public.tags (organization_id);
create index idx_tags_deleted_at on public.tags (deleted_at);

create trigger tags_set_updated_at
    before update on public.tags
    for each row execute function public.trigger_set_updated_at();

alter table public.tags enable row level security;

-- ---------------------------------------------------------------------------
-- Extend question_banks
-- ---------------------------------------------------------------------------

alter table public.question_banks
    add column if not exists subject_id uuid references public.subjects (id) on delete set null,
    add column if not exists topic_id uuid references public.topics (id) on delete set null;

create index if not exists idx_question_banks_subject_id on public.question_banks (subject_id);
create index if not exists idx_question_banks_topic_id on public.question_banks (topic_id);

-- ---------------------------------------------------------------------------
-- Question Groups (shared stimulus)
-- ---------------------------------------------------------------------------

create table if not exists public.question_groups (
    id uuid primary key default extensions.uuid_generate_v4(),
    organization_id uuid not null references public.organizations (id) on delete cascade,
    bank_id uuid not null references public.question_banks (id) on delete cascade,
    title varchar(500) not null,
    group_type public.question_group_type not null default 'none',
    shared_content text,
    resource_url varchar(2000),
    metadata jsonb not null default '{}'::jsonb,
    sort_order integer not null default 0,
    created_by uuid references auth.users (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index idx_question_groups_org_id on public.question_groups (organization_id);
create index idx_question_groups_bank_id on public.question_groups (bank_id);
create index idx_question_groups_deleted_at on public.question_groups (deleted_at);

create trigger question_groups_set_updated_at
    before update on public.question_groups
    for each row execute function public.trigger_set_updated_at();

alter table public.question_groups enable row level security;

-- ---------------------------------------------------------------------------
-- Evolve questions → Assessment Engine model
-- ---------------------------------------------------------------------------

alter table public.questions
    add column if not exists title varchar(500),
    add column if not exists question_type text,
    add column if not exists question_group_id uuid references public.question_groups (id) on delete set null,
    add column if not exists subject_id uuid references public.subjects (id) on delete set null,
    add column if not exists topic_id uuid references public.topics (id) on delete set null,
    add column if not exists metadata jsonb not null default '{}'::jsonb,
    add column if not exists answer_schema jsonb not null default '{}'::jsonb,
    add column if not exists scoring_schema jsonb not null default '{"score": 1}'::jsonb,
    add column if not exists status public.question_status not null default 'draft',
    add column if not exists grading_mode public.grading_mode not null default 'auto';

-- Migrate enum type → text question_type
update public.questions
set question_type = type::text
where question_type is null and type is not null;

update public.questions
set title = left(content, 200)
where title is null;

-- Build answer_schema from legacy question_options (plpgsql)
create or replace function kit.migrate_question_answer_schemas()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    r record;
    v_options jsonb;
    v_schema jsonb;
    v_correct_key text;
    v_keys text[];
    i integer;
begin
    for r in
        select q.id, q.question_type
        from public.questions q
        where q.answer_schema = '{}'::jsonb
           or q.answer_schema is null
    loop
        select coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'content', qo.content,
                    'is_correct', qo.is_correct,
                    'sort_order', qo.sort_order
                )
                order by qo.sort_order, qo.created_at
            ),
            '[]'::jsonb
        )
        into v_options
        from public.question_options qo
        where qo.question_id = r.id
          and qo.deleted_at is null;

        v_schema := '{}'::jsonb;

        if r.question_type = 'single_choice' then
            for i in 0..jsonb_array_length(v_options) - 1 loop
                if (v_options->i->>'is_correct')::boolean then
                    v_correct_key := chr(65 + i);
                    exit;
                end if;
            end loop;

            v_schema := jsonb_build_object(
                'correctAnswer', coalesce(v_correct_key, 'A'),
                'options', (
                    select jsonb_agg(
                        jsonb_build_object(
                            'key', chr(65 + (ordinality - 1)),
                            'content', elem->>'content'
                        )
                    )
                    from jsonb_array_elements(v_options) with ordinality as t(elem, ordinality)
                )
            );

        elsif r.question_type = 'multiple_choice' then
            v_schema := jsonb_build_object(
                'correctAnswers', (
                    select coalesce(jsonb_agg(chr(65 + (ordinality - 1))), '[]'::jsonb)
                    from jsonb_array_elements(v_options) with ordinality as t(elem, ordinality)
                    where (elem->>'is_correct')::boolean
                ),
                'options', (
                    select jsonb_agg(
                        jsonb_build_object(
                            'key', chr(65 + (ordinality - 1)),
                            'content', elem->>'content'
                        )
                    )
                    from jsonb_array_elements(v_options) with ordinality as t(elem, ordinality)
                )
            );

        elsif r.question_type in ('true_false', 'yes_no') then
            v_schema := jsonb_build_object(
                'correctAnswer',
                case
                    when exists (
                        select 1
                        from jsonb_array_elements(v_options) elem
                        where (elem->>'is_correct')::boolean
                          and lower(elem->>'content') in ('true', 'yes', 'đúng', 'có')
                    ) then case when r.question_type = 'yes_no' then 'yes' else 'true' end
                    else case when r.question_type = 'yes_no' then 'no' else 'false' end
                end
            );

        elsif r.question_type in ('fill_blank', 'short_answer') then
            v_schema := jsonb_build_object(
                'acceptedAnswers', (
                    select coalesce(jsonb_agg(elem->>'content'), '[]'::jsonb)
                    from jsonb_array_elements(v_options) elem
                    where (elem->>'is_correct')::boolean
                ),
                'caseSensitive', false
            );
        end if;

        update public.questions
        set answer_schema = v_schema
        where id = r.id;
    end loop;
end;
$$;

select kit.migrate_question_answer_schemas();
drop function kit.migrate_question_answer_schemas();

update public.questions
set grading_mode = 'manual'
where question_type = 'essay';

update public.questions
set status = 'published'
where status = 'draft';

alter table public.questions
    alter column question_type set not null;

-- Drop legacy enum column after migration
alter table public.questions drop column if exists type;

create index if not exists idx_questions_question_type on public.questions (question_type);
create index if not exists idx_questions_question_group_id on public.questions (question_group_id);
create index if not exists idx_questions_subject_id on public.questions (subject_id);
create index if not exists idx_questions_status on public.questions (status);

-- ---------------------------------------------------------------------------
-- Question ↔ Tags
-- ---------------------------------------------------------------------------

create table if not exists public.question_tags (
    id uuid primary key default extensions.uuid_generate_v4(),
    organization_id uuid not null references public.organizations (id) on delete cascade,
    question_id uuid not null references public.questions (id) on delete cascade,
    tag_id uuid not null references public.tags (id) on delete cascade,
    created_at timestamptz not null default now(),
    unique (question_id, tag_id)
);

create index idx_question_tags_org_id on public.question_tags (organization_id);
create index idx_question_tags_question_id on public.question_tags (question_id);
create index idx_question_tags_tag_id on public.question_tags (tag_id);

alter table public.question_tags enable row level security;

-- ---------------------------------------------------------------------------
-- Exams
-- ---------------------------------------------------------------------------

create table if not exists public.exams (
    id uuid primary key default extensions.uuid_generate_v4(),
    organization_id uuid not null references public.organizations (id) on delete cascade,
    title varchar(500) not null,
    description text,
    duration_minutes integer not null default 60,
    pass_score numeric(10, 2) not null default 50,
    total_score numeric(10, 2) not null default 100,
    status public.exam_status not null default 'draft',
    metadata jsonb not null default '{}'::jsonb,
    subject_id uuid references public.subjects (id) on delete set null,
    created_by uuid references auth.users (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index idx_exams_org_id on public.exams (organization_id);
create index idx_exams_status on public.exams (status);
create index idx_exams_deleted_at on public.exams (deleted_at);

create trigger exams_set_updated_at
    before update on public.exams
    for each row execute function public.trigger_set_updated_at();

alter table public.exams enable row level security;

-- ---------------------------------------------------------------------------
-- Exam Sections
-- ---------------------------------------------------------------------------

create table if not exists public.exam_sections (
    id uuid primary key default extensions.uuid_generate_v4(),
    organization_id uuid not null references public.organizations (id) on delete cascade,
    exam_id uuid not null references public.exams (id) on delete cascade,
    title varchar(500) not null,
    description text,
    sort_order integer not null default 0,
    duration_minutes integer,
    metadata jsonb not null default '{}'::jsonb,
    created_by uuid references auth.users (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index idx_exam_sections_org_id on public.exam_sections (organization_id);
create index idx_exam_sections_exam_id on public.exam_sections (exam_id);
create index idx_exam_sections_deleted_at on public.exam_sections (deleted_at);

create trigger exam_sections_set_updated_at
    before update on public.exam_sections
    for each row execute function public.trigger_set_updated_at();

alter table public.exam_sections enable row level security;

-- ---------------------------------------------------------------------------
-- Exam Section Items (questions or question groups)
-- ---------------------------------------------------------------------------

create table if not exists public.exam_section_items (
    id uuid primary key default extensions.uuid_generate_v4(),
    organization_id uuid not null references public.organizations (id) on delete cascade,
    section_id uuid not null references public.exam_sections (id) on delete cascade,
    question_id uuid references public.questions (id) on delete set null,
    question_group_id uuid references public.question_groups (id) on delete set null,
    score numeric(10, 2) not null default 1,
    sort_order integer not null default 0,
    created_by uuid references auth.users (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    constraint exam_section_items_target_check check (
        (question_id is not null and question_group_id is null)
        or (question_id is null and question_group_id is not null)
    )
);

create index idx_exam_section_items_org_id on public.exam_section_items (organization_id);
create index idx_exam_section_items_section_id on public.exam_section_items (section_id);
create index idx_exam_section_items_deleted_at on public.exam_section_items (deleted_at);

create trigger exam_section_items_set_updated_at
    before update on public.exam_section_items
    for each row execute function public.trigger_set_updated_at();

alter table public.exam_section_items enable row level security;

-- ---------------------------------------------------------------------------
-- Students
-- ---------------------------------------------------------------------------

create table if not exists public.students (
    id uuid primary key default extensions.uuid_generate_v4(),
    organization_id uuid not null references public.organizations (id) on delete cascade,
    user_id uuid references auth.users (id) on delete set null,
    full_name varchar(255) not null,
    email varchar(320) not null,
    status public.student_status not null default 'active',
    created_by uuid references auth.users (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    unique (organization_id, email)
);

create index idx_students_org_id on public.students (organization_id);
create index idx_students_user_id on public.students (user_id);
create index idx_students_deleted_at on public.students (deleted_at);

create trigger students_set_updated_at
    before update on public.students
    for each row execute function public.trigger_set_updated_at();

alter table public.students enable row level security;

-- ---------------------------------------------------------------------------
-- Exam Assignments
-- ---------------------------------------------------------------------------

create table if not exists public.exam_assignments (
    id uuid primary key default extensions.uuid_generate_v4(),
    organization_id uuid not null references public.organizations (id) on delete cascade,
    exam_id uuid not null references public.exams (id) on delete cascade,
    student_id uuid not null references public.students (id) on delete cascade,
    start_time timestamptz not null,
    end_time timestamptz not null,
    assigned_by uuid references auth.users (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index idx_exam_assignments_org_id on public.exam_assignments (organization_id);
create index idx_exam_assignments_exam_id on public.exam_assignments (exam_id);
create index idx_exam_assignments_student_id on public.exam_assignments (student_id);
create index idx_exam_assignments_deleted_at on public.exam_assignments (deleted_at);

create trigger exam_assignments_set_updated_at
    before update on public.exam_assignments
    for each row execute function public.trigger_set_updated_at();

alter table public.exam_assignments enable row level security;

-- ---------------------------------------------------------------------------
-- Exam Attempts
-- ---------------------------------------------------------------------------

create table if not exists public.exam_attempts (
    id uuid primary key default extensions.uuid_generate_v4(),
    organization_id uuid not null references public.organizations (id) on delete cascade,
    exam_id uuid not null references public.exams (id) on delete cascade,
    assignment_id uuid references public.exam_assignments (id) on delete set null,
    student_id uuid not null references public.students (id) on delete cascade,
    score numeric(10, 2),
    max_score numeric(10, 2),
    status public.attempt_status not null default 'not_started',
    grading_mode public.grading_mode not null default 'auto',
    started_at timestamptz,
    submitted_at timestamptz,
    graded_at timestamptz,
    metadata jsonb not null default '{}'::jsonb,
    created_by uuid references auth.users (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index idx_exam_attempts_org_id on public.exam_attempts (organization_id);
create index idx_exam_attempts_exam_id on public.exam_attempts (exam_id);
create index idx_exam_attempts_student_id on public.exam_attempts (student_id);
create index idx_exam_attempts_status on public.exam_attempts (status);
create index idx_exam_attempts_deleted_at on public.exam_attempts (deleted_at);

create trigger exam_attempts_set_updated_at
    before update on public.exam_attempts
    for each row execute function public.trigger_set_updated_at();

alter table public.exam_attempts enable row level security;

-- ---------------------------------------------------------------------------
-- Attempt Answers
-- ---------------------------------------------------------------------------

create table if not exists public.attempt_answers (
    id uuid primary key default extensions.uuid_generate_v4(),
    organization_id uuid not null references public.organizations (id) on delete cascade,
    attempt_id uuid not null references public.exam_attempts (id) on delete cascade,
    question_id uuid not null references public.questions (id) on delete cascade,
    answer_data jsonb not null default '{}'::jsonb,
    is_correct boolean,
    score numeric(10, 2),
    max_score numeric(10, 2),
    grading_mode public.grading_mode,
    graded_by uuid references auth.users (id),
    graded_at timestamptz,
    feedback text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    unique (attempt_id, question_id)
);

create index idx_attempt_answers_org_id on public.attempt_answers (organization_id);
create index idx_attempt_answers_attempt_id on public.attempt_answers (attempt_id);
create index idx_attempt_answers_question_id on public.attempt_answers (question_id);
create index idx_attempt_answers_deleted_at on public.attempt_answers (deleted_at);

create trigger attempt_answers_set_updated_at
    before update on public.attempt_answers
    for each row execute function public.trigger_set_updated_at();

alter table public.attempt_answers enable row level security;

-- ---------------------------------------------------------------------------
-- Attempt Logs (auto-save trail)
-- ---------------------------------------------------------------------------

create table if not exists public.attempt_logs (
    id uuid primary key default extensions.uuid_generate_v4(),
    organization_id uuid not null references public.organizations (id) on delete cascade,
    attempt_id uuid not null references public.exam_attempts (id) on delete cascade,
    question_id uuid references public.questions (id) on delete set null,
    action varchar(50) not null,
    payload jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index idx_attempt_logs_org_id on public.attempt_logs (organization_id);
create index idx_attempt_logs_attempt_id on public.attempt_logs (attempt_id);
create index idx_attempt_logs_created_at on public.attempt_logs (created_at);

alter table public.attempt_logs enable row level security;

-- ---------------------------------------------------------------------------
-- Quota helpers
-- ---------------------------------------------------------------------------

create or replace function public.get_org_exam_count(p_organization_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
    select count(*)::integer
    from public.exams
    where organization_id = p_organization_id
      and deleted_at is null;
$$;

create or replace function public.check_exam_quota(p_organization_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_max_exams integer;
    v_current_count integer;
begin
    select p.max_exams into v_max_exams
    from public.subscriptions s
    join public.plans p on p.id = s.plan_id
    where s.organization_id = p_organization_id
      and s.status = 'active'
      and s.deleted_at is null
    order by s.started_at desc
    limit 1;

    if v_max_exams is null then
        select max_exams into v_max_exams from public.plans where slug = 'free';
    end if;

    v_current_count := public.get_org_exam_count(p_organization_id);
    return v_current_count < v_max_exams;
end;
$$;

create or replace function public.get_student_id_for_user(p_organization_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
    select s.id
    from public.students s
    where s.organization_id = p_organization_id
      and s.user_id = auth.uid()
      and s.status = 'active'
      and s.deleted_at is null
    limit 1;
$$;

grant execute on function public.get_org_exam_count(uuid) to authenticated, service_role;
grant execute on function public.check_exam_quota(uuid) to authenticated, service_role;
grant execute on function public.get_student_id_for_user(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RLS: subjects, topics, tags, question_groups
-- ---------------------------------------------------------------------------

create policy subjects_select on public.subjects for select to authenticated
    using (organization_id in (select public.get_auth_user_org_ids()) and deleted_at is null);
create policy subjects_insert on public.subjects for insert to authenticated
    with check (public.user_can_manage_content(organization_id));
create policy subjects_update on public.subjects for update to authenticated
    using (public.user_can_manage_content(organization_id) and deleted_at is null)
    with check (public.user_can_manage_content(organization_id));

create policy topics_select on public.topics for select to authenticated
    using (organization_id in (select public.get_auth_user_org_ids()) and deleted_at is null);
create policy topics_insert on public.topics for insert to authenticated
    with check (public.user_can_manage_content(organization_id));
create policy topics_update on public.topics for update to authenticated
    using (public.user_can_manage_content(organization_id) and deleted_at is null)
    with check (public.user_can_manage_content(organization_id));

create policy tags_select on public.tags for select to authenticated
    using (organization_id in (select public.get_auth_user_org_ids()) and deleted_at is null);
create policy tags_insert on public.tags for insert to authenticated
    with check (public.user_can_manage_content(organization_id));
create policy tags_update on public.tags for update to authenticated
    using (public.user_can_manage_content(organization_id) and deleted_at is null)
    with check (public.user_can_manage_content(organization_id));

create policy question_groups_select on public.question_groups for select to authenticated
    using (organization_id in (select public.get_auth_user_org_ids()) and deleted_at is null);
create policy question_groups_insert on public.question_groups for insert to authenticated
    with check (public.user_can_manage_content(organization_id));
create policy question_groups_update on public.question_groups for update to authenticated
    using (public.user_can_manage_content(organization_id) and deleted_at is null)
    with check (public.user_can_manage_content(organization_id));

create policy question_tags_select on public.question_tags for select to authenticated
    using (organization_id in (select public.get_auth_user_org_ids()));
create policy question_tags_insert on public.question_tags for insert to authenticated
    with check (public.user_can_manage_content(organization_id));
create policy question_tags_delete on public.question_tags for delete to authenticated
    using (public.user_can_manage_content(organization_id));

-- ---------------------------------------------------------------------------
-- RLS: exams, sections, items
-- ---------------------------------------------------------------------------

create policy exams_select on public.exams for select to authenticated
    using (organization_id in (select public.get_auth_user_org_ids()) and deleted_at is null);
create policy exams_insert on public.exams for insert to authenticated
    with check (public.user_can_manage_content(organization_id) and public.check_exam_quota(organization_id));
create policy exams_update on public.exams for update to authenticated
    using (public.user_can_manage_content(organization_id) and deleted_at is null)
    with check (public.user_can_manage_content(organization_id));

create policy exam_sections_select on public.exam_sections for select to authenticated
    using (organization_id in (select public.get_auth_user_org_ids()) and deleted_at is null);
create policy exam_sections_insert on public.exam_sections for insert to authenticated
    with check (public.user_can_manage_content(organization_id));
create policy exam_sections_update on public.exam_sections for update to authenticated
    using (public.user_can_manage_content(organization_id) and deleted_at is null)
    with check (public.user_can_manage_content(organization_id));

create policy exam_section_items_select on public.exam_section_items for select to authenticated
    using (organization_id in (select public.get_auth_user_org_ids()) and deleted_at is null);
create policy exam_section_items_insert on public.exam_section_items for insert to authenticated
    with check (public.user_can_manage_content(organization_id));
create policy exam_section_items_update on public.exam_section_items for update to authenticated
    using (public.user_can_manage_content(organization_id) and deleted_at is null)
    with check (public.user_can_manage_content(organization_id));

-- ---------------------------------------------------------------------------
-- RLS: students, assignments
-- ---------------------------------------------------------------------------

create policy students_select on public.students for select to authenticated
    using (organization_id in (select public.get_auth_user_org_ids()) and deleted_at is null);
create policy students_insert on public.students for insert to authenticated
    with check (public.user_can_manage_content(organization_id));
create policy students_update on public.students for update to authenticated
    using (public.user_can_manage_content(organization_id) and deleted_at is null)
    with check (public.user_can_manage_content(organization_id));

create policy exam_assignments_select on public.exam_assignments for select to authenticated
    using (organization_id in (select public.get_auth_user_org_ids()) and deleted_at is null);
create policy exam_assignments_insert on public.exam_assignments for insert to authenticated
    with check (public.user_can_manage_content(organization_id));
create policy exam_assignments_update on public.exam_assignments for update to authenticated
    using (public.user_can_manage_content(organization_id) and deleted_at is null)
    with check (public.user_can_manage_content(organization_id));

-- ---------------------------------------------------------------------------
-- RLS: attempts — teachers read all, students own only
-- ---------------------------------------------------------------------------

create policy exam_attempts_select on public.exam_attempts for select to authenticated
    using (
        organization_id in (select public.get_auth_user_org_ids())
        and deleted_at is null
        and (
            public.user_can_manage_content(organization_id)
            or student_id = public.get_student_id_for_user(organization_id)
        )
    );

create policy exam_attempts_insert on public.exam_attempts for insert to authenticated
    with check (
        organization_id in (select public.get_auth_user_org_ids())
        and student_id = public.get_student_id_for_user(organization_id)
    );

create policy exam_attempts_update on public.exam_attempts for update to authenticated
    using (
        organization_id in (select public.get_auth_user_org_ids())
        and deleted_at is null
        and (
            public.user_can_manage_content(organization_id)
            or (
                student_id = public.get_student_id_for_user(organization_id)
                and status in ('not_started', 'in_progress')
            )
        )
    )
    with check (organization_id in (select public.get_auth_user_org_ids()));

create policy attempt_answers_select on public.attempt_answers for select to authenticated
    using (
        organization_id in (select public.get_auth_user_org_ids())
        and deleted_at is null
        and (
            public.user_can_manage_content(organization_id)
            or exists (
                select 1 from public.exam_attempts ea
                where ea.id = attempt_id
                  and ea.student_id = public.get_student_id_for_user(organization_id)
            )
        )
    );

create policy attempt_answers_insert on public.attempt_answers for insert to authenticated
    with check (
        organization_id in (select public.get_auth_user_org_ids())
        and exists (
            select 1 from public.exam_attempts ea
            where ea.id = attempt_id
              and ea.student_id = public.get_student_id_for_user(organization_id)
              and ea.status in ('in_progress', 'not_started')
        )
    );

create policy attempt_answers_update on public.attempt_answers for update to authenticated
    using (
        organization_id in (select public.get_auth_user_org_ids())
        and deleted_at is null
        and (
            public.user_can_manage_content(organization_id)
            or exists (
                select 1 from public.exam_attempts ea
                where ea.id = attempt_id
                  and ea.student_id = public.get_student_id_for_user(organization_id)
                  and ea.status = 'in_progress'
            )
        )
    )
    with check (organization_id in (select public.get_auth_user_org_ids()));

create policy attempt_logs_select on public.attempt_logs for select to authenticated
    using (
        organization_id in (select public.get_auth_user_org_ids())
        and (
            public.user_can_manage_content(organization_id)
            or exists (
                select 1 from public.exam_attempts ea
                where ea.id = attempt_id
                  and ea.student_id = public.get_student_id_for_user(organization_id)
            )
        )
    );

create policy attempt_logs_insert on public.attempt_logs for insert to authenticated
    with check (
        organization_id in (select public.get_auth_user_org_ids())
        and exists (
            select 1 from public.exam_attempts ea
            where ea.id = attempt_id
              and ea.student_id = public.get_student_id_for_user(organization_id)
              and ea.status = 'in_progress'
        )
    );

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant select, insert, update on public.subjects to authenticated, service_role;
grant select, insert, update on public.topics to authenticated, service_role;
grant select, insert, update on public.tags to authenticated, service_role;
grant select, insert, update on public.question_groups to authenticated, service_role;
grant select, insert, delete on public.question_tags to authenticated, service_role;
grant select, insert, update on public.exams to authenticated, service_role;
grant select, insert, update on public.exam_sections to authenticated, service_role;
grant select, insert, update on public.exam_section_items to authenticated, service_role;
grant select, insert, update on public.students to authenticated, service_role;
grant select, insert, update on public.exam_assignments to authenticated, service_role;
grant select, insert, update on public.exam_attempts to authenticated, service_role;
grant select, insert, update on public.attempt_answers to authenticated, service_role;
grant select, insert on public.attempt_logs to authenticated, service_role;

-- Drop legacy enum if unused
drop type if exists public.question_type;
