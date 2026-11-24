import { useSyncExternalStore, useEffect, useState } from 'react'

// ---------- Types ----------
export type Status = 'available' | 'claimed' | 'pickup_confirmed' | 'handed_over' | 'completed' | 'cancelled'
export type Role = 'donor' | 'org' | 'volunteer'
export type Category = 'Cooked meals' | 'Bakery' | 'Fruit & veg' | 'Packaged' | 'Snacks'
export type Diet = 'veg' | 'nonveg' | 'mixed'

export interface Party { id: string; name: string; kind: string; area: string }
export interface TimelineEvent { at: number; label: string; by: string }

export interface Donation {
  id: string
  title: string
  category: Category
  diet: Diet
  portions: number
  preparedAt: number
  pickupFrom: number
  pickupBy: number
  area: string
  packaging: string
  notes: string
  donorId: string
  orgId?: string
  volunteerId?: string
  code?: string
  status: Status
  events: TimelineEvent[]
  createdAt: number
}

export interface Identity { role: Role; id: string }
export interface State { version: 1; donations: Donation[]; identity: Identity | null }

export type DonationInput = Pick<Donation,
  'title' | 'category' | 'diet' | 'portions' | 'preparedAt' | 'pickupFrom' | 'pickupBy' | 'area' | 'packaging' | 'notes'>

// ---------- Fictional demo parties (never real organisations) ----------
export const DONORS: Party[] = [
  { id: 'd1', name: 'Saffron Table Caterers', kind: 'Event caterer', area: 'Baner' },
  { id: 'd2', name: 'Kothrud Hostel Mess', kind: 'Hostel kitchen', area: 'Kothrud' },
  { id: 'd3', name: 'Moonlit Banquet Hall', kind: 'Event venue', area: 'Aundh' },
  { id: 'd4', name: 'Crumb & Co. Bakery', kind: 'Bakery', area: 'Viman Nagar' },
]
export const ORGS: Party[] = [
  { id: 'o1', name: 'Annapurna Community Kitchen', kind: 'Community kitchen', area: 'Hadapsar' },
  { id: 'o2', name: 'Sahyadri Food Bank', kind: 'Food bank', area: 'Shivajinagar' },
]
export const VOLUNTEERS: Party[] = [
  { id: 'v1', name: 'Riya S.', kind: 'Two-wheeler volunteer', area: 'Baner' },
  { id: 'v2', name: 'Kabir M.', kind: 'Car volunteer', area: 'Kothrud' },
]
export const PARTIES: Record<Role, Party[]> = { donor: DONORS, org: ORGS, volunteer: VOLUNTEERS }
export const AREAS = ['Aundh', 'Baner', 'Hadapsar', 'Kothrud', 'Shivajinagar', 'Viman Nagar', 'Wakad']
export const CATEGORIES: Category[] = ['Cooked meals', 'Bakery', 'Fruit & veg', 'Packaged', 'Snacks']
export const CHECKLIST = [
  'Food was prepared or stored hygienically and has not been served or handled by guests.',
  'Cooked food has been kept hot or refrigerated since preparation.',
  'Food is packed in clean, covered containers.',
  'Allergens and ingredients are noted where known.',
  'I understand the receiving organisation will assess suitability before distribution.',
]

export const STATUS_LABEL: Record<Status | 'expired', string> = {
  available: 'Available',
  claimed: 'Claimed',
  pickup_confirmed: 'Picked up',
  handed_over: 'Handed over',
  completed: 'Completed',
  cancelled: 'Cancelled',
  expired: 'Expired',
}
/** The forward path of a rescue; also drives the progress tracker. */
export const FLOW: Status[] = ['available', 'claimed', 'pickup_confirmed', 'handed_over', 'completed']

export const partyName = (id?: string) =>
  [...DONORS, ...ORGS, ...VOLUNTEERS].find(p => p.id === id)?.name ?? 'Unknown'

