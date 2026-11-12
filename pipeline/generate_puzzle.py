from __future__ import annotations

import argparse
import json
import os
import random
import time
from collections import Counter
from dataclasses import dataclass, field
from datetime import timezone, datetime, timedelta
from pathlib import Path
from typing import Iterator

import networkx as nx
import requests
from dotenv import load_dotenv
from supabase import Client, create_client


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SUPPORTED_LANGUAGES: dict[str, str] = {
    "tamil": "ta",
    "telugu": "te",
    "english": "en",
    "hindi": "hi",
}

PAGES_PER_LANGUAGE = 40
MIN_VOTE_COUNT: dict[str, int] = {
    "tamil":   200,
    "telugu":  200,
    "hindi":   500,
    "english": 1000,
}
MAX_CAST_PER_MOVIE = 15          # top-billed cast members to include per movie
CONNECTOR_PERCENTILE = 0.85      # top 15% by betweenness centrality = connector actors
CENTRALITY_SAMPLE_K = 500        # approximation sample for betweenness centrality
VALID_HOPS = {4, 5, 6, 7, 8, 9}        # acceptable optimal hop counts for a puzzle
MAX_RETRIES_PER_LANGUAGE = 20    # attempts before giving up on a language
TMDB_SLEEP = 0.075               # seconds between TMDB calls (~13 req/sec)
CACHE_SAVE_INTERVAL = 100        # save cast cache every N movies

ROOT = Path(__file__).resolve().parent
CACHE_DIR = ROOT / "cache"
MOVIE_CACHE_PATH = CACHE_DIR / "tmdb_movies.json"    # {lang_code: [{tmdb movie object}]}
CAST_CACHE_PATH = CACHE_DIR / "tmdb_cast.json"       # {movie_tmdb_id: [{actor object}]}


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Movie:
    tmdb_id: int
    title: str
    language: str
    popularity: float
    poster_path: str | None


@dataclass(frozen=True)
class Actor:
    tmdb_id: int
    name: str
    popularity: float
    profile_path: str | None


@dataclass
class GameGraph:
    graph: nx.Graph
    movies: dict[str, Movie]   # node_id -> Movie  (node_id = "m_{tmdb_id}")
    actors: dict[str, Actor]   # node_id -> Actor  (node_id = "a_{tmdb_id}")
    actor_language_counts: dict[str, Counter[str]]

    def movie_node(self, tmdb_id: int) -> str:
        return f"m_{tmdb_id}"

    def actor_node(self, tmdb_id: int) -> str:
        return f"a_{tmdb_id}"


@dataclass(frozen=True)
class SelectedPuzzle:
    puzzle_slot: str
    puzzle_date: str
    language: str
    start_movie: Movie
    star: Actor
    optimal_hop_count: int
    connector_actor_ids: list[int]

    def to_supabase_row(self) -> dict:
        return {
            "puzzle_slot": self.puzzle_slot,
            "puzzle_date": self.puzzle_date,
            "language": self.language,
            "start_movie_tmdb_id": self.start_movie.tmdb_id,
            "start_movie_title": self.start_movie.title,
            "star_tmdb_id": self.star.tmdb_id,
            "star_name": self.star.name,
            "optimal_hop_count": self.optimal_hop_count,
            "connector_actor_ids": self.connector_actor_ids,
        }


# ---------------------------------------------------------------------------
# TMDB client
# ---------------------------------------------------------------------------

