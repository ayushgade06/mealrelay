import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, AlertTriangle, Clock, MapPin, X } from 'lucide-react'
import {
  displayStatus, FLOW, partyName, STATUS_LABEL, store, useStore,
  type Donation, type Role, type Status,
} from './store'

// ---------- Formatting ----------
const MIN = 60_000
export const fmtTime = (t: number) => new Date(t).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
export const fmtDateTime = (t: number) =>
  new Date(t).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

export function fmtDuration(ms: number) {
  const m = Math.max(0, Math.round(ms / MIN))
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  return m % 60 ? `${h} h ${m % 60} min` : `${h} h`
}

export type Urgency = 'critical' | 'soon' | 'ok' | 'closed'
export function urgency(d: Donation, now: number): Urgency {
  const left = d.pickupBy - now
  if (left <= 0) return 'closed'
  if (left < 60 * MIN) return 'critical'
  if (left < 3 * 60 * MIN) return 'soon'
  return 'ok'
}

export const ROLE_LABEL: Record<Role, string> = { donor: 'Donor', org: 'Rescue organisation', volunteer: 'Volunteer' }
export const ROLE_HOME: Record<Role, string> = { donor: '/donor', org: '/org', volunteer: '/volunteer' }

// ---------- Small pieces ----------
const PILL: Record<Status | 'expired', string> = {
  available: 'bg-turmeric-soft text-ink',
  claimed: 'bg-sky-soft text-sky',
  pickup_confirmed: 'bg-sky-soft text-sky',
  handed_over: 'bg-sky-soft text-sky',
  completed: 'bg-leaf-soft text-leaf',
  cancelled: 'bg-steel text-ink-soft',
  expired: 'bg-steel text-ink-soft',
}

export function StatusPill({ d, now }: { d: Donation; now: number }) {
  const s = displayStatus(d, now)
  return <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${PILL[s]}`}>{STATUS_LABEL[s]}</span>
}

export function DietMark({ diet }: { diet: Donation['diet'] }) {
  // Mirrors the familiar Indian food-label convention: green square for veg, brown for non-veg.
  const color = diet === 'veg' ? 'border-leaf text-leaf' : diet === 'nonveg' ? 'border-[#7A3B12] text-[#7A3B12]' : 'border-ink-soft text-ink-soft'
  const label = diet === 'veg' ? 'Vegetarian' : diet === 'nonveg' ? 'Non-vegetarian' : 'Mixed'
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft">
      <span aria-hidden className={`grid size-3.5 place-items-center rounded-[3px] border-[1.5px] ${color}`}>
        <span className="size-1.5 rounded-full bg-current" />
      </span>
      {label}
    </span>
  )
}

export function DemoTag({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex rounded-md border border-dashed border-ink-soft/50 px-1.5 py-px text-[11px] font-medium text-ink-soft ${className}`}>
      Demo, not verified
    </span>
  )
}

