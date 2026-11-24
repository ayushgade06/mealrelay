import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { displayStatus, useNow, useStore } from '../store'
import { Ticket } from '../ui'

const STEPS = [
  { t: 'List the surplus', b: 'A caterer, hostel or venue lists what is left, how many portions, and the latest time it can be collected.' },
  { t: 'Claim and collect', b: 'A community kitchen claims the batch so nobody else drives to it. A volunteer accepts the pickup and collects it.' },
  { t: 'Verify the handoff', b: 'At drop-off the kitchen enters the volunteer’s 4-digit receipt code. Only then does the rescue count.' },
]

const ROLES = [
  { role: 'donor', t: 'For donors', b: 'Post a batch in under a minute, see who claimed it and when it was collected. Cancel or edit until someone claims it.', cta: 'List food as a donor' },
  { role: 'org', t: 'For rescue organisations', b: 'One board sorted by what expires first. Claim a batch and it disappears for everyone else, so no wasted trips.', cta: 'Claim food as an organisation' },
  { role: 'volunteer', t: 'For volunteers', b: 'See pickups that need a rider, accept one, confirm collection and show a receipt code at drop-off.', cta: 'Pick up as a volunteer' },
] as const

export default function Landing() {
  const { donations } = useStore()
  const now = useNow()
  const live = donations
    .filter(d => displayStatus(d, now) === 'available')
    .sort((a, b) => a.pickupBy - b.pickupBy)
    .slice(0, 3)

  return (
    <>
      <section className="grid items-center gap-12 pb-16 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h1 className="text-[2.6rem] leading-[1.02] font-extrabold sm:text-6xl lg:text-7xl">
            Rescue food before the clock runs out.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-ink-soft">
            MealRelay turns a forwarded “we have leftover food” message into a tracked rescue:
            listed, claimed, collected and handed over with a receipt code, before the pickup window closes.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/start" className="btn-accent px-6 py-3 text-base">Try the live demo</Link>
            <Link to="/board" className="btn-ghost px-6 py-3 text-base">See the rescue board</Link>
          </div>
          <p className="mt-4 text-sm text-ink-soft">No sign-up. Pick a demo role and walk through a full rescue in about two minutes.</p>
        </div>

        <div aria-label="Batches closing soonest" className="relative">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-base font-bold">Closing soonest on the board</h2>
            <Link to="/board" className="text-sm font-semibold underline-offset-4 hover:underline">View all</Link>
          </div>
          {live.length ? (
            <div className="space-y-5">
              {live.map((d, i) => <Ticket key={d.id} d={d} now={now} delay={150 + i * 120} />)}
            </div>
          ) : (
            <div className="ticket p-6 text-ink-soft">
              Nothing is waiting right now. <Link to="/donor/new" className="font-semibold text-ink underline">List a batch</Link> or reset the demo.
            </div>
          )}
        </div>
      </section>

      <section className="border-t border-steel py-16">
        <h2 className="text-3xl font-extrabold sm:text-4xl">How a rescue works</h2>
        <ol className="mt-10 grid gap-8 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.t} className="flex gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-turmeric font-display text-lg font-extrabold">{i + 1}</span>
              <div>
                <h3 className="text-xl font-bold">{s.t}</h3>
                <p className="mt-2 text-ink-soft">{s.b}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="py-16">
        <h2 className="max-w-2xl text-3xl font-extrabold sm:text-4xl">Three people, one batch, one shared status</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {ROLES.map(r => (
            <div key={r.role} className="flex flex-col rounded-2xl bg-ink p-6 text-paper">
              <h3 className="text-xl font-bold">{r.t}</h3>
              <p className="mt-3 flex-1 text-paper/75">{r.b}</p>
              <Link to={`/start?role=${r.role}`} className="btn-accent mt-6 self-start">{r.cta}</Link>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-turmeric-soft p-6 sm:p-10">
        <div className="flex gap-4">
          <ShieldAlert className="mt-1 size-6 shrink-0" aria-hidden />
          <div className="max-w-3xl">
            <h2 className="text-2xl font-extrabold">What MealRelay is not</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-ink-soft">
              <li>Not a food-safety check. The donor checklist is a self-declaration; the receiving organisation still assesses every batch.</li>
              <li>Not affiliated with FSSAI, the Indian Food Sharing Alliance or any real NGO. All names here are fictional.</li>
              <li>Not storing anyone’s phone number, home address or beneficiary details. Areas are neighbourhood-level only.</li>
            </ul>
          </div>
        </div>
      </section>
    </>
  )
}
