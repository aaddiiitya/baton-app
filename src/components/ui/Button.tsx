// ---------------------------------------------------------------------------
// Button — the one button used on every Baton screen.
// Uses only Baton Tailwind tokens (primary-*, line, ink); never hex colours.
// ---------------------------------------------------------------------------

import type { ReactNode } from 'react'

interface ButtonProps {
  /** The button label. */
  children: ReactNode
  /** Click handler (not needed for submit buttons). */
  onClick?: () => void
  /** primary = solid teal; secondary = white with a thin border. */
  variant?: 'primary' | 'secondary'
  /** HTML button type. Defaults to "button" so forms never submit by accident. */
  type?: 'button' | 'submit'
  /** Greys the button out and blocks clicks. */
  disabled?: boolean
  /** Shows "Please wait..." and disables the button while a request runs. */
  loading?: boolean
  /** Stretch to the full column width (default true). */
  fullWidth?: boolean
}

const BASE =
  'px-4 py-3 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-50 print:hidden'

const VARIANTS = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700',
  secondary: 'border border-line bg-white text-ink hover:border-primary-600 hover:bg-primary-50',
}

export default function Button({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled = false,
  loading = false,
  fullWidth = true,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
      className={`${BASE} ${VARIANTS[variant]} ${fullWidth ? 'w-full' : ''}`}
    >
      {loading ? 'Please wait...' : children}
    </button>
  )
}
