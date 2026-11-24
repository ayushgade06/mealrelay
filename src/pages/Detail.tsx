import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { ArrowLeft, CheckSquare, MapPin } from 'lucide-react'
import {
  acceptTask, cancel, CHECKLIST, confirmPickup, displayStatus, markHandedOver, partyName, store,
  useNow, useStore, verifyHandoff, type Donation, type Identity,
} from '../store'
import { ClaimButton } from './Board'
import {
  ConfirmButton, Countdown, DemoTag, DietMark, fmtDateTime, fmtDuration, fmtTime, Progress, StatusPill, Timeline,
  useAction, useToast,
} from '../ui'

export function VerifyForm({ d, orgId, initial = '' }: { d: Donation; orgId: string; initial?: string }) {
  const [code, setCode] = useState(initial)
  const [error, setError] = useState('')
  const toast = useToast()
  const id = `code-${d.id}`
  const submit = (e: FormEvent) => {
    e.preventDefault()
    try {
      store.act(d.id, x => verifyHandoff(x, orgId, code, Date.now()))
      toast('ok', `Handoff verified. ${d.portions} portions added to the impact ledger.`)
    } catch (err) { setError((err as Error).message) }
  }
  return (
    <form onSubmit={submit} className="w-full">
      <label htmlFor={id} className="label">Receipt code from the volunteer</label>
      <div className="flex gap-2">
        <input id={id} className="field w-32 text-center text-lg font-bold tracking-[0.4em]" inputMode="numeric" autoComplete="off"
          maxLength={4} placeholder="0000" value={code} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined}
          onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setError('') }} />
        <button className="btn-primary" disabled={code.length !== 4}>Verify handoff</button>
      </div>
      {error && <p id={`${id}-err`} className="mt-2 text-sm font-medium text-chili">{error}</p>}
    </form>
  )
}

/** The buttons each demo role may press for a batch, given its current state. */
export function RoleActions({ d, identity, now }: { d: Donation; identity: Identity | null; now: number }) {
  const act = useAction()
  const nav = useNavigate()
  if (!identity) return null
  const s = displayStatus(d, now)
  const { role, id } = identity
  const t = () => Date.now()

  if (role === 'donor' && d.donorId === id && s === 'available') return (
    <>
      <Link to={`/donor/edit/${d.id}`} className="btn-ghost">Edit listing</Link>
      <ConfirmButton className="btn-danger" label="Cancel listing" title="Cancel this listing?"
        body="It will be removed from the rescue board. This can’t be undone." confirm="Cancel listing"
        onConfirm={() => act(d.id, x => cancel(x, id, t()), 'Listing cancelled.')} />
    </>
  )
  if (role === 'org' && s === 'available') return <ClaimButton d={d} orgId={id} />
  if (role === 'org' && d.orgId === id && s === 'handed_over') return <VerifyForm d={d} orgId={id} />
  if (role === 'volunteer') {
    if (s === 'claimed' && !d.volunteerId) return (
      <button className="btn-primary" onClick={() => act(d.id, x => acceptTask(x, id, t()), `Pickup accepted. Head to ${d.area}.`)}>Accept pickup</button>
    )
    if (d.volunteerId !== id) return null
    if (s === 'claimed') return (
      <button className="btn-primary" onClick={() => act(d.id, x => confirmPickup(x, id, t()), 'Collection confirmed. Your receipt code is ready.')}>Confirm collected</button>
    )
    if (s === 'pickup_confirmed') return (
      <>
        <button className="btn-primary" onClick={() => act(d.id, x => markHandedOver(x, id, t()), `Marked as handed over. Show your code to ${partyName(d.orgId)}.`)}>Mark handed over</button>
        <button className="btn-ghost" onClick={() => nav(`/donation/${d.id}`)}>Show receipt code</button>
      </>
    )
    if (s === 'handed_over') return <Link to={`/donation/${d.id}`} className="btn-ghost">Show receipt code</Link>
  }
  return null
}

function CodeCard({ d }: { d: Donation }) {
  const url = `${location.origin}${location.pathname}#/donation/${d.id}?code=${d.code}`
  return (
    <section className="rounded-2xl bg-ink p-6 text-paper">
      <h2 className="text-lg font-bold">Receipt code</h2>
      <p className="mt-1 text-sm text-paper/75">Show this at drop-off. {partyName(d.orgId)} enters it, or scans the QR, to close the rescue.</p>
      <div className="mt-5 flex flex-wrap items-center gap-6">
        <div className="font-display text-6xl font-extrabold tracking-[0.2em] text-turmeric" aria-label={`Code ${d.code?.split('').join(' ')}`}>{d.code}</div>
        <div className="rounded-xl bg-white p-2"><QRCodeSVG value={url} size={104} title="QR code that opens this batch with the receipt code filled in" /></div>
      </div>
    </section>
  )
}

