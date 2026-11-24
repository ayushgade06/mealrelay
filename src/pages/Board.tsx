import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { AREAS, CATEGORIES, claim, displayStatus, partyName, useNow, useStore, type Donation } from '../store'
import { ConfirmButton, Empty, PageHead, Ticket, useAction } from '../ui'

type Show = 'open' | 'active' | 'all'
const SHOW: Record<Show, string> = { open: 'Open to claim', active: 'In progress', all: 'Everything' }
const WITHIN = { any: 'Any time', '60': 'Within 1 hour', '180': 'Within 3 hours' } as const

export function ClaimButton({ d, orgId }: { d: Donation; orgId: string }) {
  const act = useAction()
  return (
    <ConfirmButton
      label="Claim batch"
      title={`Claim ${d.portions} portions?`}
      body={<>You’re committing <strong>{partyName(orgId)}</strong> to collect “{d.title}” from {d.area} before the window closes. Other organisations will no longer see it.</>}
      confirm="Claim batch"
      onConfirm={() => act(d.id, x => claim(x, orgId, Date.now()), `Claimed. A volunteer can now accept the pickup.`)}
    />
  )
}

export default function Board() {
  const { donations, identity } = useStore()
  const now = useNow()
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [area, setArea] = useState('')
  const [show, setShow] = useState<Show>('open')
  const [within, setWithin] = useState<keyof typeof WITHIN>('any')
  const [sort, setSort] = useState<'deadline' | 'newest'>('deadline')

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return donations
      .filter(d => {
        const s = displayStatus(d, now)
        if (show === 'open' && s !== 'available') return false
        if (show === 'active' && !['claimed', 'pickup_confirmed', 'handed_over'].includes(s)) return false
        if (category && d.category !== category) return false
        if (area && d.area !== area) return false
        if (within !== 'any' && (d.pickupBy < now || d.pickupBy - now > Number(within) * 60_000)) return false
        return !needle || `${d.title} ${d.notes} ${partyName(d.donorId)}`.toLowerCase().includes(needle)
      })
      .sort((a, b) => (sort === 'deadline' ? a.pickupBy - b.pickupBy : b.createdAt - a.createdAt))
  }, [donations, now, q, category, area, show, within, sort])

  const filtered = q || category || area || within !== 'any'
  const clear = () => { setQ(''); setCategory(''); setArea(''); setWithin('any') }
  const isOrg = identity?.role === 'org'

  return (
    <>
      <PageHead
        title="Rescue board"
        sub={isOrg
          ? 'Batches closing soonest are at the top. Claim one and it’s removed from everyone else’s board.'
          : 'Every surplus batch in the demo city. Switch to a rescue organisation to claim one.'}
        action={identity?.role === 'donor' && <Link to="/donor/new" className="btn-accent">List surplus food</Link>}
      />

      <div className="mb-8 space-y-4">
        <div role="radiogroup" aria-label="Show" className="flex flex-wrap gap-2">
          {(Object.keys(SHOW) as Show[]).map(s => (
            <button key={s} role="radio" aria-checked={show === s} onClick={() => setShow(s)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${show === s ? 'bg-ink text-paper' : 'bg-steel hover:bg-steel-dark'}`}>
              {SHOW[s]}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
          <label className="relative sm:col-span-2 lg:col-span-1">
            <span className="sr-only">Search</span>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-soft" aria-hidden />
            <input className="field pl-10" placeholder="Search food or donor" value={q} onChange={e => setQ(e.target.value)} />
          </label>
          <label><span className="sr-only">Category</span>
            <select className="field" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">All categories</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label><span className="sr-only">Area</span>
            <select className="field" value={area} onChange={e => setArea(e.target.value)}>
              <option value="">All areas</option>{AREAS.map(a => <option key={a}>{a}</option>)}
            </select>
          </label>
          <label><span className="sr-only">Pickup deadline</span>
            <select className="field" value={within} onChange={e => setWithin(e.target.value as keyof typeof WITHIN)}>
              {Object.entries(WITHIN).map(([k, v]) => <option key={k} value={k}>{k === 'any' ? 'Closes any time' : `Closes ${v.toLowerCase()}`}</option>)}
            </select>
          </label>
          <label><span className="sr-only">Sort</span>
            <select className="field" value={sort} onChange={e => setSort(e.target.value as 'deadline' | 'newest')}>
              <option value="deadline">Closing soonest</option>
              <option value="newest">Newest first</option>
            </select>
          </label>
        </div>
        <p className="text-sm text-ink-soft" aria-live="polite">{list.length} {list.length === 1 ? 'batch' : 'batches'}</p>
      </div>

      {list.length ? (
        <div className="grid gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((d, i) => (
            <Ticket key={d.id} d={d} now={now} delay={Math.min(i, 6) * 40}>
              {isOrg && displayStatus(d, now) === 'available' && <ClaimButton d={d} orgId={identity.id} />}
            </Ticket>
          ))}
        </div>
      ) : (
        <Empty
          title={filtered ? 'No batches match these filters' : 'Nothing waiting to be claimed'}
          body={filtered ? 'Try a wider area or deadline.' : 'New surplus appears here as soon as a donor lists it. You can list one yourself as a donor, or reset the demo.'}
          action={filtered ? <button className="btn-ghost" onClick={clear}>Clear filters</button> : <Link to="/start?role=donor" className="btn-primary">List food as a donor</Link>}
        />
      )}
    </>
  )
}
