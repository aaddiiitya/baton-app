// ---------------------------------------------------------------------------
// Timeline — vertical timeline adapted from the 21st.dev Timeline component
// (@preetsuthar17), simplified for Baton: vertical only, Baton tokens instead
// of shadcn tokens, and a dotClassName so the marker is the resident's colour.
// ---------------------------------------------------------------------------

import type { ReactNode } from 'react'
import { cva } from 'class-variance-authority'
import { Check, Home, LogIn, LogOut, Wrench } from 'lucide-react'

/** Tiny local replacement for shadcn's cn() helper. */
function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

const marker = cva('relative z-10 flex shrink-0 items-center justify-center rounded-full', {
  variants: {
    size: { sm: 'mt-1 h-3 w-3', md: 'mt-0.5 h-5 w-5' },
  },
  defaultVariants: { size: 'sm' },
})

/** Optional icon per entry type (decorative). */
export type TimelineStatus = 'house-created' | 'damage' | 'handover' | 'move-out' | 'move-in'

const ICONS = {
  'house-created': Home,
  damage: Wrench,
  handover: Check,
  'move-out': LogOut,
  'move-in': LogIn,
}

export interface TimelineItemData {
  id: string
  /** Formatted date, e.g. "3 FEB 2026". */
  date: string
  title: string
  /** Marker colour class, e.g. "bg-resident-orange" or "bg-primary-600". */
  dotClassName: string
  status?: TimelineStatus
  /** Extra content under the title (badges, notes, boundary rule). */
  content?: ReactNode
}

export function Timeline({ items }: { items: TimelineItemData[] }) {
  return (
    <ol className="relative flex flex-col gap-4" aria-label="House timeline">
      {items.map((item, index) => {
        const Icon = item.status ? ICONS[item.status] : null
        const isLast = index === items.length - 1
        return (
          <li key={item.id} className="relative flex gap-3">
            <div className="relative flex w-5 shrink-0 justify-center">
              {!isLast && (
                <span aria-hidden className="absolute bottom-[-22px] left-1/2 top-2 w-px -translate-x-1/2 bg-line" />
              )}
              <span aria-hidden className={cn(marker({ size: Icon ? 'md' : 'sm' }), item.dotClassName)}>
                {Icon && <Icon className="h-3 w-3 text-white" strokeWidth={2.5} />}
              </span>
            </div>
            <div className="min-w-0 flex-1 pb-2">
              <time className="text-xs uppercase tracking-wide text-muted">{item.date}</time>
              <p className="text-sm text-ink">{item.title}</p>
              {item.content}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
