// ---------------------------------------------------------------------------
// /setup — create a new house, or join an existing one with its house code.
// ---------------------------------------------------------------------------

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { JoinHouseInput, NewHouseInput, ResidentColour } from '../types'
import { RESIDENT_COLOURS } from '../types'
import { todayISO } from '../utils/format'
import Button from '../components/ui/Button'
import FormField, { INPUT_CLASS } from '../components/ui/FormField'
import ColourPicker from '../components/ui/ColourPicker'
import ServerError from '../components/ui/ServerError'
import PrivacyNote from '../components/ui/PrivacyNote'

const colourEnum = z.enum(['orange', 'blue', 'purple', 'green'])

const createSchema = z
  .object({
    firstName: z.string().trim().min(1, 'Enter your first name').max(40, 'Use 40 characters or fewer'),
    address: z.string().trim().min(1, 'Enter the house address').max(200, 'Use 200 characters or fewer'),
    // Numbers are read with valueAsNumber; empty fields become NaN and fail.
    totalBond: z.number({ message: 'Enter the total bond' }).gt(0, 'Total bond must be more than $0'),
    bondContribution: z.number({ message: 'Enter your contribution' }).gt(0, 'Your contribution must be more than $0'),
    moveInDate: z.string().min(1, 'Choose your move-in date'),
    residentCount: z.number({ message: 'Enter a number' }).int().min(2, 'At least 2 residents').max(8, 'At most 8 residents'),
    colour: colourEnum,
  })
  .refine((v) => v.bondContribution <= v.totalBond, {
    path: ['bondContribution'],
    message: 'Your contribution cannot exceed the total bond',
  })
  .refine((v) => v.moveInDate <= todayISO(), {
    path: ['moveInDate'],
    message: 'Move-in date cannot be in the future',
  })

const joinSchema = z
  .object({
    code: z.string().trim().min(4, 'Enter the house code'),
    firstName: z.string().trim().min(1, 'Enter your first name').max(40, 'Use 40 characters or fewer'),
    bondContribution: z.number({ message: 'Enter your contribution' }).min(0, 'Cannot be negative'),
    moveInDate: z.string().min(1, 'Choose your move-in date'),
    colour: colourEnum,
  })
  .refine((v) => v.moveInDate <= todayISO(), {
    path: ['moveInDate'],
    message: 'Move-in date cannot be in the future',
  })

type CreateValues = z.infer<typeof createSchema>
type JoinValues = z.infer<typeof joinSchema>

interface Props {
  email: string
  onCreate: (input: NewHouseInput) => Promise<void>
  onJoin: (input: JoinHouseInput) => Promise<void>
  onLogout: () => void
}

