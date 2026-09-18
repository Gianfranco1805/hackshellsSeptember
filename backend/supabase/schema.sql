-- Safety Walking Companion -- schema for Supabase/Postgres
-- Run this in the Supabase SQL editor (or `supabase db push` if you wire up the CLI).

create extension if not exists "pgcrypto";

do $$ begin
  create type contact_type as enum ('primary', 'emergency');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type walk_status as enum ('active', 'resolved', 'escalated');
exception
  when duplicate_object then null;
end $$;

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  phone text not null,
  type contact_type not null,
  created_at timestamptz not null default now()
);

create table if not exists walk_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  primary_contact_id uuid references contacts (id),
  emergency_contact_id uuid references contacts (id),

  check_in_interval_seconds integer not null,
  current_level integer not null default 1,
  status walk_status not null default 'active',

  -- Zero-setup contact link: knowing this token is the only thing required
  -- to view (sanitized) status. Not guessable, not tied to a Supabase login.
  share_token uuid not null default gen_random_uuid(),

  started_at timestamptz not null default now(),
  last_ping_time timestamptz not null default now(),
  last_response_time timestamptz,

  last_known_lat double precision,
  last_known_lng double precision,
  last_location_timestamp timestamptz,
  is_stationary boolean not null default false,

  last_alert_summary text,
  resolved_at timestamptz
);

create unique index if not exists idx_walk_sessions_share_token on walk_sessions (share_token);
create index if not exists idx_walk_sessions_user_id on walk_sessions (user_id);

create table if not exists location_pings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references walk_sessions (id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  recorded_at timestamptz not null default now()
);

create index if not exists idx_location_pings_session_id on location_pings (session_id, recorded_at desc);

create table if not exists check_in_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references walk_sessions (id) on delete cascade,
  event_type text not null, -- 'checkin_ok' | 'level_change' | 'status_check' | 'resolved'
  level integer,
  summary text,
  created_at timestamptz not null default now()
);

create index if not exists idx_check_in_logs_session_id on check_in_logs (session_id, created_at desc);

-- Row Level Security. The backend uses the service-role key (bypasses RLS)
-- for all app logic, but these policies protect the data if the frontend
-- ever queries Supabase directly (e.g. for Auth) and as defense-in-depth.
alter table contacts enable row level security;
alter table walk_sessions enable row level security;
alter table location_pings enable row level security;
alter table check_in_logs enable row level security;

drop policy if exists "Users manage their own contacts" on contacts;
create policy "Users manage their own contacts" on contacts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage their own walk sessions" on walk_sessions;
create policy "Users manage their own walk sessions" on walk_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage pings for their own sessions" on location_pings;
create policy "Users manage pings for their own sessions" on location_pings
  for all using (
    exists (
      select 1 from walk_sessions w
      where w.id = location_pings.session_id and w.user_id = auth.uid()
    )
  );

drop policy if exists "Users manage logs for their own sessions" on check_in_logs;
create policy "Users manage logs for their own sessions" on check_in_logs
  for all using (
    exists (
      select 1 from walk_sessions w
      where w.id = check_in_logs.session_id and w.user_id = auth.uid()
    )
  );

-- Note: no RLS policy grants anonymous/public access to walk_sessions by
-- share_token. The public contact link (GET /public/walks/{share_token}/status)
-- is served exclusively through the backend using the service-role key, which
-- returns a sanitized subset of fields (see app/schemas.py PublicWalkStatusOut).
