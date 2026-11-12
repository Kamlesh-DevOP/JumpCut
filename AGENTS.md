# AGENTS.md — JumpCut

This file is the authoritative specification for building JumpCut. Read it fully before writing any code. Every decision about architecture, naming, behavior, and constraints is documented here.

---

## What is JumpCut?

JumpCut is a daily movie-connection puzzle game inspired by "Six Degrees of Separation." The player is given a **Start Movie** and must reach **The Star** (goal actor) by hopping between movies and actors:

```
Start Movie → pick an Actor → see their Movies → pick a Movie → see its Cast → ... → reach The Star
```

The goal is to reach The Star in as few hops as possible. Every day at midnight UTC, **four puzzles** are published — one per supported language. All users playing the same language play the same puzzle that day.

---

## Monorepo Structure

```
jumpcut/
├── frontend/          # React + Vite + Tailwind
├── backend/           # Node.js + Express
├── pipeline/          # Python nightly graph job
├── supabase/          # DB migrations and seed files
└── AGENTS.md          # This file
```

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 18, Vite, Tailwind CSS | SPA, no SSR |
| Backend | Node.js 20+, Express 5 | REST API, TMDB proxy |
| Database | PostgreSQL via Supabase | Auth + data |
| Auth | Supabase Auth | Email/password + Google OAuth |
| Graph pipeline | Python 3.11+, NetworkX | Nightly GitHub Actions cron — no pandas, no IMDb |
| Frontend hosting | Vercel | Free tier |
| Backend hosting | Render or Railway | Free tier |
| CI/CD | GitHub Actions | Pipeline cron + deploy hooks |

---

## Environment Variables

### Backend (`backend/.env`)
```
PORT=3001
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
TMDB_API_KEY=
TMDB_BASE_URL=https://api.themoviedb.org/3
TMDB_IMAGE_BASE_URL=https://image.tmdb.org/t/p/w500
CORS_ORIGIN=http://localhost:5173
```

### Frontend (`frontend/.env`)
```
VITE_API_BASE_URL=http://localhost:3001
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### Pipeline (`pipeline/.env`)
```
TMDB_API_KEY=
TMDB_BASE_URL=https://api.themoviedb.org/3
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

**Rules:**
- Never expose `TMDB_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` to the frontend.
- The frontend only ever calls the JumpCut backend. It never calls TMDB directly.
- Use `VITE_SUPABASE_ANON_KEY` (public key, safe to expose) in the frontend only for auth flows.

---

## Database Schema

All migrations live in `supabase/migrations/` and must be run in order via Supabase CLI or pasted into the SQL Editor in sequence.

### Table: `users`
Managed by Supabase Auth. Extended via `profiles`.

### Table: `profiles`
```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  jumpcut_id text unique not null,   -- short public ID e.g. "jc_a1b2c3", generated on signup
  created_at timestamptz default now()
);
```

`jumpcut_id` is generated at signup as `"jc_" || lower(nanoid(6))`. It is the shareable identity users send to friends. It is immutable after creation.

### Table: `daily_puzzles`
```sql
create table daily_puzzles (
  id serial primary key,
  puzzle_date date not null,
  language text not null check (language in ('tamil', 'telugu', 'english', 'hindi')),
  start_movie_tmdb_id integer not null,
  start_movie_title text not null,
  star_tmdb_id integer not null,
  star_name text not null,
  optimal_hop_count integer not null,    -- minimum hops to reach The Star
  connector_actor_ids integer[] not null, -- TMDB person IDs of popular connectors (hidden in Hard mode)
  unique(puzzle_date, language)           -- one puzzle per language per day
);
```

### Table: `game_sessions`
```sql
create table game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  puzzle_date date not null,
  language text not null check (language in ('tamil', 'telugu', 'english', 'hindi')),
  difficulty text not null check (difficulty in ('easy', 'hard')),
  status text not null default 'in_progress' check (status in ('in_progress', 'solved', 'abandoned')),
  hop_count integer default 0,
  undos_used integer default 0,
  score numeric(4,2),          -- round((optimal_hops / total_hops) * 10, 2), computed on solve
  path jsonb default '[]',     -- array of {type: "movie"|"actor", tmdb_id, name, poster_path}
  started_at timestamptz default now(),
  completed_at timestamptz,
  foreign key (puzzle_date, language) references daily_puzzles(puzzle_date, language)
);
```

