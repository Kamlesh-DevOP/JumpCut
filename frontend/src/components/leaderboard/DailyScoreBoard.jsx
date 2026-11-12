export function DailyScoreBoard({ scope, board }) {
  const label = scope === 'friends' ? 'Friends today' : 'Top players today';

  return (
    <section aria-label={label}>
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-medium text-parchment">{label}</h2>
          <p className="mt-1 text-sm text-parchment/55">{formatIndiaDay(board.day)}</p>
        </div>
        <span className="text-sm text-amber">Cumulative Score</span>
      </div>
      {board.entries.length === 0 ? <p className="border border-dashed border-card-border py-8 text-center text-sm text-parchment/55">No completed games in this group today.</p> : (
        <ol className="divide-y divide-card-border border-y border-card-border">
          {board.entries.map((entry) => (
            <li key={entry.jumpcut_id} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 py-3 sm:grid-cols-[2.5rem_minmax(0,1fr)_6rem_6rem]">
              <span className="font-display text-xl font-bold text-amber">{entry.rank}</span>
              <div className="min-w-0">
                <p className="truncate font-medium text-parchment">{entry.username}</p>
                <p className="font-mono text-xs text-parchment/45">{entry.jumpcut_id}</p>
              </div>
              <span className="hidden text-right text-sm text-parchment/70 sm:block">{entry.puzzles_solved} solved</span>
              <span className="font-display text-right text-lg font-bold text-amber">{Number(entry.total_score).toFixed(2)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function formatIndiaDay(day) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'Asia/Kolkata' }).format(new Date(`${day}T00:00:00+05:30`));
}
