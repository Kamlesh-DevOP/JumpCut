import { Trophy } from 'lucide-react';

export function Leaderboard() {
  return (
    <section className="space-y-5 py-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber">Rankings</p>
        <h1 className="font-display mt-2 text-4xl font-bold text-parchment">Leaderboard</h1>
      </div>
      <div className="border border-card-border bg-card-surface p-6">
        <div className="flex items-center gap-3">
          <Trophy className="text-amber" size={28} />
          <div>
            <h2 className="font-display text-xl font-medium text-parchment">Daily, weekly, and monthly boards</h2>
            <p className="mt-1 text-parchment/55">Scoring views will connect after the backend leaderboard step.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
