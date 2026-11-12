import { LockKeyhole, UserRound } from 'lucide-react';

import { imageUrl } from '../../utils/image.js';

export function ActorCard({ actor, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(actor)}
      disabled={actor.hidden}
      className="group overflow-hidden border border-card-border bg-card-surface text-left transition hover:-translate-y-0.5 hover:border-amber disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div className="poster-aspect bg-noir">
        {actor.profile_path ? (
          <img src={imageUrl(actor.profile_path)} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-ash">
            <UserRound size={32} />
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-medium text-parchment">{actor.name}</h3>
          {actor.hidden && <LockKeyhole size={14} className="shrink-0 text-ash" />}
        </div>
        <p className="mt-1 line-clamp-1 text-xs text-ash">{actor.hidden ? 'Hidden connector' : actor.character}</p>
      </div>
    </button>
  );
}
