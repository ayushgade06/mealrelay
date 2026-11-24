# Milestone checklist

| Milestone | Status | Evidence |
| --- | --- | --- |
| M0 Setup, scope, fictional data | DONE | Repo scaffolded. Scope and limitations are in the README. All demo parties are fictional and labelled "Demo, not verified". No env vars needed. |
| M1 UX and visual system | DONE | Tokens in `src/index.css`. Shared components in `src/ui.tsx`. |
| M2 Foundation and data model | DONE | `src/store.ts`: state machine, validation, localStorage with cross-tab sync, seed data and reset. 5 Vitest tests pass. |
| M3 Landing and role entry | DONE | `/` and `/start`. |
| M4 Donor create/manage | DONE | Validated form, checklist, preview, edit and cancel. Verified in the browser. |
| M5 Board, filter, claim | DONE | Filters and sort, confirm dialog, double-claim guard. Verified in the browser and by unit tests. |
| M6 Volunteer and verified handoff | DONE | Accept → collect → code/QR → hand over → org verifies. Wrong code rejected. Verified in the browser. |
| M7 Impact | DONE | Completed-only metrics, estimate labelled. Updates after a rescue (verified). |
| M8 Responsive QA, a11y | DONE (automated) | No horizontal overflow on 8 routes at 320/375/390/430/768 px. Labels, focus rings, skip link, reduced motion, native dialog. Still to do: a manual pass on a real phone after deployment. |
| M9 Deploy and submit | IN PROGRESS | Repo is public: https://github.com/ayushgade06/mealrelay. Live: https://buildurwebsite.vercel.app (returns 200 without login). Left: Devpost form, filled in by the owner. |
