/*
 * Link pre-created student rows (by email) to authenticated user accounts.
 */

create or replace function public.link_student_account(
    p_organization_id uuid,
    p_user_id uuid,
    p_email text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_student_id uuid;
begin
    select s.id into v_student_id
    from public.students s
    where s.organization_id = p_organization_id
      and lower(s.email) = lower(p_email)
      and s.deleted_at is null
      and (s.user_id is null or s.user_id = p_user_id)
    order by s.created_at asc
    limit 1;

    if v_student_id is null then
        return null;
    end if;

    update public.students
    set user_id = p_user_id
    where id = v_student_id
      and user_id is null;

    return v_student_id;
end;
$$;

grant execute on function public.link_student_account(uuid, uuid, text) to authenticated, service_role;
