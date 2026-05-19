// Single source of truth for buttons. Replaces the dozens of one-off
// `<button className="bg-gradient...">` instances scattered across pages.
// Pass an icon prop (Lucide component) and it composes nicely with text.

import type { ReactNode, ButtonHTMLAttributes, AnchorHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'success'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary:   'bg-[#D72027] hover:bg-[#A0151B] text-white shadow-sm hover:shadow',
  secondary: 'bg-[#FFC107] hover:bg-amber-400 text-zinc-900 shadow-sm hover:shadow',
  ghost:     'bg-transparent hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900',
  outline:   'bg-white border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 text-zinc-700',
  danger:    'bg-white border border-red-200 hover:border-red-400 hover:bg-red-50 text-red-700',
  success:   'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm hover:shadow',
}

const SIZES: Record<Size, string> = {
  sm: 'text-xs px-3 py-1.5 gap-1.5 rounded-md',
  md: 'text-sm px-4 py-2 gap-2 rounded-lg',
  lg: 'text-base px-5 py-2.5 gap-2 rounded-xl',
}

const ICON_SIZE: Record<Size, number> = { sm: 14, md: 16, lg: 18 }

type CommonProps = {
  variant?: Variant
  size?: Size
  icon?: LucideIcon
  iconAfter?: LucideIcon
  loading?: boolean
  children?: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconAfter: IconAfter,
  loading,
  children,
  className = '',
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={`inline-flex items-center justify-center font-semibold transition-colors ${SIZES[size]} ${VARIANTS[variant]} disabled:opacity-50 disabled:pointer-events-none ${className}`}
    >
      {Icon && !loading && <Icon size={ICON_SIZE[size]} aria-hidden />}
      {loading && <Spinner size={ICON_SIZE[size]} />}
      {children}
      {IconAfter && <IconAfter size={ICON_SIZE[size]} aria-hidden />}
    </button>
  )
}

export function LinkButton({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconAfter: IconAfter,
  children,
  className = '',
  ...rest
}: CommonProps & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      {...rest}
      className={`inline-flex items-center justify-center font-semibold transition-colors ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
    >
      {Icon && <Icon size={ICON_SIZE[size]} aria-hidden />}
      {children}
      {IconAfter && <IconAfter size={ICON_SIZE[size]} aria-hidden />}
    </a>
  )
}

function Spinner({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      className="animate-spin"
      aria-hidden
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}
