// ---------------------------------------------------------------------------
// /result — the outcome of a handover, in one of two states.
// ---------------------------------------------------------------------------

import { useNavigate } from 'react-router-dom'
import type { Handover, HandoverResult, ResidentColour } from '../types'
import { formatDate } from '../utils/format'
import Button from '../components/ui/Button'
import ResidentBadge from '../components/ui/ResidentBadge'
import PrivacyNote from '../components/ui/PrivacyNote'

interface Props {
  result: HandoverResult
  handover: Handover
  outgoingName: string
  /** The outgoing renter's colour, so their signed-by name shows the right dot. */
  outgoingColour: ResidentColour | null
}

export default function ResultScreen({ result, handover, outgoingName, outgoingColour }: Props) {
  const navigate = useNavigate()

  // --- Failure: the incoming renter disputed an item ------------------------
  if (result === 'failure') {
    return (
      <div className="space-y-6 pt-6">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-line bg-white">
            <span className="text-2xl text-muted">!</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Handover not recorded</h1>
        </div>

        <div className="border border-line bg-white p-4 text-sm text-ink">
          <p>
            {handover.incomingName} disputed an item, so nothing has changed. Liability for damage still sits with
            the whole house.
          </p>
          <p className="mt-2 text-muted">Talk it through, adjust the record if needed, then review and sign again.</p>
        </div>

        <Button onClick={() => navigate('/handover')}>Back to review</Button>
        <Button variant="secondary" onClick={() => navigate('/timeline')}>
          Back to timeline
        </Button>
        <PrivacyNote />
      </div>
    )
  }

  // --- Success: the boundary is set ----------------------------------------
  return (
    <div className="space-y-6 pt-6">
      <div className="space-y-3 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-600">
          <span className="text-2xl font-semibold text-white">✓</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Handover confirmed</h1>
        <p className="text-sm text-muted">Liability boundary set {formatDate(handover.date)}</p>
      </div>

      <div className="border border-line bg-white p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">Signed</p>
        <ul className="space-y-2 text-sm text-ink">
          <li className="flex items-center justify-between">
            <ResidentBadge name={handover.signedByOutgoing} colour={outgoingColour} size="md" />
            <span className="text-primary-600">Signed</span>
          </li>
          <li className="flex items-center justify-between">
            <ResidentBadge name={handover.signedByIncoming} colour={handover.incomingColour} size="md" />
            <span className="text-primary-600">Signed</span>
          </li>
        </ul>
      </div>

      <p className="text-center text-xs text-muted">
        Added to house timeline — {outgoingName} moved out, {handover.incomingName} moved in.
      </p>

      <div className="space-y-3">
        <Button onClick={() => navigate('/exit-pack')}>View my exit pack</Button>
        <Button variant="secondary" onClick={() => navigate('/timeline')}>
          Back to timeline
        </Button>
      </div>
    </div>
  )
}
