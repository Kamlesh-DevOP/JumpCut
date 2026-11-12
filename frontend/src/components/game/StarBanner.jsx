import { Goal } from 'lucide-react';

import { imageUrl } from '../../utils/image.js';

export function StarBanner({ star }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-marigold/40 bg-amber-50 px-4 py-3">
      {star?.profile_path ? (
        <img src={imageUrl(star.profile_path)} alt="" className="h-12 w-12 rounded-md object-cover" />
      ) : (
        <div className="grid h-12 w-12 place-items-center rounded-md bg-white text-marigold">
          <Goal size={24} />
        </div>
      )}
      <div>
        <p className="text-xs font-bold uppercase text-stone-600">Reach The Star</p>
        <p className="text-lg font-black text-ink">{star?.name ?? 'Unknown star'}</p>
      </div>
    </div>
  );
}
