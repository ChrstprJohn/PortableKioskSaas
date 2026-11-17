create table public.platform_operators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 60),
  owner_email text not null,
  active boolean not null default true,
  published boolean not null default false,
  description text not null default '',
  logo_url text,
  accent_color text not null default '#176b58' check (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  registration_request_id uuid not null unique,
  created_at timestamptz not null default now()
);

create table public.business_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'cashier'))
);
create index on public.business_memberships(business_id);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  category text not null default 'Menu' check (char_length(category) between 1 and 60),
  description text not null default '' check (char_length(description) <= 500),
  price_centavos integer not null check (price_centavos between 1 and 10000000),
  available boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.menu_items(business_id);

create table public.kiosk_orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  code text not null check (code ~ '^[0-9]{4}$'),
  request_id uuid not null,
  request_hash text not null,
  items jsonb not null check (jsonb_typeof(items) = 'array'),
  total_centavos integer not null check (total_centavos > 0),
  status text not null default 'pending' check (status in ('pending', 'completed', 'cancelled', 'expired')),
  expires_at timestamptz not null default now() + interval '30 minutes',
  completed_at timestamptz,
  completed_by uuid references auth.users(id),
  completion_request_id uuid,
  cash_received_centavos integer,
  created_at timestamptz not null default now(),
  unique (business_id, request_id),
  check (status <> 'completed' or (completed_at is not null and completed_by is not null and cash_received_centavos >= total_centavos))
);
create unique index kiosk_pending_codes on public.kiosk_orders(business_id, code) where status = 'pending';
create index on public.kiosk_orders(business_id, created_at desc);

create table public.audit_entries (
  id bigint generated always as identity primary key,
  business_id uuid references public.businesses(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_id uuid,
  created_at timestamptz not null default now()
);

create function public.can_read_business(target_business uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.platform_operators where user_id = auth.uid())
  or exists (
    select 1 from public.business_memberships m join public.businesses b on b.id = m.business_id
    where m.user_id = auth.uid() and m.business_id = target_business and b.active
  );
$$;
revoke all on function public.can_read_business(uuid) from public;
grant execute on function public.can_read_business(uuid) to authenticated;

alter table public.platform_operators enable row level security;
alter table public.businesses enable row level security;
alter table public.business_memberships enable row level security;
alter table public.menu_items enable row level security;
alter table public.kiosk_orders enable row level security;
alter table public.audit_entries enable row level security;

create policy operator_self on public.platform_operators for select to authenticated using (user_id = auth.uid());
create policy business_read on public.businesses for select to authenticated using (public.can_read_business(id));
create policy membership_self on public.business_memberships for select to authenticated using (user_id = auth.uid());
create policy menu_read on public.menu_items for select to authenticated using (public.can_read_business(business_id));
create policy order_read on public.kiosk_orders for select to authenticated using (public.can_read_business(business_id));
create policy audit_read on public.audit_entries for select to authenticated using (public.can_read_business(business_id));

-- All mutations and anonymous kiosk access go through validated Express endpoints.
revoke all on public.platform_operators, public.businesses, public.business_memberships, public.menu_items, public.kiosk_orders, public.audit_entries from anon, authenticated;
grant select on public.platform_operators, public.businesses, public.business_memberships, public.menu_items, public.kiosk_orders, public.audit_entries to authenticated;

-- Public logos are intentional branding assets. Only the backend may upload.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('business-logos', 'business-logos', true, 1048576, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;