### Table: `leaderboard`
```sql
create table leaderboard (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  puzzle_date date not null,
  language text not null check (language in ('tamil', 'telugu', 'english', 'hindi')),
  difficulty text not null check (difficulty in ('easy', 'hard')),
  hop_count integer not null,
  score numeric(4,2) not null,   -- round((optimal_hops / hop_count) * 10, 2)
  completed_at timestamptz not null,
  foreign key (puzzle_date, language) references daily_puzzles(puzzle_date, language),
  unique(user_id, puzzle_date, language, difficulty)
);
```

One row per user per language per difficulty per day. A user can have up to 8 leaderboard entries per day (4 languages × 2 difficulties).

### Table: `streaks`
```sql
create table streaks (
  user_id uuid primary key references profiles(id) on delete cascade,
  current_streak integer default 0,
  longest_streak integer default 0,
  last_solved_date date
);
```

### Table: `friends`
```sql
create table friends (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references profiles(id) on delete cascade,
  addressee_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz default now(),
  unique(requester_id, addressee_id),
  check (requester_id <> addressee_id)
);
```

A friendship is bidirectional once accepted. To check if two users are friends, query for a row where `(requester_id = A and addressee_id = B) OR (requester_id = B and addressee_id = A)` and `status = 'accepted'`.

### Table: `user_points`
```sql
create table user_points (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  puzzle_date date not null,
  language text not null check (language in ('tamil', 'telugu', 'english', 'hindi')),
  difficulty text not null check (difficulty in ('easy', 'hard')),
  score numeric(4,2) not null,
  foreign key (puzzle_date, language) references daily_puzzles(puzzle_date, language),
  unique(user_id, puzzle_date, language, difficulty)
);
```

This is the source of truth for points accumulation. Weekly and monthly leaderboards are computed by summing `score` from this table over the relevant date range. Do not recompute from `leaderboard` — always use `user_points`.

### Row Level Security (RLS)

Enable RLS on all tables. Apply these policies:
- `profiles`: users can read all, but only update their own row.
- `game_sessions`: users can only read and write their own rows.
- `leaderboard`: users can read all, insert only their own.
- `streaks`: users can only read and write their own row.
- `daily_puzzles`: all authenticated users can read. No user writes.
- `friends`: users can read rows where they are requester or addressee. Users can insert (send request) and update status only on rows where they are addressee (accept/reject). Users cannot delete friendship rows.
- `user_points`: users can read all (needed for leaderboards). Insert only their own. No updates or deletes.

---

## Backend API

Base path: `/api/v1`

All protected routes require a valid Supabase JWT in the `Authorization: Bearer <token>` header. The backend verifies this using the Supabase service role client.

### Auth middleware
```
verifyToken(req, res, next)
```
Validates the JWT from the Authorization header. Attaches `req.user` (with `id`, `email`). Returns 401 if invalid or missing.

---

### Routes

#### `GET /api/v1/puzzle/today`
Returns today's puzzle for a given language. Public (no auth required — so unauthenticated users can preview).

Query param: `?language=tamil|telugu|english|hindi` (required). Return 400 if missing or invalid.

Response:
```json
{
  "puzzle_date": "2025-08-01",
  "language": "tamil",
  "start_movie": {
    "tmdb_id": 27205,
    "title": "Vikram",
    "poster_path": "/poster.jpg",
    "year": 2022
  },
  "star": {
    "tmdb_id": 6193,
    "name": "Fahadh Faasil",
    "profile_path": "/profile.jpg"
  },
  "optimal_hop_count": 3
}
```
Do NOT return `connector_actor_ids` here. That is backend-only.

---

#### `GET /api/v1/movie/:tmdbId/cast`
Returns the cast for a movie. Auth required.

- Fetches from TMDB `/movie/:id/credits`.
- Returns only actors (filter `known_for_department === "Acting"`), ordered by `order` (billing order).
- In Hard Mode: if the actor's `tmdb_id` is in today's `connector_actor_ids` for the session's language, replace their name with `"???"` and profile_path with `null`. Accept a `?difficulty=hard&language=tamil` query param to trigger this.
- Cap at 15 cast members.

