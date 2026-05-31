-- Storage buckets and policies (local `supabase start` runs this after storage-api init)

-- Account image
insert into storage.buckets (id, name, public)
values ('account_image', 'account_image', true)
on conflict (id) do nothing;

create or replace function kit.get_storage_filename_as_uuid(name text)
returns uuid
language plpgsql
set search_path = ''
as $$
begin
    return replace(
        storage.filename(name),
        concat('.', storage.extension(name)),
        ''
    )::uuid;
end;
$$;

grant execute on function kit.get_storage_filename_as_uuid(text) to authenticated, service_role;

drop policy if exists account_image on storage.objects;

create policy account_image on storage.objects
for all
using (
    bucket_id = 'account_image'
    and kit.get_storage_filename_as_uuid(name) = auth.uid()
)
with check (
    bucket_id = 'account_image'
    and kit.get_storage_filename_as_uuid(name) = auth.uid()
);

-- Organization logos
insert into storage.buckets (id, name, public)
values ('organization_logos', 'organization_logos', true)
on conflict (id) do nothing;

drop policy if exists organization_logos on storage.objects;

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

-- Payment proofs
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

-- Attempt uploads
insert into storage.buckets (id, name, public)
values ('attempt_uploads', 'attempt_uploads', false)
on conflict (id) do nothing;

drop policy if exists attempt_uploads_insert on storage.objects;
drop policy if exists attempt_uploads_select on storage.objects;

create policy attempt_uploads_insert on storage.objects
for insert to authenticated
with check (
    bucket_id = 'attempt_uploads'
    and (storage.foldername(name))[1]::uuid in (
        select public.get_auth_user_org_ids()
    )
);

create policy attempt_uploads_select on storage.objects
for select to authenticated
using (
    bucket_id = 'attempt_uploads'
    and (storage.foldername(name))[1]::uuid in (
        select public.get_auth_user_org_ids()
    )
);
