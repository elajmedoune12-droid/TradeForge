-- ============================================================
-- TRADEFORGE — Supabase Schema (PostgreSQL compatible)
-- Copiez ce SQL dans l'éditeur SQL de votre projet Supabase
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── TRADES ─────────────────────────────────────────────────
create table if not exists trades (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  market text not null,
  type text check (type in ('buy', 'sell')) not null,
  rr_planned numeric(5,2),
  rr_won numeric(5,2),
  result text check (result in ('tp', 'sl', 'be', 'missed')) not null,
  emotion text,
  respect_plan boolean default true,
  discipline_score integer check (discipline_score between 1 and 10),
  notes text,
  images jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- RLS pour trades
alter table trades enable row level security;

drop policy if exists "Users see own trades" on trades;
create policy "Users see own trades" on trades
  for all using (auth.uid() = user_id);

-- ─── HINDSIGHT (lié aux trades) ─────────────────────────────
create table if not exists hindsight (
  id uuid primary key default uuid_generate_v4(),
  trade_id uuid references trades(id) on delete cascade not null unique,
  user_id uuid references auth.users(id) on delete cascade not null,
  main_error text not null,
  lesson text not null,
  rule text not null,
  notes text,
  tags text[] default '{}',
  images jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table hindsight enable row level security;
drop policy if exists "Users see own hindsight" on hindsight;
create policy "Users see own hindsight" on hindsight
  for all using (auth.uid() = user_id);

-- ─── RULES ──────────────────────────────────────────────────
create table if not exists rules (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  text text not null,
  active boolean default true,
  created_at timestamptz default now()
);

alter table rules enable row level security;
drop policy if exists "Users see own rules" on rules;
create policy "Users see own rules" on rules
  for all using (auth.uid() = user_id);

-- ─── HINDSIGHTS STANDALONE ──────────────────────────────────
create table if not exists hindsights_standalone (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  timeframes text[] default '{}',
  markets text[] default '{}',
  notes text,
  images jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table hindsights_standalone enable row level security;
drop policy if exists "Users see own hindsights_standalone" on hindsights_standalone;
create policy "Users see own hindsights_standalone" on hindsights_standalone
  for all using (auth.uid() = user_id);

-- ─── FONCTION POUR updated_at ───────────────────────────────
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_hindsight_updated_at on hindsight;
create trigger update_hindsight_updated_at
  before update on hindsight
  for each row execute function update_updated_at_column();

drop trigger if exists update_hindsights_standalone_updated_at on hindsights_standalone;
create trigger update_hindsights_standalone_updated_at
  before update on hindsights_standalone
  for each row execute function update_updated_at_column();

-- ─── STORAGE POLICIES ───────────────────────────────────────
drop policy if exists "Authenticated users can upload" on storage.objects;
create policy "Authenticated users can upload"
  on storage.objects for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "Public read" on storage.objects;
create policy "Public read"
  on storage.objects for select
  using (bucket_id = 'trade-images');

-- ─── INDEX POUR PERFORMANCES ────────────────────────────────
create index if not exists idx_trades_user_id on trades(user_id);
create index if not exists idx_trades_date on trades(date);
create index if not exists idx_hindsight_user_id on hindsight(user_id);
create index if not exists idx_hindsight_trade_id on hindsight(trade_id);
create index if not exists idx_rules_user_id on rules(user_id);
create index if not exists idx_hindsights_standalone_user_id on hindsights_standalone(user_id);