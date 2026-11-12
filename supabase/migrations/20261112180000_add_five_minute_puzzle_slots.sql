do $$
declare
  foreign_key record;
begin
  for foreign_key in
    select conrelid::regclass as table_name, conname
    from pg_constraint
    where contype = 'f'
      and confrelid = 'public.daily_puzzles'::regclass
  loop
    execute format('alter table %s drop constraint %I', foreign_key.table_name, foreign_key.conname);
  end loop;
end;
$$;

alter table public.daily_puzzles
  add column puzzle_slot timestamptz;

update public.daily_puzzles
set puzzle_slot = puzzle_date::timestamp at time zone 'UTC'
where puzzle_slot is null;

alter table public.daily_puzzles
  alter column puzzle_slot set not null;

alter table public.game_sessions
  add column puzzle_slot timestamptz;

alter table public.leaderboard
  add column puzzle_slot timestamptz;

alter table public.user_points
  add column puzzle_slot timestamptz;

update public.game_sessions as session
set puzzle_slot = puzzle.puzzle_slot
from public.daily_puzzles as puzzle
where puzzle.puzzle_date = session.puzzle_date
  and puzzle.language = session.language;

update public.leaderboard as entry
set puzzle_slot = puzzle.puzzle_slot
from public.daily_puzzles as puzzle
where puzzle.puzzle_date = entry.puzzle_date
  and puzzle.language = entry.language;

update public.user_points as points
set puzzle_slot = puzzle.puzzle_slot
from public.daily_puzzles as puzzle
where puzzle.puzzle_date = points.puzzle_date
  and puzzle.language = points.language;

alter table public.game_sessions
  alter column puzzle_slot set not null;

alter table public.leaderboard
  alter column puzzle_slot set not null;

alter table public.user_points
  alter column puzzle_slot set not null;

alter table public.daily_puzzles
  drop constraint if exists daily_puzzles_puzzle_date_language_key;

alter table public.game_sessions
  drop constraint if exists game_sessions_user_puzzle_difficulty_key;

alter table public.leaderboard
  drop constraint if exists leaderboard_user_id_puzzle_date_language_difficulty_key;

alter table public.user_points
  drop constraint if exists user_points_user_id_puzzle_date_language_difficulty_key;

alter table public.daily_puzzles
  add constraint daily_puzzles_puzzle_slot_language_key
  unique (puzzle_slot, language);

alter table public.game_sessions
  add constraint game_sessions_puzzle_slot_language_fkey
  foreign key (puzzle_slot, language)
  references public.daily_puzzles(puzzle_slot, language),
  add constraint game_sessions_user_puzzle_slot_difficulty_key
  unique (user_id, puzzle_slot, language, difficulty);

alter table public.leaderboard
  add constraint leaderboard_puzzle_slot_language_fkey
  foreign key (puzzle_slot, language)
  references public.daily_puzzles(puzzle_slot, language),
  add constraint leaderboard_user_puzzle_slot_difficulty_key
  unique (user_id, puzzle_slot, language, difficulty);

alter table public.user_points
  add constraint user_points_puzzle_slot_language_fkey
  foreign key (puzzle_slot, language)
  references public.daily_puzzles(puzzle_slot, language),
  add constraint user_points_user_puzzle_slot_difficulty_key
  unique (user_id, puzzle_slot, language, difficulty);

drop index if exists public.game_sessions_user_date_language_difficulty_idx;
drop index if exists public.leaderboard_daily_sort_idx;
drop index if exists public.user_points_aggregate_idx;

create index game_sessions_user_slot_language_difficulty_idx
  on public.game_sessions(user_id, puzzle_slot, language, difficulty);

create index leaderboard_slot_sort_idx
  on public.leaderboard(puzzle_slot, language, difficulty, hop_count, completed_at);

create index user_points_aggregate_slot_idx
  on public.user_points(puzzle_date, puzzle_slot, language, difficulty, user_id);
