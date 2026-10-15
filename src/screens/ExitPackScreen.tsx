// ---------------------------------------------------------------------------
// /exit-pack — the outgoing renter's evidence of what is (and is not) theirs.
// ---------------------------------------------------------------------------

import { Link } from 'react-router-dom'
import type { CurrentUser, Handover, House, TimelineEntry } from '../types'
import { formatDate, formatMoney, todayISO } from '../utils/format'
import Button from '../components/ui/Button'
import ResidentBadge from '../components/ui/ResidentBadge'
import PrivacyNote from '../components/ui/PrivacyNote'

interface Props {
  currentUser: CurrentUser
  house: House
  timeline: TimelineEntry[]
  handover: Handover
}

export default function ExitPackScreen({ currentUser, house, timeline, handover }: Props) {
  const me = house.residents.find((r) => r.id === currentUser.id)
  const damageEntries = timeline.filter((e) => e.kind === 'damage')

  // Damage attributed to the outgoing renter vs. explicitly excluded from them.
  const mine = damageEntries.filter((e) => e.residentId === currentUser.id)
  const excluded = damageEntries.filter((e) => e.residentId !== currentUser.id)

  const confirmed = handover.incomingResponse === 'agree'
  const repayment = confirmed
    ? `Bond contribution ${formatMoney(me?.bondContribution ?? 0)} · Repaid by ${handover.incomingName} on ${formatDate(handover.date)}`
    : `Bond contribution ${formatMoney(me?.bondContribution ?? 0)} · Not yet repaid`

  const residentFor = (id: string | null | undefined) => (id ? (house.residents.find((r) => r.id === id) ?? null) : null)
  const label = 'text-xs font-medium uppercase tracking-wide text-muted'

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link to="/timeline" className="text-xs text-muted hover:text-ink print:hidden">
          ← Back to timeline
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Your exit pack</h1>
        <p className="text-sm text-muted">A dated record of what is and is not yours.</p>
        <p className="text-xs text-muted">
          Baton exit pack · {house.address} · generated {formatDate(todayISO())}
        </p>
      </header>

      <section className="border border-line bg-white p-4">
        <p className={label}>Occupancy</p>
        <div className="mt-1">
          <ResidentBadge name={currentUser.firstName} colour={me?.colour ?? null} isYou size="md" />
        </div>
        <p className="text-sm text-muted">
          {me?.moveInDate ? formatDate(me.moveInDate) : '—'} to {me?.moveOutDate ? formatDate(me.moveOutDate) : 'present'}
        </p>
      </section>

      <section className="border border-line bg-white p-4">
        <p className={label}>Handovers</p>
        <p className="mt-1 text-sm text-ink">
          {confirmed ? 1 : 0} signed handover{confirmed ? '' : 's'}
        </p>
        <p className="mt-1 text-sm text-muted">{repayment}</p>
      </section>

      <section className="border border-line bg-white p-4">
        <p className={label}>Damage attributed to you ({mine.length})</p>
        {mine.length === 0 ? (
          <p className="mt-1 text-sm text-muted">None recorded.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-ink">
            {mine.map((e) => (
              <li key={e.id}>
                {formatDate(e.date)} — {e.description}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border border-primary-600 bg-white p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-primary-600">
          Damage excluded from you ({excluded.length})
        </p>
        {excluded.length === 0 ? (
          <p className="mt-1 text-sm text-muted">None recorded.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm text-ink">
            {excluded.map((e) => {
              const resident = residentFor(e.residentId)
              return (
                <li key={e.id}>
                  <p>
                    {formatDate(e.date)} — {e.description}
                  </p>
                  <div className="mt-1">
                    <ResidentBadge name={resident?.firstName ?? null} colour={resident?.colour ?? null} />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <Button onClick={() => window.print()}>Download PDF</Button>
      <PrivacyNote />
    </div>
  )
}
