# Copilot Instructions for PLC Front-End Dashboard

## Project Overview
**plc-front** is a monorepo for a PLC / SCADA monitoring system:
- **Frontend (root)**: Vue 3 (Options API) + Vite, Bootstrap 5, SweetAlert2, Chart.js / ApexCharts / canvas-gauges, vue-i18n (TH/EN)
- **Backend (`backend/`)**: Express 5 + Sequelize + PostgreSQL (CommonJS), port 3001

There is **no Vue Router** — [App.vue](../src/App.vue) switches tabs with a `tab` data field.

## Running
```bash
npm install          # installs root + backend (postinstall)
npm run dev:setup    # first time: checks backend/.env.development + PostgreSQL, runs migrations
npm run seed:dev     # first time on an empty DB
npm run dev          # backend (3001) + Vite (5173); Vite starts after the backend port is open
npm run dev:web      # frontend only
npm run dev:api      # backend only
npm test             # Vitest unit tests (src/__tests__)
npm run test:e2e     # Playwright (e2e/, API is mocked with page.route)
```
Node >= 20.19 (see `.nvmrc`). Use **npm** only (no pnpm lock files).

## Tabs (App.vue)
| Tab key | View | Purpose |
|---|---|---|
| dashboard | [DashboardLayout.vue](../src/views/DashboardLayout.vue) → [DashboardCards.vue](../src/views/DashboardCards.vue) | Real-time cards, chart modal ([Chart.vue](../src/views/Chart.vue)) |
| oee | [Oee.vue](../src/views/Oee.vue) | OEE snapshot, trend, hourly |
| alarmhistory | [AlarmHistory.vue](../src/views/AlarmHistory.vue) | TRIGGER / RECOVERY events, downtime |
| interaction | [Interaction.vue](../src/views/Interaction.vue) | Elements placed on a machine image, PLC write |
| demo | [Demo.vue](../src/views/Demo.vue) | Simulation without a live PLC |
| setting | [Setting.vue](../src/views/Setting.vue) | Type / Room / Product / Device / Employee / Working time / PLC debug |

Visible tabs: `super_admin` sees all; other roles use `permissions[tab] === true` from `localStorage`.

## Auth
- Login stores `token`, `user`, `permissions` in `localStorage`, then reloads the page.
- App polls `GET /api/dashboard/cards` every 2 s **only when logged in**; a `401` logs the user out.

## API calls
Always import from [src/utils/api.js](../src/utils/api.js) — do not redefine per file:
```javascript
import { BASE_API, authH } from '../utils/api';
const res = await fetch(`${BASE_API}/api/rooms`, { headers: authH() });
```
- `BASE_API` is empty in dev → requests go to `/api` and Vite proxies them to `http://localhost:3001` (override with `API_PROXY_TARGET`).
- In production `VITE_API_BASE_URL` (`.env.production`) is the full backend URL.
- `authH()` returns `{}` when there is no token (never `Bearer null`).
- Full list of endpoints used by the frontend: [api_endpoints.csv](../api_endpoints.csv).

## Data model
```
Device {id, name, device_type, room, addresses[]}
└─ Address {id, label, plc_address, data_type, last_value}
   ├─ number_config {scale, offset, decimal_places, unit, min_value, max_value}
   ├─ level_config[]   (data_type = level)
   └─ alarms[]
```
`data_type`: `onoff` | `number` | `number_gauge` | `level`.

## Conventions
- User feedback: `showAlert` / `showConfirm` from [swalHelper.js](../src/utils/swalHelper.js) (plain text, not HTML).
- Text through `locale.t('...')` (injected `locale`); add keys to both `src/locales/th.json` and `en.json`.
- Comments are mostly Thai — keep that style.
- Relative imports only (no path aliases).

## Tests
- One test file per component under `src/__tests__/` mirroring `src/`.
- E2E specs import `test` from `e2e/fixtures.js`, which serves the CDN files locally so runs do not depend on the network.
- Bug-case tests are named `[BUG-x]`; fix the component, and only change a test when its expectation is wrong (explain why in the test comment).
