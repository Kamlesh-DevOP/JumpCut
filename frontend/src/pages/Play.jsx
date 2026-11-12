import { Check, Clapperboard, RotateCcw } from 'lucide-react';
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
  { value: 'tamil', label: 'Tamil', script: 'தமிழ்' },
  { value: 'telugu', label: 'Telugu', script: 'తెలుగు' },
  { value: 'english', label: 'English', script: 'EN' },
  { value: 'hindi', label: 'Hindi', script: 'हिन्दी' }
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
    if (!game.error && !game.isLoadingChoices && game.hasStarted && game.status === 'in_progress' && game.view === 'movie_cast' && game.currentMovie && game.cast.length === 0) {
      game.loadCast(game.currentMovie);
    }
    if (!game.error && !game.isLoadingChoices && game.hasStarted && game.status === 'in_progress' && game.view === 'actor_movies' && game.currentActor && game.actorMovies.length === 0) {
      game.loadActorMovies(game.currentActor);
    }
  }, [game.hasStarted, game.status, game.view, game.currentMovie?.tmdb_id, game.currentActor?.tmdb_id, game.isLoadingChoices, game.error]);

  if (!store.hasStarted) {
    return (
      <section className="mx-auto max-w-3xl space-y-7 py-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber">New puzzle every 30 minutes</p>
          <h1 className="font-display mt-2 text-4xl font-bold text-parchment">Choose your cinema.</h1>
          <p className="mt-2 text-sm text-parchment/60">Language and difficulty lock once your path begins.</p>
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

        {puzzleError && <p className="border border-[#E4B0A8] bg-[#F4DED9] p-3 text-sm text-[#64211E]">{puzzleError}</p>}
        <Button onClick={beginGame} disabled={isLoading} className="w-full sm:w-auto">
          <Clapperboard size={16} /> {isLoading ? 'Loading puzzle' : 'Start this puzzle'}
        </Button>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <StarBanner star={game.puzzle?.star} optimalHops={game.puzzle?.optimal_hop_count} />
        <HopCounter hopCount={game.hopCount} undosLeft={game.undosLeft} />
      </div>
      <PathTracker path={game.path} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-amber">
            {game.language} / {game.difficulty}
          </p>
          <h1 className="font-display mt-1 text-3xl font-bold text-parchment">
            {game.view === 'movie_cast' ? game.currentMovie?.title : `${game.currentActor?.name}'s movies`}
          </h1>
        </div>
        <Button variant="secondary" onClick={() => game.undo(undo)} disabled={game.undosLeft <= 0 || game.path.length === 0}>
          <RotateCcw size={16} />
          Undo
        </Button>
      </div>

      {game.error && <p className="border border-[#E4B0A8] bg-[#F4DED9] p-3 text-sm text-[#64211E]">{game.error}</p>}
      {game.isLoadingChoices && <Spinner label="Loading choices" />}
      {!game.isLoadingChoices && game.view === 'movie_cast' && (
        <CastGrid cast={game.cast} onSelectActor={(actor) => game.selectActor(actor, recordHop)} />
      )}
      {!game.isLoadingChoices && game.view === 'actor_movies' && (
        <MovieGrid movies={game.actorMovies} onSelectMovie={(movie) => game.selectMovie(movie, recordHop)} />
      )}
      <SolvedModal isOpen={game.status === 'solved'} game={game} onMainMenu={store.resetGame} />
    </section>
  );
}

function Selector({ label, options, value, onChange }) {
  const isDifficulty = label === 'Difficulty';

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-ash">{label}</p>
      <div className={`grid gap-2 ${isDifficulty ? 'sm:max-w-md sm:grid-cols-2' : 'sm:grid-cols-4'}`}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            className={`min-h-16 border px-4 py-3 text-left text-sm transition ${
              value === option.value
                ? isDifficulty && option.value === 'hard'
                  ? 'border-[#F3D8D1] bg-[#F3D8D1] text-[#42150F] shadow-[0_0_0_1px_rgba(243,216,209,0.35)]'
                  : 'border-amber bg-amber text-noir shadow-[0_0_0_1px_rgba(201,135,42,0.35)]'
                : 'border-card-border bg-noir text-parchment hover:border-amber/60'
            }`}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="font-medium">{option.label}</span>
              {value === option.value && <Check size={17} strokeWidth={3} />}
            </span>
            {option.script && <span className={`mt-1 block text-xs ${value === option.value ? 'opacity-75' : 'text-ash'}`}>{option.script}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
