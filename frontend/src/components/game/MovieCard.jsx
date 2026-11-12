import { Film } from 'lucide-react';

import { imageUrl } from '../../utils/image.js';

export function MovieCard({ movie, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(movie)}
      className="group overflow-hidden rounded-lg border border-stone-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-ink hover:shadow-md"
    >
      <div className="poster-aspect bg-stone-200">
        {movie.poster_path ? (
          <img src={imageUrl(movie.poster_path)} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-stone-500">
            <Film size={32} />
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-bold text-ink">{movie.title}</h3>
        <p className="mt-1 text-xs text-stone-600">{movie.year ?? 'Year unknown'}</p>
      </div>
    </button>
  );
}
