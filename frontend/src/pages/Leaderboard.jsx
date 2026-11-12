import { Trophy, UsersRound } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { getCurrentLeaderboard, getDailyLeaderboard } from '../api/leaderboard.js';
import { getApiErrorMessage } from '../api/client.js';
import { DailyScoreBoard } from '../components/leaderboard/DailyScoreBoard.jsx';
import { useAuth } from '../hooks/useAuth.js';

const languages = ['tamil', 'telugu', 'english', 'hindi'];
const difficulties = ['easy', 'hard'];

export function Leaderboard() {
  const { isLoading: isCheckingAuth, user } = useAuth();
  const userId = user?.id;
  const [scope, setScope] = useState('friends');
  const [boardType, setBoardType] = useState('current');
  const [language, setLanguage] = useState('tamil');
  const [difficulty, setDifficulty] = useState('easy');
  const [board, setBoard] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const hasMatchingBoard = boardType === 'daily' ? board?.period === 'daily' : Boolean(board?.puzzle_slot);

  const loadBoard = useCallback(async () => {
    if (!userId) {
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const nextBoard = boardType === 'daily'
        ? await getDailyLeaderboard(scope)
        : await getCurrentLeaderboard({ scope, language, difficulty });
      setBoard(nextBoard);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }, [boardType, difficulty, language, scope, userId]);

  useEffect(() => {
    if (!userId) {
      return undefined;
    }

    loadBoard();
    const refreshInterval = window.setInterval(loadBoard, 30_000);

    return () => window.clearInterval(refreshInterval);
  }, [loadBoard, userId]);

  return (
    <section className="mx-auto max-w-4xl space-y-7 py-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber">Rankings</p>
        <h1 className="font-display mt-2 text-4xl font-bold text-parchment">Leaderboard</h1>
      </div>

      {isCheckingAuth ? <p className="text-sm text-parchment/55">Checking your account...</p> : !user ? (
        <div className="border border-card-border bg-card-surface p-6">
          <p className="text-parchment/65">Log in to compare puzzle results.</p>
          <Link className="mt-4 inline-flex text-sm font-medium text-amber hover:text-parchment" to="/auth/login">Log in</Link>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 border-y border-card-border py-4">
            <ScopeButton active={scope === 'friends'} icon={UsersRound} label="Friends" onClick={() => setScope('friends')} />
            <ScopeButton active={scope === 'global'} icon={Trophy} label="Global" onClick={() => setScope('global')} />
          </div>
          <div className="flex flex-wrap gap-2">
            <TypeButton active={boardType === 'current'} label="Current puzzle" onClick={() => setBoardType('current')} />
            <TypeButton active={boardType === 'daily'} label="Daily total" onClick={() => setBoardType('daily')} />
          </div>
          {boardType === 'current' && <div className="grid gap-5 sm:grid-cols-2">
              <Filter label="Language" options={languages} value={language} onChange={setLanguage} />
              <Filter label="Difficulty" options={difficulties} value={difficulty} onChange={setDifficulty} />
            </div>}

          {error && <p className="border border-crimson-light/30 p-3 text-sm text-crimson-light">{error}</p>}
          {isLoading || !hasMatchingBoard ? <p className="py-8 text-center text-sm text-parchment/55">Loading scores...</p> : (boardType === 'daily' ? <DailyScoreBoard scope={scope} board={board} /> : <Board scope={scope} board={board} />)}
        </>
      )}
    </section>
  );
}

function ScopeButton({ active, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-10 items-center gap-2 border px-4 text-sm font-medium ${active ? 'border-amber bg-amber text-noir' : 'border-card-border bg-card-surface text-parchment hover:border-amber'}`}
      onClick={onClick}
    >
      <Icon aria-hidden="true" size={16} /> {label}
    </button>
  );
}

function TypeButton({ active, label, onClick }) {
  return <button type="button" className={`min-h-9 border px-3 text-sm ${active ? 'border-amber text-amber' : 'border-card-border text-parchment/60 hover:border-amber'}`} onClick={onClick}>{label}</button>;
}

function Filter({ label, options, value, onChange }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-[0.15em] text-parchment/55">{label}</span>
      <select className="mt-2 min-h-10 w-full border border-card-border bg-noir px-3 text-sm capitalize text-parchment outline-none focus:border-amber" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function Board({ scope, board }) {
  const label = scope === 'friends' ? 'Friends in this puzzle' : 'Top players in this puzzle';

  return (
    <section aria-label={label}>
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-medium text-parchment">{label}</h2>
          <p className="mt-1 text-sm text-parchment/55">{formatPuzzleSlot(board.puzzle_slot)}</p>
        </div>
        <span className="text-sm capitalize text-amber">{board.language} / {board.difficulty}</span>
      </div>
      {board.entries.length === 0 ? <p className="border border-dashed border-card-border py-8 text-center text-sm text-parchment/55">No completed games in this group yet.</p> : (
        <ol className="divide-y divide-card-border border-y border-card-border">
          {board.entries.map((entry) => (
            <li key={entry.jumpcut_id} className="grid grid-cols-[2rem_minmax(0,1fr)_auto_auto] items-center gap-3 py-3 sm:grid-cols-[2.5rem_minmax(0,1fr)_5rem_5rem]">
              <span className="font-display text-xl font-bold text-amber">{entry.rank}</span>
              <div className="min-w-0">
                <p className="truncate font-medium text-parchment">{entry.username}</p>
                <p className="font-mono text-xs text-parchment/45">{entry.jumpcut_id}</p>
              </div>
              <span className="text-right text-sm text-parchment/70">{entry.hop_count} hops</span>
              <span className="font-display text-right text-lg font-bold text-amber">{Number(entry.score).toFixed(2)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function formatPuzzleSlot(slot) {
  return `Current puzzle: ${new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(slot))}`;
}
