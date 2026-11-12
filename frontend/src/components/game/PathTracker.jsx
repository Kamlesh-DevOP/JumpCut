import { ChevronRight } from 'lucide-react';

export function PathTracker({ path }) {
  return (
    <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2">
      {path.length === 0 ? (
        <span className="text-sm text-stone-500">No jumps yet</span>
      ) : (
        path.map((entry, index) => (
          <span key={`${entry.type}-${entry.tmdb_id}-${index}`} className="inline-flex items-center gap-2">
            <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-700">
              {entry.type === 'movie' ? 'Movie' : 'Actor'}
            </span>
            <span className="max-w-40 truncate text-sm font-medium">{entry.name}</span>
            {index < path.length - 1 && <ChevronRight size={14} className="text-stone-400" />}
          </span>
        ))
      )}
    </div>
  );
}
