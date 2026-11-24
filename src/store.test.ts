import { describe, expect, it } from 'vitest'
import {
  acceptTask, cancel, claim, confirmPickup, createDonation, editDonation, impact, isExpired,
  markHandedOver, seed, validate, verifyHandoff, type DonationInput,
} from './store'

const NOW = 1_800_000_000_000
const H = 3_600_000
const input: DonationInput = {
  title: 'Veg biryani', category: 'Cooked meals', diet: 'veg', portions: 80, area: 'Baner',
  packaging: 'Trays', notes: '', preparedAt: NOW - H, pickupFrom: NOW, pickupBy: NOW + 2 * H,
}

describe('rescue workflow', () => {
  it('runs the full chain and only then counts impact', () => {
    let d = createDonation(input, 'd1', NOW, 'x')
    expect(impact([d]).portions).toBe(0)
    d = claim(d, 'o1', NOW)
    d = acceptTask(d, 'v1', NOW)
    d = confirmPickup(d, 'v1', NOW, '1234')
    d = markHandedOver(d, 'v1', NOW)
    expect(impact([d]).rescues).toBe(0)
    expect(() => verifyHandoff(d, 'o1', '9999', NOW)).toThrow(/doesn’t match/)
    expect(() => verifyHandoff(d, 'o2', '1234', NOW)).toThrow(/Only the organisation/)
    d = verifyHandoff(d, 'o1', '1234', NOW)
    expect(d.status).toBe('completed')
    expect(d.events).toHaveLength(6)
    expect(impact([d])).toMatchObject({ rescues: 1, portions: 80, donors: 1 })
  })

  it('prevents double claims, expired claims and skipped steps', () => {
    const d = createDonation(input, 'd1', NOW)
    const claimed = claim(d, 'o1', NOW)
    expect(() => claim(claimed, 'o2', NOW)).toThrow(/claimed this batch first/)
    expect(() => claim(d, 'o1', NOW + 3 * H)).toThrow(/window/)
    expect(isExpired(d, NOW + 3 * H)).toBe(true)
    expect(() => confirmPickup(claimed, 'v1', NOW)).toThrow(/assigned volunteer/)
    expect(() => markHandedOver(claimed, 'v1', NOW)).toThrow()
    expect(() => acceptTask(acceptTask(claimed, 'v1', NOW), 'v2', NOW)).toThrow(/already accepted/)
  })

  it('lets only the owning donor edit or cancel an unclaimed listing', () => {
    const d = createDonation(input, 'd1', NOW)
    expect(() => cancel(d, 'd2', NOW)).toThrow()
    expect(cancel(d, 'd1', NOW).status).toBe('cancelled')
    expect(editDonation(d, { ...input, portions: 90 }, 'd1', NOW).portions).toBe(90)
    expect(() => editDonation(claim(d, 'o1', NOW), input, 'd1', NOW)).toThrow()
    expect(() => cancel(claim(d, 'o1', NOW), 'd1', NOW)).toThrow()
  })

  it('validates the donation form', () => {
    expect(validate(input, NOW)).toEqual({})
    const e = validate({ ...input, title: 'a', portions: 0, pickupBy: NOW - 1, area: '' }, NOW)
    expect(Object.keys(e).sort()).toEqual(['area', 'pickupBy', 'portions', 'title'])
  })

  it('seeds a consistent demo with completed-only impact', () => {
    const s = seed(NOW)
    const done = s.donations.filter(d => d.status === 'completed')
    expect(impact(s.donations).portions).toBe(done.reduce((a, d) => a + d.portions, 0))
    expect(s.donations.some(d => isExpired(d, NOW))).toBe(true)
  })
})
