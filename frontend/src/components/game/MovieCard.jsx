import { Film } from 'lucide-react';

import { imageUrl } from '../../utils/image.js';

export function MovieCard({ movie, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(movie)}
      className="group overflow-hidden border border-card-border bg-noir text-left transition hover:-translate-y-0.5 hover:border-amber"
    >
      <div className="poster-aspect bg-card-surface">
        {movie.poster_path ? (
          <img src={imageUrl(movie.poster_path)} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-ash">
            <Film size={32} />
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-display line-clamp-2 text-base font-medium text-parchment">{movie.title}</h3>
        <p className="mt-1 text-xs text-amber">{movie.year ?? 'Year unknown'}</p>
      </div>
    </button>
  );
}
