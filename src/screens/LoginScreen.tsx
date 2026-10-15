// ---------------------------------------------------------------------------
// /login — log in or create an account (Supabase Auth, via the Python API).
// ---------------------------------------------------------------------------

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Button from '../components/ui/Button'
import FormField, { INPUT_CLASS } from '../components/ui/FormField'
import ServerError from '../components/ui/ServerError'

/** Minimal, dependency-free email check that works across zod versions. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const schema = z.object({
  email: z.string().min(1, 'Enter your email address').regex(EMAIL_RE, 'Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password is too long'),
})

type FormValues = z.infer<typeof schema>

interface Props {
  /** Logs in or signs up; throws an error with a user-safe message on failure. */
  onAuth: (mode: 'login' | 'signup', email: string, password: string) => Promise<void>
}

export default function LoginScreen({ onAuth }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function submit(values: FormValues) {
    setServerError('')
    try {
      await onAuth(mode, values.email.trim(), values.password)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  const isSignup = mode === 'signup'

  return (
    <div className="space-y-8">
      {/* Logo: three coloured vertical bars + wordmark */}
      <div className="space-y-6 pt-8">
        <div className="flex items-end gap-2" aria-hidden>
          <span className="h-10 w-3 rounded-full bg-resident-orange" />
          <span className="h-14 w-3 rounded-full bg-resident-blue" />
          <span className="h-8 w-3 rounded-full bg-resident-purple" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">Baton</h1>
          <p className="mt-1 text-sm text-muted">A shared record for share houses</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(submit)} className="space-y-5" noValidate>
        <h2 className="text-lg font-semibold text-ink">{isSignup ? 'Create your account' : 'Log in'}</h2>

        <FormField
          label="Email"
          htmlFor="email"
          why="this is how you sign in to your house record."
          error={errors.email?.message}
        >
          <input id="email" type="email" autoComplete="email" {...register('email')} className={INPUT_CLASS} />
        </FormField>

        <FormField
          label="Password"
          htmlFor="password"
          why="at least 8 characters keeps your record private."
          error={errors.password?.message}
        >
          <input
            id="password"
            type="password"
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            {...register('password')}
            className={INPUT_CLASS}
          />
        </FormField>

        <ServerError message={serverError} />

        <Button type="submit" loading={isSubmitting}>
          {isSignup ? 'Create account' : 'Log in'}
        </Button>
      </form>

      <div className="space-y-3">
        <Button
          variant="secondary"
          onClick={() => {
            setMode(isSignup ? 'login' : 'signup')
            setServerError('')
          }}
        >
          {isSignup ? 'I already have an account' : 'Create an account'}
        </Button>
        <p className="text-xs text-muted">
          Have a house code? You will enter it after you log in. Demo code: BATON42.
        </p>
      </div>

      {/* Ethics: transparency + data minimisation */}
      <div className="space-y-2 border-t border-line pt-4">
        <p className="text-xs text-muted">Only residents of this house can see this record. Never your landlord or agent.</p>
        <p className="text-xs text-muted">We only use your email to sign you in.</p>
      </div>
    </div>
  )
}
