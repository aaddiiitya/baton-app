// ---------------------------------------------------------------------------
// /log-damage — honestly record a damage item as it happens.
// ---------------------------------------------------------------------------

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import type { NewDamageInput, Resident, Room } from '../types'
import { ROOMS } from '../types'
import { todayISO } from '../utils/format'
import Button from '../components/ui/Button'
import FormField, { INPUT_CLASS } from '../components/ui/FormField'
import ServerError from '../components/ui/ServerError'
import PrivacyNote from '../components/ui/PrivacyNote'

/** "Cause unknown" is a valid, honest option — it is never a person. */
const UNKNOWN = 'unknown'

const schema = z
  .object({
    description: z.string().trim().min(1, 'Describe what was damaged').max(200, 'Use 200 characters or fewer'),
    room: z.enum(['kitchen', 'bathroom', 'bedroom', 'living room', 'laundry', 'outdoor']),
    date: z.string().min(1, 'Choose the date you noticed it'),
    causedBy: z.string().min(1, 'Say who caused it'),
    note: z.string().max(200, 'Note must be 200 characters or fewer').optional(),
  })
  .refine((v) => v.date <= todayISO(), {
    path: ['date'],
    message: 'Date noticed cannot be in the future',
  })

type FormValues = z.infer<typeof schema>

interface Props {
  /** Only current residents can be named. */
  residents: Resident[]
  currentUserId: string
  onSave: (input: NewDamageInput) => Promise<void>
}

export default function LogDamageScreen({ residents, currentUserId, onSave }: Props) {
  const [serverError, setServerError] = useState('')
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { causedBy: 'me', date: todayISO(), room: 'kitchen' },
  })

  const note = watch('note') ?? ''

  async function submit(values: FormValues) {
    setServerError('')
    // Translate the select value into a residentId (null = cause unknown).
    let residentId: string | null = null
    if (values.causedBy === 'me') residentId = currentUserId
    else if (values.causedBy !== UNKNOWN) residentId = values.causedBy
    try {
      await onSave({
        description: values.description.trim(),
        date: values.date,
        room: values.room as Room,
        residentId,
        note: values.note?.trim() || undefined,
      })
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Could not save. Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link to="/timeline" className="text-xs text-muted hover:text-ink">
          ← Back to timeline
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Log damage</h1>
        <p className="text-sm text-muted">Record it while it is fresh, honestly.</p>
      </header>

      <form onSubmit={handleSubmit(submit)} className="space-y-5" noValidate>
        <FormField label="What is damaged" htmlFor="description" why="a short description is what everyone will review later." error={errors.description?.message}>
          <input id="description" placeholder="e.g. Shower screen cracked" {...register('description')} className={INPUT_CLASS} />
        </FormField>

        <FormField label="Room" htmlFor="room" why="the room helps a future housemate find and check the item." error={errors.room?.message}>
          <select id="room" {...register('room')} className={INPUT_CLASS}>
            {ROOMS.map((room) => (
              <option key={room} value={room}>
                {room.charAt(0).toUpperCase() + room.slice(1)}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Date noticed" htmlFor="date" why="liability is dated, so the record stays accurate over time." error={errors.date?.message}>
          <input id="date" type="date" max={todayISO()} {...register('date')} className={INPUT_CLASS} />
        </FormField>

        <FormField
          label="Who caused it"
          htmlFor="causedBy"
          why={'naming someone is only a claim until they confirm it. "Cause unknown" is always allowed.'}
          error={errors.causedBy?.message}
        >
          <select id="causedBy" {...register('causedBy')} className={INPUT_CLASS}>
            <option value="me">Me</option>
            {residents
              .filter((r) => r.id !== currentUserId)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.firstName}
                </option>
              ))}
            <option value={UNKNOWN}>Cause unknown</option>
          </select>
        </FormField>

        <FormField label="Note" htmlFor="note" required={false} why="extra context helps, but it is optional." error={errors.note?.message}>
          <textarea id="note" rows={3} maxLength={200} placeholder="Anything else worth recording" {...register('note')} className={INPUT_CLASS} />
        </FormField>
        <p className="-mt-3 text-right text-xs text-muted">{note.length}/200</p>

        <ServerError message={serverError} />
        <Button type="submit" loading={isSubmitting}>
          Save entry
        </Button>
      </form>

      <PrivacyNote />
    </div>
  )
}
