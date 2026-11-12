create extension if not exists pgcrypto;

create or replace function public.generate_jumpcut_id()
returns text
language plpgsql
as $$
declare
  alphabet constant text := 'abcdefghijklmnopqrstuvwxyz0123456789';
  output text := '';
  idx integer;
begin
  for idx in 1..6 loop
    output := output || substr(alphabet, floor(random() * length(alphabet) + 1)::integer, 1);
  end loop;

  return 'jc_' || output;
end;
$$;

create or replace function public.generate_unique_jumpcut_id()
returns text
language plpgsql
as $$
declare
  candidate text;
begin
  loop
    candidate := public.generate_jumpcut_id();
    exit when not exists (
      select 1
      from public.profiles
      where jumpcut_id = candidate
    );
  end loop;

  return candidate;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  jumpcut_id text unique not null,
  created_at timestamptz default now()
);

create table public.daily_puzzles (
  id serial primary key,
  puzzle_date date not null,
  language text not null check (language in ('tamil', 'telugu', 'english', 'hindi')),
  start_movie_tmdb_id integer not null,
  start_movie_title text not null,
  star_tmdb_id integer not null,
  star_name text not null,
  optimal_hop_count integer not null,
  connector_actor_ids integer[] not null,
  unique(puzzle_date, language)
);

create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  puzzle_date date not null,
  language text not null check (language in ('tamil', 'telugu', 'english', 'hindi')),
  difficulty text not null check (difficulty in ('easy', 'hard')),
  status text not null default 'in_progress' check (status in ('in_progress', 'solved', 'abandoned')),
  hop_count integer default 0,
  undos_used integer default 0,
  score numeric(4,2),
  path jsonb default '[]',
  started_at timestamptz default now(),
  completed_at timestamptz,
  foreign key (puzzle_date, language) references public.daily_puzzles(puzzle_date, language)
);

create table public.leaderboard (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  puzzle_date date not null,
  language text not null check (language in ('tamil', 'telugu', 'english', 'hindi')),
  difficulty text not null check (difficulty in ('easy', 'hard')),
  hop_count integer not null,
  score numeric(4,2) not null,
  completed_at timestamptz not null,
  foreign key (puzzle_date, language) references public.daily_puzzles(puzzle_date, language),
  unique(user_id, puzzle_date, language, difficulty)
);

create table public.streaks (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  current_streak integer default 0,
  longest_streak integer default 0,
  last_solved_date date
);

create table public.friends (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz default now(),
  unique(requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create table public.user_points (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  puzzle_date date not null,
  language text not null check (language in ('tamil', 'telugu', 'english', 'hindi')),
  difficulty text not null check (difficulty in ('easy', 'hard')),
  score numeric(4,2) not null,
  foreign key (puzzle_date, language) references public.daily_puzzles(puzzle_date, language),
  unique(user_id, puzzle_date, language, difficulty)
);

create index game_sessions_user_date_language_difficulty_idx
  on public.game_sessions(user_id, puzzle_date, language, difficulty);

create index leaderboard_daily_sort_idx
  on public.leaderboard(puzzle_date, language, difficulty, hop_count, completed_at);

create index user_points_aggregate_idx
  on public.user_points(puzzle_date, language, difficulty, user_id);

create index friends_requester_status_idx
  on public.friends(requester_id, status);

create index friends_addressee_status_idx
  on public.friends(addressee_id, status);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_username text;
begin
  requested_username := nullif(trim(new.raw_user_meta_data->>'username'), '');

  insert into public.profiles (id, username, jumpcut_id)
  values (
    new.id,
    coalesce(requested_username, 'user_' || substr(replace(new.id::text, '-', ''), 1, 8)),
    public.generate_unique_jumpcut_id()
  );

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.prevent_profile_identity_changes()
returns trigger
language plpgsql
as $$
begin
  if new.id <> old.id then
    raise exception 'Profile id cannot be changed';
  end if;

  if new.jumpcut_id <> old.jumpcut_id then
    raise exception 'JumpCut ID cannot be changed';
  end if;

  if new.created_at <> old.created_at then
    raise exception 'Profile creation time cannot be changed';
  end if;

  return new;
end;
$$;

create trigger prevent_profile_identity_changes
before update on public.profiles
for each row execute function public.prevent_profile_identity_changes();

create or replace function public.prevent_friend_identity_changes()
returns trigger
language plpgsql
as $$
begin
  if new.id <> old.id
    or new.requester_id <> old.requester_id
    or new.addressee_id <> old.addressee_id
    or new.created_at <> old.created_at then
    raise exception 'Friend request identity fields cannot be changed';
  end if;

  return new;
end;
$$;

create trigger prevent_friend_identity_changes
before update on public.friends
for each row execute function public.prevent_friend_identity_changes();

alter table public.profiles enable row level security;
alter table public.daily_puzzles enable row level security;
alter table public.game_sessions enable row level security;
alter table public.leaderboard enable row level security;
alter table public.streaks enable row level security;
alter table public.friends enable row level security;
alter table public.user_points enable row level security;

create policy "Profiles are readable by authenticated users"
  on public.profiles
  for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Authenticated users can read daily puzzles"
  on public.daily_puzzles
  for select
  to authenticated
  using (true);

create policy "Users can read their own game sessions"
  on public.game_sessions
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can insert their own game sessions"
  on public.game_sessions
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update their own game sessions"
  on public.game_sessions
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Authenticated users can read leaderboard"
  on public.leaderboard
  for select
  to authenticated
  using (true);

create policy "Users can insert their own leaderboard entries"
  on public.leaderboard
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can read their own streaks"
  on public.streaks
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can insert their own streaks"
  on public.streaks
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update their own streaks"
  on public.streaks
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can read their friend rows"
  on public.friends
  for select
  to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "Users can send friend requests"
  on public.friends
  for insert
  to authenticated
  with check (requester_id = auth.uid());

create policy "Addressees can update friend request status"
  on public.friends
  for update
  to authenticated
  using (addressee_id = auth.uid())
  with check (addressee_id = auth.uid());

create policy "Authenticated users can read user points"
  on public.user_points
  for select
  to authenticated
  using (true);

create policy "Users can insert their own user points"
  on public.user_points
  for insert
  to authenticated
  with check (user_id = auth.uid());