Response:
```json
{
  "movie_tmdb_id": 27205,
  "cast": [
    {
      "tmdb_id": 6193,
      "name": "Leonardo DiCaprio",
      "character": "Cobb",
      "profile_path": "/abc.jpg",
      "hidden": false
    }
  ]
}
```

---

#### `GET /api/v1/actor/:tmdbId/movies`
Returns movies for an actor. Auth required.

- Fetches from TMDB `/person/:id/movie_credits`.
- Returns only `cast` credits (not crew).
- Filter: `vote_count > 100` to remove obscure/unreleased titles.
- Sort by `popularity` descending.
- Cap at 20 movies.

Response:
```json
{
  "actor_tmdb_id": 6193,
  "movies": [
    {
      "tmdb_id": 27205,
      "title": "Inception",
      "poster_path": "/poster.jpg",
      "year": 2010,
      "vote_average": 8.8
    }
  ]
}
```

---

#### `POST /api/v1/session/start`
Auth required. Starts a new game session.

Body:
```json
{
  "language": "tamil" | "telugu" | "english" | "hindi",
  "difficulty": "easy" | "hard"
}
```

- Check if a session already exists for this user + today's date + language + difficulty. If so, return it (do not create a duplicate).
- Creates a row in `game_sessions`.

Response: the full `game_sessions` row.

---

#### `PATCH /api/v1/session/:sessionId/hop`
Auth required. Records a hop (user clicked a movie or actor).

Body:
```json
{
  "type": "movie" | "actor",
  "tmdb_id": 27205,
  "name": "Inception",
  "poster_path": "/poster.jpg"
}
```

- Appends to `path` jsonb array.
- Increments `hop_count`.
- If `type === "actor"` and `tmdb_id` matches today's `star_tmdb_id` for the session's language:
  - Set `status = "solved"`, `completed_at = now()`.
  - Compute score: `round((optimal_hop_count / hop_count) * 10, 2)`. Store on session row.
  - Write to `leaderboard` (puzzle_date, language, difficulty, hop_count, score, completed_at).
  - Write to `user_points` (puzzle_date, language, difficulty, score).
  - Update `streaks` (last_solved_date, current_streak, longest_streak).

Response: updated session row (including computed score).

---

#### `PATCH /api/v1/session/:sessionId/undo`
Auth required. Removes the last hop.

- Check `undos_used < 3`. If already 3, return 403 with message `"No undos remaining"`.
- Pop last entry from `path`.
- Decrement `hop_count` by 1.
- Increment `undos_used` by 1.

Response: updated session row.

---

#### `GET /api/v1/leaderboard/daily/:puzzleDate`
Auth required. Returns the global top 10 for a given puzzle date and language.

Query params:
- `?language=tamil|telugu|english|hindi` (required)
- `?difficulty=easy|hard` (required)

Sorting: primary by `hop_count` ascending, secondary by `completed_at` ascending (faster time wins ties).
Cap at 10 entries.

Response:
```json
{
  "puzzle_date": "2025-08-01",
  "language": "tamil",
  "difficulty": "easy",
  "entries": [
    {
      "rank": 1,
      "username": "filmfan99",
      "jumpcut_id": "jc_a1b2c3",
      "hop_count": 2,
      "score": 10.00,
      "completed_at": "2025-08-01T08:43:00Z"
    }
  ]
}
```

---

#### `GET /api/v1/leaderboard/aggregate`
Auth required. Returns weekly or monthly global leaderboard across all languages.

Query params:
- `?period=weekly|monthly` (required)
- `?language=tamil|telugu|english|hindi|all` (optional, default `all`)
- `?difficulty=easy|hard|all` (optional, default `all`)

Computes by summing `score` from `user_points` over the current week (Mon–Sun) or month.
Cap at 20 entries. Sort by total score descending, then total puzzles solved descending.

Response:
```json
{
  "period": "weekly",
  "language": "all",
  "entries": [
    {
      "rank": 1,
      "username": "filmfan99",
      "jumpcut_id": "jc_a1b2c3",
      "total_score": 47.50,
      "puzzles_solved": 6
    }
  ]
}
```

