export function Spinner({ label = 'Loading' }) {
  return (
    <div className="flex items-center gap-3 text-sm text-stone-600">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-ink" />
      <span>{label}</span>
    </div>
  );
}
