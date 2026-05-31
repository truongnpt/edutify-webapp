-- Sprint H: storage for file_upload question answers (see seed.sql when storage is not ready yet)
do $attempt_uploads_storage$
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
end $attempt_uploads_storage$;