---

#### `GET /api/v1/leaderboard/friends/:puzzleDate`
Auth required. Returns the friends leaderboard for a given puzzle date and language.

Query params:
- `?language=tamil|telugu|english|hindi` (required)
- `?difficulty=easy|hard` (required)

Returns scores only for users who are accepted friends of the requesting user (plus the requesting user themselves). No cap — show all friends. Sort by `hop_count` ascending, then `completed_at` ascending.

Response: same shape as `/leaderboard/daily/:puzzleDate` but filtered to friends + self.

---

#### `GET /api/v1/leaderboard/friends/aggregate`
Auth required. Same as `/leaderboard/aggregate` but filtered to the requesting user's accepted friends + self.

Query params: same as `/leaderboard/aggregate`.

---

#### `GET /api/v1/user/stats`
Auth required. Returns the current user's stats.

Response:
```json
{
  "current_streak": 5,
  "longest_streak": 12,
  "total_solved": 34,
  "avg_hop_count": 3.8
}
```

---

#### `POST /api/v1/friends/request`
Auth required. Send a friend request by JumpCut ID.

Body:
```json
{ "jumpcut_id": "jc_a1b2c3" }
```

- Look up the profile by `jumpcut_id`. Return 404 if not found.
- Return 400 if a request already exists in either direction.
- Insert row into `friends` with `status = 'pending'`.

---

#### `PATCH /api/v1/friends/:friendshipId/accept`
Auth required. Accept a pending friend request.

- Only the addressee can accept. Return 403 if the requesting user is not the addressee.
- Set `status = 'accepted'`.

---

#### `DELETE /api/v1/friends/:friendshipId`
Auth required. Remove a friend or reject/cancel a request.

- User must be either requester or addressee. Return 403 otherwise.
- Hard delete the row.

---

#### `GET /api/v1/friends`
Auth required. List all accepted friends of the current user.

Response:
```json
{
  "friends": [
    {
      "user_id": "uuid...",
      "username": "filmfan99",
      "jumpcut_id": "jc_a1b2c3"
    }
  ]
}
```

---

#### `GET /api/v1/friends/requests`
Auth required. List pending incoming friend requests.

Response: array of `{ friendship_id, from_username, from_jumpcut_id, created_at }`.

---

## Frontend Architecture

### Pages / Routes (React Router)

```
/                  → Home (today's puzzle preview, CTA to play)
/play              → Game page (the actual game)
/leaderboard       → Leaderboard (daily + weekly + monthly tabs; language + difficulty filters)
/friends           → Friends list, pending requests, search by JumpCut ID
/profile           → User stats, history, and your JumpCut ID
/auth/login        → Login page
/auth/signup       → Signup page
```

### Key Components

```
src/
├── components/
│   ├── game/
│   │   ├── MovieCard.jsx         # poster, title, year — clickable
│   │   ├── ActorCard.jsx         # profile photo, name — clickable (hidden if ???)
│   │   ├── CastGrid.jsx          # grid of ActorCards
│   │   ├── MovieGrid.jsx         # grid of MovieCards
│   │   ├── PathTracker.jsx       # breadcrumb: Movie → Actor → Movie → ...
│   │   ├── StarBanner.jsx        # always-visible goal: "Reach: [Star Name + photo]"
│   │   ├── HopCounter.jsx        # "Hops: 4 | Undos left: 2"
│   │   └── SolvedModal.jsx       # shown on solve: path, hop count, share button
│   ├── ui/
│   │   ├── Button.jsx
│   │   ├── Modal.jsx
│   │   └── Spinner.jsx
│   └── layout/
│       ├── Navbar.jsx
│       └── Footer.jsx
├── pages/
│   ├── Home.jsx
│   ├── Play.jsx
│   ├── Leaderboard.jsx   # tabs: Daily / Weekly / Monthly; filters: language, difficulty, global/friends
│   ├── Friends.jsx       # search by jumpcut_id, pending requests, friends list
│   ├── Profile.jsx       # stats, JumpCut ID display + copy button
│   └── auth/
│       ├── Login.jsx
│       └── Signup.jsx
├── hooks/
│   ├── useGame.js        # core game state machine
│   ├── usePuzzle.js      # fetch today's puzzle
│   └── useSession.js     # create/sync session with backend
├── api/
│   └── client.js         # axios instance pointed at VITE_API_BASE_URL
├── store/
│   └── gameStore.js      # Zustand store for game state
└── utils/
    └── share.js          # generate shareable result text
```