class TmdbClient:
    def __init__(self, api_key: str, base_url: str = "https://api.themoviedb.org/3") -> None:
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
        })

    def _get(self, path: str, params: dict | None = None, retries: int = 3) -> dict:
        url = f"{self.base_url}{path}"
        for attempt in range(retries):
            try:
                time.sleep(TMDB_SLEEP)
                response = self.session.get(url, params=params, timeout=30)
                if response.status_code == 429:
                    wait = int(response.headers.get("Retry-After", 10))
                    print(f"  Rate limited. Sleeping {wait}s...")
                    time.sleep(wait)
                    continue
                response.raise_for_status()
                return response.json()
            except requests.RequestException as e:
                if attempt == retries - 1:
                    raise
                print(f"  Request failed ({e}), retrying ({attempt + 1}/{retries})...")
                time.sleep(2 ** attempt)
        return {}

    def discover_movies(
        self,
        language_code: str,
        page: int,
        origin_country: str | None = None,
        min_votes: int = 200,
    ) -> dict:
        params = {
            "with_original_language": language_code,
            "sort_by": "popularity.desc",
            "vote_count.gte": min_votes,
            "page": page,
        }
        if origin_country:
            params["with_origin_country"] = origin_country
        return self._get("/discover/movie", params=params)

    def get_cast(self, movie_tmdb_id: int) -> list[dict]:
        data = self._get(f"/movie/{movie_tmdb_id}/credits")
        return data.get("cast", [])


# ---------------------------------------------------------------------------
# Cache helpers
# ---------------------------------------------------------------------------

def load_json_cache(path: Path) -> dict:
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return {}
    return {}


def save_json_cache(path: Path, data: dict) -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, sort_keys=True), encoding="utf-8")


# ---------------------------------------------------------------------------
# Step 1: Fetch movies via TMDB Discover
# ---------------------------------------------------------------------------

# Country hints for languages that have data quality issues on TMDB
LANGUAGE_ORIGIN_COUNTRY: dict[str, str] = {
    "tamil":  "IN",
    "telugu": "IN",
    "hindi":  "IN",
    # english: no country hint — too broad (US, UK, AU etc.)
}

def fetch_all_movies(tmdb: TmdbClient) -> dict[str, list[Movie]]:
    raw_cache: dict[str, list[dict]] = load_json_cache(MOVIE_CACHE_PATH)
    result: dict[str, list[Movie]] = {}

    for lang_name, lang_code in SUPPORTED_LANGUAGES.items():
        if lang_code in raw_cache:
            print(f"[{lang_name}] Movies loaded from cache ({len(raw_cache[lang_code])} movies)")
            result[lang_name] = [_raw_to_movie(m) for m in raw_cache[lang_code]]
            continue

        min_votes = MIN_VOTE_COUNT[lang_name]
        origin_country = LANGUAGE_ORIGIN_COUNTRY.get(lang_name)
        seen_ids: set[int] = set()
        raw_movies: list[dict] = []

        # Pass 1: standard language filter
        print(f"[{lang_name}] Pass 1: fetching by original_language={lang_code}...")
        raw_movies, seen_ids = _fetch_pages(
            tmdb, lang_code, min_votes, origin_country=None,
            seen_ids=seen_ids, raw_movies=raw_movies,
        )
        print(f"[{lang_name}] Pass 1 done: {len(raw_movies)} movies")

        # Pass 2: origin_country supplement (Indian languages only)
        if origin_country:
            print(f"[{lang_name}] Pass 2: supplementing with origin_country={origin_country}...")
            raw_movies, seen_ids = _fetch_pages(
                tmdb, lang_code, min_votes, origin_country=origin_country,
                seen_ids=seen_ids, raw_movies=raw_movies,
            )
            print(f"[{lang_name}] Pass 2 done: {len(raw_movies)} movies total (deduped)")

        raw_cache[lang_code] = raw_movies
        save_json_cache(MOVIE_CACHE_PATH, raw_cache)
        result[lang_name] = [_raw_to_movie(m) for m in raw_movies]
        print(f"[{lang_name}] ✓ Final: {len(raw_movies)} movies")

    return result


