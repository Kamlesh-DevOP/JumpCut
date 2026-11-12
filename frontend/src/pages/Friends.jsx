import { UsersRound } from 'lucide-react';

export function Friends() {
  return (
    <section className="space-y-5 py-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber">Social</p>
        <h1 className="font-display mt-2 text-4xl font-bold text-parchment">Friends</h1>
      </div>
      <div className="border border-card-border bg-card-surface p-6">
        <div className="flex items-center gap-3">
          <UsersRound className="text-amber" size={28} />
          <div>
            <h2 className="font-display text-xl font-medium text-parchment">Friend requests and friend boards</h2>
            <p className="mt-1 text-parchment/55">This screen will connect when the friends API step is built.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