export default function SetupScreen({ email, onCreate, onJoin, onLogout }: Props) {
  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [serverError, setServerError] = useState('')

  const createForm = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { colour: 'orange', residentCount: 3 },
  })
  const joinForm = useForm<JoinValues>({
    resolver: zodResolver(joinSchema),
    defaultValues: { colour: 'green', moveInDate: todayISO() },
  })

  async function run(action: () => Promise<void>) {
    setServerError('')
    try {
      await action()
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  const ce = createForm.formState.errors
  const je = joinForm.formState.errors

  const tabClass = (active: boolean) =>
    `flex-1 border px-3 py-2 text-sm font-medium ${
      active ? 'border-primary-600 bg-primary-600 text-white' : 'border-line bg-white text-ink'
    }`

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted">Signed in as {email}</p>
          <button type="button" onClick={onLogout} className="text-xs text-muted underline hover:text-ink">
            Log out
          </button>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Set up your house</h1>
        <p className="text-sm text-muted">Start a new shared record, or join your housemates' record.</p>
      </header>

      <div className="flex" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'create'} className={tabClass(tab === 'create')} onClick={() => { setTab('create'); setServerError('') }}>
          Create a house
        </button>
        <button type="button" role="tab" aria-selected={tab === 'join'} className={tabClass(tab === 'join')} onClick={() => { setTab('join'); setServerError('') }}>
          Join with a code
        </button>
      </div>

      {tab === 'create' ? (
        <form
          onSubmit={createForm.handleSubmit((v) => run(() => onCreate({ ...v, firstName: v.firstName.trim(), address: v.address.trim() })))}
          className="space-y-5"
          noValidate
        >
          <FormField label="Your first name" htmlFor="firstName" why="only a first name is needed to label your entries." error={ce.firstName?.message}>
            <input id="firstName" autoComplete="given-name" {...createForm.register('firstName')} className={INPUT_CLASS} />
          </FormField>

          <FormField label="House address" htmlFor="address" why="so everyone knows which record they are signing." error={ce.address?.message}>
            <input id="address" placeholder="e.g. 42 Rathdowne Street" {...createForm.register('address')} className={INPUT_CLASS} />
          </FormField>

          <FormField label="Total bond lodged ($)" htmlFor="totalBond" why="the bond is what a claim would be paid from." error={ce.totalBond?.message}>
            <input id="totalBond" type="number" step="0.01" inputMode="decimal" {...createForm.register('totalBond', { valueAsNumber: true })} className={INPUT_CLASS} />
          </FormField>

          <FormField label="Your bond contribution ($)" htmlFor="bondContribution" why="your exit pack shows what you are owed back." error={ce.bondContribution?.message}>
            <input id="bondContribution" type="number" step="0.01" inputMode="decimal" {...createForm.register('bondContribution', { valueAsNumber: true })} className={INPUT_CLASS} />
          </FormField>

          <FormField label="Your move-in date" htmlFor="moveInDate" why="liability only applies from the day you moved in." error={ce.moveInDate?.message}>
            <input id="moveInDate" type="date" max={todayISO()} {...createForm.register('moveInDate')} className={INPUT_CLASS} />
          </FormField>

          <FormField label="Number of residents" htmlFor="residentCount" why="the bond is shared between everyone on the lease (2–8)." error={ce.residentCount?.message}>
            <input id="residentCount" type="number" min={2} max={8} {...createForm.register('residentCount', { valueAsNumber: true })} className={INPUT_CLASS} />
          </FormField>

          <FormField label="Your colour" htmlFor="colour" why="your colour follows you on every screen, so entries are easy to scan.">
            <ColourPicker
              id="colour"
              colours={RESIDENT_COLOURS.filter((c) => c !== 'grey')}
              value={createForm.watch('colour')}
              onChange={(c: ResidentColour) => createForm.setValue('colour', c as CreateValues['colour'], { shouldValidate: true })}
            />
          </FormField>

          <ServerError message={serverError} />
          <Button type="submit" loading={createForm.formState.isSubmitting}>Create house</Button>
        </form>
      ) : (
        <form
          onSubmit={joinForm.handleSubmit((v) => run(() => onJoin({ ...v, code: v.code.trim().toUpperCase(), firstName: v.firstName.trim() })))}
          className="space-y-5"
          noValidate
        >
          <FormField label="House code" htmlFor="code" why="it links you to your housemates' shared record. Demo code: BATON42." error={je.code?.message}>
            <input id="code" autoCapitalize="characters" placeholder="e.g. BATON42" {...joinForm.register('code')} className={INPUT_CLASS} />
          </FormField>

          <FormField label="Your first name" htmlFor="joinFirstName" why="only a first name is needed to label your entries." error={je.firstName?.message}>
            <input id="joinFirstName" autoComplete="given-name" {...joinForm.register('firstName')} className={INPUT_CLASS} />
          </FormField>

          <FormField label="Your bond contribution ($)" htmlFor="joinBond" why="your exit pack shows what you are owed back." error={je.bondContribution?.message}>
            <input id="joinBond" type="number" step="0.01" inputMode="decimal" {...joinForm.register('bondContribution', { valueAsNumber: true })} className={INPUT_CLASS} />
          </FormField>

          <FormField label="Your move-in date" htmlFor="joinMoveIn" why="liability only applies from the day you moved in." error={je.moveInDate?.message}>
            <input id="joinMoveIn" type="date" max={todayISO()} {...joinForm.register('moveInDate')} className={INPUT_CLASS} />
          </FormField>

          <FormField label="Your colour" htmlFor="joinColour" why="pick a colour no current housemate uses. Grey is never used for a person.">
            <ColourPicker
              id="joinColour"
              colours={RESIDENT_COLOURS.filter((c) => c !== 'grey')}
              value={joinForm.watch('colour')}
              onChange={(c: ResidentColour) => joinForm.setValue('colour', c as JoinValues['colour'], { shouldValidate: true })}
            />
          </FormField>

          <ServerError message={serverError} />
          <Button type="submit" loading={joinForm.formState.isSubmitting}>Join house</Button>
        </form>
      )}

      <PrivacyNote />
    </div>
  )
}
