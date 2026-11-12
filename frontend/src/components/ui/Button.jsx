export function Button({ children, className, variant = 'primary', type = 'button', ...props }) {
  const variantClass = {
    primary: 'bg-ink text-white hover:bg-black',
    secondary: 'border border-stone-300 bg-white text-ink hover:border-ink',
    danger: 'bg-ember text-white hover:bg-red-700'
  }[variant];

  return (
    <button
      type={type}
      className={[
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-55',
        variantClass,
        className
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </button>
  );
}
