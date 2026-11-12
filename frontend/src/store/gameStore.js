import { create } from 'zustand';

const initialState = {
  view: 'movie_cast',
  currentMovie: null,
  currentActor: null,
  cast: [],
  actorMovies: [],
  path: [],
  hopCount: 0,
  undosLeft: 3,
  score: null,
  optimalPath: [],
  status: 'in_progress',
  language: 'tamil',
  difficulty: 'easy',
  sessionId: null,
  puzzle: null,
  hasStarted: false
};

export const useGameStore = create((set, get) => ({
  ...initialState,
  setLanguage: (language) => set({ language }),
  setDifficulty: (difficulty) => set({ difficulty }),
  startGame: (puzzle, session) => get().syncSession(session, puzzle),
  syncSession: (session, puzzleOverride) =>
    set((state) => {
      const puzzle = puzzleOverride ?? state.puzzle;
      const path = session.path ?? [];
      const lastHop = path.at(-1);
      const lastMovieHop = [...path].reverse().find((hop) => hop.type === 'movie');
      const isActor = lastHop?.type === 'actor';

      return {
        puzzle,
        sessionId: session.id,
        path,
        hopCount: session.hop_count ?? path.length,
        undosLeft: 3 - (session.undos_used ?? 0),
        score: session.score ?? null,
        optimalPath: session.optimal_path ?? (puzzleOverride ? [] : state.optimalPath),
        status: session.status,
        currentMovie: lastMovieHop ? toMovie(lastMovieHop) : puzzle.start_movie,
        currentActor: isActor ? toActor(lastHop) : null,
        cast: [],
        actorMovies: [],
        view: isActor ? 'actor_movies' : 'movie_cast',
        hasStarted: true
      };
    }),
  setCast: (cast) => set({ cast }),
  setActorMovies: (actorMovies) => set({ actorMovies }),
  resetGame: () => set(initialState)
}));

function toMovie(hop) {
  return { tmdb_id: hop.tmdb_id, title: hop.name, poster_path: hop.poster_path, year: null };
}

function toActor(hop) {
  return { tmdb_id: hop.tmdb_id, name: hop.name, profile_path: hop.poster_path };
}