// ---------- Pure domain rules ----------
export const isExpired = (d: Donation, now: number) => d.status === 'available' && now > d.pickupBy
export const displayStatus = (d: Donation, now: number): Status | 'expired' => (isExpired(d, now) ? 'expired' : d.status)

const MIN = 60_000
const HOUR = 60 * MIN

export function validate(input: DonationInput, now: number): Partial<Record<keyof DonationInput | 'checklist', string>> {
  const e: Partial<Record<keyof DonationInput | 'checklist', string>> = {}
  if (input.title.trim().length < 3) e.title = 'Describe the food in at least 3 characters, e.g. "Veg biryani trays".'
  if (!Number.isInteger(input.portions) || input.portions < 1) e.portions = 'Enter the number of portions as a whole number above 0.'
  else if (input.portions > 5000) e.portions = 'For more than 5,000 portions, split the batch into several listings.'
  if (!input.area) e.area = 'Choose the approximate pickup area.'
  if (Number.isNaN(input.preparedAt)) e.preparedAt = 'Enter when the food was prepared.'
  else if (input.preparedAt > now + 5 * MIN) e.preparedAt = 'Preparation time can’t be in the future.'
  if (Number.isNaN(input.pickupBy)) e.pickupBy = 'Enter the latest pickup time.'
  else if (input.pickupBy <= now) e.pickupBy = 'The pickup deadline must be later than now.'
  else if (!Number.isNaN(input.pickupFrom) && input.pickupBy <= input.pickupFrom) e.pickupBy = 'The deadline must be after the window opens.'
  return e
}

function fail(msg: string): never { throw new Error(msg) }
const ev = (d: Donation, label: string, by: string, now: number) => [...d.events, { at: now, label, by }]

export function createDonation(input: DonationInput, donorId: string, now: number, id = uid()): Donation {
  return {
    ...input, title: input.title.trim(), id, donorId, status: 'available', createdAt: now,
    events: [{ at: now, label: 'Listed on the rescue board', by: partyName(donorId) }],
  }
}

export function editDonation(d: Donation, input: DonationInput, donorId: string, now: number): Donation {
  if (d.donorId !== donorId) fail('Only the donor who listed this batch can edit it.')
  if (d.status !== 'available' || isExpired(d, now)) fail('This batch can no longer be edited because it has been claimed, expired or closed.')
  return { ...d, ...input, title: input.title.trim(), events: ev(d, 'Listing details updated', partyName(donorId), now) }
}

export function cancel(d: Donation, donorId: string, now: number): Donation {
  if (d.donorId !== donorId) fail('Only the donor who listed this batch can cancel it.')
  if (d.status !== 'available') fail('This batch has already been claimed, so it can’t be cancelled here. Contact the rescue organisation.')
  return { ...d, status: 'cancelled', events: ev(d, 'Listing cancelled by donor', partyName(donorId), now) }
}

export function claim(d: Donation, orgId: string, now: number): Donation {
  if (d.status !== 'available') fail(`${partyName(d.orgId)} claimed this batch first. Pick another from the board.`)
  if (isExpired(d, now)) fail('The pickup window for this batch has closed.')
  return { ...d, status: 'claimed', orgId, events: ev(d, 'Claimed for collection', partyName(orgId), now) }
}

export function acceptTask(d: Donation, volunteerId: string, now: number): Donation {
  if (d.status !== 'claimed') fail('This task is not waiting for a volunteer.')
  if (d.volunteerId) fail(`${partyName(d.volunteerId)} already accepted this pickup.`)
  return { ...d, volunteerId, events: ev(d, 'Volunteer accepted the pickup', partyName(volunteerId), now) }
}

export function confirmPickup(d: Donation, volunteerId: string, now: number, code = handoffCode()): Donation {
  if (d.status !== 'claimed' || d.volunteerId !== volunteerId) fail('Only the assigned volunteer can confirm this pickup.')
  return { ...d, status: 'pickup_confirmed', code, events: ev(d, 'Food collected from donor', partyName(volunteerId), now) }
}