/** The pickup window drains like a kitchen timer. */
export function Countdown({ d, now, compact = false }: { d: Donation; now: number; compact?: boolean }) {
  const u = urgency(d, now)
  const total = Math.max(d.pickupBy - d.createdAt, 1)
  const left = Math.max(d.pickupBy - now, 0)
  const pct = Math.min(100, (left / total) * 100)
  const bar = u === 'critical' ? 'bg-chili' : u === 'soon' ? 'bg-turmeric' : 'bg-leaf'
  const text = u === 'closed' ? `Window closed ${fmtDuration(now - d.pickupBy)} ago` : `${fmtDuration(left)} left to collect`
  return (
    <div>
      <div className={`flex items-center gap-1.5 text-sm font-semibold ${u === 'critical' ? 'text-chili' : 'text-ink'}`}>
        {u === 'critical' ? <AlertTriangle className="size-4" aria-hidden /> : <Clock className="size-4" aria-hidden />}
        {text}
        {!compact && <span className="ml-auto text-xs font-medium text-ink-soft">by {fmtTime(d.pickupBy)}</span>}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-steel" role="presentation">
        <div className={`h-full rounded-full ${bar} transition-[width] duration-1000`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/** Shows the countdown only while the batch is still waiting to be collected. */
function needsCountdown(d: Donation) { return d.status === 'available' || d.status === 'claimed' }

export function Ticket({ d, now, children, delay = 0 }: { d: Donation; now: number; children?: ReactNode; delay?: number }) {
  const closed = displayStatus(d, now) === 'expired' || d.status === 'cancelled'
  return (
    <article className={`ticket drop-in flex flex-col ${closed ? 'opacity-70' : ''}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-xs font-semibold text-ink-soft">{d.category}</span>
            <DietMark diet={d.diet} />
          </div>
          <h3 className="mt-1.5 text-lg leading-snug font-bold">
            <Link to={`/donation/${d.id}`} className="hover:underline focus-visible:underline after:absolute after:inset-0 after:content-['']">
              {d.title}
            </Link>
          </h3>
        </div>
        <div className="text-right">
          <div className="font-display text-3xl leading-none font-extrabold">{d.portions}</div>
          <div className="text-xs text-ink-soft">portions</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 px-5 text-sm text-ink-soft">
        <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden />{d.area}</span>
        <span className="truncate">{partyName(d.donorId)}</span>
      </div>
      <div className="mt-auto border-t border-dashed border-steel-dark px-5 pt-4 pb-5 mt-4">
        {needsCountdown(d) && !closed ? (
          <Countdown d={d} now={now} />
        ) : (
          <div className="flex items-center justify-between text-sm">
            <StatusPill d={d} now={now} />
            <span className="text-ink-soft">
              {d.status === 'completed' ? `Completed ${fmtDateTime(d.events.at(-1)!.at)}` : closed ? `Closed ${fmtTime(d.pickupBy)}` : `With ${partyName(d.volunteerId)}`}
            </span>
          </div>
        )}
        {children && <div className="relative z-10 mt-4 flex flex-wrap gap-2">{children}</div>}
      </div>
    </article>
  )
}

export function Progress({ d }: { d: Donation }) {
  const idx = FLOW.indexOf(d.status)
  if (idx < 0) return null
  return (
    <ol className="grid grid-cols-5 gap-1.5" aria-label="Rescue progress">
      {FLOW.map((s, i) => (
        <li key={s} className="min-w-0">
          <div className={`h-1.5 rounded-full ${i <= idx ? (d.status === 'completed' ? 'bg-leaf' : 'bg-ink') : 'bg-steel'}`} />
          <div className={`mt-1.5 truncate text-[11px] sm:text-xs ${i === idx ? 'font-semibold text-ink' : 'text-ink-soft'}`}>
            {STATUS_LABEL[s]}
            {i === idx && <span className="sr-only"> (current step)</span>}
          </div>
        </li>
      ))}
    </ol>
  )
}

export function Timeline({ d }: { d: Donation }) {
  return (
    <ol className="relative space-y-5 border-l-2 border-steel pl-6">
      {d.events.map((e, i) => (
        <li key={i} className="relative">
          <span className={`absolute top-1 -left-[31px] size-3 rounded-full ring-4 ring-paper ${i === d.events.length - 1 ? 'bg-turmeric' : 'bg-ink'}`} />
          <div className="text-sm font-semibold">{e.label}</div>
          <div className="text-sm text-ink-soft">{e.by}, {fmtDateTime(e.at)}</div>
        </li>
      ))}
    </ol>
  )
}

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-steel-dark px-6 py-12 text-center">
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-ink-soft">{body}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}

export function PageHead({ title, sub, action }: { title: string; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-extrabold sm:text-4xl">{title}</h1>
        {sub && <p className="mt-2 text-ink-soft">{sub}</p>}
      </div>
      {action}
    </div>
  )
}

/** Shown when the current demo role can't use a page; offers a one-click switch. */
export function RoleGate({ role, children }: { role: Role; children: (id: string) => ReactNode }) {
  const { identity } = useStore()
  if (identity?.role === role) return <>{children(identity.id)}</>
  return (
    <Empty
      title={`This page is for the ${ROLE_LABEL[role].toLowerCase()} role`}
      body={`Pick a demo ${ROLE_LABEL[role].toLowerCase()} to continue. No account or password needed.`}
      action={<Link className="btn-primary" to={`/start?role=${role}`}>Choose a demo {ROLE_LABEL[role].toLowerCase()}</Link>}
    />
  )
}

/** Native <dialog> gives focus trapping, Esc-to-close and a backdrop for free. */
export function ConfirmButton({ label, title, body, confirm, onConfirm, className = 'btn-primary' }: {
  label: ReactNode; title: string; body: ReactNode; confirm: string; onConfirm: () => void; className?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  return (
    <>
      <button className={className} onClick={() => ref.current?.showModal()}>{label}</button>
      <dialog ref={ref} className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/50">
        <form method="dialog" className="p-6">
          <h2 className="text-xl font-bold">{title}</h2>
          <div className="mt-2 text-ink-soft">{body}</div>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button className="btn-ghost" value="cancel">Go back</button>
            <button className="btn-primary" value="ok" onClick={onConfirm}>{confirm}</button>
          </div>
        </form>
      </dialog>
    </>
  )
}

// ---------- Toasts ----------
type Toast = { id: number; kind: 'ok' | 'error'; text: string }
const ToastCtx = createContext<(kind: Toast['kind'], text: string) => void>(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = useCallback((kind: Toast['kind'], text: string) => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, kind, text }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 5000)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:right-6 sm:left-auto sm:items-end" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} role={t.kind === 'error' ? 'alert' : 'status'}
            className={`drop-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${t.kind === 'ok' ? 'bg-ink text-paper' : 'bg-chili text-white'}`}>
            {t.kind === 'ok' ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-turmeric" aria-hidden /> : <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />}
            <span className="flex-1">{t.text}</span>
            <button onClick={() => setToasts(x => x.filter(y => y.id !== t.id))} aria-label="Dismiss" className="opacity-70 hover:opacity-100">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

/** Runs a store action and turns domain errors into toasts. */
export function useAction() {
  const toast = useToast()
  return (id: string, fn: (d: Donation) => Donation, success: string) => {
    try { store.act(id, fn); toast('ok', success); return true }
    catch (e) { toast('error', e instanceof Error ? e.message : 'Something went wrong. Try again.'); return false }
  }
}
