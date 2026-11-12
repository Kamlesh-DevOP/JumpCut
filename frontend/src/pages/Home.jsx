import { Link } from 'react-router-dom';

export function Home() {
  return (
    <section className="grid gap-8 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <div className="space-y-5">
        <p className="text-sm font-bold uppercase text-ember">Daily movie connection puzzle</p>
        <h1 className="max-w-3xl text-5xl font-black leading-tight text-ink sm:text-6xl">JumpCut</h1>
        <p className="max-w-2xl text-lg leading-8 text-stone-700">
          Start from today&apos;s movie, jump through actors and filmographies, and reach The Star in as few moves as possible.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/play"
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-black"
          >
            Play today
          </Link>
          <Link
            to="/leaderboard"
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-ink hover:border-ink"
          >
            View leaderboard
          </Link>
        </div>
      </div>
      <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3">
          {['Tamil', 'Telugu', 'English', 'Hindi'].map((language, index) => (
            <div key={language} className="flex items-center justify-between rounded-md bg-stone-100 px-4 py-3">
              <span className="font-bold">{language}</span>
              <span className="text-sm text-stone-600">Puzzle {index + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