### Game State Machine (`useGame.js`)

The game view alternates between two states. Track this in the Zustand store:

```
view: "movie_cast" | "actor_movies"

gameStore = {
  view: "movie_cast",
  currentMovie: { tmdb_id, title, poster_path, year },
  currentActor: null,
  cast: [],           // current cast list being shown
  actorMovies: [],    // current actor's movies being shown
  path: [],           // hops so far
  hopCount: 0,
  undosLeft: 3,
  score: null,        // computed on solve: round((optimal/hops)*10, 2)
  status: "in_progress" | "solved",
  language: "tamil" | "telugu" | "english" | "hindi",
  difficulty: "easy" | "hard",
  sessionId: null,
  puzzle: null        // today's puzzle from API
}
```

Flow:
1. Load puzzle → show Start Movie's cast (`view = "movie_cast"`).
2. User clicks an Actor → fetch that actor's movies → `view = "actor_movies"`. Record hop.
3. User clicks a Movie → fetch that movie's cast → `view = "movie_cast"`. Record hop.
4. After each actor click: check if actor is The Star → if yes, trigger solved flow.
5. Undo: pop last hop, revert view and current entity.

### Language & Difficulty Selection
- On `/play`, before starting, user first picks a language (Tamil / Telugu / English / Hindi) via a four-button selector, then picks a difficulty (Easy / Hard).
- Each combination is an independent session. A user can play all 8 combinations per day (4 languages × 2 difficulties).
- Once a session starts, neither language nor difficulty can be changed.
- If a session already exists for today + chosen language + difficulty, resume it automatically.
- The language selection also determines which leaderboard the user's score is posted to.

### Share Text (on solve)
```
JumpCut #{puzzle_number} [{LANGUAGE}] — {difficulty}
Reached The Star in {hop_count} hops • Score: {score}/10 🎬
{emoji path: 🎬 for movie, ⭐ for actor, 🏆 for The Star}

play.jumpcut.app
```

Example:
```
JumpCut #42 [Tamil] — Hard
Reached The Star in 5 hops • Score: 6.00/10 🎬
🎬 ⭐ 🎬 ⭐ 🏆
play.jumpcut.app
```

No movie titles or actor names in the share text — no spoilers.

---

## Frontend Design System

### Fonts
- **Headings, scores, hop counts, game titles**: Playfair Display (serif) — weights 400, 500, 700
- **All UI chrome, labels, cast names, navigation, body copy**: Inter (sans-serif) — weights 400, 500
- Import both from Google Fonts.

### Colour Palette

| Name | Hex | Usage |
|---|---|---|
| Noir | `#1A0A00` | Primary dark background, navbar, movie card backgrounds |
| Amber | `#C9872A` | Primary accent — active states, scores, language selector highlight, CTA buttons |
| Crimson | `#8B2020` | Exclusively for The Star — banner background tint, star icon, win state |
| Crimson Light | `#D9726A` | The Star text on dark backgrounds |
| Parchment | `#F5EDD8` | Light text on dark surfaces |
| Ash | `#6B6359` | Muted/secondary text, undo dots (used), disabled states |
| Deep Noir | `#120600` | Deeper background layer (path tracker bar, footer) |
| Card Surface | `#2A1500` | Actor row backgrounds, inner card surfaces |
| Card Border | `#3D2200` | Borders on dark surfaces |

### Component Rules

**Navbar**
- Background: Noir (`#1A0A00`), bottom border `#3D2200`
- Logo: Playfair Display 700, Amber
- Active language + difficulty shown as pills (Amber pill for language, Crimson pill for difficulty)
- Icons: leaderboard, friends, profile avatar — Ash colour, Amber on hover

**The Star Banner** (always visible, just below navbar during gameplay)
- Background tint: `#8B202015`, border `#8B202033`
- Star icon: Crimson circle with `#D9726A` star icon inside
- Name: Playfair Display 500, `#D9726A`
- Label "Reach The Star": Inter 10px, uppercase, `#D9726A88`
- Optimal hops shown on the right in Ash

