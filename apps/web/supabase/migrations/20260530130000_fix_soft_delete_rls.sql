/*
 * Fix soft delete under RLS.
 *
 * PostgreSQL requires SELECT policies to pass on the NEW row after UPDATE.
 * Setting deleted_at violates SELECT policies that filter deleted_at IS NULL,
 * so client-side UPDATE soft deletes fail with error 42501.
 *
 * Use SECURITY DEFINER helpers that verify permissions then bypass RLS.
 */

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
        'question_groups'
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

create or replace function public.soft_delete_org_rows_by_column(
    p_table_name text,
    p_organization_id uuid,
    p_column_name text,
    p_column_value uuid
)
returns integer
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

    if p_table_name = 'questions' and p_column_name = 'bank_id' then
        null;
    elsif p_table_name = 'question_options' and p_column_name = 'question_id' then
        null;
    elsif p_table_name = 'exam_sections' and p_column_name = 'exam_id' then
        null;
    elsif p_table_name = 'exam_section_items' and p_column_name = 'section_id' then
        null;
    else
        raise exception 'Invalid table/column combination'
            using errcode = '22023';
    end if;

    v_sql := format(
        'update public.%I set deleted_at = now() where %I = $1 and organization_id = $2 and deleted_at is null',
        p_table_name,
        p_column_name
    );

    execute v_sql using p_column_value, p_organization_id;

    get diagnostics v_count = row_count;

    return v_count;
end;
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

    return coalesce(v_current_count, 0) < coalesce(v_max_exams, 5);
end;
$$;

grant execute on function public.soft_delete_org_row(text, uuid, uuid) to authenticated, service_role;
grant execute on function public.soft_delete_org_rows_by_column(text, uuid, text, uuid) to authenticated, service_role;
