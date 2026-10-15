// ---------------------------------------------------------------------------
// /handover — review the record and co-sign a dated liability boundary.
// ---------------------------------------------------------------------------

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import type { CurrentUser, HandoverInput, Resident, ResidentColour } from '../types'
import { formatDate, formatMoney, todayISO } from '../utils/format'
import Button from '../components/ui/Button'
import FormField, { INPUT_CLASS } from '../components/ui/FormField'
import ColourPicker from '../components/ui/ColourPicker'
import ResidentBadge from '../components/ui/ResidentBadge'
import ServerError from '../components/ui/ServerError'
import PrivacyNote from '../components/ui/PrivacyNote'

const ALL_COLOURS: ResidentColour[] = ['orange', 'blue', 'purple', 'green']

const schema = z
  .object({
    incomingName: z.string().trim().min(1, 'Enter their first name').max(40, 'Use 40 characters or fewer'),
    incomingColour: z.enum(['orange', 'blue', 'purple', 'green']),
    incomingResponse: z.enum(['agree', 'dispute'], { message: 'Choose their response' }),
    consent: z.boolean(),
    outgoingSignature: z.string().trim().min(1, 'Sign your name'),
    incomingSignature: z.string().trim().min(1, 'They must sign their name'),
  })
  // Consent is required before a boundary can be signed.
  .refine((v) => v.consent === true, {
    path: ['consent'],
    message: 'Both of you must agree before this can be signed',
  })

type FormValues = z.infer<typeof schema>

interface Props {
  currentUser: CurrentUser
  currentResidents: Resident[]
  roomsChecked: number
  damageItemsLogged: number
  onConfirm: (input: HandoverInput) => Promise<void>
}

