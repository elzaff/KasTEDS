-- KasTEDS communal finance schema for Supabase.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'MEMBER' check (role in ('ADMIN', 'MEMBER')),
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text not null default 'circle-dot',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('INCOME', 'EXPENSE')),
  amount numeric(14,2) not null check (amount > 0),
  title text not null,
  category_id uuid references public.categories(id),
  transaction_date date not null default current_date,
  description text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.budget_items (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  amount numeric(14,2) not null default 0 check (amount >= 0),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.categories (name, icon) values
  ('Iuran Bulanan', 'coins'), ('Listrik', 'zap'), ('WiFi', 'wifi'),
  ('Air PDAM', 'droplets'), ('Kebersihan', 'sparkles'), ('Perbaikan', 'wrench'),
  ('Perlengkapan Rumah', 'shopping-basket'), ('Kas', 'wallet'), ('Lainnya', 'shapes')
on conflict (name) do nothing;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budget_items enable row level security;

create policy "authenticated users can read profiles" on public.profiles for select to authenticated using (true);
create policy "authenticated users can read categories" on public.categories for select to authenticated using (active = true);
create policy "authenticated users can read transactions" on public.transactions for select to authenticated using (true);
create policy "authenticated users can read budget" on public.budget_items for select to authenticated using (active = true);

create policy "admins manage transactions" on public.transactions for all to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'ADMIN')
) with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'ADMIN')
);

create policy "admins manage budget" on public.budget_items for all to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'ADMIN')
) with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'ADMIN')
);
