import { Lightbulb } from 'lucide-react';

import { imageUrl } from '../../utils/image.js';

export function HintPanel({ movies }) {
  if (movies.length === 0) {
    return null;
  }

  return (
    <section className="border border-amber/30 bg-amber/10 p-4">
      <div className="flex items-center gap-2">
        <Lightbulb size={17} className="text-amber" />
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-amber">Star clue</p>
          <p className="text-sm text-parchment/75">The Star appears in these popular films.</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-5 gap-2 sm:gap-3">
        {movies.map((movie) => (
          <article key={movie.tmdb_id} className="min-w-0">
            <div className="poster-aspect overflow-hidden border border-card-border bg-noir">
              {movie.poster_path ? (
                <img src={imageUrl(movie.poster_path)} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-xs text-ash">No poster</div>
              )}
            </div>
            <p className="mt-2 line-clamp-2 text-xs font-medium leading-4 text-parchment">{movie.title}</p>
            <p className="mt-1 text-[11px] text-amber">{movie.year ?? 'Unknown year'}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
