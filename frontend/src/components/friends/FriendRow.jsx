import { Trash2, UserRound } from 'lucide-react';

import { Button } from '../ui/Button.jsx';

export function FriendRow({ friend, isWorking, onRemove }) {
  return (
    <li className="flex items-center justify-between gap-4 border border-card-border bg-card-surface px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-noir text-amber">
          <UserRound aria-hidden="true" size={18} />
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium text-parchment">{friend.username}</p>
          <p className="mt-0.5 font-mono text-xs text-parchment/50">{friend.jumpcut_id}</p>
        </div>
      </div>
      <Button
        aria-label={`Remove ${friend.username}`}
        className="shrink-0 px-3"
        disabled={isWorking}
        title={`Remove ${friend.username}`}
        variant="secondary"
        onClick={() => onRemove(friend)}
      >
        <Trash2 aria-hidden="true" size={16} />
      </Button>
    </li>
  );
}
