// ---------------------------------------------------------------------------
// Baton — shared TypeScript types and colour tokens
// Data is saved in Supabase through the Python API (src/lib/api.ts).
// ---------------------------------------------------------------------------

/**
 * The colours a resident can have. Grey is deliberately part of this union but
 * is NEVER assigned to a person — it only ever means "cause unknown".
 */
export type ResidentColour = 'orange' | 'blue' | 'purple' | 'green' | 'grey'

/** The colours a user may actually pick for a person (grey excluded). */
export const RESIDENT_COLOURS: ResidentColour[] = ['orange', 'blue', 'purple', 'green']

/** A person living in the house. */
export interface Resident {
  id: string
  firstName: string
  colour: ResidentColour
  /** false once the resident has moved out via a confirmed handover. */
  isCurrent: boolean
  /** ISO date (yyyy-mm-dd). */
  moveInDate: string
  /** ISO date, set when the resident moves out. */
  moveOutDate?: string | null
  /** This resident's share of the bond in dollars. */
  bondContribution?: number | null
}

/** The kind of timeline entry, which decides how the dot is drawn. */
export type EntryKind = 'house-created' | 'damage' | 'handover' | 'move-out' | 'move-in'

/** Rooms a damage item can belong to. */
export type Room = 'kitchen' | 'bathroom' | 'bedroom' | 'living room' | 'laundry' | 'outdoor'

export const ROOMS: Room[] = ['kitchen', 'bathroom', 'bedroom', 'living room', 'laundry', 'outdoor']

/** A single row on the house timeline. */
export interface TimelineEntry {
  id: string
  kind: EntryKind
  /** ISO date (yyyy-mm-dd). */
  date: string
  description: string
  /** null means "cause unknown" (rendered grey). */
  residentId: string | null
  /** true when damage is attributed to someone other than the logged-in user. */
  awaitingConfirmation: boolean
  room?: Room | null
  note?: string | null
}

/** The house and its current + past residents. */
export interface House {
  id: string
  /** Code housemates use to join this house record. */
  joinCode: string
  address: string
  totalBond: number
  residents: Resident[]
}

/** A co-signed move-out / move-in boundary. */
export interface Handover {
  id: string
  /** ISO date of the handover (the liability boundary). */
  date: string
  outgoingResidentId: string
  incomingName: string
  incomingColour: ResidentColour
  incomingResponse: 'agree' | 'dispute'
  consentGiven: boolean
  /** Typed-name signatures. */
  signedByOutgoing: string
  signedByIncoming: string
  roomsChecked: number
  damageItemsLogged: number
}

/** The logged-in session user. */
export interface CurrentUser {
  id: string
  firstName: string
  email: string
}

// ---------------------------------------------------------------------------
// Form payloads handed from screens back up to App's state handlers.
// ---------------------------------------------------------------------------

/** Everything the "set up your house" form collects. */
export interface NewHouseInput {
  firstName: string
  address: string
  totalBond: number
  bondContribution: number
  moveInDate: string
  residentCount: number
  colour: ResidentColour
}

/** Everything the "log damage" form collects. */
export interface NewDamageInput {
  description: string
  date: string
  room: Room
  /** null = cause unknown. */
  residentId: string | null
  note?: string
}

/** Everything the handover form collects (App fills the computed summary). */
export interface HandoverInput {
  incomingName: string
  incomingColour: ResidentColour
  incomingResponse: 'agree' | 'dispute'
  consentGiven: boolean
  signedByOutgoing: string
  signedByIncoming: string
}

/** Everything the "join with a code" form collects. */
export interface JoinHouseInput {
  code: string
  firstName: string
  colour: ResidentColour
  moveInDate: string
  bondContribution: number
}

/** Outcome of a handover attempt, held in state so /result can render it. */
export type HandoverResult = 'success' | 'failure'

/** Everything the API returns about the logged-in user's house. */
export interface AppState {
  /** user.id is the user's RESIDENT id ("" before they join a house). */
  user: CurrentUser
  house: House | null
  timeline: TimelineEntry[]
  /** The user's latest handover attempt as the outgoing renter. */
  handover: Handover | null
}

// ---------------------------------------------------------------------------
// Tailwind class maps
//
// IMPORTANT: every class is written as a COMPLETE literal string so that the
// Tailwind content scanner can see it. Never build these with template strings.
// ---------------------------------------------------------------------------

/** Solid dot background per colour (used for timeline markers). */
export const COLOUR_DOT: Record<ResidentColour, string> = {
  orange: 'bg-resident-orange',
  blue: 'bg-resident-blue',
  purple: 'bg-resident-purple',
  green: 'bg-resident-green',
  grey: 'bg-resident-grey',
}

/** Soft badge: tinted text + matching ring colour (no dynamic classes). */
export const COLOUR_BADGE: Record<ResidentColour, string> = {
  orange: 'text-resident-orange ring-resident-orange',
  blue: 'text-resident-blue ring-resident-blue',
  purple: 'text-resident-purple ring-resident-purple',
  green: 'text-resident-green ring-resident-green',
  grey: 'text-resident-grey ring-resident-grey',
}

/** Foreground text colour per colour token. */
export const COLOUR_TEXT: Record<ResidentColour, string> = {
  orange: 'text-resident-orange',
  blue: 'text-resident-blue',
  purple: 'text-resident-purple',
  green: 'text-resident-green',
  grey: 'text-resident-grey',
}