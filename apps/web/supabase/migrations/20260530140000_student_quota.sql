/*
 * Student quota + soft delete support for students table.
 */

create or replace function public.get_org_student_count(p_organization_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
    select count(*)::integer
    from public.students
    where organization_id = p_organization_id
      and deleted_at is null;
$$;

create or replace function public.check_student_quota(p_organization_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_max_students integer;
    v_current_count integer;
begin
    select p.max_students into v_max_students
    from public.subscriptions s
    join public.plans p on p.id = s.plan_id
    where s.organization_id = p_organization_id
      and s.status = 'active'
      and s.deleted_at is null
    order by s.started_at desc
    limit 1;

    if v_max_students is null then
        select max_students into v_max_students from public.plans where slug = 'free';
    end if;

    v_current_count := public.get_org_student_count(p_organization_id);

    return coalesce(v_current_count, 0) < coalesce(v_max_students, 20);
end;
$$;

grant execute on function public.get_org_student_count(uuid) to authenticated, service_role;
grant execute on function public.check_student_quota(uuid) to authenticated, service_role;

drop policy if exists students_insert on public.students;

create policy students_insert on public.students for insert to authenticated
    with check (
        public.user_can_manage_content(organization_id)
        and public.check_student_quota(organization_id)
    );

create or replace function public.soft_delete_org_row(
    p_table_name text,
    p_row_id uuid,
    p_organization_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_sql text;
    v_count integer;
begin
    if not public.user_can_manage_content(p_organization_id) then
        raise exception 'Permission denied'
            using errcode = '42501';
    end if;

    if p_table_name not in (
        'question_banks',
        'questions',
        'question_options',
        'exams',
        'exam_sections',
        'exam_section_items',
        'subjects',
        'topics',
        'tags',
        'question_groups',
        'students'
    ) then
        raise exception 'Invalid table name'
            using errcode = '22023';
    end if;

    v_sql := format(
        'update public.%I set deleted_at = now() where id = $1 and organization_id = $2 and deleted_at is null',
        p_table_name
    );

    execute v_sql using p_row_id, p_organization_id;

    get diagnostics v_count = row_count;

    return v_count > 0;
end;
$$;
