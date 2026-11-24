import { Link } from 'react-router-dom'
import { partyName, useNow, useStore } from '../store'
import { Empty, PageHead, RoleGate, Ticket } from '../ui'
import { RoleActions } from './Detail'
import { Group } from './Donor'

export default function VolunteerHome() {
  const { donations, identity } = useStore()
  const now = useNow()
  return (
    <RoleGate role="volunteer">
      {id => {
        const byDeadline = [...donations].sort((a, b) => a.pickupBy - b.pickupBy)
        const mine = byDeadline.filter(d => d.volunteerId === id && ['claimed', 'pickup_confirmed', 'handed_over'].includes(d.status))
        const open = byDeadline.filter(d => d.status === 'claimed' && !d.volunteerId)
        const done = byDeadline.filter(d => d.volunteerId === id && d.status === 'completed').reverse()
        const hint = (s: string, org?: string) =>
          s === 'claimed' ? 'Collect from the donor, then confirm.' : s === 'pickup_confirmed' ? `Deliver to ${partyName(org)}.` : `Waiting for ${partyName(org)} to enter your code.`
        return (
          <>
            <PageHead title="Your pickups" sub="Accept a pickup, confirm collection, then show your receipt code at drop-off." />
            {mine.length > 0 && <Group title="Your active pickups" count={mine.length}>
              {mine.map(d => <Ticket key={d.id} d={d} now={now}>
                <p className="w-full text-sm text-ink-soft">{hint(d.status, d.orgId)}</p>
                <RoleActions d={d} identity={identity} now={now} />
              </Ticket>)}
            </Group>}
            <Group title="Needs a volunteer" count={open.length}>
              {open.length ? open.map(d => <Ticket key={d.id} d={d} now={now}>
                <p className="w-full text-sm text-ink-soft">Deliver to {partyName(d.orgId)}</p>
                <RoleActions d={d} identity={identity} now={now} />
              </Ticket>) : (
                <div className="sm:col-span-2 lg:col-span-3">
                  <Empty title="No pickups waiting" body="When a rescue organisation claims a batch, it appears here for a volunteer to accept."
                    action={<Link to="/board" className="btn-ghost">See the rescue board</Link>} />
                </div>
              )}
            </Group>
            {done.length > 0 && <Group title="Completed by you" count={done.length}>{done.map(d => <Ticket key={d.id} d={d} now={now} />)}</Group>}
          </>
        )
      }}
    </RoleGate>
  )
}
