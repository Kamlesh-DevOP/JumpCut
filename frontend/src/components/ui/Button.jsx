export function Button({ children, className, variant = 'primary', type = 'button', ...props }) {
  const variantClass = {
    primary: 'bg-amber text-noir hover:bg-[#e4a13b]',
    secondary: 'border border-card-border bg-card-surface text-parchment hover:border-amber hover:text-amber',
    danger: 'bg-crimson text-parchment hover:bg-[#a32a2a]'
  }[variant];

  return (
    <button
      type={type}
      className={[
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40',
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
