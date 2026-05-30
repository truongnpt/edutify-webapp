/*
 * Sprint K: Stripe billing alongside bank transfer
 */

create type public.payment_method as enum ('bank_transfer', 'stripe');

alter table public.plans
    add column if not exists stripe_price_id text;

alter table public.organizations
    add column if not exists stripe_customer_id text;

alter table public.payments
    alter column proof_image_url drop not null;

alter table public.payments
    add column if not exists payment_method public.payment_method not null default 'bank_transfer',
    add column if not exists stripe_checkout_session_id text,
    add column if not exists stripe_subscription_id text;

create unique index if not exists idx_payments_stripe_session
    on public.payments (stripe_checkout_session_id)
    where stripe_checkout_session_id is not null;

-- Activate plan after Stripe checkout (service role / webhook only)
create or replace function public.activate_organization_plan(
    p_organization_id uuid,
    p_plan_id uuid,
    p_activated_by uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
    update public.subscriptions
    set status = 'cancelled'
    where organization_id = p_organization_id
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
        p_organization_id,
        p_plan_id,
        'active',
        now(),
        p_activated_by
    );

    return true;
end;
$$;

grant execute on function public.activate_organization_plan(uuid, uuid, uuid) to service_role;
