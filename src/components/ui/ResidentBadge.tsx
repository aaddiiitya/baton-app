// ---------------------------------------------------------------------------
// ResidentBadge — a coloured dot + a name. Used every time a person is named,
// so each resident's colour follows them on every screen. Grey = cause unknown.
// ---------------------------------------------------------------------------

import { COLOUR_DOT, type ResidentColour } from '../../types'

interface ResidentBadgeProps {
  /** First name, or null for "Cause unknown". */
  name: string | null
  /** Resident colour, or null for grey. */
  colour: ResidentColour | null
  /** Appends " (you)" after the name. */
  isYou?: boolean
  /** Dot and text size. */
  size?: 'sm' | 'md'
  /** Shows "Awaiting their confirmation" under the name. */
  awaitingConfirmation?: boolean
}

export default function ResidentBadge({
  name,
  colour,
  isYou = false,
  size = 'sm',
  awaitingConfirmation = false,
}: ResidentBadgeProps) {
  const dotClass = COLOUR_DOT[name === null ? 'grey' : (colour ?? 'grey')]
  const label = name === null ? 'Cause unknown' : isYou ? `${name} (you)` : name
  const dotSize = size === 'md' ? 'h-4 w-4' : 'h-3 w-3'
  const textSize = size === 'md' ? 'text-sm' : 'text-xs'

  return (
    <span className="inline-flex flex-col">
      <span className="inline-flex items-center gap-2">
        <span aria-hidden className={`shrink-0 rounded-full ${dotSize} ${dotClass}`} />
        <span className={`${textSize} text-ink`}>{label}</span>
      </span>
      {awaitingConfirmation && <span className="mt-0.5 text-xs text-muted">Awaiting their confirmation</span>}
    </span>
  )
}