export default function Detail() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { donations, identity } = useStore()
  const now = useNow(5000)
  const d = donations.find(x => x.id === id)

  if (!d) return (
    <div className="py-16 text-center">
      <h1 className="text-3xl font-extrabold">This batch isn’t in the demo</h1>
      <p className="mt-2 text-ink-soft">It may have been removed when the demo was reset.</p>
      <Link to="/board" className="btn-primary mt-6">Back to the rescue board</Link>
    </div>
  )

  const s = displayStatus(d, now)
  const isVolunteer = identity?.role === 'volunteer' && d.volunteerId === identity.id
  const isReceiver = identity?.role === 'org' && d.orgId === identity.id
  const showCode = isVolunteer && (s === 'pickup_confirmed' || s === 'handed_over')
  const scannedCode = params.get('code') ?? ''
  const claimedAt = d.events.find(e => e.label.startsWith('Claimed'))?.at

  return (
    <div>
      <Link to="/board" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden />Rescue board
      </Link>
      <div className="mt-6 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-8">
          <div className="ticket relative overflow-hidden p-6 sm:p-8">
            {s === 'completed' && (
              <div className="stamp absolute top-6 right-6 rounded-lg border-4 border-leaf px-3 py-1 font-display text-2xl font-extrabold text-leaf" aria-hidden>
                Rescued
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill d={d} now={now} />
              <span className="text-sm font-semibold text-ink-soft">{d.category}</span>
              <DietMark diet={d.diet} />
            </div>
            <h1 className="mt-4 max-w-xl text-3xl font-extrabold sm:text-4xl">{d.title}</h1>
            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
              <div><dt className="text-sm text-ink-soft">Portions</dt><dd className="font-display text-2xl font-extrabold">{d.portions}</dd></div>
              <div><dt className="text-sm text-ink-soft">Prepared</dt><dd className="font-semibold">{fmtDateTime(d.preparedAt)}</dd></div>
              <div><dt className="text-sm text-ink-soft">Pickup window</dt><dd className="font-semibold">{fmtTime(d.pickupFrom)} to {fmtTime(d.pickupBy)}</dd></div>
              <div><dt className="text-sm text-ink-soft">Area</dt><dd className="inline-flex items-center gap-1 font-semibold"><MapPin className="size-4" aria-hidden />{d.area}</dd></div>
              <div><dt className="text-sm text-ink-soft">Packaging</dt><dd className="font-semibold">{d.packaging || 'Not specified'}</dd></div>
              <div><dt className="text-sm text-ink-soft">Donor</dt><dd className="font-semibold">{partyName(d.donorId)} <DemoTag /></dd></div>
            </dl>
            {d.notes && <p className="mt-6 rounded-xl bg-turmeric-soft p-4 text-sm"><strong>Donor notes:</strong> {d.notes}</p>}
            {(s === 'available' || s === 'claimed') && <div className="mt-6"><Countdown d={d} now={now} /></div>}
            <div className="mt-6 flex flex-wrap gap-2 empty:hidden">
              {isReceiver && s === 'handed_over'
                ? <VerifyForm d={d} orgId={identity.id} initial={scannedCode} />
                : <RoleActions d={d} identity={identity} now={now} />}
            </div>
            {!identity && s === 'available' && (
              <p className="mt-6 text-sm text-ink-soft">
                <Link to="/start?role=org" className="font-semibold text-ink underline">Choose a demo organisation</Link> to claim this batch.
              </p>
            )}
          </div>

          {s !== 'cancelled' && s !== 'expired' && <Progress d={d} />}
          {showCode && <CodeCard d={d} />}

          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><CheckSquare className="size-5" aria-hidden />Donor’s self-declaration</h2>
            <ul className="space-y-2 text-sm text-ink-soft">
              {CHECKLIST.map(c => <li key={c} className="flex gap-2"><span aria-hidden className="text-leaf">✓</span>{c}</li>)}
            </ul>
            <p className="mt-3 text-xs text-ink-soft">This is the donor’s own declaration, not a safety inspection. The receiving organisation checks the food before serving it.</p>
          </section>
        </div>

        <aside className="space-y-6">
          <section>
            <h2 className="mb-5 text-lg font-bold">Chain of custody</h2>
            <Timeline d={d} />
          </section>
          <section className="rounded-2xl bg-steel/60 p-5 text-sm">
            <dl className="space-y-3">
              <div className="flex justify-between gap-4"><dt className="text-ink-soft">Claimed by</dt><dd className="text-right font-semibold">{d.orgId ? partyName(d.orgId) : 'Nobody yet'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink-soft">Volunteer</dt><dd className="text-right font-semibold">{d.volunteerId ? partyName(d.volunteerId) : 'Not assigned'}</dd></div>
              {s === 'completed' && claimedAt && (
                <div className="flex justify-between gap-4"><dt className="text-ink-soft">Claim to handoff</dt><dd className="font-semibold">{fmtDuration(d.events.at(-1)!.at - claimedAt)}</dd></div>
              )}
            </dl>
          </section>
        </aside>
      </div>
    </div>
  )
}
