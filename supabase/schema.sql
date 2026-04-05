-- Wholefed Database Schema
-- Run this in Supabase SQL Editor after creating the project

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Users profile (auto-created on first sign-in)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- Health conditions per user
create table if not exists user_conditions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  conditions jsonb default '[]'::jsonb,
  profile jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table user_conditions enable row level security;
create policy "Users can manage own conditions" on user_conditions for all using (auth.uid() = user_id);

-- Scan history
create table if not exists scans (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text default 'Meal Scan',
  photo_url text,
  score integer default 0,
  variety integer default 0,
  nutrition integer default 0,
  verdict text,
  ingredients jsonb default '[]'::jsonb,
  insights jsonb default '[]'::jsonb,
  annotations jsonb default '[]'::jsonb,
  upgrade jsonb,
  created_at timestamptz default now()
);

alter table scans enable row level security;
create policy "Users can view own scans" on scans for select using (auth.uid() = user_id);
create policy "Users can insert own scans" on scans for insert with check (auth.uid() = user_id);
create policy "Users can delete own scans" on scans for delete using (auth.uid() = user_id);

-- Index for fast history queries
create index if not exists scans_user_created on scans (user_id, created_at desc);

-- Auto-create profile on first sign-up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id) values (new.id);
  insert into user_conditions (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Subscription tracking
create table if not exists subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null unique,
  status text default 'free' check (status in ('free', 'pro', 'expired')),
  provider text check (provider in ('apple', 'manual', null)),
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table subscriptions enable row level security;
create policy "Users can view own subscription" on subscriptions for select using (auth.uid() = user_id);

-- Storage bucket for scan photos
-- NOTE: Create 'scan-photos' bucket manually in Supabase Dashboard > Storage
-- Set it to PUBLIC so photos can be displayed

-- Account deletion (GDPR / App Store requirement)
create or replace function delete_user_data()
returns void as $$
begin
  delete from scans where user_id = auth.uid();
  delete from user_conditions where user_id = auth.uid();
  delete from subscriptions where user_id = auth.uid();
  delete from profiles where id = auth.uid();
end;
$$ language plpgsql security definer;
