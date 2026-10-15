-- ===========================================================================
-- Baton — Supabase database schema
-- Run this ONCE in Supabase: SQL Editor -> New query -> paste -> Run.
--
-- Security model: Row Level Security (RLS) is ON for every table and there are
-- NO public policies. The browser can never read or write these tables
-- directly. Only the Python backend can, using the secret key that is stored
-- as an environment variable on Vercel.
-- ===========================================================================

create extension if not exists pgcrypto;

-- A share house. join_code lets housemates join the same record.
create table if not exists public.houses (
  id          uuid primary key default gen_random_uuid(),
  address     text not null check (char_length(address) between 1 and 200),
  total_bond  numeric(10,2) not null check (total_bond > 0),
  join_code   text not null unique,
  created_by  uuid,
  created_at  timestamptz not null default now()
);

-- A person who lives (or lived) in a house. user_id is null for housemates
-- who have not created an account yet. First names only (data minimisation).
create table if not exists public.residents (
  id                uuid primary key default gen_random_uuid(),
  house_id          uuid not null references public.houses(id) on delete cascade,
  user_id           uuid,
  first_name        text not null check (char_length(first_name) between 1 and 40),
  colour            text not null check (colour in ('orange','blue','purple','green')),
  is_current        boolean not null default true,
  move_in_date      date not null,
  move_out_date     date,
  bond_contribution numeric(10,2) check (bond_contribution >= 0),
  created_at        timestamptz not null default now()
);

-- Every dated event on the house record.
create table if not exists public.timeline_entries (
  id                    uuid primary key default gen_random_uuid(),
  house_id              uuid not null references public.houses(id) on delete cascade,
  kind                  text not null check (kind in ('house-created','damage','handover','move-out','move-in')),
  entry_date            date not null,
  description           text not null check (char_length(description) between 1 and 200),
  resident_id           uuid references public.residents(id) on delete set null,
  awaiting_confirmation boolean not null default false,
  room                  text check (room in ('kitchen','bathroom','bedroom','living room','laundry','outdoor')),
  note                  text check (note is null or char_length(note) <= 200),
  created_by            uuid,
  created_at            timestamptz not null default now()
);

-- Every handover attempt, agreed or disputed (an audit trail).
create table if not exists public.handovers (
  id                   uuid primary key default gen_random_uuid(),
  house_id             uuid not null references public.houses(id) on delete cascade,
  handover_date        date not null,
  outgoing_resident_id uuid not null references public.residents(id),
  incoming_resident_id uuid references public.residents(id),
  incoming_name        text not null,
  incoming_colour      text not null check (incoming_colour in ('orange','blue','purple','green')),
  incoming_response    text not null check (incoming_response in ('agree','dispute')),
  consent_given        boolean not null check (consent_given = true),
  signed_by_outgoing   text not null,
  signed_by_incoming   text not null,
  rooms_checked        integer not null default 0,
  damage_items_logged  integer not null default 0,
  created_at           timestamptz not null default now()
);

create index if not exists residents_user_idx on public.residents(user_id);
create index if not exists residents_house_idx on public.residents(house_id);
create index if not exists timeline_house_idx on public.timeline_entries(house_id);
create index if not exists handovers_house_idx on public.handovers(house_id);

-- Lock every table: RLS on, no policies => no access with the public key.
alter table public.houses           enable row level security;
alter table public.residents        enable row level security;
alter table public.timeline_entries enable row level security;
alter table public.handovers        enable row level security;

-- ---------------------------------------------------------------------------
-- Demo house (join code BATON42), same data as the Assignment 2 MVP.
-- Aditya, Sana and Josh are housemates without accounts; whoever joins with
-- BATON42 takes the free colour (green).
-- ---------------------------------------------------------------------------
insert into public.houses (id, address, total_bond, join_code)
values ('00000000-0000-0000-0000-000000000042', '42 Rathdowne Street', 2400, 'BATON42')
on conflict (id) do nothing;

insert into public.residents (id, house_id, first_name, colour, move_in_date, bond_contribution) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000042', 'Aditya', 'orange', '2026-02-03', 600),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000042', 'Sana',   'blue',   '2026-02-03', 600),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-000000000042', 'Josh',   'purple', '2026-02-03', 600)
on conflict (id) do nothing;

insert into public.timeline_entries (id, house_id, kind, entry_date, description, resident_id, awaiting_confirmation, room) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000042', 'house-created', '2026-02-03', 'House created — 42 Rathdowne Street', null, false, null),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000042', 'damage', '2026-03-14', 'Shower screen cracked', '00000000-0000-0000-0000-0000000000a1', true, 'bathroom'),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-000000000042', 'damage', '2026-04-19', 'Carpet stain in the hallway', null, false, 'living room'),
  ('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-000000000042', 'damage', '2026-06-02', 'Oven door hinge broken', '00000000-0000-0000-0000-0000000000a2', true, 'kitchen')
on conflict (id) do nothing;
