-- Switch plan prices from USD to VND (monthly)
update public.plans
set price_monthly = 799000,
    updated_at = now()
where slug = 'pro';

update public.plans
set price_monthly = 2490000,
    updated_at = now()
where slug = 'enterprise';