export function markHandedOver(d: Donation, volunteerId: string, now: number): Donation {
  if (d.status !== 'pickup_confirmed' || d.volunteerId !== volunteerId) fail('Only the assigned volunteer can mark this as handed over.')
  return { ...d, status: 'handed_over', events: ev(d, `Delivered to ${partyName(d.orgId)}, awaiting code check`, partyName(volunteerId), now) }
}

export function verifyHandoff(d: Donation, orgId: string, code: string, now: number): Donation {
  if (d.orgId !== orgId) fail('Only the organisation that claimed this batch can verify it.')
  if (d.status !== 'handed_over') fail('The volunteer hasn’t marked this batch as handed over yet.')
  if (code.trim() !== d.code) fail('That code doesn’t match. Ask the volunteer to show the receipt code on their task screen.')
  return { ...d, status: 'completed', events: ev(d, 'Handoff verified with receipt code', partyName(orgId), now) }
}

export interface Impact {
  rescues: number; portions: number; donors: number; medianMinutes: number | null
  byCategory: { category: Category; portions: number }[]
  recent: Donation[]
}

/** Counts completed rescues only. Pending, expired or cancelled batches never count. */
export function impact(donations: Donation[]): Impact {
  const done = donations.filter(d => d.status === 'completed')
  const durations = done
    .map(d => d.events.at(-1)!.at - (d.events.find(e => e.label.startsWith('Claimed'))?.at ?? d.createdAt))
    .sort((a, b) => a - b)
  const mid = durations.length ? durations[Math.floor((durations.length - 1) / 2)] : null
  return {
    rescues: done.length,
    portions: done.reduce((s, d) => s + d.portions, 0),
    donors: new Set(done.map(d => d.donorId)).size,
    medianMinutes: mid === null ? null : Math.round(mid / MIN),
    byCategory: CATEGORIES.map(category => ({
      category, portions: done.filter(d => d.category === category).reduce((s, d) => s + d.portions, 0),
    })).filter(c => c.portions > 0),
    recent: [...done].sort((a, b) => b.events.at(-1)!.at - a.events.at(-1)!.at).slice(0, 4),
  }
}

export function uid() { return Math.random().toString(36).slice(2, 9) }
export function handoffCode() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 10000
  return n.toString().padStart(4, '0')
}

