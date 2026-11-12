# JumpCut Pipeline

This pipeline generates one puzzle per supported language for each five-minute
UTC slot and writes the results to Supabase.

## Setup

```sh
cd pipeline
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Fill in `.env` with:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TMDB_API_KEY`

## Run

Dry-run without writing to Supabase:

```sh
python generate_puzzle.py --dry-run
```

Generate for a specific five-minute slot:

```sh
python generate_puzzle.py --slot 2026-11-12T12:05:00Z --dry-run
```

Write to Supabase:

```sh
python generate_puzzle.py
```

The script caches TMDB Discover and cast responses under `pipeline/cache/`.

Without `--slot`, the generator publishes the next five-minute UTC slot. The
GitHub Actions workflow runs every five minutes and supplies the required
`TMDB_API_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` repository
secrets.
