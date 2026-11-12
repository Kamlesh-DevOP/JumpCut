# JumpCut Supabase

This directory contains the database migrations for JumpCut. Run migrations in
timestamp order from `supabase/migrations/`.

## Required Extensions

The initial migration enables:

- `pgcrypto` for `gen_random_uuid()`

The migration also creates small helper functions for profile signup:

- `generate_jumpcut_id()`
- `generate_unique_jumpcut_id()`
- `handle_new_user()`

## Applying Migrations

When a Supabase project is available, apply the migrations with the Supabase CLI:

```sh
supabase db push
```

For a local Supabase instance, start Supabase first:

```sh
supabase start
supabase db reset
```

## Access Model

Row Level Security is enabled on all app tables. Authenticated users can only
read or write the rows allowed by the policies in the migration.

Backend and pipeline jobs should use the Supabase service role key for trusted
server-side writes such as creating daily puzzles, recording solved sessions,
writing leaderboard entries, and deleting friendship rows through the API.

Never expose the service role key or TMDB API key to the frontend.
