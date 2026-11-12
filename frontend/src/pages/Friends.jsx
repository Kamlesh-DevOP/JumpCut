import { UsersRound } from 'lucide-react';

export function Friends() {
  return (
    <section className="space-y-5">
      <div>
        <p className="text-sm font-bold uppercase text-ember">Social</p>
        <h1 className="mt-2 text-4xl font-black">Friends</h1>
      </div>
      <div className="rounded-lg border border-stone-200 bg-white p-6">
        <div className="flex items-center gap-3">
          <UsersRound className="text-peacock" size={28} />
          <div>
            <h2 className="text-xl font-black">Friend requests and friend boards</h2>
            <p className="mt-1 text-stone-600">This screen will connect when the friends API step is built.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