def _fetch_pages(
    tmdb: TmdbClient,
    lang_code: str,
    min_votes: int,
    origin_country: str | None,
    seen_ids: set[int],
    raw_movies: list[dict],
) -> tuple[list[dict], set[int]]:
    for page in range(1, PAGES_PER_LANGUAGE + 1):
        data = tmdb.discover_movies(lang_code, page, origin_country, min_votes)
        page_results = data.get("results", [])
        total_pages = data.get("total_pages", 1)

        for movie in page_results:
            if movie["id"] not in seen_ids:
                seen_ids.add(movie["id"])
                raw_movies.append(movie)

        if page % 10 == 0:
            print(f"  Page {page}/{min(PAGES_PER_LANGUAGE, total_pages)}...")

        if page >= total_pages:
            print(f"  Reached last page ({page})")
            break

    return raw_movies, seen_ids


def _raw_to_movie(raw: dict) -> Movie:
    return Movie(
        tmdb_id=raw["id"],
        title=raw.get("title") or raw.get("original_title", ""),
        language=raw.get("original_language", ""),
        popularity=float(raw.get("popularity") or 0),
        poster_path=raw.get("poster_path"),
    )


# ---------------------------------------------------------------------------
# Step 2: Fetch cast for every movie
# ---------------------------------------------------------------------------

def fetch_all_cast(tmdb: TmdbClient, all_movies: dict[str, list[Movie]]) -> dict[int, list[Actor]]:
    """
    Returns {movie_tmdb_id: [Actor, ...]} for all movies across all languages.
    Cached to CAST_CACHE_PATH. Only fetches movies not already in cache.
    """
    raw_cache: dict[str, list[dict]] = load_json_cache(CAST_CACHE_PATH)
    # keys in JSON are strings; convert to int for lookup
    cast_map: dict[int, list[Actor]] = {
        int(mid): [_raw_to_actor(a) for a in actors]
        for mid, actors in raw_cache.items()
    }

    # Collect all unique movies across languages
    all_movie_ids: dict[int, Movie] = {}
    for movies in all_movies.values():
        for movie in movies:
            all_movie_ids[movie.tmdb_id] = movie

    uncached = [mid for mid in all_movie_ids if mid not in cast_map]
    print(f"Fetching cast for {len(uncached)} movies ({len(cast_map)} already cached)...")

    for i, movie_id in enumerate(uncached):
        raw_cast = tmdb.get_cast(movie_id)
        # Keep top N cast by billing order, actors only (order field = billing order)
        actors = [
            _raw_to_actor(a) for a in raw_cast
            if a.get("known_for_department") == "Acting"
        ][:MAX_CAST_PER_MOVIE]

        cast_map[movie_id] = actors
        raw_cache[str(movie_id)] = [_actor_to_raw(a) for a in actors]

        if (i + 1) % CACHE_SAVE_INTERVAL == 0:
            save_json_cache(CAST_CACHE_PATH, raw_cache)
            print(f"  {i + 1}/{len(uncached)} movies processed...")

    save_json_cache(CAST_CACHE_PATH, raw_cache)
    print(f"Cast fetch complete. Total movies with cast: {len(cast_map)}")
    return cast_map


def _raw_to_actor(raw: dict) -> Actor:
    return Actor(
        tmdb_id=raw["id"],
        name=raw.get("name", ""),
        popularity=float(raw.get("popularity") or 0),
        profile_path=raw.get("profile_path"),
    )


def _actor_to_raw(actor: Actor) -> dict:
    return {
        "id": actor.tmdb_id,
        "name": actor.name,
        "popularity": actor.popularity,
        "profile_path": actor.profile_path,
        "known_for_department": "Acting",
    }


# ---------------------------------------------------------------------------
# Step 3: Build the bipartite graph
# ---------------------------------------------------------------------------

