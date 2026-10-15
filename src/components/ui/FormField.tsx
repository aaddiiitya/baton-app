// ---------------------------------------------------------------------------
// FormField — wraps any input/select/textarea with Baton's label, the
// "Why we ask" transparency line and the validation error, always the same way.
// ---------------------------------------------------------------------------

import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'

interface FormFieldProps {
  /** Visible label text (rendered small, uppercase, grey). */
  label: string
  /** id of the input, so the label is linked to it. */
  htmlFor: string
  /** The "Why we ask" explanation shown under the field. */
  why: string
  /** Validation error; replaces the "Why we ask" line when present. */
  error?: string
  /** Marks optional fields in the label when false (default true). */
  required?: boolean
  /** The actual input element. */
  children: ReactNode
}

export const INPUT_CLASS =
  'w-full border border-line bg-white px-3 py-3 text-sm text-ink outline-none focus:border-primary-600'

export default function FormField({ label, htmlFor, why, error, required = true, children }: FormFieldProps) {
  const helpId = `${htmlFor}-help`
  // Link the helper/error text to the input for screen readers.
  const field = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        'aria-describedby': helpId,
        'aria-invalid': error ? true : undefined,
      })
    : children

  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
        {label}
        {!required && <span className="normal-case tracking-normal"> (optional)</span>}
      </label>
      {field}
      {error ? (
        <p id={helpId} role="alert" className="mt-1 text-xs text-resident-orange">
          {error}
        </p>
      ) : (
        <p id={helpId} className="mt-1 text-xs text-muted">
          Why we ask: {why}
        </p>
      )}
    </div>
  )
}
