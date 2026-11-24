import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import {
  AREAS, CATEGORIES, CHECKLIST, createDonation, displayStatus, DONORS, editDonation, store, useNow, useStore, validate,
  type Category, type Diet, type DonationInput,
} from '../store'
import { Empty, PageHead, RoleGate, Ticket, useToast } from '../ui'
import { RoleActions } from './Detail'

const pad = (n: number) => String(n).padStart(2, '0')
const toLocal = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}` }
const fromLocal = (s: string) => (s ? new Date(s).getTime() : NaN)

export function DonorHome() {
  const { donations, identity } = useStore()
  const now = useNow()
  return (
    <RoleGate role="donor">
      {id => {
        const mine = donations.filter(d => d.donorId === id).sort((a, b) => b.createdAt - a.createdAt)
        const open = mine.filter(d => ['available', 'claimed', 'pickup_confirmed', 'handed_over'].includes(displayStatus(d, now)))
        const closed = mine.filter(d => !open.includes(d))
        return (
          <>
            <PageHead title="Your listings" sub="Track each batch from listing to verified handoff."
              action={<Link to="/donor/new" className="btn-accent">List surplus food</Link>} />
            {mine.length === 0 && (
              <Empty title="You haven’t listed any food yet" body="List your first batch. Rescue organisations see it on the board straight away."
                action={<Link to="/donor/new" className="btn-primary">List surplus food</Link>} />
            )}
            {open.length > 0 && <Group title="In progress" count={open.length}>{open.map(d => (
              <Ticket key={d.id} d={d} now={now}><RoleActions d={d} identity={identity} now={now} /></Ticket>
            ))}</Group>}
            {closed.length > 0 && <Group title="Closed" count={closed.length}>{closed.map(d => <Ticket key={d.id} d={d} now={now} />)}</Group>}
          </>
        )
      }}
    </RoleGate>
  )
}

export function Group({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="mb-5 text-xl font-bold">{title} <span className="font-sans text-base font-medium text-ink-soft">({count})</span></h2>
      <div className="grid gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  )
}

function Field({ label, error, id, hint, children }: { label: string; error?: string; id: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="mt-1 text-sm text-ink-soft">{hint}</p>}
      {error && <p id={`${id}-err`} className="mt-1 text-sm font-medium text-chili">{error}</p>}
    </div>
  )
}

export function DonationForm() {
  return <RoleGate role="donor">{id => <FormInner donorId={id} />}</RoleGate>
}

function FormInner({ donorId }: { donorId: string }) {
  const { id: editId } = useParams()
  const { donations } = useStore()
  const nav = useNavigate()
  const toast = useToast()
  const existing = editId ? donations.find(d => d.id === editId) : undefined
  const [start] = useState(() => Date.now())

  const [f, setF] = useState(() => ({
    title: existing?.title ?? '',
    category: existing?.category ?? 'Cooked meals' as Category,
    diet: existing?.diet ?? 'veg' as Diet,
    portions: existing ? String(existing.portions) : '',
    preparedAt: toLocal(existing?.preparedAt ?? start - 30 * 60_000),
    pickupFrom: toLocal(existing?.pickupFrom ?? start),
    pickupBy: toLocal(existing?.pickupBy ?? start + 2 * 3_600_000),
    area: existing?.area ?? DONORS.find(d => d.id === donorId)?.area ?? '',
    packaging: existing?.packaging ?? '',
    notes: existing?.notes ?? '',
  }))
  const [checks, setChecks] = useState<boolean[]>(() => CHECKLIST.map(() => !!existing))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState(false)
  const now = useNow()

  if (editId && (!existing || existing.donorId !== donorId)) return (
    <Empty title="You can’t edit this listing" body="It doesn’t exist or belongs to another donor." action={<Link to="/donor" className="btn-primary">Back to your listings</Link>} />
  )

  const input: DonationInput = {
    title: f.title, category: f.category, diet: f.diet, portions: Number(f.portions), area: f.area,
    packaging: f.packaging.trim(), notes: f.notes.trim(),
    preparedAt: fromLocal(f.preparedAt), pickupFrom: fromLocal(f.pickupFrom), pickupBy: fromLocal(f.pickupBy),
  }
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => { setF({ ...f, [k]: e.target.value }); setErrors({ ...errors, [k]: '' }) }
  const a11y = (k: string) => ({ id: k, 'aria-invalid': !!errors[k], 'aria-describedby': errors[k] ? `${k}-err` : undefined })

  const review = (e: FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = { ...validate(input, Date.now()) }
    if (!checks.every(Boolean)) errs.checklist = 'Confirm every item before publishing. If one isn’t true, this food shouldn’t be listed.'
    setErrors(errs)
    if (Object.values(errs).some(Boolean)) {
      document.getElementById(Object.keys(errs).find(k => errs[k])!)?.focus()
      return
    }
    setPreview(true)
    window.scrollTo(0, 0)
  }

  const publish = () => {
    try {
      if (existing) {
        store.act(existing.id, d => editDonation(d, input, donorId, Date.now()))
        toast('ok', 'Listing updated.')
        nav(`/donation/${existing.id}`)
      } else {
        const d = createDonation(input, donorId, Date.now())
        store.add(d)
        toast('ok', 'Published. Your batch is live on the rescue board.')
        nav(`/donation/${d.id}`)
      }
    } catch (err) { toast('error', (err as Error).message); setPreview(false) }
  }

  if (preview) {
    const draft = { ...createDonation(input, donorId, now, 'preview'), createdAt: existing?.createdAt ?? now }
    return (
      <div className="max-w-xl">
        <PageHead title="Check your listing" sub="This is how rescue organisations will see it on the board." />
        <div className="pointer-events-none"><Ticket d={draft} now={now} /></div>
        <div className="mt-8 flex flex-wrap gap-2">
          <button className="btn-accent" onClick={publish}>{existing ? 'Save changes' : 'Publish to board'}</button>
          <button className="btn-ghost" onClick={() => setPreview(false)}>Edit details</button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={review} noValidate className="max-w-2xl">
      <PageHead title={existing ? 'Edit listing' : 'List surplus food'} sub="Takes about a minute. Use the neighbourhood, not a street address." />
      <div className="space-y-6">
        <Field label="What food is it?" id="title" error={errors.title}>
          <input {...a11y('title')} className="field" placeholder="e.g. Veg biryani and raita" value={f.title} onChange={set('title')} />
        </Field>
        <div className="grid gap-6 sm:grid-cols-3">
          <Field label="Category" id="category">
            <select id="category" className="field" value={f.category} onChange={set('category')}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
          </Field>
          <Field label="Diet" id="diet">
            <select id="diet" className="field" value={f.diet} onChange={set('diet')}>
              <option value="veg">Vegetarian</option><option value="nonveg">Non-vegetarian</option><option value="mixed">Mixed</option>
            </select>
          </Field>
          <Field label="Portions" id="portions" error={errors.portions}>
            <input {...a11y('portions')} className="field" type="number" inputMode="numeric" min={1} placeholder="80" value={f.portions} onChange={set('portions')} />
          </Field>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          <Field label="Prepared at" id="preparedAt" error={errors.preparedAt}>
            <input {...a11y('preparedAt')} className="field" type="datetime-local" value={f.preparedAt} onChange={set('preparedAt')} />
          </Field>
          <Field label="Pickup from" id="pickupFrom">
            <input id="pickupFrom" className="field" type="datetime-local" value={f.pickupFrom} onChange={set('pickupFrom')} />
          </Field>
          <Field label="Pickup by" id="pickupBy" error={errors.pickupBy}>
            <input {...a11y('pickupBy')} className="field" type="datetime-local" value={f.pickupBy} onChange={set('pickupBy')} />
          </Field>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Pickup area" id="area" error={errors.area}>
            <select {...a11y('area')} className="field" value={f.area} onChange={set('area')}>
              <option value="">Choose an area</option>{AREAS.map(a => <option key={a}>{a}</option>)}
            </select>
          </Field>
          <Field label="Packaging (optional)" id="packaging">
            <input id="packaging" className="field" placeholder="e.g. Steel containers, lids on" value={f.packaging} onChange={set('packaging')} />
          </Field>
        </div>
        <Field label="Notes for the collector (optional)" id="notes" hint="Allergens, what to bring, gate instructions. No phone numbers.">
          <textarea id="notes" rows={3} className="field" value={f.notes} onChange={set('notes')} aria-describedby="notes-hint" />
        </Field>

        <fieldset className="rounded-2xl border border-steel-dark bg-white p-5" aria-describedby={errors.checklist ? 'checklist-err' : undefined}>
          <legend className="px-1 font-display text-lg font-bold">Before you publish</legend>
          <div className="space-y-3">
            {CHECKLIST.map((c, i) => (
              <label key={c} className="flex cursor-pointer gap-3 text-sm">
                <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-ink" id={i === 0 ? 'checklist' : undefined} checked={checks[i]}
                  onChange={e => { setChecks(checks.map((v, j) => (j === i ? e.target.checked : v))); setErrors({ ...errors, checklist: '' }) }} />
                {c}
              </label>
            ))}
          </div>
          {errors.checklist && <p id="checklist-err" className="mt-3 text-sm font-medium text-chili">{errors.checklist}</p>}
          <p className="mt-4 flex gap-2 rounded-xl bg-turmeric-soft p-3 text-xs">
            <ShieldAlert className="size-4 shrink-0" aria-hidden />
            This is your own declaration, not a safety certification. You and the receiving organisation remain responsible for following FSSAI rules.
          </p>
        </fieldset>

        <div className="flex flex-wrap gap-2">
          <button className="btn-accent">Preview listing</button>
          <Link to={existing ? `/donation/${existing.id}` : '/donor'} className="btn-ghost">Discard</Link>
        </div>
      </div>
    </form>
  )
}
