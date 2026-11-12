import { UserRound } from 'lucide-react';

export function Profile() {
  return (
    <section className="space-y-5">
      <div>
        <p className="text-sm font-bold uppercase text-ember">Your stats</p>
        <h1 className="mt-2 text-4xl font-black">Profile</h1>
      </div>
      <div className="rounded-lg border border-stone-200 bg-white p-6">
        <div className="flex items-center gap-3">
          <UserRound className="text-plum" size={28} />
          <div>
            <h2 className="text-xl font-black">JumpCut ID and play history</h2>
            <p className="mt-1 text-stone-600">Profile stats will connect after scoring and auth are wired end to end.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
