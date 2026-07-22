-- Community Alert System: groups, recipients, delivery audit and escalation.
create type public.alert_channel as enum ('sms','whatsapp');
create type public.alert_delivery_status as enum ('queued','sent','delivered','failed');

create table public.community_watch_groups (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null, community text not null, ward text, leader_id uuid references auth.users(id), leader_name text,
  escalation_minutes integer not null default 15 check (escalation_minutes between 1 and 1440),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.community_group_members (
  id uuid primary key default gen_random_uuid(), group_id uuid not null references public.community_watch_groups(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade, name text not null, phone text not null,
  whatsapp_target text, preferred_language text not null default 'en', sms_enabled boolean not null default true,
  whatsapp_enabled boolean not null default false, unique(group_id,phone)
);
create table public.emergency_contacts (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null, category text not null check(category in ('police','hospital','fire_service','community_leader','volunteer','other')),
  phone text not null, whatsapp_target text, community text, active boolean not null default true,
  incident_types text[] not null default '{}', authority_level integer not null default 1 check(authority_level between 1 and 10), created_at timestamptz not null default now()
);
create table public.community_alerts (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  incident_id text, incident_type text not null, summary text not null, location text not null,
  threat_level text not null check(threat_level in ('low','medium','high','critical')), instructions text not null,
  occurred_at timestamptz not null, language text not null default 'en', status text not null default 'active' check(status in ('active','resolved')),
  media jsonb not null default '[]'::jsonb,
  escalation_level integer not null default 0, next_escalation_at timestamptz, created_at timestamptz not null default now(), resolved_at timestamptz
);
create table public.community_alert_targets (alert_id uuid references public.community_alerts(id) on delete cascade, group_id uuid references public.community_watch_groups(id) on delete cascade, primary key(alert_id,group_id));
create table public.alert_deliveries (
  id uuid primary key default gen_random_uuid(), alert_id uuid not null references public.community_alerts(id) on delete cascade,
  channel public.alert_channel not null, recipient text not null, provider text not null, provider_message_id text,
  status public.alert_delivery_status not null default 'queued', error text, attempts integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.alert_escalations (
  id uuid primary key default gen_random_uuid(), alert_id uuid not null references public.community_alerts(id) on delete cascade,
  from_level integer not null, to_level integer not null, reason text not null, notified_contacts uuid[] not null default '{}', created_at timestamptz not null default now()
);
create index community_alerts_escalation_idx on public.community_alerts(next_escalation_at) where status='active';
create index emergency_contacts_matching_idx on public.emergency_contacts using gin(incident_types);
alter table public.community_watch_groups enable row level security; alter table public.community_group_members enable row level security;
alter table public.emergency_contacts enable row level security; alter table public.community_alerts enable row level security;
alter table public.community_alert_targets enable row level security; alter table public.alert_deliveries enable row level security; alter table public.alert_escalations enable row level security;
create policy "owners manage groups" on public.community_watch_groups for all using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy "owners manage members" on public.community_group_members for all using(exists(select 1 from public.community_watch_groups g where g.id=group_id and g.owner_id=auth.uid())) with check(exists(select 1 from public.community_watch_groups g where g.id=group_id and g.owner_id=auth.uid()));
create policy "owners manage contacts" on public.emergency_contacts for all using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy "owners manage alerts" on public.community_alerts for all using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy "owners manage targets" on public.community_alert_targets for all using(exists(select 1 from public.community_alerts a where a.id=alert_id and a.owner_id=auth.uid())) with check(exists(select 1 from public.community_alerts a where a.id=alert_id and a.owner_id=auth.uid()));
create policy "owners manage deliveries" on public.alert_deliveries for all using(exists(select 1 from public.community_alerts a where a.id=alert_id and a.owner_id=auth.uid())) with check(exists(select 1 from public.community_alerts a where a.id=alert_id and a.owner_id=auth.uid()));
create policy "owners manage escalations" on public.alert_escalations for all using(exists(select 1 from public.community_alerts a where a.id=alert_id and a.owner_id=auth.uid())) with check(exists(select 1 from public.community_alerts a where a.id=alert_id and a.owner_id=auth.uid()));
