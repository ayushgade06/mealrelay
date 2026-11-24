import { Link } from 'react-router-dom'
import { Info } from 'lucide-react'
import { impact, partyName, useStore } from '../store'
import { DemoTag, Empty, fmtDateTime, PageHead } from '../ui'

export default function ImpactPage() {
  const { donations } = useStore()
  const m = impact(donations)
  const ledger = donations.filter(d => d.status === 'completed').sort((a, b) => b.events.at(-1)!.at - a.events.at(-1)!.at)
  const pending = donations.filter(d => ['claimed', 'pickup_confirmed', 'handed_over'].includes(d.status)).length
  const maxCat = Math.max(1, ...m.byCategory.map(c => c.portions))

  return (
    <>
      <PageHead title="Impact ledger" sub={<>Only rescues closed with a verified receipt code are counted. <DemoTag /></>} />

      {m.rescues === 0 ? (
        <Empty title="No verified rescues yet" body="Complete a rescue end to end and it will be recorded here."
          action={<Link to="/start" className="btn-primary">Start a demo rescue</Link>} />
      ) : (
        <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] [&>*]:min-w-0">
          <div>
            <p className="font-display text-3xl leading-tight font-extrabold sm:text-5xl">
              {m.portions.toLocaleString('en-IN')} portions reached community kitchens through{' '}
              {m.rescues} verified {m.rescues === 1 ? 'handoff' : 'handoffs'} from {m.donors} {m.donors === 1 ? 'donor' : 'donors'}.
            </p>
            <dl className="mt-10 grid grid-cols-2 gap-6 border-t border-steel pt-6 sm:grid-cols-3">
              <div><dt className="text-sm text-ink-soft">Estimated meals</dt><dd className="font-display text-3xl font-extrabold">~{m.portions.toLocaleString('en-IN')}</dd></div>
              <div><dt className="text-sm text-ink-soft">Median claim to handoff</dt><dd className="font-display text-3xl font-extrabold">{m.medianMinutes} min</dd></div>
              <div><dt className="text-sm text-ink-soft">Still in progress</dt><dd className="font-display text-3xl font-extrabold">{pending}</dd></div>
            </dl>
            <p className="mt-4 flex gap-2 text-sm text-ink-soft">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              Meals are an estimate that assumes one donated portion serves one meal. In-progress, expired and cancelled batches are never counted.
            </p>

            <h2 className="mt-12 mb-4 text-xl font-bold">Portions by food type</h2>
            <ul className="space-y-3">
              {m.byCategory.map(c => (
                <li key={c.category}>
                  <div className="flex justify-between text-sm"><span className="font-semibold">{c.category}</span><span>{c.portions}</span></div>
                  <div className="mt-1 h-2.5 rounded-full bg-steel"><div className="h-full rounded-full bg-ink" style={{ width: `${(c.portions / maxCat) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          </div>

          <section className="ticket self-start p-6" aria-labelledby="ledger-h">
            <h2 id="ledger-h" className="text-center font-display text-lg font-bold">Verified rescues</h2>
            <ol className="mt-5 divide-y divide-dashed divide-steel-dark">
              {ledger.map(d => (
                <li key={d.id} className="py-3">
                  <Link to={`/donation/${d.id}`} className="flex justify-between gap-4 hover:underline">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{d.title}</span>
                      <span className="block text-xs text-ink-soft">{partyName(d.donorId)} to {partyName(d.orgId)}, {fmtDateTime(d.events.at(-1)!.at)}</span>
                    </span>
                    <span className="shrink-0 font-semibold">{d.portions}</span>
                  </Link>
                </li>
              ))}
            </ol>
            <div className="mt-2 flex justify-between border-t-2 border-ink pt-3 font-display text-lg font-extrabold">
              <span>Total portions</span><span>{m.portions}</span>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
