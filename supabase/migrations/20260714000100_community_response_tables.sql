-- Community response data tables for offline-capable alerting and coordination

create table if not exists public.community_alerts (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now() not null,
  user_id uuid not null,
  title text not null,
  message text not null,
  priority text not null,
  channel text not null,
  status text default 'pending' not null
);

create table if not exists public.community_reports (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now() not null,
  user_id uuid not null,
  category text not null,
  location text,
  details text not null,
  contact_phone text,
  status text default 'pending' not null
);

create table if not exists public.community_watch_groups (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now() not null,
  user_id uuid not null,
  group_name text not null,
  area text,
  members_count integer not null default 0,
  contact_phone text,
  notes text
);

create table if not exists public.resource_locations (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now() not null,
  user_id uuid not null,
  name text not null,
  resource_type text not null,
  description text,
  address text,
  contact_phone text,
  is_safe boolean not null default true
);

create table if not exists public.family_reunifications (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now() not null,
  user_id uuid not null,
  name text not null,
  relation text,
  last_seen_location text,
  last_seen_date date,
  contact_phone text,
  status text not null default 'missing',
  notes text
);

alter table public.community_alerts enable row level security;
alter table public.community_reports enable row level security;
alter table public.community_watch_groups enable row level security;
alter table public.resource_locations enable row level security;
alter table public.family_reunifications enable row level security;

create policy "allow authenticated users to select community alerts"
  on public.community_alerts
  for select
  to authenticated
  using (true);

create policy "allow authenticated users to insert community alerts"
  on public.community_alerts
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "allow authenticated users to select community reports"
  on public.community_reports
  for select
  to authenticated
  using (true);

create policy "allow authenticated users to insert community reports"
  on public.community_reports
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "allow authenticated users to select community watch groups"
  on public.community_watch_groups
  for select
  to authenticated
  using (true);

create policy "allow authenticated users to insert community watch groups"
  on public.community_watch_groups
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "allow authenticated users to select resource locations"
  on public.resource_locations
  for select
  to authenticated
  using (true);

create policy "allow authenticated users to insert resource locations"
  on public.resource_locations
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "allow authenticated users to select family reunifications"
  on public.family_reunifications
  for select
  to authenticated
  using (true);

create policy "allow authenticated users to insert family reunifications"
  on public.family_reunifications
  for insert
  to authenticated
  with check (auth.uid() = user_id);