// ---------- Seed data (relative to "now" so the demo is always live) ----------
export function seed(now: number): State {
  const mk = (
    id: string, title: string, category: Category, diet: Diet, portions: number, donorId: string,
    area: string, preparedAgo: number, closesIn: number, packaging: string, notes = '',
  ): Donation => createDonation({
    title, category, diet, portions, area, packaging, notes,
    preparedAt: now - preparedAgo, pickupFrom: now - preparedAgo + 15 * MIN, pickupBy: now + closesIn,
  }, donorId, now - preparedAgo + 10 * MIN, id)

  const run = (d: Donation, steps: ((d: Donation, t: number) => Donation)[], start: number, gap: number) =>
    steps.reduce((acc, step, i) => step(acc, start + i * gap), d)

  const completed = (id: string, title: string, category: Category, diet: Diet, portions: number, donorId: string, area: string, orgId: string, volId: string, daysAgo: number) => {
    const t0 = now - daysAgo * 24 * HOUR
    const d = createDonation({
      title, category, diet, portions, area, packaging: 'Sealed trays', notes: '',
      preparedAt: t0 - HOUR, pickupFrom: t0, pickupBy: t0 + 3 * HOUR,
    }, donorId, t0 - 50 * MIN, id)
    const code = '4821'
    return run(d, [
      (x, t) => claim(x, orgId, t),
      (x, t) => acceptTask(x, volId, t),
      (x, t) => confirmPickup(x, volId, t, code),
      (x, t) => markHandedOver(x, volId, t),
      (x, t) => verifyHandoff(x, orgId, code, t),
    ], t0 - 40 * MIN, 12 * MIN)
  }

  const claimedNoVol = run(
    mk('b5', 'Paneer butter masala with jeera rice', 'Cooked meals', 'veg', 45, 'd3', 'Aundh', 70 * MIN, 95 * MIN, 'Steel containers, lids on'),
    [(x, t) => claim(x, 'o2', t)], now - 20 * MIN, 0)
  const inTransit = run(
    mk('b6', 'Chicken pulao trays', 'Cooked meals', 'nonveg', 30, 'd2', 'Kothrud', 90 * MIN, 70 * MIN, 'Foil trays, covered'),
    [(x, t) => claim(x, 'o1', t), (x, t) => acceptTask(x, 'v2', t), (x, t) => confirmPickup(x, 'v2', t, '7305')],
    now - 45 * MIN, 10 * MIN)

  return {
    version: 1,
    identity: null,
    donations: [
      mk('b1', 'Veg biryani and raita from a wedding lunch', 'Cooked meals', 'veg', 80, 'd1', 'Baner', 50 * MIN, 48 * MIN, 'Hotel pans with cling film', 'Contains dairy (raita). Bring large carriers.'),
      mk('b2', 'Assorted breads and buns', 'Bakery', 'veg', 60, 'd4', 'Viman Nagar', 3 * HOUR, 3.5 * HOUR, 'Paper bags in crates', 'Contains gluten. Baked this morning.'),
      mk('b3', 'Dal, sabzi and chapati dinner surplus', 'Cooked meals', 'veg', 35, 'd2', 'Kothrud', 40 * MIN, 2 * HOUR, 'Steel containers'),
      mk('b4', 'Bananas and seasonal fruit', 'Fruit & veg', 'veg', 120, 'd3', 'Aundh', 5 * HOUR, 6 * HOUR, 'Open crates', 'Fully ripe; best distributed today.'),
      claimedNoVol,
      inTransit,
      mk('b7', 'Samosa and snack platters', 'Snacks', 'veg', 25, 'd1', 'Baner', 4 * HOUR, -30 * MIN, 'Cardboard boxes'),
      completed('b8', 'Mixed veg pulao', 'Cooked meals', 'veg', 70, 'd1', 'Baner', 'o1', 'v1', 1),
      completed('b9', 'Sandwich loaves and croissants', 'Bakery', 'veg', 40, 'd4', 'Viman Nagar', 'o2', 'v2', 2),
      completed('b10', 'Egg curry and rice', 'Cooked meals', 'nonveg', 55, 'd2', 'Kothrud', 'o1', 'v2', 3),
    ],
  }
}

// ---------- Persistence: localStorage, synced across tabs ----------
const KEY = 'mealrelay:v1'
const listeners = new Set<() => void>()
let state: State = load()

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as State
      if (parsed?.version === 1 && Array.isArray(parsed.donations)) return parsed
    }
  } catch { /* storage blocked or corrupt: fall back to a fresh seed */ }
  const fresh = seed(Date.now())
  save(fresh)
  return fresh
}

function save(s: State) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* private mode: state lives in memory only */ }
}

function set(next: State) {
  state = next
  save(next)
  listeners.forEach(l => l())
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', e => {
    if (e.key === KEY) { state = load(); listeners.forEach(l => l()) }
  })
}

export const store = {
  get: () => state,
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l) } },
  setIdentity(identity: Identity | null) { set({ ...state, identity }) },
  add(d: Donation) { set({ ...state, donations: [d, ...state.donations] }) },
  /** Re-reads storage before applying, so two tabs can't both claim the same batch. */
  act(id: string, fn: (d: Donation) => Donation) {
    const latest = load()
    const d = latest.donations.find(x => x.id === id) ?? fail('This batch no longer exists. The demo may have been reset.')
    const next = fn(d)
    set({ ...latest, identity: state.identity, donations: latest.donations.map(x => (x.id === id ? next : x)) })
    return next
  },
  reset() { set({ ...seed(Date.now()), identity: state.identity }) },
}

export function useStore() { return useSyncExternalStore(store.subscribe, store.get) }

export function useNow(ms = 15_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t) }, [ms])
  return now
}
