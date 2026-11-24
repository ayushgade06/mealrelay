# MealRelay

**Rescue food before the clock runs out.**

MealRelay is a working prototype of a surplus-food rescue and handoff platform. Donors list surplus food with a pickup deadline. Rescue organisations claim batches from a board sorted by urgency. Volunteers collect the food, and a 4-digit receipt code (with a QR) verifies the handoff. Only verified handoffs count on the impact ledger.

Built for the ROXTEN STUDIOS *Build Your Own Website* hackathon (November 2026).

> **Prototype notice:** every donor, organisation, volunteer, batch and number in this app is **fictional demo data**. MealRelay is not a food-safety certification and has no affiliation with FSSAI, the Indian Food Sharing Alliance or any real organisation.

## The problem

Surplus edible food and food insecurity exist side by side. Rescuing that food depends on fast coordination between donors, recovery organisations and volunteers, and today it often happens in forwarded chat messages: nobody knows who has claimed a batch, when the window closes, or whether the food actually arrived. MealRelay turns that into one shared, time-aware status for every batch.

## Key features

- **Time-aware rescue board.** Each batch is a "ticket" with a pickup-window bar that drains in real time and turns red in the final hour. Filter by category, area and deadline, search, and sort by closing time or newest.
- **Explicit rescue states.** Available → Claimed → Picked up → Handed over → Completed. Invalid transitions are rejected by the domain layer (`src/store.ts`).
- **Conflict-safe claiming.** A claim re-reads the latest saved state before it's written, so two organisations, even in two browser tabs, can't claim the same batch.
- **Donor self-declaration.** A 5-item checklist is required before publishing. It is clearly labelled as a declaration, not a safety check.
- **Preview before publish**, plus edit and cancel while a batch is still unclaimed.
- **Verified handoff.** At pickup the volunteer receives a 4-digit receipt code and QR. The receiving organisation enters the code to close the rescue; wrong codes are rejected.
- **Chain of custody timeline** for every batch: who did what, and when.
- **Impact ledger** calculated from completed records only. The meals figure is labelled as an estimate (assumption: 1 portion ≈ 1 meal).
- **No sign-up.** Pick a demo role and identity. Open a second tab as another role and updates arrive live.
- **One-click demo reset** that reseeds fresh batches with deadlines relative to the current time.

## Demo in two minutes

1. Open the site → **Try the live demo** → *Rescue organisation* → *Annapurna Community Kitchen*.
2. **Rescue board** → on *Veg biryani and raita* (80 portions) → **Claim batch** → confirm.
3. Click the profile chip at the top right → *Volunteer* → *Riya S.* → **Accept pickup** → **Confirm collected**. Note the receipt code.
4. **Mark handed over**.
5. Switch back to *Annapurna Community Kitchen* → **My rescues** → enter the code → **Verify handoff**.
6. Open **Impact**: the ledger now includes the rescue. Try a wrong code, or claim the same batch as *Sahyadri Food Bank*, to see the guards.

Use **Reset demo** in the header to start over.

## Tech stack

| Part | Choice |
| --- | --- |
| UI | React 19, TypeScript, Vite |
| Styling | Tailwind CSS v4 (custom tokens in `src/index.css`) |
| Routing | React Router (hash routing, so any static host works) |
| Icons | Lucide |
| QR | qrcode.react |
| Tests | Vitest |
| Fonts | Bricolage Grotesque and Figtree (Google Fonts) |

### Architecture

```
src/
  store.ts        domain types, state machine, validation, impact math, seed data, localStorage store
  store.test.ts   tests for the workflow, guards, validation and impact
  ui.tsx          shared components: rescue ticket, countdown, progress, timeline, dialogs, toasts
  App.tsx         layout, navigation, routes
  pages/          Landing, Start (role picker), Board, Detail, Donor, Org, Volunteer, Impact
```

All business rules live in pure functions in `store.ts` (`claim`, `acceptTask`, `confirmPickup`, `markHandedOver`, `verifyHandoff`, `cancel`, `editDonation`). Each one throws a user-facing error on an invalid transition. The UI only calls these functions.

**Data model:** a `Donation` holds the food details, pickup window, area, donor/organisation/volunteer IDs, status, receipt code and an append-only `events` timeline. Demo parties are constants.

## Run locally

Requires Node 22+.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests
npm run build    # typecheck + production build into dist/
```

No environment variables or API keys are needed.

## Deploy

`dist/` is a static site. On Vercel: import the repo, framework preset *Vite*, build command `npm run build`, output `dist`. Netlify and GitHub Pages work the same way, because routing uses URL hashes.

## Limitations (honest list)

- **Data lives in your browser** (localStorage) and syncs between tabs on the same device only. It is not shared between different people or devices. A real deployment needs a shared database (for example Postgres) with server-side transition checks.
- **No real identity or organisation verification.** Roles are demo identities.
- The QR encodes a link that opens the batch with the code pre-filled. Because the data is per-browser, scanning it on another device won't find the batch.
- No maps, GPS, notifications or routing. Areas are neighbourhood-level only, by design, to avoid exposing private addresses.
- The checklist is not a food-safety assessment and does not replace FSSAI requirements.

## Research and references

- FSSAI, Indian Food Sharing Alliance (IFSA): https://sharefood.eatrightindia.gov.in/what_ifsa.html
- FSSAI, Recovery and Distribution of Surplus Foods Regulations, 2019 (press release): https://fssai.gov.in/upload/uploadfiles/files/Press_Release_Gazette_Notification_Surplus_Food_06_08_2019.pdf
- WRI India, Dialogue on collaborative actions to reduce food waste in Pune city: https://wri-india.org/sites/default/files/2026-01/Dialogue%20on%20collaborative%20actions%20to%20reduce%20food%20waste%20in%20pune%20city.pdf

Demo locations are Pune neighbourhoods because Pune has documented food-recovery collaboration (see the WRI India link). No real organisation in Pune is represented.

## Disclosures

- **AI tools:** this project was planned and built with the help of Claude (Anthropic) via Claude Code, which was used for code generation, design and testing. I reviewed the code and can explain it.
- **Libraries:** React, React Router, Tailwind CSS, Lucide icons, qrcode.react, Vite, Vitest (all open source; see `package.json`).
- **Template:** project scaffolded with `npm create vite` (react-ts template). No UI template or theme was used.
- **Assets:** Google Fonts (Bricolage Grotesque, Figtree; SIL Open Font License). The logo/favicon is an original SVG. No stock images.
