import { UserRound } from 'lucide-react';

import { imageUrl } from '../../utils/image.js';

export function ActorCard({ actor, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(actor)}
      disabled={actor.hidden}
      className="group overflow-hidden rounded-lg border border-stone-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-ink hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div className="poster-aspect bg-stone-200">
        {actor.profile_path ? (
          <img src={imageUrl(actor.profile_path)} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-stone-500">
            <UserRound size={32} />
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-bold text-ink">{actor.name}</h3>
        <p className="mt-1 line-clamp-1 text-xs text-stone-600">{actor.hidden ? 'Hidden connector' : actor.character}</p>
      </div>
    </button>
  );
}
