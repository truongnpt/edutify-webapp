-- Sprint F: per-exam attempt limit (null = unlimited)
alter table public.exams
    add column if not exists max_attempts integer
    check (max_attempts is null or max_attempts >= 1);

comment on column public.exams.max_attempts is
    'Max completed attempts per student for this exam (excluding preview). NULL = unlimited.';