def build_game_graph(
    all_movies: dict[str, list[Movie]],
    cast_map: dict[int, list[Actor]],
) -> GameGraph:
    """
    Builds a bipartite NetworkX graph:
      - movie nodes: "m_{tmdb_id}"
      - actor nodes: "a_{tmdb_id}"
      - edges: actor appeared in movie
    """
    G = nx.Graph()
    movies: dict[str, Movie] = {}
    actors: dict[str, Actor] = {}
    actor_language_counts: dict[str, Counter[str]] = {}

    for lang_movies in all_movies.values():
        for movie in lang_movies:
            node = f"m_{movie.tmdb_id}"
            if not G.has_node(node):
                G.add_node(node, kind="movie", language=movie.language)
                movies[node] = movie

    for movie_id, cast in cast_map.items():
        movie_node = f"m_{movie_id}"
        if not G.has_node(movie_node):
            continue
        for actor in cast:
            actor_node = f"a_{actor.tmdb_id}"
            if not G.has_node(actor_node):
                G.add_node(actor_node, kind="actor")
                actors[actor_node] = actor
                actor_language_counts[actor_node] = Counter()
            G.add_edge(movie_node, actor_node)
            actor_language_counts[actor_node][movies[movie_node].language] += 1

    # Remove isolated nodes (movies with no cast fetched, actors with no movies)
    isolated = list(nx.isolates(G))
    G.remove_nodes_from(isolated)

    print(f"Graph built: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges "
          f"({len(movies)} movies, {len(actors)} actors, {len(isolated)} isolated removed)")
    return GameGraph(
        graph=G,
        movies=movies,
        actors=actors,
        actor_language_counts=actor_language_counts,
    )


# ---------------------------------------------------------------------------
# Step 4: Compute connector actors (betweenness centrality, approximated)
# ---------------------------------------------------------------------------

def compute_connector_actors(game_graph: GameGraph) -> set[str]:
    """
    Returns node IDs of actors in the top CONNECTOR_PERCENTILE by betweenness centrality.
    Uses k-sample approximation so this runs in seconds instead of hours.
    """
    G = game_graph.graph
    actor_nodes = list(game_graph.actors.keys())

    if not actor_nodes:
        return set()

    print(f"Computing betweenness centrality (k={CENTRALITY_SAMPLE_K} approximation)...")
    k = min(CENTRALITY_SAMPLE_K, G.number_of_nodes())
    centrality = nx.betweenness_centrality(G, k=k, normalized=True)

    actor_scores = {node: centrality.get(node, 0.0) for node in actor_nodes}
    scores = sorted(actor_scores.values())
    threshold_idx = int(len(scores) * CONNECTOR_PERCENTILE)
    threshold = scores[threshold_idx] if scores else 0.0

    connectors = {node for node, score in actor_scores.items() if score >= threshold}
    print(f"Connector actors: {len(connectors)} ({CONNECTOR_PERCENTILE*100:.0f}th percentile, "
          f"threshold={threshold:.6f})")
    return connectors


# ---------------------------------------------------------------------------
# Step 5: Select one puzzle per language
# ---------------------------------------------------------------------------

def select_all_puzzles(
    game_graph: GameGraph,
    connector_nodes: set[str],
    puzzle_slot: str,
) -> list[SelectedPuzzle]:
    puzzles = []
    for lang_name in SUPPORTED_LANGUAGES:
        print(f"\n[{lang_name}] Selecting puzzle...")
        puzzle = select_language_puzzle(game_graph, connector_nodes, lang_name, puzzle_slot)
        print(f"[{lang_name}] ✓ Start: '{puzzle.start_movie.title}' → "
              f"Star: '{puzzle.star.name}' | {puzzle.optimal_hop_count} hops | "
              f"{len(puzzle.connector_actor_ids)} connectors hidden in Hard mode")
        puzzles.append(puzzle)
    return puzzles