export default function HandoverScreen({ currentUser, currentResidents, roomsChecked, damageItemsLogged, onConfirm }: Props) {
  const [serverError, setServerError] = useState('')

  // The outgoing renter is always the logged-in user.
  const outgoingName = currentUser.firstName
  const outgoingResident = currentResidents.find((r) => r.id === currentUser.id)
  const outgoingColour: ResidentColour = outgoingResident?.colour ?? 'orange'

  // Colours used by housemates who are staying are not offered again; the
  // outgoing renter's colour is freed up for whoever replaces them.
  const usedColours = currentResidents.filter((r) => r.id !== currentUser.id).map((r) => r.colour)
  const availableColours = ALL_COLOURS.filter((c) => !usedColours.includes(c))

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      incomingColour: (availableColours[0] ?? 'green') as FormValues['incomingColour'],
      incomingResponse: 'agree',
      consent: false,
    },
  })

  const incomingColour = watch('incomingColour')
  const incomingName = watch('incomingName') ?? ''
  const outgoingTyped = watch('outgoingSignature') ?? ''
  const incomingTyped = watch('incomingSignature') ?? ''
  const outgoingMatches = outgoingTyped.trim().toLowerCase() === outgoingName.trim().toLowerCase()
  const incomingMatches = incomingName.trim() !== '' && incomingTyped.trim().toLowerCase() === incomingName.trim().toLowerCase()

  async function submit(values: FormValues) {
    // A typed signature must match each name before the boundary can be set.
    if (!outgoingMatches || !incomingMatches) return
    setServerError('')
    try {
      await onConfirm({
        incomingName: values.incomingName.trim(),
        incomingColour: values.incomingColour,
        incomingResponse: values.incomingResponse,
        consentGiven: values.consent,
        signedByOutgoing: values.outgoingSignature.trim(),
        signedByIncoming: values.incomingSignature.trim(),
      })
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Could not save the handover. Please try again.')
    }
  }

  const outgoingSignatureError =
    errors.outgoingSignature?.message ?? (outgoingTyped && !outgoingMatches ? `This must match “${outgoingName}”.` : undefined)
  const incomingSignatureError =
    errors.incomingSignature?.message ??
    (incomingTyped && !incomingMatches ? `This must match ${incomingName ? `“${incomingName}”` : 'their name'}.` : undefined)

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link to="/timeline" className="text-xs text-muted hover:text-ink">
          ← Back to timeline
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Review and sign</h1>
        <p className="text-sm text-muted">A handover sets a dated liability boundary.</p>
      </header>

      {/* Summary card */}
      <div className="border border-line bg-white p-4">
        <dl className="grid grid-cols-3 gap-3 text-center">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">Rooms checked</dt>
            <dd className="text-lg font-semibold text-ink">{roomsChecked}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">Damage items</dt>
            <dd className="text-lg font-semibold text-ink">{damageItemsLogged}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">Date</dt>
            <dd className="text-lg font-semibold text-ink">{formatDate(todayISO())}</dd>
          </div>
        </dl>
      </div>

      {/* Outgoing renter (the logged-in user) */}
      <div className="border border-line bg-white p-4">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Outgoing renter</p>
        <ResidentBadge name={outgoingName} colour={outgoingColour} isYou size="md" />
        <p className="mt-1 text-xs text-muted">Bond contribution {formatMoney(outgoingResident?.bondContribution ?? 0)}</p>
      </div>

      <form onSubmit={handleSubmit(submit)} className="space-y-5" noValidate>
        <FormField label="Incoming renter's first name" htmlFor="incomingName" why="they become a resident and sign this boundary." error={errors.incomingName?.message}>
          <input id="incomingName" placeholder="e.g. Priya" {...register('incomingName')} className={INPUT_CLASS} />
        </FormField>

        <FormField label="Their colour" htmlFor="incomingColour" why="only colours not already in use are shown. Grey is never used for a person.">
          <ColourPicker
            id="incomingColour"
            colours={availableColours}
            value={incomingColour}
            onChange={(c) => setValue('incomingColour', c as FormValues['incomingColour'], { shouldValidate: true })}
          />
        </FormField>
        {incomingName && (
          <div className="-mt-2">
            <ResidentBadge name={incomingName} colour={incomingColour} size="md" />
          </div>
        )}

        {/* Liability boundary graphic */}
        <div className="border border-line bg-white p-4">
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-primary-600" />
            <span className="text-xs uppercase tracking-wide text-primary-600">Boundary</span>
            <span className="h-px flex-1 bg-primary-600" />
          </div>
          <p className="mt-2 text-center text-sm text-ink">Everything above this line stays with {outgoingName}</p>
        </div>

        <fieldset>
          <legend className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Incoming renter's response</legend>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="radio" value="agree" {...register('incomingResponse')} />
              I agree with the recorded condition
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="radio" value="dispute" {...register('incomingResponse')} />
              I dispute an item
            </label>
          </div>
          {errors.incomingResponse && <p className="mt-1 text-xs text-resident-orange">{errors.incomingResponse.message}</p>}
        </fieldset>

        <div>
          <label className="flex items-start gap-2 text-sm text-ink">
            <input type="checkbox" {...register('consent')} className="mt-1" />
            <span>We both agree this record is accurate and understand it sets a liability boundary.</span>
          </label>
          {errors.consent && <p role="alert" className="mt-1 text-xs text-resident-orange">{errors.consent.message}</p>}
        </div>

        <FormField label="Your signature (type your name)" htmlFor="outgoingSignature" why="typing your name is your signature. It records that you agreed on this date." error={outgoingSignatureError}>
          <input id="outgoingSignature" placeholder={outgoingName} {...register('outgoingSignature')} className={INPUT_CLASS} />
        </FormField>

        <FormField label="Incoming renter's signature (type their name)" htmlFor="incomingSignature" why="their typed name records that they inspected the property with you." error={incomingSignatureError}>
          <input id="incomingSignature" placeholder={incomingName || 'Their name'} {...register('incomingSignature')} className={INPUT_CLASS} />
        </FormField>

        <ServerError message={serverError} />
        <Button type="submit" loading={isSubmitting}>
          Sign and confirm
        </Button>
      </form>

      <PrivacyNote />
    </div>
  )
}