**Path Tracker Bar** (below Star banner)
- Background: Deep Noir (`#120600`), bottom border `#3D2200`
- Movie chips: Noir bg, Amber text
- Actor chips: `#C9872A18` bg, Amber text
- Current/incomplete chip: Noir bg, Parchment `88` opacity
- Arrows between chips: Ash colour
- Hop count (Playfair Display 700, Parchment) and undo dots on the right

**Actor Rows**
- Default: `#2A1500` background, `#3D2200` border, Parchment name text
- Hover: border shifts to Amber
- Hidden actor (Hard mode): dimmed opacity 0.6, lock icon instead of chevron, name shown as `???` in Ash, subtext `#3D2200`
- The Star appearing in cast: `#8B202012` background, `#8B202055` border, Crimson Light name, trophy icon instead of chevron

**Movie Cards**
- Background: Noir, border `#3D2200`
- Title: Playfair Display 500, Parchment
- Year + language: Inter 11px, Amber

**Language Selector** (pre-game)
- Four buttons, one per language
- Selected: `1.5px solid #C9872A`, `#C9872A10` background, Amber text
- Unselected: `0.5px solid #3D2200`, no background, Parchment text
- Show native script below English name: தமிழ், తెలుగు, हिन्दी, EN

**Solved Modal**
- Three stat tiles: hops (neutral), score (Amber tint + border), optimal (neutral)
- Score displayed larger in Amber via Playfair Display 700
- Share button: Noir bg, Amber text; Show path button: secondary style

**Undo Button**
- Always visible below cast list, never hidden in a menu
- Background: `#2A1500`, border `#3D2200`, text Ash
- Remaining count shown inline: "Undo last hop (2 remaining)"
- Disabled when 0 remaining: opacity 0.4, not clickable

**Footer**
- Background: Deep Noir (`#120600`), top border `#3D2200`
- TMDB attribution in `#3D2200` (very muted — legally required, not prominent)
- Puzzle number in Playfair Display, `#3D2200`

---

## Hop Count — How It Works

The graph is **bipartite**: movie nodes and actor nodes, with edges only between them. There are no movie→movie or actor→actor edges. Every path strictly alternates:

```
Movie → Actor → Movie → Actor → ...
```

Every traversed edge = 1 hop. A path of length 3 means:

```
Start Movie → Actor A → Some Movie → The Star
```

That is 3 edges = 3 user clicks = 3 hops. This is consistent: each hop in the graph corresponds to exactly one user action in the game. The minimum enforced optimal hop count is configurable via `VALID_HOPS` in the pipeline — currently tuned per the operator's preference. The constraint ensures The Star is never reachable in 1 hop (direct cast) or 2 hops (second-degree connection).

---

## Pipeline (Nightly Puzzle Generation)

Location: `pipeline/generate_puzzle.py`

**The pipeline does NOT use IMDb datasets.** All data is fetched from TMDB directly. This keeps the pipeline fast (first run ~10 minutes, subsequent runs ~2 minutes) and eliminates the 1GB IMDb download.

### Two persistent caches (in `pipeline/cache/`)

| File | Contents | Invalidated by |
|---|---|---|
| `tmdb_movies.json` | `{lang_code: [raw TMDB movie objects]}` | `--refresh-movies` flag |
| `tmdb_cast.json` | `{movie_tmdb_id: [raw actor objects]}` | `--refresh-cast` flag |

Both caches persist across runs. The nightly job only fetches what is missing.

### Pipeline steps (runs every night at 23:00 UTC)

**Step 1 — Fetch movies via TMDB Discover**

For each language, fetch up to 40 pages (800 movies) from `/discover/movie`:
- `with_original_language=<code>`
- `sort_by=popularity.desc`
- `vote_count.gte=<floor>` — floor varies by language (see below)

For Indian languages (Tamil, Telugu, Hindi), run a **second pass** with `with_origin_country=IN` added, and merge results deduplicating by TMDB ID. This compensates for TMDB's known data quality issue where many Indian films are miscategorised and missed by the language filter alone.

