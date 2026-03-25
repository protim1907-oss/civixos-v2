type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode
  fullWidth?: boolean
}

export function Button({
  children,
  className = "",
  fullWidth = false,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition shadow-sm
      bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed
      ${fullWidth ? "w-full" : ""}
      ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}