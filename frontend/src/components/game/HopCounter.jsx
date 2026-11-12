export function HopCounter({ hopCount, undosLeft }) {
  return (
    <div className="grid grid-cols-2 overflow-hidden border border-card-border bg-noir text-center">
      <div className="border-r border-card-border px-4 py-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-ash">Jumps</p>
        <p className="font-display text-3xl font-bold text-parchment">{hopCount}</p>
      </div>
      <div className="px-4 py-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-ash">Undos</p>
        <p className="font-display text-3xl font-bold text-amber">{undosLeft}</p>
      </div>
    </div>
  );
}
