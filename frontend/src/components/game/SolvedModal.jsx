import { Copy, Trophy } from 'lucide-react';

import { createShareText } from '../../utils/share.js';
import { Button } from '../ui/Button.jsx';
import { Modal } from '../ui/Modal.jsx';

export function SolvedModal({ isOpen, game }) {
  const shareText = createShareText(game);

  async function copyShareText() {
    await navigator.clipboard?.writeText(shareText);
  }

  return (
    <Modal isOpen={isOpen}>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-marigold text-ink">
            <Trophy size={24} />
          </div>
          <div>
            <p className="text-sm font-bold uppercase text-stone-500">Solved</p>
            <h2 className="text-2xl font-black">Reached The Star</h2>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-stone-100 p-4">
            <p className="text-xs font-bold uppercase text-stone-500">Jumps</p>
            <p className="text-3xl font-black">{game.hopCount}</p>
          </div>
          <div className="rounded-lg bg-stone-100 p-4">
            <p className="text-xs font-bold uppercase text-stone-500">Score</p>
            <p className="text-3xl font-black">{Number(game.score ?? 0).toFixed(2)}</p>
          </div>
        </div>
        <pre className="whitespace-pre-wrap rounded-lg bg-ink p-4 text-sm text-white">{shareText}</pre>
        <Button onClick={copyShareText} className="w-full">
          <Copy size={16} />
          Copy result
        </Button>
      </div>
    </Modal>
  );
}
