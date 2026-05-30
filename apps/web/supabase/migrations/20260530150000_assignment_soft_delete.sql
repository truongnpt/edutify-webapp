/*
 * Allow soft delete for exam_assignments via SECURITY DEFINER helper.
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
        'question_groups',
        'students',
        'exam_assignments'
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
