import { Link } from 'react-router-dom'
import { partyName, useNow, useStore } from '../store'
import { Empty, PageHead, RoleGate, Ticket } from '../ui'
import { RoleActions } from './Detail'
import { Group } from './Donor'

export default function OrgHome() {
  const { donations, identity } = useStore()
  const now = useNow()
  return (
    <RoleGate role="org">
      {id => {
        const mine = donations.filter(d => d.orgId === id).sort((a, b) => a.pickupBy - b.pickupBy)
        const verify = mine.filter(d => d.status === 'handed_over')
        const moving = mine.filter(d => d.status === 'claimed' || d.status === 'pickup_confirmed')
        const done = mine.filter(d => d.status === 'completed').reverse()
        return (
          <>
            <PageHead title={partyName(id)} sub="Batches you’ve claimed, from pickup to verified handoff."
              action={<Link to="/board" className="btn-accent">Find food to claim</Link>} />
            {mine.length === 0 && (
              <Empty title="You haven’t claimed anything yet" body="Open the rescue board to find batches closing soon near you."
                action={<Link to="/board" className="btn-primary">Open the rescue board</Link>} />
            )}
            {verify.length > 0 && <Group title="Arrived, verify the code" count={verify.length}>
              {verify.map(d => <Ticket key={d.id} d={d} now={now}><RoleActions d={d} identity={identity} now={now} /></Ticket>)}
            </Group>}
            {moving.length > 0 && <Group title="On the way" count={moving.length}>
              {moving.map(d => <Ticket key={d.id} d={d} now={now}>
                <p className="text-sm text-ink-soft">{d.volunteerId ? `${partyName(d.volunteerId)} is ${d.status === 'claimed' ? 'heading to pickup' : 'bringing it to you'}.` : 'Waiting for a volunteer to accept.'}</p>
              </Ticket>)}
            </Group>}
            {done.length > 0 && <Group title="Completed" count={done.length}>{done.map(d => <Ticket key={d.id} d={d} now={now} />)}</Group>}
          </>
        )
      }}
    </RoleGate>
  )
}
