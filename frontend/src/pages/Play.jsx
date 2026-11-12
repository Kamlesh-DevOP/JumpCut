import { RotateCcw } from 'lucide-react';
import { useEffect } from 'react';

import { CastGrid } from '../components/game/CastGrid.jsx';
import { HopCounter } from '../components/game/HopCounter.jsx';
import { MovieGrid } from '../components/game/MovieGrid.jsx';
import { PathTracker } from '../components/game/PathTracker.jsx';
import { SolvedModal } from '../components/game/SolvedModal.jsx';
import { StarBanner } from '../components/game/StarBanner.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { useGame } from '../hooks/useGame.js';
import { usePuzzle } from '../hooks/usePuzzle.js';
import { useSession } from '../hooks/useSession.js';
import { useGameStore } from '../store/gameStore.js';

const languages = [
  { value: 'tamil', label: 'Tamil' },
  { value: 'telugu', label: 'Telugu' },
  { value: 'english', label: 'English' },
  { value: 'hindi', label: 'Hindi' }
];

const difficulties = [
  { value: 'easy', label: 'Easy' },
  { value: 'hard', label: 'Hard' }
];

export function Play() {
  const { loadPuzzle, isLoading, error: puzzleError } = usePuzzle();
  const { startSession, recordHop, undo } = useSession();
  const game = useGame();
  const store = useGameStore();

  async function beginGame() {
    const puzzle = await loadPuzzle(store.language);
    const session = await startSession({ language: store.language, difficulty: store.difficulty });
    store.startGame(puzzle, session);
  }

  useEffect(() => {
    if (game.hasStarted && game.status === 'in_progress' && game.view === 'movie_cast' && game.currentMovie && game.cast.length === 0) {
      game.loadCast(game.currentMovie);
    }
    if (game.hasStarted && game.status === 'in_progress' && game.view === 'actor_movies' && game.currentActor && game.actorMovies.length === 0) {
      game.loadActorMovies(game.currentActor);
    }
  }, [game.hasStarted, game.status, game.view, game.currentMovie?.tmdb_id, game.currentActor?.tmdb_id]);

  if (!store.hasStarted) {
    return (
      <section className="mx-auto max-w-3xl space-y-6">
        <div>
          <p className="text-sm font-bold uppercase text-ember">Daily challenge</p>
          <h1 className="mt-2 text-4xl font-black">Choose your puzzle</h1>
        </div>

        <Selector
          label="Language"
          options={languages}
          value={store.language}
          onChange={store.setLanguage}
        />
        <Selector
          label="Difficulty"
          options={difficulties}
          value={store.difficulty}
          onChange={store.setDifficulty}
        />

        {puzzleError && <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{puzzleError}</p>}
        <Button onClick={beginGame} disabled={isLoading} className="w-full sm:w-auto">
          {isLoading ? 'Loading puzzle' : 'Start game'}
        </Button>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <StarBanner star={game.puzzle?.star} />
        <HopCounter hopCount={game.hopCount} undosLeft={game.undosLeft} />
      </div>
      <PathTracker path={game.path} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase text-stone-500">
            {game.language} / {game.difficulty}
          </p>
          <h1 className="text-3xl font-black">
            {game.view === 'movie_cast' ? game.currentMovie?.title : `${game.currentActor?.name}'s movies`}
          </h1>
        </div>
        <Button variant="secondary" onClick={() => game.undo(undo)} disabled={game.undosLeft <= 0 || game.path.length === 0}>
          <RotateCcw size={16} />
          Undo
        </Button>
      </div>

      {game.error && <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{game.error}</p>}
      {game.isLoadingChoices && <Spinner label="Loading choices" />}
      {!game.isLoadingChoices && game.view === 'movie_cast' && (
        <CastGrid cast={game.cast} onSelectActor={(actor) => game.selectActor(actor, recordHop)} />
      )}
      {!game.isLoadingChoices && game.view === 'actor_movies' && (
        <MovieGrid movies={game.actorMovies} onSelectMovie={(movie) => game.selectMovie(movie, recordHop)} />
      )}
      <SolvedModal isOpen={game.status === 'solved'} game={game} />
    </section>
  );
}

function Selector({ label, options, value, onChange }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-bold text-stone-700">{label}</p>
      <div className="grid gap-2 sm:grid-cols-4">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-md border px-4 py-3 text-sm font-bold ${
              value === option.value ? 'border-ink bg-ink text-white' : 'border-stone-300 bg-white text-ink hover:border-ink'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