def select_language_puzzle(
    game_graph: GameGraph,
    connector_nodes: set[str],
    language: str,
    puzzle_slot: str,
) -> SelectedPuzzle:
    G = game_graph.graph
    lang_code = SUPPORTED_LANGUAGES[language]

    # All movies for this language that exist in the graph
    candidate_movies = [
        node for node, movie in game_graph.movies.items()
        if movie.language == lang_code and G.has_node(node)
    ]

    if not candidate_movies:
        raise RuntimeError(f"No movies available for language '{language}' (code: {lang_code})")

    print(f"  {len(candidate_movies)} candidate start movies")

    for attempt in range(MAX_RETRIES_PER_LANGUAGE):
        start_node = random.choice(candidate_movies)

        # BFS from start movie — cutoff at max valid hops
        lengths = nx.single_source_shortest_path_length(G, start_node, cutoff=max(VALID_HOPS))

        # Valid Stars: actor nodes reachable in exactly VALID_HOPS steps
        # This enforces minimum 3 hops — actors at 1 hop are direct cast,
        # actors at 2 hops share a movie with a direct cast member. Both rejected.
        valid_star_nodes = [
            node for node, hops in lengths.items()
            if hops in VALID_HOPS
            and G.nodes[node]["kind"] == "actor"
            and actor_has_primary_language(node, lang_code, game_graph)
        ]

        if not valid_star_nodes:
            print(f"  Attempt {attempt + 1}: no valid Stars found, trying new start movie...")
            continue

        # Weighted random choice by actor popularity
        star_node = _weighted_actor_choice(valid_star_nodes, game_graph)
        optimal_hops = lengths[star_node]

        # Find connector actors on all shortest paths
        all_paths = list(nx.all_shortest_paths(G, start_node, star_node))
        connector_actor_tmdb_ids = sorted({
            game_graph.actors[node].tmdb_id
            for path in all_paths
            for node in path
            if node != star_node and node in connector_nodes and node in game_graph.actors
        })

        return SelectedPuzzle(
            puzzle_slot=puzzle_slot,
            puzzle_date=puzzle_slot[:10],
            language=language,
            start_movie=game_graph.movies[start_node],
            star=game_graph.actors[star_node],
            optimal_hop_count=optimal_hops,
            connector_actor_ids=connector_actor_tmdb_ids,
        )

    raise RuntimeError(
        f"Could not select a valid puzzle for '{language}' after {MAX_RETRIES_PER_LANGUAGE} attempts. "
        f"Try increasing PAGES_PER_LANGUAGE or lowering MIN_VOTE_COUNT."
    )


def actor_has_primary_language(actor_node: str, language_code: str, game_graph: GameGraph) -> bool:
    language_counts = game_graph.actor_language_counts.get(actor_node)
    if not language_counts:
        return False

    target_count = language_counts.get(language_code, 0)
    return target_count > 0 and target_count == max(language_counts.values())


def _weighted_actor_choice(actor_nodes: list[str], game_graph: GameGraph) -> str:
    weights = [max(game_graph.actors[node].popularity, 0.1) for node in actor_nodes]
    return random.choices(actor_nodes, weights=weights, k=1)[0]


# ---------------------------------------------------------------------------
# Step 6: Write to Supabase
# ---------------------------------------------------------------------------

def write_puzzles(supabase: Client, puzzles: list[SelectedPuzzle]) -> None:
    rows = [p.to_supabase_row() for p in puzzles]
    response = (
        supabase.table("daily_puzzles")
        .upsert(rows, on_conflict="puzzle_slot,language")
        .execute()
    )
    print(json.dumps(response.data, indent=2))


# ---------------------------------------------------------------------------
# CLI + main
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate JumpCut five-minute puzzles.")
    parser.add_argument(
        "--date",
        help="Legacy shortcut for a midnight UTC puzzle slot, YYYY-MM-DD.",
    )
    parser.add_argument(
        "--slot",
        help="Five-minute UTC puzzle slot as ISO 8601, for example 2026-11-12T12:05:00Z.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print selected puzzles as JSON without writing to Supabase.",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help="Random seed for reproducible runs.",
    )
    parser.add_argument(
        "--languages",
        nargs="+",
        choices=list(SUPPORTED_LANGUAGES.keys()),
        help="Generate puzzles for a subset of languages only.",
    )
    parser.add_argument(
        "--refresh-movies",
        action="store_true",
        help="Force re-fetch movies from TMDB even if cache exists.",
    )
    parser.add_argument(
        "--refresh-cast",
        action="store_true",
        help="Force re-fetch cast from TMDB even if cache exists.",
    )
    return parser.parse_args()


