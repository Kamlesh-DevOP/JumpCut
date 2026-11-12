import { Check, UserPlus, X } from 'lucide-react';

import { Button } from '../ui/Button.jsx';

export function IncomingRequestRow({ request, isWorking, onAccept, onReject }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border border-card-border bg-card-surface px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-noir text-amber">
          <UserPlus aria-hidden="true" size={18} />
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium text-parchment">{request.from_username}</p>
          <p className="mt-0.5 font-mono text-xs text-parchment/50">{request.from_jumpcut_id}</p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button disabled={isWorking} onClick={() => onAccept(request)}>
          <Check aria-hidden="true" size={16} /> Accept
        </Button>
        <Button aria-label={`Reject ${request.from_username}'s request`} disabled={isWorking} title="Reject request" variant="secondary" onClick={() => onReject(request)}>
          <X aria-hidden="true" size={16} />
        </Button>
      </div>
    </li>
  );
}
