alter table public.daily_puzzles
  add column optimal_path jsonb not null default '[]'::jsonb;
