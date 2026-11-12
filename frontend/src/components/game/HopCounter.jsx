export function HopCounter({ hopCount, undosLeft }) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-stone-200 bg-white text-center">
      <div className="border-r border-stone-200 px-4 py-3">
        <p className="text-xs font-bold uppercase text-stone-500">Jumps</p>
        <p className="text-2xl font-black">{hopCount}</p>
      </div>
      <div className="px-4 py-3">
        <p className="text-xs font-bold uppercase text-stone-500">Undos</p>
        <p className="text-2xl font-black">{undosLeft}</p>
      </div>
    </div>
  );
}