def read_env(dry_run: bool) -> dict[str, str]:
    env = {
        "SUPABASE_URL": os.getenv("SUPABASE_URL", ""),
        "SUPABASE_SERVICE_ROLE_KEY": os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
        "TMDB_API_KEY": os.getenv("TMDB_API_KEY", ""),
        "TMDB_BASE_URL": os.getenv("TMDB_BASE_URL", "https://api.themoviedb.org/3"),
    }
    required = (
        ["TMDB_API_KEY"]
        if dry_run
        else ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "TMDB_API_KEY"]
    )
    missing = [k for k in required if not env[k]]
    if missing:
        raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")
    return env


def resolve_puzzle_slot(slot: str | None, legacy_date: str | None) -> str:
    if slot and legacy_date:
        raise ValueError("Use either --slot or --date, not both.")

    if legacy_date:
        parsed = datetime.fromisoformat(legacy_date).replace(tzinfo=timezone.utc)
    elif slot:
        parsed = datetime.fromisoformat(slot.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            raise ValueError("--slot must include a UTC offset, such as Z.")
        parsed = parsed.astimezone(timezone.utc)
    else:
        now = datetime.now(timezone.utc).replace(second=0, microsecond=0)
        parsed = now.replace(minute=now.minute - (now.minute % 5)) + timedelta(minutes=5)

    if parsed.second or parsed.microsecond or parsed.minute % 5:
        raise ValueError("Puzzle slots must start on a five-minute UTC boundary.")

    return parsed.isoformat().replace("+00:00", "Z")


def main() -> None:
    args = parse_args()
    load_dotenv(ROOT / ".env")
    random.seed(args.seed)

    puzzle_slot = resolve_puzzle_slot(args.slot, args.date)
    languages = args.languages or list(SUPPORTED_LANGUAGES.keys())
    print(f"Generating puzzles for: {', '.join(languages)} | slot: {puzzle_slot}")

    env = read_env(args.dry_run)
    tmdb = TmdbClient(env["TMDB_API_KEY"], env["TMDB_BASE_URL"])

    # Clear caches if forced refresh
    if args.refresh_movies and MOVIE_CACHE_PATH.exists():
        MOVIE_CACHE_PATH.unlink()
        print("Movie cache cleared.")
    if args.refresh_cast and CAST_CACHE_PATH.exists():
        CAST_CACHE_PATH.unlink()
        print("Cast cache cleared.")

    # --- Pipeline ---
    print("\n=== Step 1: Fetch movies ===")
    all_movies = fetch_all_movies(tmdb)

    # Filter to requested languages only (for --languages subset)
    if args.languages:
        all_movies = {lang: movies for lang, movies in all_movies.items() if lang in args.languages}

    print("\n=== Step 2: Fetch cast ===")
    cast_map = fetch_all_cast(tmdb, all_movies)

    print("\n=== Step 3: Build graph ===")
    game_graph = build_game_graph(all_movies, cast_map)

    print("\n=== Step 4: Compute connectors ===")
    connector_nodes = compute_connector_actors(game_graph)

    print("\n=== Step 5: Select puzzles ===")
    puzzles = select_all_puzzles(game_graph, connector_nodes, puzzle_slot)

    print("\n=== Results ===")
    output = [p.to_supabase_row() for p in puzzles]
    print(json.dumps(output, indent=2, ensure_ascii=False))

    if args.dry_run:
        print("\nDry run complete. Nothing written to Supabase.")
        return

    print("\n=== Step 6: Write to Supabase ===")
    supabase = create_client(env["SUPABASE_URL"], env["SUPABASE_SERVICE_ROLE_KEY"])
    write_puzzles(supabase, puzzles)
    print("Done.")


if __name__ == "__main__":
    main()