Vote count floors by language:
```python
MIN_VOTE_COUNT = {
    "tamil":   200,
    "telugu":  200,
    "hindi":   500,
    "english": 1000,
}
```

Results cached to `tmdb_movies.json`. Subsequent runs load from cache and skip all Discover calls.

**Step 2 — Fetch cast for every movie**

For each unique movie across all languages, call `/movie/{tmdb_id}/credits`. Keep only actors (`known_for_department == "Acting"`), top 15 by billing order. Save every 100 movies to avoid losing progress on crash. Cached to `tmdb_cast.json`.

**Step 3 — Build the bipartite graph**

- Movie nodes: `"m_{tmdb_id}"` — attributes: `kind="movie"`, `language`
- Actor nodes: `"a_{tmdb_id}"` — attributes: `kind="actor"`
- Edges: actor appeared in movie
- Remove isolated nodes (movies with no cast, actors with no movies)

**Step 4 — Compute connector actors**

Run betweenness centrality with `k=500` approximation (runs in seconds, not hours):
```python
centrality = nx.betweenness_centrality(graph, k=500, normalized=True)
```
Actors in the top 15% by centrality score = connector actors. These are stored as TMDB person IDs and hidden in Hard Mode.

**Step 5 — Select one puzzle per language**

For each language, run the following loop (up to 20 retries before hard failure):

1. Pick a random start movie from that language's movie nodes.
2. Run BFS from the start movie with `cutoff=max(VALID_HOPS)`.
3. Collect valid Star candidates: actor nodes reachable in exactly `VALID_HOPS` steps (default tuned by operator). Actors at 1 hop (direct cast) and 2 hops (second-degree) are explicitly rejected — they are too easy.
4. If no valid candidates, discard this start movie and retry with a new one. Do not attempt to force a Star from the same start movie.
5. From valid candidates, pick a Star weighted by TMDB popularity score.
6. Compute all shortest paths to identify which connector actors lie on them — these become `connector_actor_ids`.

If all 20 retries fail for a language, the pipeline aborts with a hard error and the GitHub Actions job fails loudly (no silent failure).

**Step 6 — Write to Supabase**

Upsert rows into `daily_puzzles` with `on_conflict="puzzle_date,language"`. All IDs stored are TMDB integers — no IMDb IDs anywhere in the database.

### CLI flags

| Flag | Effect |
|---|---|
| `--dry-run` | Print selected puzzles as JSON, skip Supabase write |
| `--date YYYY-MM-DD` | Override target date (default: tomorrow UTC) |
| `--seed N` | Set random seed for reproducible runs |
| `--languages tamil hindi` | Generate subset of languages only |
| `--refresh-movies` | Delete movie cache and re-fetch from Discover |
| `--refresh-cast` | Delete cast cache and re-fetch from TMDB |

### Python dependencies (`pipeline/requirements.txt`)
```
networkx
requests
python-dotenv
supabase
```

Note: `pandas` is not used. All data handling is done with plain dicts and lists.

### GitHub Actions cron (`.github/workflows/generate_puzzle.yml`)
```yaml
on:
  schedule:
    - cron: '0 23 * * *'   # 23:00 UTC daily
  workflow_dispatch:         # allow manual trigger for emergencies
```

---

## Game Rules (enforce in backend)

| Rule | Detail |
|---|---|
| Daily puzzles | 4 puzzles per day (one per language), resets midnight UTC |
| Languages | Tamil, Telugu, Hindi, English — independent puzzles and leaderboards |
| Same puzzle per language | All users in the same language play the same start + star |
| Sessions per day | Up to 8 per user: 4 languages × 2 difficulties |
| Undos | Max 3 per session |
| Difficulty lock | Chosen at session start, cannot change mid-game |
| Hard Mode | Top 15% betweenness-centrality actors shown as `???` in cast list |
| Hop counting | Every click (movie or actor) = 1 hop. Graph edges alternate movie↔actor, so 3 hops = Movie→Actor→Movie→Star (3 user clicks) |
| Win condition | Clicking The Star actor ends the game |
| Minimum hop constraint | Optimal path must be at least 3 hops. Direct cast (1 hop) and second-degree connections (2 hops) are never valid Stars |
| Scoring | `round((optimal_hops / total_hops) * 10, 2)` — max 10.00, computed server-side on solve |
| Score of 10.00 | Only achievable by solving in exactly the optimal number of hops |
| Leaderboard sort | Primary: hop_count ascending. Tiebreak: completed_at ascending (faster wins) |
| Points accumulation | `user_points` table stores one score per session. Weekly = current Mon–Sun. Monthly = current calendar month |
| Duplicate session guard | If session exists for user + date + language + difficulty, resume it — never create a duplicate |

