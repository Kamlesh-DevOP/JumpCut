import { Film, Trophy, UserRound, UsersRound } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const links = [
  { to: '/play', label: 'Play', icon: Film },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/friends', label: 'Friends', icon: UsersRound },
  { to: '/profile', label: 'Profile', icon: UserRound }
];

export function Navbar() {
  return (
    <header className="border-b border-stone-200 bg-white">
      <nav className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <NavLink to="/" className="text-xl font-black tracking-normal text-ink">
          JumpCut
        </NavLink>
        <div className="flex flex-wrap items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${
                  isActive ? 'bg-ink text-white' : 'text-stone-700 hover:bg-stone-100'
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
