// ---------------------------------------------------------------------------
// Baton — the ONLY place the frontend talks to the backend.
//
// The browser calls our own Python API at /api/... It never holds a Supabase
// key and never talks to Supabase directly. The only thing kept in the
// browser is the user's login token, in sessionStorage (cleared when the tab
// closes) so a page refresh does not log the user out.
// ---------------------------------------------------------------------------

import type {
  AppState,
  Handover,
  HandoverInput,
  HandoverResult,
  JoinHouseInput,
  NewDamageInput,
  NewHouseInput,
} from '../types'

const TOKEN_KEY = 'baton.session'

let memoryToken: string | null = null

export function getToken(): string | null {
  if (memoryToken) return memoryToken
  try {
    memoryToken = sessionStorage.getItem(TOKEN_KEY)
  } catch {
    memoryToken = null
  }
  return memoryToken
}

export function setToken(token: string) {
  memoryToken = token
  try {
    sessionStorage.setItem(TOKEN_KEY, token)
  } catch {
    /* storage unavailable: keep the token in memory only */
  }
}

export function clearToken() {
  memoryToken = null
  try {
    sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

/** An error with a message that is safe to show the user. */
export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, method: 'GET' | 'POST' = 'GET', body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check your connection and try again.')
  }

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    // FastAPI returns {detail: "message"} or, for validation, {detail: [...]}.
    const detail = data?.detail
    const message =
      typeof detail === 'string' ? detail : 'Some details are not valid. Please check the form.'
    throw new ApiError(res.status, message)
  }
  return data as T
}

interface AuthResponse {
  accessToken: string
  email: string
}

export interface HandoverResponse {
  result: HandoverResult
  handover: Handover
  state: AppState
}

export const api = {
  signup: (email: string, password: string) =>
    request<AuthResponse>('/auth/signup', 'POST', { email, password }),
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', 'POST', { email, password }),
  state: () => request<AppState>('/state'),
  createHouse: (input: NewHouseInput) => request<AppState>('/houses', 'POST', input),
  joinHouse: (input: JoinHouseInput) => request<AppState>('/houses/join', 'POST', input),
  addDamage: (input: NewDamageInput) => request<AppState>('/damage', 'POST', input),
  confirmHandover: (input: HandoverInput) => request<HandoverResponse>('/handovers', 'POST', input),
}
