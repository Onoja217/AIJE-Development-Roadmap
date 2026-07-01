
-- 1) SECURITY DEFINER functions: lock down execution
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create or replace function public.purge_face_audit()
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  retention integer;
  deleted_count integer;
begin
  select audit_retention_days into retention from public.face_privacy_settings where user_id = auth.uid();
  if retention is null or retention <= 0 then
    return 0;
  end if;
  with del as (
    delete from public.face_recognition_audit
    where user_id = auth.uid()
      and created_at < now() - (retention || ' days')::interval
    returning id
  )
  select count(*) into deleted_count from del;
  return coalesce(deleted_count, 0);
end;
$$;

-- 2) Hide GraphQL from anon/authenticated (app uses PostgREST only)
revoke usage on schema graphql from anon, authenticated;
revoke usage on schema graphql_public from anon, authenticated;

-- 3) Drop broad public SELECT on storage.objects for the avatars bucket
--    Public bucket direct URLs still work; this only removes list capability.
drop policy if exists "Public can view avatars" on storage.objects;

-- 4) Camera stream URL server-side validation (blocks SSRF-prone hosts)
create or replace function public.validate_camera_stream_url()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  url text := new.stream_url;
  host text;
begin
  if url is null or length(url) = 0 or length(url) > 2048 then
    raise exception 'invalid stream_url length';
  end if;
  if url !~* '^(https?|rtsp|rtmp|hls)://' then
    raise exception 'stream_url must use http, https, rtsp, rtmp, or hls scheme';
  end if;
  host := lower(substring(url from '^[a-z]+://([^/:?#]+)'));
  if host is null or length(host) = 0 then
    raise exception 'stream_url has no host';
  end if;
  if host in ('localhost', '0.0.0.0', '::1', '[::1]')
     or host ~ '^127\.'
     or host ~ '^10\.'
     or host ~ '^192\.168\.'
     or host ~ '^169\.254\.'
     or host ~ '^172\.(1[6-9]|2[0-9]|3[0-1])\.'
     or host ~ '\.local$'
     or host ~ '\.internal$'
  then
    raise exception 'stream_url must not reference private, loopback, or internal addresses';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_cameras_stream_url on public.cameras;
create trigger validate_cameras_stream_url
before insert or update of stream_url on public.cameras
for each row execute function public.validate_camera_stream_url();

-- 5) payment_events: explicitly deny client writes
create policy "no client inserts on payment_events"
  on public.payment_events
  as restrictive
  for insert
  to authenticated, anon
  with check (false);

create policy "no client deletes on payment_events"
  on public.payment_events
  as restrictive
  for delete
  to authenticated, anon
  using (false);

create policy "no client updates on payment_events"
  on public.payment_events
  as restrictive
  for update
  to authenticated, anon
  using (false)
  with check (false);

-- 6) subscriptions: remove client UPDATE (Paystack fields managed by webhook only)
drop policy if exists "users update own subscription" on public.subscriptions;
-- Also prevent clients from inserting arbitrary paystack codes at signup
drop policy if exists "users insert own subscription" on public.subscriptions;
create policy "users insert own subscription minimal"
  on public.subscriptions
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and paystack_customer_code is null
    and paystack_subscription_code is null
    and paystack_email_token is null
    and status = 'inactive'
  );

-- 7) realtime.messages: enable RLS (deny broadcast/presence by default)
--    Does NOT affect postgres_changes, which uses each table's own RLS.
alter table realtime.messages enable row level security;
