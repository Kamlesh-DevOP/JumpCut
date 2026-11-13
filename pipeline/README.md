# JumpCut Pipeline

This pipeline generates one puzzle per supported language for each thirty-minute
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

Generate for a specific thirty-minute slot:

```sh
python generate_puzzle.py --slot 2026-11-12T12:30:00Z --dry-run
```

Write to Supabase:

```sh
python generate_puzzle.py
```

The script caches TMDB Discover and cast responses under `pipeline/cache/`.

Without `--slot`, the generator publishes the next thirty-minute UTC slot. In
production, an external scheduler calls the protected backend generation
endpoint; see `backend/README.md` for its required environment and request
format.
