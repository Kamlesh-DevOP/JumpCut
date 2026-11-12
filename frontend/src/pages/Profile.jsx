import { UserRound } from 'lucide-react';

export function Profile() {
  return (
    <section className="space-y-5 py-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber">Your stats</p>
        <h1 className="font-display mt-2 text-4xl font-bold text-parchment">Profile</h1>
      </div>
      <div className="border border-card-border bg-card-surface p-6">
        <div className="flex items-center gap-3">
          <UserRound className="text-amber" size={28} />
          <div>
            <h2 className="font-display text-xl font-medium text-parchment">JumpCut ID and play history</h2>
            <p className="mt-1 text-parchment/55">Profile stats will connect after scoring and auth are wired end to end.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
