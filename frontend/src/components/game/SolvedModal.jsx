import { ArrowRight, Clapperboard, Trophy } from 'lucide-react';

import { Button } from '../ui/Button.jsx';
import { Modal } from '../ui/Modal.jsx';

export function SolvedModal({ isOpen, game, onMainMenu }) {

  return (
    <Modal isOpen={isOpen}>
      <div className="space-y-6 text-parchment">
        <div className="flex items-center gap-4 border-b border-card-border pb-5">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-amber text-noir">
            <Trophy size={28} />
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-amber/80">Puzzle complete</p>
            <h2 className="font-display text-3xl font-bold">You reached The Star.</h2>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="border border-card-border bg-card-surface p-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-ash">Jumps</p>
            <p className="font-display mt-1 text-3xl font-bold">{game.hopCount}</p>
          </div>
          <div className="border border-amber/40 bg-amber/10 p-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-amber">Score</p>
            <p className="font-display mt-1 text-3xl font-bold text-amber">{Number(game.score ?? 0).toFixed(2)}</p>
          </div>
          <div className="border border-card-border bg-card-surface p-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-ash">Optimal</p>
            <p className="font-display mt-1 text-3xl font-bold">{game.puzzle?.optimal_hop_count ?? '—'}</p>
          </div>
        </div>
        <div className="space-y-2 border border-card-border bg-deep-noir p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-amber">Optimal path</p>
            <p className="text-xs text-ash">{game.puzzle?.optimal_hop_count ?? 0} jumps</p>
          </div>
          {game.optimalPath?.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {game.optimalPath.map((entry, index) => (
                <span key={`${entry.type}-${entry.tmdb_id}-${index}`} className="inline-flex items-center gap-2">
                  <span className={`rounded-sm px-2 py-1 text-xs ${entry.type === 'movie' ? 'bg-card-surface text-amber' : 'bg-amber/10 text-parchment'}`}>
                    {entry.name}
                  </span>
                  {index < game.optimalPath.length - 1 && <ArrowRight size={13} className="text-ash" />}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6 text-parchment/60">This puzzle was generated before optimal routes were stored.</p>
          )}
        </div>
        <Button onClick={onMainMenu} className="w-full">
          <Clapperboard size={16} />
          Back to game selection
        </Button>
      </div>
    </Modal>
  );
}
