import { ArrowRight, Clapperboard, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

import { usePuzzleCadence } from '../hooks/usePuzzleCadence.js';

const languageCards = [
  { name: 'Tamil', script: 'தமிழ்', code: 'TA' },
  { name: 'Telugu', script: 'తెలుగు', code: 'TE' },
  { name: 'Hindi', script: 'हिन्दी', code: 'HI' },
  { name: 'English', script: 'EN', code: 'EN' }
];

const languageValues = ['tamil', 'telugu', 'hindi', 'english'];

export function Home() {
  const puzzleCadence = usePuzzleCadence();

  return (
    <section className="film-grain -mx-4 flex min-h-[calc(100vh-9rem)] flex-col justify-center border-y border-card-border px-4 py-12 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div className="space-y-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber/30 bg-amber/10 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-amber">
            <Sparkles size={14} /> New puzzle every {puzzleCadence} minutes
          </div>
          <div className="space-y-3">
            <p className="font-display text-xl text-crimson-light">The movie connection game</p>
            <h1 className="font-display max-w-3xl text-5xl font-bold leading-[1.02] text-parchment sm:text-7xl">
              Find the star.<br />
              <span className="text-amber">Make the cut.</span>
            </h1>
          </div>
          <p className="max-w-xl text-base leading-7 text-parchment/65 sm:text-lg">
            Begin with one film. Follow its cast into another story. Reach The Star in the fewest possible jumps.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/play" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-amber px-5 py-3 text-sm font-medium text-noir transition hover:bg-[#e4a13b]">
              <Clapperboard size={18} /> Play the current puzzle
            </Link>
            <Link to="/leaderboard" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-card-border bg-card-surface px-5 py-3 text-sm font-medium text-parchment transition hover:border-amber hover:text-amber">
              Explore scores <ArrowRight size={17} />
            </Link>
          </div>
        </div>

        <div className="border-y border-card-border py-3 lg:border">
          <div className="flex items-center justify-between px-4 pb-3 text-xs font-medium uppercase tracking-wide text-ash">
            <span>Choose your cinema</span>
            <span>Four paths live</span>
          </div>
          <div className="grid grid-cols-2 gap-px bg-card-border">
            {languageCards.map((language, index) => (
              <Link key={language.name} to={`/play?language=${languageValues[index]}`} className="group min-h-36 bg-card-surface p-4 transition hover:bg-noir">
                <p className="text-xs font-medium text-amber">{language.code}</p>
                <p className="mt-7 font-display text-2xl text-parchment group-hover:text-amber">{language.name}</p>
                <p className="mt-1 text-sm text-ash">{language.script}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
