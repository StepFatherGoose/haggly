-- Haggly Pro billing/auth tables

create table if not exists public.billing_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique not null,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscription_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_code text not null default 'haggly_pro',
  is_pro boolean not null default false,
  subscription_status text,
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now(),
  last_stripe_event_id text
);

create table if not exists public.stripe_webhook_events (
  stripe_event_id text primary key,
  event_type text not null,
  status text not null default 'processed',
  processed_at timestamptz not null default now()
);

alter table public.billing_customers enable row level security;
alter table public.subscription_entitlements enable row level security;
alter table public.stripe_webhook_events enable row level security;

drop policy if exists "users_can_read_own_billing_customer" on public.billing_customers;
create policy "users_can_read_own_billing_customer"
  on public.billing_customers for select
  using (auth.uid() = user_id);

drop policy if exists "users_can_read_own_entitlement" on public.subscription_entitlements;
create policy "users_can_read_own_entitlement"
  on public.subscription_entitlements for select
  using (auth.uid() = user_id);

-- No client-side insert/update/delete policies for billing tables.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists billing_customers_set_updated_at on public.billing_customers;
create trigger billing_customers_set_updated_at
before update on public.billing_customers
for each row execute procedure public.set_updated_at();

drop trigger if exists subscription_entitlements_set_updated_at on public.subscription_entitlements;
create trigger subscription_entitlements_set_updated_at
before update on public.subscription_entitlements
for each row execute procedure public.set_updated_at();
