import { Trophy } from 'lucide-react';

export function Leaderboard() {
  return (
    <section className="space-y-5">
      <div>
        <p className="text-sm font-bold uppercase text-ember">Rankings</p>
        <h1 className="mt-2 text-4xl font-black">Leaderboard</h1>
      </div>
      <div className="rounded-lg border border-stone-200 bg-white p-6">
        <div className="flex items-center gap-3">
          <Trophy className="text-marigold" size={28} />
          <div>
            <h2 className="text-xl font-black">Daily, weekly, and monthly boards</h2>
            <p className="mt-1 text-stone-600">Scoring views will connect after the backend leaderboard step.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
