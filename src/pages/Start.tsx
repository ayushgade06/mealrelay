import { useNavigate, useSearchParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import { PARTIES, store, useStore, type Role } from '../store'
import { DemoTag, PageHead, ROLE_HOME, ROLE_LABEL, useToast } from '../ui'

const ROLE_HINT: Record<Role, string> = {
  donor: 'List surplus food and track who collects it.',
  org: 'Claim batches and verify each handoff.',
  volunteer: 'Accept pickups and carry the receipt code.',
}

export default function Start() {
  const [params, setParams] = useSearchParams()
  const { identity } = useStore()
  const nav = useNavigate()
  const toast = useToast()
  const role = (params.get('role') as Role) in PARTIES ? (params.get('role') as Role) : identity?.role ?? 'donor'

  return (
    <div className="max-w-3xl">
      <PageHead
        title="Who are you in this demo?"
        sub="Pick a role and a fictional identity. Open a second tab as another role to watch updates arrive live."
      />
      <div role="tablist" aria-label="Role" className="grid gap-2 sm:grid-cols-3">
        {(Object.keys(PARTIES) as Role[]).map(r => (
          <button key={r} role="tab" aria-selected={r === role} onClick={() => setParams({ role: r }, { replace: true })}
            className={`rounded-2xl border-2 p-4 text-left transition-colors ${r === role ? 'border-ink bg-white' : 'border-transparent bg-steel/60 hover:bg-steel'}`}>
            <div className="font-display text-lg font-bold">{ROLE_LABEL[r]}</div>
            <div className="mt-1 text-sm text-ink-soft">{ROLE_HINT[r]}</div>
          </button>
        ))}
      </div>

      <h2 className="mt-10 mb-4 text-xl font-bold">Continue as</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {PARTIES[role].map(p => {
          const current = identity?.id === p.id
          return (
            <li key={p.id}>
              <button
                onClick={() => { store.setIdentity({ role, id: p.id }); toast('ok', `You’re now ${p.name}.`); nav(ROLE_HOME[role]) }}
                className={`ticket w-full p-5 text-left hover:ring-2 hover:ring-ink ${current ? 'ring-2 ring-leaf' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-display text-lg font-bold">{p.name}</span>
                  {current && <span className="inline-flex items-center gap-1 text-xs font-semibold text-leaf"><Check className="size-3.5" />Current</span>}
                </div>
                <div className="mt-1 text-sm text-ink-soft">{p.kind}, {p.area}</div>
                <DemoTag className="mt-3" />
              </button>
            </li>
          )
        })}
      </ul>
      {identity && (
        <button className="mt-8 text-sm font-semibold text-ink-soft underline underline-offset-4 hover:text-ink"
          onClick={() => { store.setIdentity(null); toast('ok', 'Signed out of the demo role.'); nav('/') }}>
          Leave demo role
        </button>
      )}
    </div>
  )
}
