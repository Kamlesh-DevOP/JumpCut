export function Modal({ children, isOpen }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 px-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-lg border border-card-border bg-noir p-6 shadow-2xl">{children}</div>
    </div>
  );
}
