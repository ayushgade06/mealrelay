import { useEffect, useState } from 'react'
import { HashRouter, Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { RotateCcw, UserRound } from 'lucide-react'
import { partyName, store, useStore } from './store'
import { ROLE_HOME, ROLE_LABEL, ToastProvider, useToast } from './ui'
import Landing from './pages/Landing'
import Start from './pages/Start'
import Board from './pages/Board'
import Detail from './pages/Detail'
import { DonorHome, DonationForm } from './pages/Donor'
import OrgHome from './pages/Org'
import VolunteerHome from './pages/Volunteer'
import ImpactPage from './pages/Impact'

const HOME_LABEL = { donor: 'My listings', org: 'My rescues', volunteer: 'My pickups' } as const

function ResetButton() {
  const [armed, setArmed] = useState(false)
  const toast = useToast()
  useEffect(() => { if (armed) { const t = setTimeout(() => setArmed(false), 4000); return () => clearTimeout(t) } }, [armed])
  return (
    <button
      className={`btn px-3 py-1.5 text-xs ${armed ? 'bg-chili text-white' : 'text-ink-soft hover:bg-steel'}`}
      onClick={() => {
        if (!armed) return setArmed(true)
        store.reset(); setArmed(false); toast('ok', 'Demo reset. Fresh batches are on the board.')
      }}
    >
      <RotateCcw className="size-3.5" aria-hidden />{armed ? 'Click again to reset' : 'Reset demo'}
    </button>
  )
}

function Header() {
  const { identity } = useStore()
  const link = ({ isActive }: { isActive: boolean }) =>
    `rounded-full px-3 py-1.5 text-sm font-semibold whitespace-nowrap ${isActive ? 'bg-ink text-paper' : 'text-ink hover:bg-steel'}`
  return (
    <header className="sticky top-0 z-40 border-b border-steel bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-extrabold">
          <img src="/favicon.svg" alt="" className="size-7" />MealRelay
        </Link>
        <nav aria-label="Main" className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
          <NavLink to="/board" className={link}>Rescue board</NavLink>
          {identity && <NavLink to={ROLE_HOME[identity.role]} className={link}>{HOME_LABEL[identity.role]}</NavLink>}
          <NavLink to="/impact" className={link}>Impact</NavLink>
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <ResetButton />
          <Link to="/start" className="btn-ghost max-w-[11rem] px-3 py-1.5 text-xs sm:max-w-none" title="Switch demo role">
            <UserRound className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{identity ? `${partyName(identity.id)} (${ROLE_LABEL[identity.role]})` : 'Choose a role'}</span>
          </Link>
        </div>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="mt-24 border-t border-steel">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm text-ink-soft sm:grid-cols-2 sm:px-6">
        <p>
          MealRelay is a hackathon prototype. Every donor, organisation, volunteer, batch and number here is fictional demo data.
          It is not a food-safety certification and has no affiliation with FSSAI or any real organisation.
        </p>
        <p>
          Donors and receiving organisations stay responsible for following applicable food-safety rules, including FSSAI’s
          surplus-food regulations. Data is stored only in this browser and syncs between tabs on this device.
        </p>
      </div>
    </footer>
  )
}

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

export default function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <ScrollTop />
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-3 focus:py-2 focus:text-paper"
          onClick={e => { e.preventDefault(); document.getElementById('main')?.focus() }}>
          Skip to content
        </a>
        <Header />
        <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-4 pt-8 outline-none sm:px-6 sm:pt-12">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/start" element={<Start />} />
            <Route path="/board" element={<Board />} />
            <Route path="/donation/:id" element={<Detail />} />
            <Route path="/donor" element={<DonorHome />} />
            <Route path="/donor/new" element={<DonationForm />} />
            <Route path="/donor/edit/:id" element={<DonationForm />} />
            <Route path="/org" element={<OrgHome />} />
            <Route path="/volunteer" element={<VolunteerHome />} />
            <Route path="/impact" element={<ImpactPage />} />
            <Route path="*" element={
              <div className="py-20 text-center">
                <h1 className="text-3xl font-extrabold">This page doesn’t exist</h1>
                <Link to="/board" className="btn-primary mt-6">Go to the rescue board</Link>
              </div>
            } />
          </Routes>
        </main>
        <Footer />
      </ToastProvider>
    </HashRouter>
  )
}
