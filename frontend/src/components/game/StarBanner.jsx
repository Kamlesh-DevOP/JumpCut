import { Goal, Sparkles } from 'lucide-react';

import { imageUrl } from '../../utils/image.js';

export function StarBanner({ star, optimalHops }) {
  return (
    <div className="flex items-center gap-3 border border-[#E4B0A8] bg-[#F4E1DC] px-4 py-3">
      {star?.profile_path ? (
        <img src={imageUrl(star.profile_path)} alt="" className="h-12 w-12 rounded-full border border-[#C98479] object-cover" />
      ) : (
        <div className="grid h-12 w-12 place-items-center rounded-full bg-[#E6B0A7] text-[#64211E]">
          <Goal size={24} />
        </div>
      )}
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#8B4B45]">Reach The Star</p>
        <p className="font-display text-xl font-medium text-[#64211E]">{star?.name ?? 'Unknown star'}</p>
      </div>
      <div className="ml-auto hidden items-center gap-2 text-right text-xs text-[#8B4B45] sm:flex">
        <Sparkles size={14} className="text-amber" />
        <span>Optimal<br /><strong className="font-display text-lg font-bold text-[#64211E]">{optimalHops}</strong> jumps</span>
      </div>
    </div>
  );
}
