alter table public.game_sessions
  add constraint game_sessions_user_puzzle_difficulty_key
  unique (user_id, puzzle_date, language, difficulty);
