// ---------------------------------------------------------------------------
// /timeline — the house home screen: newest-first timeline + primary actions.
// Rendered with the adapted 21st.dev Timeline and the shared ResidentBadge.
// ---------------------------------------------------------------------------

import { useNavigate } from 'react-router-dom'
import type { CurrentUser, House, Resident, TimelineEntry } from '../types'
import { COLOUR_DOT } from '../types'
import { formatDate, formatMoney } from '../utils/format'
import Button from '../components/ui/Button'
import ResidentBadge from '../components/ui/ResidentBadge'
import PrivacyNote from '../components/ui/PrivacyNote'
import { Timeline, type TimelineItemData } from '../components/ui/timeline'

interface Props {
  house: House
  timeline: TimelineEntry[]
  currentUser: CurrentUser
  /** false once the user has moved out (the record becomes read-only). */
  isCurrent: boolean
  /** true when the user has a confirmed handover (exit pack available). */
  hasHandover: boolean
  onLogout: () => void
}

export default function TimelineScreen({ house, timeline, currentUser, isCurrent, hasHandover, onLogout }: Props) {
  const navigate = useNavigate()
  const currentResidents = house.residents.filter((r) => r.isCurrent)

  // Newest first. Dates are ISO yyyy-mm-dd so string compare is chronological.
  // Same-day entries: the handover (boundary) first, then move-in/out events.
  const RANK: Record<TimelineEntry['kind'], number> = { handover: 0, 'move-in': 1, 'move-out': 2, damage: 3, 'house-created': 4 }
  const ordered = [...timeline].sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : RANK[a.kind] - RANK[b.kind],
  )

  const residentFor = (id: string | null | undefined): Resident | null =>
    id ? (house.residents.find((r) => r.id === id) ?? null) : null

  /** Teal for system events, the person's colour for people, grey for unknown. */
  const dotClass = (entry: TimelineEntry): string => {
    if (entry.kind === 'house-created' || entry.kind === 'handover') return 'bg-primary-600'
    const resident = residentFor(entry.residentId)
    return resident ? COLOUR_DOT[resident.colour] : COLOUR_DOT.grey
  }

  const items: TimelineItemData[] = ordered.map((entry) => {
    const resident = residentFor(entry.residentId)
    return {
      id: entry.id,
      date: formatDate(entry.date).toUpperCase(),
      title: entry.description,
      dotClassName: dotClass(entry),
      status: entry.kind,
      content: (
        <>
          {entry.room && entry.kind === 'damage' && <p className="text-xs capitalize text-muted">{entry.room}</p>}
          {entry.note && <p className="mt-0.5 text-xs text-muted">{entry.note}</p>}
          {entry.kind === 'damage' && (
            <div className="mt-1">
              <ResidentBadge
                name={resident?.firstName ?? null}
                colour={resident?.colour ?? null}
                isYou={resident?.id === currentUser.id}
                awaitingConfirmation={entry.awaitingConfirmation}
              />
            </div>
          )}
          {entry.kind === 'handover' && (
            <div className="mt-2">
              <span className="block h-px w-full bg-primary-600" />
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-primary-600">
                Liability boundary · {formatDate(entry.date)}
              </p>
            </div>
          )}
        </>
      ),
    }
  })

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <div className="flex items-center justify-between">
          <ResidentBadge
            name={currentUser.firstName}
            colour={house.residents.find((r) => r.id === currentUser.id)?.colour ?? null}
            isYou
          />
          <button type="button" onClick={onLogout} className="text-xs text-muted underline hover:text-ink">
            Log out
          </button>
        </div>
        <h1 className="pt-2 text-2xl font-semibold tracking-tight text-ink">{house.address}</h1>
        <p className="text-sm text-muted">
          {currentResidents.length} residents · Bond {formatMoney(house.totalBond)}
        </p>
        <p className="text-xs text-muted">
          House code <span className="font-semibold tracking-wide text-ink">{house.joinCode}</span> · share it with
          housemates so they can join
        </p>
      </header>

      {!isCurrent && (
        <p className="border border-primary-600 bg-white p-3 text-sm text-ink">
          You moved out of this house. The record is now read-only for you.
        </p>
      )}

      <Timeline items={items} />

      <div className="space-y-3 border-t border-line pt-5">
        {isCurrent && (
          <>
            <Button onClick={() => navigate('/log-damage')}>Log damage</Button>
            <Button variant="secondary" onClick={() => navigate('/handover')}>
              Start handover
            </Button>
          </>
        )}
        {hasHandover && (
          <Button variant={isCurrent ? 'secondary' : 'primary'} onClick={() => navigate('/exit-pack')}>
            View my exit pack
          </Button>
        )}
      </div>

      <PrivacyNote />
    </div>
  )
}
