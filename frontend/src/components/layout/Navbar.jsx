import { Film, Trophy, UserRound, UsersRound } from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { useGameStore } from '../../store/gameStore.js';

const links = [
  { to: '/play', label: 'Play', icon: Film },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/friends', label: 'Friends', icon: UsersRound },
  { to: '/profile', label: 'Profile', icon: UserRound }
];

export function Navbar() {
  const { hasStarted, language, difficulty } = useGameStore();

  return (
    <header className="border-b border-card-border bg-noir">
      <nav className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <NavLink to="/" className="font-display text-2xl font-bold text-amber">
          JumpCut
        </NavLink>
        <div className="flex flex-wrap items-center gap-2">
          {hasStarted && (
            <div className="hidden items-center gap-1 sm:flex">
              <span className="rounded-full bg-amber px-2.5 py-1 text-[11px] font-medium uppercase text-noir">{language}</span>
              <span className="rounded-full border border-[#F3D8D1] bg-[#F3D8D1] px-2.5 py-1 text-[11px] font-medium uppercase text-[#42150F]">{difficulty}</span>
            </div>
          )}
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-card-surface text-amber' : 'text-ash hover:text-amber'
                }`
              }
            >
              <Icon aria-hidden="true" size={16} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </header>
  );
}
