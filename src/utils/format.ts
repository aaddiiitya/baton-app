// ---------------------------------------------------------------------------
// Baton — small shared formatting helpers (no UI components here).
// ---------------------------------------------------------------------------

/** Today's date as an ISO yyyy-mm-dd string (local time). */
export function todayISO(): string {
  return toISODate(new Date())
}

/** Convert a Date to an ISO yyyy-mm-dd string using local time. */
export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Format an ISO date as e.g. "3 Feb 2026". */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${d} ${months[m - 1]} ${y}`
}

/** Format a dollar amount, e.g. 2400 -> "$2,400". */
export function formatMoney(amount: number): string {
  return `$${amount.toLocaleString('en-AU')}`
}

/** A short unique id for timeline entries / residents created during a session. */
export function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}