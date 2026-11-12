import { ChevronRight } from 'lucide-react';

export function PathTracker({ path }) {
  return (
    <div className="flex min-h-12 flex-wrap items-center gap-2 border-y border-card-border bg-deep-noir px-3 py-2">
      {path.length === 0 ? (
        <span className="text-sm text-parchment/50">Your path begins with the opening movie.</span>
      ) : (
        path.map((entry, index) => (
          <span key={`${entry.type}-${entry.tmdb_id}-${index}`} className="inline-flex items-center gap-2">
            <span className={`rounded-md px-2 py-1 text-xs font-medium ${entry.type === 'movie' ? 'bg-noir text-amber' : 'bg-amber/10 text-amber'}`}>
              {entry.type === 'movie' ? 'Movie' : 'Actor'}
            </span>
            <span className="max-w-40 truncate text-sm text-parchment/80">{entry.name}</span>
            {index < path.length - 1 && <ChevronRight size={14} className="text-ash" />}
          </span>
        ))
      )}
    </div>
  );
}
