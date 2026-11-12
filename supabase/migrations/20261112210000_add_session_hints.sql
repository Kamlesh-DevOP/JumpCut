alter table public.game_sessions
  add column hints_used integer not null default 0
  check (hints_used >= 0);
