import { Copy, Trophy } from 'lucide-react';
import { useState } from 'react';

import { createShareText } from '../../utils/share.js';
import { Button } from '../ui/Button.jsx';
import { Modal } from '../ui/Modal.jsx';

export function SolvedModal({ isOpen, game }) {
  const [copied, setCopied] = useState(false);
  const shareText = createShareText(game);

  async function copyShareText() {
    await navigator.clipboard?.writeText(shareText);
    setCopied(true);
  }

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
        <div className="border-l-2 border-amber bg-deep-noir px-4 py-3 text-sm leading-6 text-parchment/70">
          Your result is saved for this thirty-minute puzzle.
        </div>
        <Button onClick={copyShareText} className="w-full">
          <Copy size={16} />
          {copied ? 'Result copied' : 'Copy result'}
        </Button>
      </div>
    </Modal>
  );
}
