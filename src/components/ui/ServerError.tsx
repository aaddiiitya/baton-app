// ---------------------------------------------------------------------------
// ServerError — shows a message returned by the API (e.g. a rejected code).
// ---------------------------------------------------------------------------

export default function ServerError({ message }: { message: string }) {
  if (!message) return null
  return (
    <p role="alert" className="border border-resident-orange bg-white p-3 text-sm text-resident-orange">
      {message}
    </p>
  )
}
