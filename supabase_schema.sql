-- ============================================================
-- TIPPING STARS — Full Supabase Schema
-- Run this entire file in your Supabase SQL editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  email text not null,
  avatar_url text,
  is_super_admin boolean default false,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone" on public.profiles
  for select using (true);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- TOURNAMENTS
-- ============================================================
create table public.tournaments (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  entry_fee numeric(10,2) default 0,
  currency text default 'AUD',
  created_by uuid references public.profiles(id),
  status text default 'upcoming' check (status in ('upcoming','active','completed')),
  -- Scoring config (all configurable per tournament)
  pts_winner int default 2,
  pts_goal_diff int default 3,
  pts_exact_score int default 5,
  pts_big_margin_bonus int default 3,  -- bonus for 3+ goal margin correct tip
  big_margin_threshold int default 3,   -- goals margin that triggers bonus
  pts_qualify int default 2,           -- per team qualifying to next round
  pts_tournament_winner int default 20,
  pts_second_place int default 12,
  pts_third_place int default 8,
  pts_top_scorer int default 15,
  -- Multipliers per round (applied to match tips)
  multiplier_group int default 1,
  multiplier_r32 int default 2,
  multiplier_r16 int default 3,
  multiplier_qf int default 4,
  multiplier_sf int default 5,
  multiplier_final int default 6,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.tournaments enable row level security;

create policy "Tournaments viewable by members" on public.tournaments
  for select using (true);
create policy "Admins can manage tournaments" on public.tournaments
  for all using (
    exists (
      select 1 from public.profiles where id = auth.uid() and is_super_admin = true
    )
  );

-- ============================================================
-- TOURNAMENT MEMBERS (with approval workflow)
-- ============================================================
create table public.tournament_members (
  id uuid default uuid_generate_v4() primary key,
  tournament_id uuid references public.tournaments(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  status text default 'pending' check (status in ('pending','approved','rejected')),
  role text default 'tipper' check (role in ('tipper','admin')),
  entry_fee_paid boolean default false,
  entry_fee_amount numeric(10,2) default 0,
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  joined_at timestamptz default now(),
  unique(tournament_id, user_id)
);
alter table public.tournament_members enable row level security;

create policy "Members can view own membership" on public.tournament_members
  for select using (auth.uid() = user_id or exists (
    select 1 from public.profiles where id = auth.uid() and is_super_admin = true
  ));
create policy "Anyone can request to join" on public.tournament_members
  for insert with check (auth.uid() = user_id);
create policy "Admins can manage memberships" on public.tournament_members
  for update using (exists (
    select 1 from public.profiles where id = auth.uid() and is_super_admin = true
  ));

-- ============================================================
-- MATCHES
-- ============================================================
create table public.matches (
  id uuid default uuid_generate_v4() primary key,
  tournament_id uuid references public.tournaments(id) on delete cascade,
  home_team text not null,
  away_team text not null,
  home_flag text,  -- emoji or image url
  away_flag text,
  kickoff_at timestamptz not null,
  round text not null check (round in ('group','r32','r16','qf','sf','final','third_place')),
  group_name text,  -- e.g. 'Group A'
  venue text,
  -- Results (null until played)
  home_score int,
  away_score int,
  home_score_et int,  -- extra time
  away_score_et int,
  home_score_pens int, -- penalties
  away_score_pens int,
  status text default 'upcoming' check (status in ('upcoming','live','completed')),
  created_at timestamptz default now()
);
alter table public.matches enable row level security;

create policy "Matches viewable by all" on public.matches
  for select using (true);
create policy "Admins can manage matches" on public.matches
  for all using (exists (
    select 1 from public.profiles where id = auth.uid() and is_super_admin = true
  ));

-- ============================================================
-- MATCH TIPS
-- ============================================================
create table public.match_tips (
  id uuid default uuid_generate_v4() primary key,
  match_id uuid references public.matches(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  tournament_id uuid references public.tournaments(id) on delete cascade,
  tip_home int not null,
  tip_away int not null,
  -- Calculated after match
  pts_winner int default 0,
  pts_goal_diff int default 0,
  pts_exact_score int default 0,
  pts_big_margin int default 0,
  pts_total int default 0,
  pts_with_multiplier int default 0,
  is_locked boolean default false,
  submitted_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(match_id, user_id, tournament_id)
);
alter table public.match_tips enable row level security;

create policy "Users can view own tips" on public.match_tips
  for select using (auth.uid() = user_id or exists (
    select 1 from public.profiles where id = auth.uid() and is_super_admin = true
  ));
create policy "After lock, all tips visible" on public.match_tips
  for select using (is_locked = true);
create policy "Users can submit own tips" on public.match_tips
  for insert with check (auth.uid() = user_id);
create policy "Users can update unlocked tips" on public.match_tips
  for update using (auth.uid() = user_id and is_locked = false);

-- ============================================================
-- TOURNAMENT TIPS (pre-tournament predictions)
-- ============================================================
create table public.tournament_tips (
  id uuid default uuid_generate_v4() primary key,
  tournament_id uuid references public.tournaments(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  tip_winner text,
  tip_second text,
  tip_third text,
  tip_top_scorer text,
  is_locked boolean default false,
  -- Scoring
  pts_winner int default 0,
  pts_second int default 0,
  pts_third int default 0,
  pts_top_scorer int default 0,
  pts_total int default 0,
  submitted_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(tournament_id, user_id)
);
alter table public.tournament_tips enable row level security;

create policy "Users can view own tournament tips" on public.tournament_tips
  for select using (auth.uid() = user_id or exists (
    select 1 from public.profiles where id = auth.uid() and is_super_admin = true
  ));
create policy "After lock, all visible" on public.tournament_tips
  for select using (is_locked = true);
create policy "Users can submit tournament tips" on public.tournament_tips
  for insert with check (auth.uid() = user_id);
create policy "Users can update unlocked tournament tips" on public.tournament_tips
  for update using (auth.uid() = user_id and is_locked = false);

-- ============================================================
-- LEADERBOARD (computed view)
-- ============================================================
create or replace view public.leaderboard as
select
  tm.tournament_id,
  tm.user_id,
  p.display_name,
  p.email,
  coalesce(sum(mt.pts_with_multiplier), 0) as match_points,
  coalesce(tt.pts_total, 0) as tournament_points,
  coalesce(sum(mt.pts_with_multiplier), 0) + coalesce(tt.pts_total, 0) as total_points,
  count(mt.id) as tips_submitted,
  tm.entry_fee_paid
from public.tournament_members tm
join public.profiles p on p.id = tm.user_id
left join public.match_tips mt on mt.user_id = tm.user_id and mt.tournament_id = tm.tournament_id
left join public.tournament_tips tt on tt.user_id = tm.user_id and tt.tournament_id = tm.tournament_id
where tm.status = 'approved'
group by tm.tournament_id, tm.user_id, p.display_name, p.email, tt.pts_total, tm.entry_fee_paid;

-- ============================================================
-- FUNCTION: Calculate match tip points
-- Call this after entering match results
-- ============================================================
create or replace function public.calculate_match_points(p_match_id uuid)
returns void as $$
declare
  v_match matches%rowtype;
  v_tip match_tips%rowtype;
  v_tournament tournaments%rowtype;
  v_multiplier int;
  v_actual_diff int;
  v_tip_diff int;
  v_actual_winner text;
  v_tip_winner text;
  v_pts_winner int := 0;
  v_pts_diff int := 0;
  v_pts_exact int := 0;
  v_pts_bonus int := 0;
  v_pts_total int := 0;
begin
  select * into v_match from public.matches where id = p_match_id;
  if v_match.home_score is null then return; end if;

  v_actual_diff := v_match.home_score - v_match.away_score;

  -- Determine winner
  if v_match.home_score > v_match.away_score then v_actual_winner := 'home';
  elsif v_match.away_score > v_match.home_score then v_actual_winner := 'away';
  else v_actual_winner := 'draw';
  end if;

  for v_tip in select * from public.match_tips where match_id = p_match_id loop
    select * into v_tournament from public.tournaments where id = v_tip.tournament_id;

    -- Get round multiplier
    v_multiplier := case v_match.round
      when 'group' then v_tournament.multiplier_group
      when 'r32' then v_tournament.multiplier_r32
      when 'r16' then v_tournament.multiplier_r16
      when 'qf' then v_tournament.multiplier_qf
      when 'sf' then v_tournament.multiplier_sf
      when 'final' then v_tournament.multiplier_final
      when 'third_place' then v_tournament.multiplier_sf
      else 1
    end;

    v_pts_winner := 0; v_pts_diff := 0; v_pts_exact := 0; v_pts_bonus := 0;

    v_tip_diff := v_tip.tip_home - v_tip.tip_away;

    -- Determine tip winner
    if v_tip.tip_home > v_tip.tip_away then v_tip_winner := 'home';
    elsif v_tip.tip_away > v_tip.tip_home then v_tip_winner := 'away';
    else v_tip_winner := 'draw';
    end if;

    -- Correct winner
    if v_tip_winner = v_actual_winner then
      v_pts_winner := v_tournament.pts_winner;
    end if;

    -- Correct goal difference (and winner must match)
    if v_tip_diff = v_actual_diff and v_tip_winner = v_actual_winner then
      v_pts_diff := v_tournament.pts_goal_diff;
    end if;

    -- Exact score
    if v_tip.tip_home = v_match.home_score and v_tip.tip_away = v_match.away_score then
      v_pts_exact := v_tournament.pts_exact_score;
      -- Big margin bonus (exact score required)
      if abs(v_actual_diff) >= v_tournament.big_margin_threshold then
        v_pts_bonus := v_tournament.pts_big_margin_bonus;
      end if;
    end if;

    v_pts_total := v_pts_winner + v_pts_diff + v_pts_exact + v_pts_bonus;

    update public.match_tips set
      pts_winner = v_pts_winner,
      pts_goal_diff = v_pts_diff,
      pts_exact_score = v_pts_exact,
      pts_big_margin = v_pts_bonus,
      pts_total = v_pts_total,
      pts_with_multiplier = v_pts_total * v_multiplier,
      is_locked = true
    where id = v_tip.id;
  end loop;

  -- Lock tips for this match
  update public.matches set status = 'completed' where id = p_match_id;
end;
$$ language plpgsql security definer;

-- ============================================================
-- FUNCTION: Calculate tournament tip points
-- Call when tournament is finished
-- ============================================================
create or replace function public.calculate_tournament_points(
  p_tournament_id uuid,
  p_winner text,
  p_second text,
  p_third text,
  p_top_scorer text
)
returns void as $$
declare
  v_t tournaments%rowtype;
  v_tip tournament_tips%rowtype;
begin
  select * into v_t from public.tournaments where id = p_tournament_id;

  for v_tip in select * from public.tournament_tips where tournament_id = p_tournament_id loop
    update public.tournament_tips set
      pts_winner = case when tip_winner = p_winner then v_t.pts_tournament_winner else 0 end,
      pts_second = case when tip_second = p_second then v_t.pts_second_place else 0 end,
      pts_third  = case when tip_third  = p_third  then v_t.pts_third_place  else 0 end,
      pts_top_scorer = case when tip_top_scorer = p_top_scorer then v_t.pts_top_scorer else 0 end,
      pts_total = (
        case when tip_winner = p_winner then v_t.pts_tournament_winner else 0 end +
        case when tip_second = p_second then v_t.pts_second_place else 0 end +
        case when tip_third  = p_third  then v_t.pts_third_place  else 0 end +
        case when tip_top_scorer = p_top_scorer then v_t.pts_top_scorer else 0 end
      ),
      is_locked = true
    where id = v_tip.id;
  end loop;
end;
$$ language plpgsql security definer;

-- ============================================================
-- FUNCTION: Auto-lock tips 2 hours before kickoff
-- Set up a pg_cron job or call this via edge function
-- ============================================================
create or replace function public.lock_due_tips()
returns void as $$
begin
  update public.match_tips
  set is_locked = true
  where match_id in (
    select id from public.matches
    where kickoff_at <= now() + interval '2 hours'
    and status = 'upcoming'
  )
  and is_locked = false;

  -- Also mark matches as locked
  update public.matches
  set status = 'live'
  where kickoff_at <= now() + interval '2 hours'
  and status = 'upcoming';
end;
$$ language plpgsql security definer;