---

## TMDB API Usage

- All TMDB calls go through the backend. Never from the frontend.
- Use Bearer token auth: `Authorization: Bearer ${TMDB_API_KEY}`
- Cache TMDB responses in memory (or Redis if available) for 1 hour to avoid redundant calls during active gameplay.
- Key endpoints used by the backend:
  - `GET /movie/{id}/credits` — cast for a movie
  - `GET /person/{id}/movie_credits` — filmography for an actor
- Key endpoints used by the pipeline only:
  - `GET /discover/movie` — fetch language movie pools
  - `GET /movie/{id}/credits` — fetch cast during graph build
- Image URLs: `https://image.tmdb.org/t/p/w500{poster_path}`
- Rate limit: ~40 req/sec. Pipeline uses 0.075s sleep between calls. Backend uses in-memory cache to avoid redundant calls.
- Attribution (required — display in footer): "This product uses the TMDB API but is not endorsed or certified by TMDB."

---

## Error Handling

### Backend
- All route handlers wrapped in try/catch.
- Return consistent error shape:
  ```json
  { "error": { "code": "SESSION_NOT_FOUND", "message": "No session found." } }
  ```
- HTTP status codes: 400 bad input, 401 unauthenticated, 403 forbidden, 404 not found, 500 server error.

### Frontend
- All API calls in try/catch.
- Show user-friendly toast messages on errors (not raw API errors).
- On TMDB failure (actor/movie fetch): show "Couldn't load data, please try again" inline — do not crash the game.

---

## Security Rules

- TMDB API key: backend + pipeline only. Never in frontend code or git.
- Supabase service role key: backend + pipeline only.
- Supabase anon key: frontend only (safe — used for auth flows only).
- All game state mutations (hop, undo, solve) go through the backend and are validated server-side. Never trust the client for hop counts or solve status.
- JWT verified on every protected route.

---

## Code Style

- Use ES modules (`import`/`export`) throughout.
- Async/await everywhere, no raw `.then()` chains.
- React components: functional only, no class components.
- Name files in kebab-case for pages/routes, PascalCase for components.
- Keep components under 150 lines. Extract logic into hooks.
- No `console.log` in production code. Use a simple logger utility in the backend.

---

## Current Build Status

| Layer | Status |
|---|---|
| Pipeline (`pipeline/generate_puzzle.py`) | ✅ Complete and tested via dry-run |
| Database schema | ✅ Applied to Supabase |
| RLS policies | ✅ Applied to Supabase |
| Backend API | ⬜ Not started |
| Frontend | ⬜ Not started |
| GitHub Actions cron | ⬜ Not wired |

---

## What to Build Next (Remaining Order)

1. `backend/` — Express server skeleton, auth middleware, then routes in this order:
   - `/puzzle/today` — unblocks all frontend work
   - `/movie/:id/cast` and `/actor/:id/movies` — core game loop
   - `/session/start`, `/session/:id/hop`, `/session/:id/undo` — game state
   - `/leaderboard/*` — scoring display
   - `/user/stats` — profile page
   - `/friends/*` — social features
2. `frontend/` — Vite + React + Tailwind scaffold, implement in this order:
   - Language + difficulty selector
   - Core game loop (Play page) using the design system above
   - Auth pages (login, signup)
   - Solved modal + share mechanic
   - Leaderboard page (daily → weekly → monthly)
   - Friends page
   - Profile page
3. `GitHub Actions` — wire nightly cron for pipeline, deploy hooks for backend and frontend

---

## Out of Scope (for now)

- Mobile app
- Multiple game modes (Mode 2+ — goal movie, speed run, etc.)
- Monetization
- Push notifications
- Social following beyond friends (public profiles, follower counts)
