# Copilot Instructions for PLC Front-End Dashboard

## Project Overview
**plc-front** is a Vue 3 + Vite real-time monitoring dashboard for PLC (Programmable Logic Controller) devices. It displays device statuses, metrics, and historical data via various chart types. The app uses **Tab-based routing** (no Vue Router) with Bootstrap 5 for styling.

## Architecture & Data Flow

### Main Tabs (App.vue)
Four main sections via tab navigation:
- **dashboard**: Real-time device cards with configurable display types
- **setting**: Device/address configuration (DeviceForm, PlcDebugForm, WorkingTimeForm)
- **demo**: Simulation mode for testing without live PLC
- **alarmhistory**: Historical alarm/event logs

### Data Hierarchy
```
App (top-level state) → devices[] (API response)
├─ Device {id, name, device_type, addresses[]}
│  └─ Address {id, label, plc_address, data_type, last_value, ...}
│     ├─ numberConfig {scale, offset, unit, min, max}
│     ├─ levels[] (for level/status display)
│     └─ alarms[] (threshold alerts)
```

### Key Data Patterns
- **devices_raw**: Raw address list for add-card modal filtering
- **dashboardCards**: User-created dashboard selections (separate from all addresses)
- **Polling**: Top-level `startPolling()` in App.vue fetches device data at intervals
- **Simulation mode**: Disables polling, uses demo data instead

## Component Organization

| Component | Purpose | Parent |
|-----------|---------|--------|
| [Dashboard.vue](src/views/Dashboard.vue) | Renders address cards with display logic | DashboardPage |
| [Chart.vue](src/views/Chart.vue) | Time-series visualization modal | Dashboard |
| [AddDashboardCard.vue](src/views/AddDashboardCard.vue) | Device/address selector modal | DashboardPage |
| [NumberChart.vue](src/components/chart/NumberChart.vue) | Line chart with min/max/avg overlays | Chart |
| [OnOffChart.vue](src/components/chart/OnOffChart.vue) | Timeline for ON/OFF events | Chart |
| [NumberGaugeChart.vue](src/components/chart/NumberGaugeChart.vue) | Radial gauge with history | Chart |
| [LevelChart.vue](src/components/chart/LevelChart.vue) | Status level indicators | Chart |
| [DeviceForm.vue](src/components/setting/DeviceForm.vue) | Device + address configuration | Setting |
| [DisplayNumber.vue](src/components/setting/DisplayNumber.vue) | Scale/offset settings for numbers | DeviceForm |
| [DisplayLevel.vue](src/components/setting/DisplayLevel.vue) | Status range threshold editor | DeviceForm |

## Display Type System
Each address has a `data_type` that determines rendering:
- **onoff**: Circle indicator + "ON"/"OFF" text (bool)
- **number**: Large text value + optional unit (scalar)
- **number_gauge**: Radial gauge + value (scalar with min/max)
- **level**: Status bar with color ranges (see DisplayLevel)

Reference: [Dashboard.vue render logic](src/views/Dashboard.vue#L30-L60)

## API Integration
- **Base URL**: `import.meta.env.VITE_API_BASE_URL` (from .env)
- **HTTP Client**: Axios (imported but no global interceptor visible)
- **Endpoints** (inferred from code):
  - `GET /api/devices` → fetch all devices + addresses
  - `POST /api/devices` → create device
  - `DELETE /api/dashboard/cards/{id}` → remove card from dashboard
  - `GET /api/charts/{addressId}?from=...&to=...` → historical data

## Key Utilities

### [swalHelper.js](src/utils/swalHelper.js)
```javascript
showAlert(title, text, icon='success') // SweetAlert2 wrapper
// Auto-closes success alerts in 1.8s, errors in 3s
```
Use for user feedback instead of raw `alert()`.

## Development Workflow

### Commands
```bash
npm run dev      # Vite dev server (http://localhost:5173)
npm run build    # Production build → dist/
npm run preview  # Preview built app locally
```

### Import Paths
- No path aliases configured; use relative imports
- Components: `../components/...`
- Views: `./FileName.vue` (sibling) or `../views/FileName.vue`

### Environment Setup
- Create `.env` with `VITE_API_BASE_URL=http://your-api:port`
- Vite automatically injects via `import.meta.env`

## Code Patterns & Conventions

### Event Flow (Props Down, Events Up)
```javascript
// Parent updates prop
<ChildComponent :data="items" @update="handleUpdate" />

// Child emits event
this.$emit('update', newValue)
```

### Modal Pattern
Use boolean `show` state + `@close` event:
```vue
<AddDashboardCard v-if="showAdd" :data="props" @close="showAdd = false" @add="onAdd" />
```

### Computed Properties for Filtering
Dashboard uses computed to derive filtered addresses based on selected device:
```javascript
filteredAddresses() {
  return this.selectedDevice?.addresses || [];
}
```

### Bootstrap 5 Classes
- Grid: `row row-cols-{1|md-2|lg-3} g-4`
- Cards: `card shadow-sm p-4`
- Buttons: `btn btn-primary btn-sm btn-outline-secondary`
- Utilities: `text-center fw-bold text-muted mb-3`

### Comments in Thai
Codebase uses Thai language for comments/labels. Maintain bilingual code if extending.

## Common Tasks

### Adding a New Display Type
1. Update `DisplayLevel.vue` or create `components/setting/Display{Type}.vue`
2. Add case in [Dashboard.vue render logic](src/views/Dashboard.vue#L25-L65)
3. Create chart component if time-series needed: `components/chart/{Type}Chart.vue`
4. Update [AddDashboardCard.vue](src/views/AddDashboardCard.vue#L140-L160) displayType switch

### Adding a New Tab
1. Create view in `views/{TabName}.vue`
2. Import + add to components in [App.vue](src/App.vue#L60-L65)
3. Add tab button in template (line 7)
4. Emit events with `@` and handle in App methods

### Fetching Data
- Use `const BASE_API = import.meta.env.VITE_API_BASE_URL`
- Call `fetch()` or axios with `${BASE_API}/api/endpoint`
- Catch errors with `showAlert('Error', errorMsg, 'error')`

## Testing & Debugging
- **Demo Tab**: Toggle simulation mode without live PLC connection
- **Browser DevTools**: Check Network tab for API calls; verify `.env` base URL
- **Vite HMR**: Changes auto-reload; check browser console for import errors

## Performance Notes
- Polling interval can be tuned in `App.vue` startPolling()
- Large chart data: consider pagination or time-range filtering
- Gauge rendering: canvas element IDs must be unique (use address_id)
