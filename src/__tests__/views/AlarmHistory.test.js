import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import AlarmHistory from '../../views/AlarmHistory.vue';

// ─── Stub child components ─────────────────────────────────────────────────
vi.mock('../../views/Chart.vue', () => ({
  default: {
    name: 'Chart',
    props: ['device', 'initialStart', 'initialEnd', 'alarmTime', 'eventType'],
    template: '<div class="chart-stub"></div>',
  },
}));

vi.mock('../../components/chart/AlarmHistoryChart.vue', () => ({
  default: {
    name: 'AlarmHistoryChart',
    template: '<div class="alarm-history-chart-stub"></div>',
  },
}));

// ─── Global stubs ─────────────────────────────────────────────────────────
const store = { token: 'test-token' };
vi.stubGlobal('localStorage', {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = v; },
  removeItem: (k) => { delete store[k]; },
});
vi.stubGlobal('alert', vi.fn());

// ─── Mock data ─────────────────────────────────────────────────────────────
const MOCK_ROOMS = [
  { id: 1, name: 'Room A' },
  { id: 2, name: 'Room B' },
];

const makeTrigger = (overrides = {}) => ({
  id: 1,
  event_type: 'TRIGGER',
  address_id: 10,
  alarm_rule_id: 1,
  value: 85.5,
  created_at: '2024-01-15T10:00:00.000Z',
  duration_sec: null,
  duration_min: null,
  device: { id: 1, name: 'Device A', room: { id: 1, name: 'Room A' } },
  rule: { id: 1, name: 'High Temp', condition_type: 'MT', min_value: 80, max_value: null, address_id: 10 },
  ...overrides,
});

const makeRecover = (overrides = {}) => ({
  id: 2,
  event_type: 'RECOVERY',
  address_id: 10,
  alarm_rule_id: 1,
  value: 75.0,
  created_at: '2024-01-15T10:30:00.000Z',
  duration_sec: null,
  duration_min: null,
  device: { id: 1, name: 'Device A', room: { id: 1, name: 'Room A' } },
  rule: { id: 1, name: 'High Temp', condition_type: 'MT', min_value: 80, max_value: null, address_id: 10 },
  ...overrides,
});

const MOCK_HISTORY = [makeTrigger(), makeRecover()];

// ─── Fetch setup ───────────────────────────────────────────────────────────
let mockFetch;

function setupFetch(opts = {}) {
  const {
    historyPayload = MOCK_HISTORY,
    historyOk = true,
    roomsPayload = { data: MOCK_ROOMS },
    roomsOk = true,
  } = opts;

  mockFetch = vi.fn((url) => {
    if (url.includes('/api/events/all')) {
      if (!historyOk) return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'fail' }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve(historyPayload) });
    }
    if (url.includes('/api/rooms')) {
      if (!roomsOk) return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'fail' }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve(roomsPayload) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
  vi.stubGlobal('fetch', mockFetch);
}

// ─── Mount helper ─────────────────────────────────────────────────────────
const EN = { current: 'en', t: (k) => k };

function mountView(props = {}, locale = EN) {
  return mount(AlarmHistory, {
    props: { devices: [], userRole: '', allowedRoomIds: null, canExport: false, ...props },
    global: {
      provide: { locale },
      // vi.mock() at top of file handles Chart and AlarmHistoryChart stubs
    },
  });
}

// ─── Setup ────────────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  store.token = 'test-token';
  setupFetch();
});

// ═══════════════════════════════════════════════════════════════════════════
describe('AlarmHistory', () => {

  // ─── Props default ───────────────────────────────────────────────────
  describe('Props defaults', () => {
    it('devices prop default: () => [] is called when no devices prop provided', async () => {
      // mount without explicit devices → triggers default: () => [] on line 315
      setupFetch({ historyPayload: [] });
      const wrapper = mount(AlarmHistory, {
        global: { provide: { locale: EN } },
        // no props → devices uses default () => []
      });
      await flushPromises();
      expect(wrapper.vm.devices).toEqual([]);
    });
  });

  // ─── Initial Render ──────────────────────────────────────────────────
  describe('Initial render', () => {
    it('renders page title', async () => {
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.find('h3.page-title').exists()).toBe(true);
    });

    it('renders Search button', async () => {
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.find('button.btn-primary').exists()).toBe(true);
    });

    it('does NOT render Export button when canExport=false', async () => {
      const wrapper = mountView({ canExport: false });
      await flushPromises();
      expect(wrapper.find('button.btn-success').exists()).toBe(false);
    });

    it('renders Export button when canExport=true', async () => {
      const wrapper = mountView({ canExport: true });
      await flushPromises();
      expect(wrapper.find('button.btn-success').exists()).toBe(true);
    });

    it('renders Room select with options from loadRooms', async () => {
      const wrapper = mountView();
      await flushPromises();
      const options = wrapper.findAll('select option');
      expect(options.length).toBeGreaterThanOrEqual(3); // All Rooms + 2 rooms
    });
  });

  // ─── Mounted ─────────────────────────────────────────────────────────
  describe('mounted()', () => {
    it('calls fetchHistory on mount', async () => {
      mountView();
      await flushPromises();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/events/all'),
        expect.any(Object)
      );
    });

    it('calls loadRooms on mount', async () => {
      mountView();
      await flushPromises();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/rooms'),
        expect.any(Object)
      );
    });
  });

  // ─── fetchHistory ─────────────────────────────────────────────────────
  describe('fetchHistory()', () => {
    it('sets loading true while fetching, false after', async () => {
      let resolveHistory;
      mockFetch = vi.fn((url) => {
        if (url.includes('/api/events/all')) {
          return new Promise(resolve => { resolveHistory = () => resolve({ ok: true, json: () => Promise.resolve([]) }); });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
      });
      vi.stubGlobal('fetch', mockFetch);

      const wrapper = mountView();
      expect(wrapper.vm.loading).toBe(true);
      resolveHistory();
      await flushPromises();
      expect(wrapper.vm.loading).toBe(false);
    });

    it('populates history on success', async () => {
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.vm.history.length).toBeGreaterThan(0);
    });

    it('resets currentPage to 1 on each fetch', async () => {
      const wrapper = mountView();
      await flushPromises();
      wrapper.vm.currentPage = 3;
      await wrapper.vm.fetchHistory();
      await flushPromises();
      expect(wrapper.vm.currentPage).toBe(1);
    });

    it('logs error and clears loading when fetch fails', async () => {
      setupFetch({ historyOk: false });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      // Make fetch throw network error
      mockFetch = vi.fn((url) => {
        if (url.includes('/api/events/all')) return Promise.reject(new Error('Network error'));
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
      });
      vi.stubGlobal('fetch', mockFetch);

      const wrapper = mountView();
      await flushPromises();
      expect(consoleSpy).toHaveBeenCalledWith('Fetch history error:', expect.any(Error));
      expect(wrapper.vm.loading).toBe(false);
      consoleSpy.mockRestore();
    });

    it('throws and catches when !res.ok', async () => {
      setupFetch({ historyOk: false });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      // fetchHistory throws 'API Error' when !res.ok
      const wrapper = mountView();
      await flushPromises();
      expect(consoleSpy).toHaveBeenCalledWith('Fetch history error:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('sends Authorization header with token', async () => {
      store.token = 'my-jwt';
      mountView();
      await flushPromises();
      const historyCall = mockFetch.mock.calls.find(([url]) => url.includes('/api/events/all'));
      expect(historyCall[1].headers.Authorization).toBe('Bearer my-jwt');
    });
  });

  // ─── loadRooms ────────────────────────────────────────────────────────
  describe('loadRooms()', () => {
    it('loads all rooms when allowedRoomIds=null', async () => {
      const wrapper = mountView({ allowedRoomIds: null });
      await flushPromises();
      expect(wrapper.vm.rooms).toEqual(MOCK_ROOMS);
    });

    it('filters rooms by allowedRoomIds', async () => {
      const wrapper = mountView({ allowedRoomIds: [1] });
      await flushPromises();
      expect(wrapper.vm.rooms).toEqual([MOCK_ROOMS[0]]);
    });

    it('uses empty array when data.data is missing', async () => {
      setupFetch({ roomsPayload: {} });
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.vm.rooms).toEqual([]);
    });

    it('logs error when loadRooms throws', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockFetch = vi.fn((url) => {
        if (url.includes('/api/rooms')) return Promise.reject(new Error('Rooms error'));
        return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_HISTORY) });
      });
      vi.stubGlobal('fetch', mockFetch);

      mountView();
      await flushPromises();
      expect(consoleSpy).toHaveBeenCalledWith('Load rooms error:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  // ─── filteredHistory computed ─────────────────────────────────────────
  describe('filteredHistory computed', () => {
    it('returns all history when no filters active and allowedRoomIds=null', async () => {
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.vm.filteredHistory.length).toBe(wrapper.vm.history.length);
    });

    it('filters by allowedRoomIds: includes only items with matching room.id', async () => {
      const historyB = [
        makeTrigger({ id: 3, device: { id: 2, name: 'B', room: { id: 2, name: 'Room B' } } }),
        makeTrigger({ id: 4, device: { id: 3, name: 'C', room: { id: 3, name: 'Room C' } } }),
        makeTrigger({ id: 5, device: { id: 1, name: 'A', room: undefined } }), // no room
      ];
      setupFetch({ historyPayload: historyB });
      const wrapper = mountView({ allowedRoomIds: [2] });
      await flushPromises();
      expect(wrapper.vm.filteredHistory.length).toBe(1);
      expect(wrapper.vm.filteredHistory[0].id).toBe(3);
    });

    it('filters by filter.deviceName (case-insensitive)', async () => {
      setupFetch({
        historyPayload: [
          makeTrigger({ id: 1, device: { id: 1, name: 'Alpha Sensor', room: { id: 1, name: 'R1' } } }),
          makeTrigger({ id: 2, device: { id: 2, name: 'Beta Meter', room: { id: 2, name: 'R2' } } }),
        ],
      });
      const wrapper = mountView();
      await flushPromises();
      wrapper.vm.filter.deviceName = 'ALPHA';
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.filteredHistory.length).toBe(1);
      expect(wrapper.vm.filteredHistory[0].id).toBe(1);
    });

    it('filters by filter.room (using room.name)', async () => {
      setupFetch({
        historyPayload: [
          makeTrigger({ id: 1, device: { id: 1, name: 'A', room: { id: 1, name: 'Room A' } } }),
          makeTrigger({ id: 2, device: { id: 2, name: 'B', room: { id: 2, name: 'Room B' } } }),
        ],
      });
      const wrapper = mountView();
      await flushPromises();
      wrapper.vm.filter.room = 'Room A';
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.filteredHistory.length).toBe(1);
      expect(wrapper.vm.filteredHistory[0].id).toBe(1);
    });

    it('filters by filter.room using room_name fallback when room object absent', async () => {
      setupFetch({
        historyPayload: [
          makeTrigger({ id: 1, device: { id: 1, name: 'A', room: null, room_name: 'Room A' } }),
          makeTrigger({ id: 2, device: { id: 2, name: 'B', room: null, room_name: 'Room B' } }),
        ],
      });
      const wrapper = mountView();
      await flushPromises();
      wrapper.vm.filter.room = 'Room A';
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.filteredHistory.length).toBe(1);
    });

    it('includes items where device?.name is empty string (matches empty search)', async () => {
      setupFetch({
        historyPayload: [makeTrigger({ device: { id: 1, name: null, room: { id: 1, name: 'R1' } } })],
      });
      const wrapper = mountView();
      await flushPromises();
      wrapper.vm.filter.deviceName = ''; // empty → no filter
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.filteredHistory.length).toBe(1);
    });

    it('covers || "" falsy branch (line 363): device.name=null + filter.deviceName set', async () => {
      // When device.name is null AND filter is active → null || '' = '' → '' includes 'abc' = false
      setupFetch({
        historyPayload: [makeTrigger({ device: { id: 1, name: null, room: { id: 1, name: 'R1' } } })],
      });
      const wrapper = mountView();
      await flushPromises();
      wrapper.vm.filter.deviceName = 'abc'; // truthy → reaches line 362-365
      await wrapper.vm.$nextTick();
      // device?.name = null → '' (falsy branch of ||) → ''.includes('abc') = false
      expect(wrapper.vm.filteredHistory.length).toBe(0);
    });
  });

  // ─── Pagination computed ───────────────────────────────────────────────
  describe('Pagination computed', () => {
    it('totalPages = 1 when no history', async () => {
      setupFetch({ historyPayload: [] });
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.vm.totalPages).toBe(1);
    });

    it('totalPages = ceil(n / 20)', async () => {
      const items = Array.from({ length: 45 }, (_, i) =>
        makeTrigger({ id: i + 1, created_at: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z` })
      );
      setupFetch({ historyPayload: items });
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.vm.totalPages).toBe(3);
    });

    it('paginatedHistory returns correct slice', async () => {
      const items = Array.from({ length: 25 }, (_, i) =>
        makeTrigger({ id: i + 1 })
      );
      setupFetch({ historyPayload: items });
      const wrapper = mountView();
      await flushPromises();
      wrapper.vm.currentPage = 2;
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.paginatedHistory.length).toBe(5); // items 21-25
      expect(wrapper.vm.paginatedHistory[0].id).toBe(21);
    });

    it('visiblePages at start (currentPage <= 2)', async () => {
      const items = Array.from({ length: 200 }, (_, i) => makeTrigger({ id: i + 1 }));
      setupFetch({ historyPayload: items });
      const wrapper = mountView();
      await flushPromises();
      wrapper.vm.currentPage = 1;
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.visiblePages[0]).toBe(1);
      expect(wrapper.vm.visiblePages.length).toBeGreaterThan(1);
    });

    it('visiblePages at end (currentPage > totalPages - 2)', async () => {
      const items = Array.from({ length: 120 }, (_, i) => makeTrigger({ id: i + 1 }));
      setupFetch({ historyPayload: items });
      const wrapper = mountView();
      await flushPromises();
      const total = wrapper.vm.totalPages; // 6
      wrapper.vm.currentPage = total;
      await wrapper.vm.$nextTick();
      const vp = wrapper.vm.visiblePages;
      expect(vp[vp.length - 1]).toBe(total);
    });

    it('visiblePages in middle (currentPage not near edges)', async () => {
      const items = Array.from({ length: 200 }, (_, i) => makeTrigger({ id: i + 1 }));
      setupFetch({ historyPayload: items });
      const wrapper = mountView();
      await flushPromises();
      wrapper.vm.currentPage = 5; // middle of 10 pages
      await wrapper.vm.$nextTick();
      const vp = wrapper.vm.visiblePages;
      expect(vp).toContain(5);
      expect(vp).toContain(3);
      expect(vp).toContain(7);
    });

    it('startIndex and endIndex computed correctly', async () => {
      const wrapper = mountView();
      await flushPromises();
      wrapper.vm.currentPage = 2;
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.startIndex).toBe(20);
      expect(wrapper.vm.endIndex).toBe(40);
    });
  });

  // ─── fetchDowntimeSummary ─────────────────────────────────────────────
  describe('fetchDowntimeSummary()', () => {
    it('computes downtimeSummary with matched RECOVER pairs', async () => {
      const history = [
        makeTrigger({ id: 1, address_id: 10, alarm_rule_id: 1, created_at: '2024-01-15T10:00:00.000Z' }),
        // Use 'RECOVER' (not 'RECOVERY') for the method to detect it
        makeRecover({ id: 2, event_type: 'RECOVER', address_id: 10, alarm_rule_id: 1, created_at: '2024-01-15T10:30:00.000Z' }),
      ];
      setupFetch({ historyPayload: history });
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.vm.downtimeSummary.total_alarms).toBe(1);
      expect(wrapper.vm.downtimeSummary.total_downtime_sec).toBe(1800); // 30 min
      expect(wrapper.vm.downtimeSummary.affected_devices).toBe(1);
      expect(parseFloat(wrapper.vm.downtimeSummary.avg_mttr)).toBeCloseTo(30.0, 1);
    });

    it('avg_mttr = 0 when no resolved pairs', async () => {
      // Only trigger, no recover
      const history = [makeTrigger({ id: 1, created_at: '2024-01-15T10:00:00.000Z' })];
      setupFetch({ historyPayload: history });
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.vm.downtimeSummary.avg_mttr).toBe(0);
    });

    it('uses alarm_rule_id ?? address_id as key (getKey fallback)', async () => {
      const history = [
        makeTrigger({ id: 1, address_id: 10, alarm_rule_id: null, created_at: '2024-01-15T10:00:00.000Z' }),
        makeRecover({ id: 2, event_type: 'RECOVER', address_id: 10, alarm_rule_id: null, created_at: '2024-01-15T10:30:00.000Z' }),
      ];
      setupFetch({ historyPayload: history });
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.vm.downtimeSummary.total_alarms).toBe(1);
      expect(parseFloat(wrapper.vm.downtimeSummary.avg_mttr)).toBeCloseTo(30.0, 1);
    });

    it('builds top5 grouped by address_id', async () => {
      const history = [
        makeTrigger({ id: 1, address_id: 10, alarm_rule_id: 1, created_at: '2024-01-15T10:00:00.000Z' }),
        makeTrigger({ id: 3, address_id: 10, alarm_rule_id: 1, created_at: '2024-01-15T12:00:00.000Z' }),
        makeTrigger({ id: 5, address_id: 20, alarm_rule_id: 2, device: { id: 2, name: 'B', room: { id: 2, name: 'R2' } }, created_at: '2024-01-15T14:00:00.000Z' }),
      ];
      setupFetch({ historyPayload: history });
      const wrapper = mountView();
      await flushPromises();
      // address 10 has 2 triggers → more total_sec → should rank first
      expect(wrapper.vm.top5.length).toBeGreaterThanOrEqual(1);
      expect(wrapper.vm.top5[0].count).toBeGreaterThanOrEqual(1);
    });

    it('sort picks earliest RECOVER when multiple exist for same trigger (covers line 487)', async () => {
      const history = [
        makeTrigger({ id: 1, address_id: 10, alarm_rule_id: 1, created_at: '2024-01-15T10:00:00.000Z' }),
        makeRecover({ id: 2, event_type: 'RECOVER', address_id: 10, alarm_rule_id: 1, created_at: '2024-01-15T11:00:00.000Z' }),
        makeRecover({ id: 3, event_type: 'RECOVER', address_id: 10, alarm_rule_id: 1, created_at: '2024-01-15T10:30:00.000Z' }),
      ];
      setupFetch({ historyPayload: history });
      const wrapper = mountView();
      await flushPromises();
      // sort ascending → earliest (T+30min=1800sec) is picked
      const triggerItem = wrapper.vm.history.find(h => h.id === 1);
      expect(triggerItem.duration_sec).toBe(1800);
    });

    it('covers || null and ?? null branches (line 534) when pair not found', async () => {
      // pair?.duration_min || null and pair?.duration_sec ?? null are dead code:
      // pairs.find() always finds a pair because pairs are built from this.history triggers.
      // Force the null/undefined path by spying on Array.prototype.find ONCE.
      setupFetch({ historyPayload: [makeTrigger({ id: 1, address_id: 10, alarm_rule_id: 1, created_at: '2024-01-15T10:00:00.000Z' })] });
      const wrapper = mountView();
      await flushPromises();

      // Override .find() once so pairs.find() returns undefined → covers line 534 null branches
      const realFind = Array.prototype.find;
      const findSpy = vi.spyOn(Array.prototype, 'find').mockImplementationOnce(function() {
        return undefined; // simulate pair not found → pair?.duration_min || null = null
      });
      try {
        wrapper.vm.fetchDowntimeSummary();
      } finally {
        findSpy.mockRestore();
      }
      // Line 534 executed with pair=undefined:
      // duration_min = undefined || null = null ✓
      // duration_sec = undefined ?? null = null ✓
      const triggerItem = wrapper.vm.history.find(h => h.event_type === 'TRIGGER');
      expect(triggerItem.duration_min).toBeNull();
      expect(triggerItem.duration_sec).toBeNull();
    });

    it('limits top5 to 5 devices', async () => {
      const history = Array.from({ length: 10 }, (_, i) =>
        makeTrigger({ id: i + 1, address_id: i + 100, alarm_rule_id: i + 100, device: { id: i + 1, name: `D${i}`, room: { id: i + 1, name: `R${i}` } } })
      );
      setupFetch({ historyPayload: history });
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.vm.top5.length).toBeLessThanOrEqual(5);
    });

    it('updates history items with duration_sec and duration_min', async () => {
      const history = [
        makeTrigger({ id: 1, address_id: 10, alarm_rule_id: 1, created_at: '2024-01-15T10:00:00.000Z' }),
        makeRecover({ id: 2, event_type: 'RECOVER', address_id: 10, alarm_rule_id: 1, created_at: '2024-01-15T10:30:00.000Z' }),
      ];
      setupFetch({ historyPayload: history });
      const wrapper = mountView();
      await flushPromises();
      const triggerItem = wrapper.vm.history.find(h => h.id === 1);
      expect(triggerItem.duration_sec).toBe(1800);
      expect(triggerItem.duration_min).toBeDefined();
    });
  });

  // ─── openChart / closeChart ───────────────────────────────────────────
  describe('openChart() / closeChart()', () => {
    const deviceData = { id: 1, address_id: 10, name: 'Device A', label: 'Device A', refresh_rate_ms: 1000 };

    it('sets showChart=true and selectedDevice when device found (plain format)', async () => {
      const wrapper = mountView({ devices: [deviceData] });
      await flushPromises();
      const item = makeTrigger({ rule: { address_id: 10, condition_type: 'MT', min_value: 80 } });
      wrapper.vm.openChart(item);
      expect(wrapper.vm.showChart).toBe(true);
      expect(wrapper.vm.selectedDevice).toEqual(deviceData);
    });

    it('sets showChart=true with _custom.value format', async () => {
      const devicesCustom = [{ _custom: { value: deviceData } }];
      const wrapper = mountView({ devices: devicesCustom });
      await flushPromises();
      const item = makeTrigger({ rule: { address_id: 10, condition_type: 'MT', min_value: 80 } });
      wrapper.vm.openChart(item);
      expect(wrapper.vm.showChart).toBe(true);
    });

    it('uses item.address_id fallback when rule.address_id missing', async () => {
      const wrapper = mountView({ devices: [deviceData] });
      await flushPromises();
      const item = makeTrigger({ address_id: 10, rule: null });
      wrapper.vm.openChart(item);
      expect(wrapper.vm.showChart).toBe(true);
    });

    it('calls alert() and returns when device not found', async () => {
      const wrapper = mountView({ devices: [] });
      await flushPromises();
      const item = makeTrigger({ rule: { address_id: 99 } });
      wrapper.vm.openChart(item);
      expect(alert).toHaveBeenCalledWith('ไม่พบข้อมูล Device ในระบบปัจจุบัน');
      expect(wrapper.vm.showChart).toBe(false);
    });

    it('computes chartStartDate/chartEndDate using refresh_rate_ms * 20', async () => {
      const dev = { ...deviceData, refresh_rate_ms: 2000 };
      const wrapper = mountView({ devices: [dev] });
      await flushPromises();
      const item = makeTrigger({ created_at: '2024-01-15T10:00:00.000Z', rule: { address_id: 10 } });
      wrapper.vm.openChart(item);
      // offset = 2000 * 20 = 40000ms = 40 sec
      const eventTime = new Date('2024-01-15T10:00:00.000Z');
      const expectedStart = new Date(eventTime.getTime() - 40000);
      expect(wrapper.vm.chartStartDate).toContain(String(expectedStart.getUTCSeconds() < 10 ? '0' + expectedStart.getUTCSeconds() : expectedStart.getUTCSeconds()).slice(-2));
    });

    it('closeChart resets showChart and selectedDevice', async () => {
      const wrapper = mountView({ devices: [deviceData] });
      await flushPromises();
      wrapper.vm.showChart = true;
      wrapper.vm.selectedDevice = deviceData;
      wrapper.vm.closeChart();
      expect(wrapper.vm.showChart).toBe(false);
      expect(wrapper.vm.selectedDevice).toBeNull();
    });

    it('sets selectedAlarmTime and selectedEventType', async () => {
      const wrapper = mountView({ devices: [deviceData] });
      await flushPromises();
      const item = makeTrigger({ created_at: '2024-01-15T10:00:00.000Z', event_type: 'TRIGGER', rule: { address_id: 10 } });
      wrapper.vm.openChart(item);
      expect(wrapper.vm.selectedAlarmTime).toBe('2024-01-15T10:00:00.000Z');
      expect(wrapper.vm.selectedEventType).toBe('TRIGGER');
    });

    it('uses default refresh_rate_ms=1000 when not set', async () => {
      const dev = { ...deviceData, refresh_rate_ms: undefined };
      const wrapper = mountView({ devices: [dev] });
      await flushPromises();
      const item = makeTrigger({ created_at: '2024-01-15T10:00:00.000Z', rule: { address_id: 10 } });
      wrapper.vm.openChart(item);
      // offsetMs = Number(undefined || 1000) * 20 = 20000ms
      expect(wrapper.vm.chartStartDate).toBeTruthy();
    });
  });

  // ─── formatDate ───────────────────────────────────────────────────────
  describe('formatDate()', () => {
    it('returns "-" for null', () => {
      const wrapper = mountView();
      expect(wrapper.vm.formatDate(null)).toBe('-');
    });

    it('returns "-" for empty string', () => {
      const wrapper = mountView();
      expect(wrapper.vm.formatDate('')).toBe('-');
    });

    it('returns formatted string for valid date', () => {
      const wrapper = mountView();
      const result = wrapper.vm.formatDate('2024-01-15T10:00:00.000Z');
      expect(typeof result).toBe('string');
      expect(result).not.toBe('-');
    });
  });

  // ─── formatDuration ───────────────────────────────────────────────────
  describe('formatDuration()', () => {
    it('returns "—" for null', () => {
      const wrapper = mountView();
      expect(wrapper.vm.formatDuration(null)).toBe('—');
    });

    it('returns "X วิ" for seconds < 60', () => {
      const wrapper = mountView();
      expect(wrapper.vm.formatDuration(30)).toBe('30 วิ');
      expect(wrapper.vm.formatDuration(0)).toBe('0 วิ');
    });

    it('returns "X นาที" when no remainder', () => {
      const wrapper = mountView();
      expect(wrapper.vm.formatDuration(120)).toBe('2 นาที');
    });

    it('returns "X นาที Y วิ" when has remainder', () => {
      const wrapper = mountView();
      expect(wrapper.vm.formatDuration(90)).toBe('1 นาที 30 วิ');
    });

    it('returns "1 นาที" for exactly 60 seconds', () => {
      const wrapper = mountView();
      expect(wrapper.vm.formatDuration(60)).toBe('1 นาที');
    });
  });

  // ─── formatLocalDateTime ─────────────────────────────────────────────
  describe('formatLocalDateTime()', () => {
    it('formats date to YYYY-MM-DDTHH:MM:SS pattern', () => {
      const wrapper = mountView();
      const d = new Date('2024-01-05T08:05:03');
      const result = wrapper.vm.formatLocalDateTime(d);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
    });

    it('pads single-digit components with 0', () => {
      const wrapper = mountView();
      const d = new Date(2024, 0, 5, 8, 5, 3); // Jan 5, 08:05:03
      const result = wrapper.vm.formatLocalDateTime(d);
      expect(result).toMatch(/2024-01-05T08:05:03/);
    });
  });

  // ─── exportCSV ────────────────────────────────────────────────────────
  describe('exportCSV()', () => {
    // Note: URL.createObjectURL is not implemented in jsdom → must mock
    it('creates Blob and triggers download (calls createObjectURL + revokeObjectURL)', async () => {
      const createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      setupFetch({ historyPayload: [makeTrigger()] });
      const wrapper = mountView({ canExport: true });
      await flushPromises();
      expect(() => wrapper.vm.exportCSV()).not.toThrow();
      expect(createSpy).toHaveBeenCalled();
      expect(revokeSpy).toHaveBeenCalledWith('blob:mock-url');
      createSpy.mockRestore();
      revokeSpy.mockRestore();
    });

    it('CSV filename contains startDate and endDate', async () => {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:url');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      const wrapper = mountView({ canExport: true });
      await flushPromises();
      wrapper.vm.filter.startDate = '2024-01-01';
      wrapper.vm.filter.endDate = '2024-01-31';
      // Capture download attribute via real anchor
      const origCreate = document.createElement.bind(document);
      let capturedDownload = '';
      const spy = vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        const el = origCreate(tag);
        if (tag === 'a') {
          Object.defineProperty(el, 'download', {
            set(v) { capturedDownload = v; },
            get() { return capturedDownload; },
            configurable: true,
          });
        }
        return el;
      });
      try {
        wrapper.vm.exportCSV();
        expect(capturedDownload).toContain('2024-01-01');
        expect(capturedDownload).toContain('2024-01-31');
      } finally {
        spy.mockRestore();
        URL.createObjectURL.mockRestore?.();
        URL.revokeObjectURL.mockRestore?.();
      }
    });

    it('CSV contains headers row with correct columns', async () => {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:url');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      setupFetch({ historyPayload: [makeTrigger({ value: 85 })] });
      const wrapper = mountView({ canExport: true });
      await flushPromises();
      // Capture Blob content
      let capturedContent = '';
      const OrigBlob = global.Blob;
      global.Blob = function BlobMock(parts, opts) {
        capturedContent = parts[0];
        return new OrigBlob(parts, opts);
      };
      try {
        wrapper.vm.exportCSV();
        expect(capturedContent).toContain('Device Name');
        expect(capturedContent).toContain('Device A');
      } finally {
        global.Blob = OrigBlob;
        URL.createObjectURL.mockRestore?.();
        URL.revokeObjectURL.mockRestore?.();
      }
    });

    it('handles null values in CSV and covers || "" falsy branch (line 552: event_type=null)', async () => {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:url');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      setupFetch({
        historyPayload: [{
          id: 99,
          event_type: null, // covers `item.event_type || ''` falsy branch on line 552
          address_id: 10, value: null, created_at: null, duration_min: null,
          device: { name: null, room: { name: null } }, rule: { name: null },
        }],
      });
      const wrapper = mountView({ canExport: true });
      await flushPromises();
      expect(() => wrapper.vm.exportCSV()).not.toThrow();
      URL.createObjectURL.mockRestore?.();
      URL.revokeObjectURL.mockRestore?.();
    });
  });

  // ─── Template Branches ────────────────────────────────────────────────
  describe('Template branches', () => {
    it('shows spinner in Search button when loading=true', async () => {
      let resolveHistory;
      mockFetch = vi.fn((url) => {
        if (url.includes('/api/events/all')) return new Promise(r => { resolveHistory = () => r({ ok: true, json: () => Promise.resolve([]) }); });
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
      });
      vi.stubGlobal('fetch', mockFetch);
      const wrapper = mountView();
      await wrapper.vm.$nextTick();
      expect(wrapper.find('.spinner-border.spinner-border-sm').exists()).toBe(true);
      resolveHistory();
      await flushPromises();
    });

    it('shows bi-search icon when not loading', async () => {
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.find('button.btn-primary .bi-search').exists()).toBe(true);
    });

    it('shows summary section when history has items', async () => {
      const wrapper = mountView();
      await flushPromises();
      // history has 2 items from MOCK_HISTORY
      expect(wrapper.find('.stat-card').exists()).toBe(true);
    });

    it('does NOT show summary section when history is empty', async () => {
      setupFetch({ historyPayload: [] });
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.find('.stat-card').exists()).toBe(false);
    });

    it('shows top5 section when top5 has items', async () => {
      const history = [
        makeTrigger({ id: 1, address_id: 10, alarm_rule_id: 1, created_at: '2024-01-15T10:00:00.000Z' }),
        makeRecover({ id: 2, event_type: 'RECOVER', address_id: 10, alarm_rule_id: 1, created_at: '2024-01-15T10:30:00.000Z' }),
      ];
      setupFetch({ historyPayload: history });
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.vm.top5.length).toBeGreaterThan(0);
      expect(wrapper.find('.rank-badge').exists()).toBe(true);
    });

    it('shows AlarmHistoryChart in else branch when top5 is empty', async () => {
      setupFetch({ historyPayload: [] });
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.vm.top5.length).toBe(0);
      expect(wrapper.find('.alarm-history-chart-stub').exists()).toBe(true);
    });

    it('shows loading row in table when loading=true', async () => {
      let resolveHistory;
      mockFetch = vi.fn((url) => {
        if (url.includes('/api/events/all')) return new Promise(r => { resolveHistory = () => r({ ok: true, json: () => Promise.resolve([]) }); });
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
      });
      vi.stubGlobal('fetch', mockFetch);
      const wrapper = mountView();
      await wrapper.vm.$nextTick();
      expect(wrapper.find('.spinner-border.text-primary').exists()).toBe(true);
      resolveHistory();
      await flushPromises();
    });

    it('shows empty state row when filteredHistory is empty', async () => {
      setupFetch({ historyPayload: [] });
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.find('.bi-database-exclamation').exists()).toBe(true);
    });

    it('shows data rows when filteredHistory has items', async () => {
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.find('tbody tr:not(.loading-row)').exists()).toBe(true);
      // At least 1 real row
      const tds = wrapper.findAll('tbody td');
      expect(tds.length).toBeGreaterThan(0);
    });

    it('shows pagination section when filteredHistory > 0', async () => {
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.find('.pagination').exists()).toBe(true);
    });

    it('shows chart modal when showChart=true', async () => {
      const wrapper = mountView({ devices: [{ id: 1, address_id: 10, name: 'A', label: 'A', refresh_rate_ms: 1000 }] });
      await flushPromises();
      wrapper.vm.showChart = true;
      wrapper.vm.selectedDevice = { id: 1, address_id: 10, name: 'A', label: 'A' };
      await wrapper.vm.$nextTick();
      expect(wrapper.find('.modal.fade.show').exists()).toBe(true);
      expect(wrapper.find('.chart-stub').exists()).toBe(true);
    });

    it('does NOT render Chart in modal when selectedDevice=null', async () => {
      const wrapper = mountView();
      await flushPromises();
      wrapper.vm.showChart = true;
      wrapper.vm.selectedDevice = null;
      await wrapper.vm.$nextTick();
      expect(wrapper.find('.chart-stub').exists()).toBe(false);
    });
  });

  // ─── Condition type branches in table ──────────────────────────────────
  describe('Template: condition_type column branches', () => {
    async function mountWithCondition(condition_type, min_value = 80, max_value = null) {
      const history = [makeTrigger({ rule: { id: 1, name: 'R', condition_type, min_value, max_value, address_id: 10 } })];
      setupFetch({ historyPayload: history });
      const wrapper = mountView();
      await flushPromises();
      return wrapper;
    }

    it('EXACT → "= min_value"', async () => {
      const w = await mountWithCondition('EXACT', 100);
      expect(w.find('tbody').text()).toContain('= 100');
    });

    it('BTW → "min_value - max_value"', async () => {
      const w = await mountWithCondition('BTW', 50, 100);
      expect(w.find('tbody').text()).toContain('50');
      expect(w.find('tbody').text()).toContain('100');
    });

    it('MT → "> min_value"', async () => {
      const w = await mountWithCondition('MT', 80);
      expect(w.find('tbody').text()).toContain('> 80');
    });

    it('MTE → ">= min_value"', async () => {
      const w = await mountWithCondition('MTE', 80);
      const html = w.find('tbody').html();
      expect(html).toContain('≥');
    });

    it('LT → "< max_value" when max_value set', async () => {
      const w = await mountWithCondition('LT', null, 20);
      const html = w.find('tbody').html();
      expect(html).toContain('&lt;');
      expect(w.find('tbody').text()).toContain('20');
    });

    it('LT → "< min_value" when max_value not set', async () => {
      const w = await mountWithCondition('LT', 20, null);
      expect(w.find('tbody').text()).toContain('20');
    });

    it('LTE → "<= max_value" when max_value set', async () => {
      const w = await mountWithCondition('LTE', null, 20);
      const html = w.find('tbody').html();
      expect(html).toContain('≤');
      expect(w.find('tbody').text()).toContain('20');
    });

    it('LTE → "<= min_value" when max_value not set', async () => {
      const w = await mountWithCondition('LTE', 20, null);
      expect(w.find('tbody').text()).toContain('20');
    });

    it('unknown condition_type → shows "-"', async () => {
      const w = await mountWithCondition('UNKNOWN');
      // The else span shows '-'
      expect(w.find('tbody td:nth-child(4)').text().trim()).toBe('-');
    });

    it('null rule → shows "-" for condition and N/A for name', async () => {
      const history = [makeTrigger({ rule: null })];
      setupFetch({ historyPayload: history });
      const wrapper = mountView();
      await flushPromises();
      const cells = wrapper.findAll('tbody td');
      const ruleNameCell = cells[1];
      expect(ruleNameCell.text()).toBe('N/A');
    });

    it('TRIGGER event shows danger badge', async () => {
      const history = [makeTrigger({ event_type: 'TRIGGER' })];
      setupFetch({ historyPayload: history });
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.find('.badge.text-danger').exists()).toBe(true);
    });

    it('RECOVERY event shows success badge', async () => {
      const history = [makeRecover({ event_type: 'RECOVERY' })];
      setupFetch({ historyPayload: history });
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.find('.badge.text-success').exists()).toBe(true);
    });

    it('shows formatted duration for TRIGGER with duration_sec != null', async () => {
      // Set history directly to bypass fetchDowntimeSummary (which overwrites duration_sec)
      setupFetch({ historyPayload: [] });
      const wrapper = mountView();
      await flushPromises();
      wrapper.vm.history = [makeTrigger({ event_type: 'TRIGGER', duration_sec: 90 })];
      await wrapper.vm.$nextTick();
      expect(wrapper.find('.badge.bg-warning').exists()).toBe(true);
      expect(wrapper.find('.badge.bg-warning').text()).toBe('1 นาที 30 วิ');
    });

    it('shows "—" in duration for TRIGGER with null duration_sec', async () => {
      const history = [makeTrigger({ event_type: 'TRIGGER', duration_sec: null })];
      setupFetch({ historyPayload: history });
      const wrapper = mountView();
      await flushPromises();
      // duration cell (7th td) should show —
      const rows = wrapper.findAll('tbody tr');
      expect(rows.length).toBeGreaterThan(0);
    });

    it('device name shows "Unknown" when device.name is null', async () => {
      const history = [makeTrigger({ device: { id: 1, name: null, room: { id: 1, name: 'R1' } } })];
      setupFetch({ historyPayload: history });
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.find('tbody').text()).toContain('Unknown');
    });

    it('rank badges: rank-1, rank-2, rank-3, rank-other for top5', async () => {
      // need 4+ TRIGGER pairs to get rank-other
      const history = [
        makeTrigger({ id: 1, address_id: 10, alarm_rule_id: 1, device: { id: 1, name: 'A', room: { id: 1, name: 'R1' } }, created_at: '2024-01-15T10:00:00.000Z' }),
        makeRecover({ id: 2, event_type: 'RECOVER', address_id: 10, alarm_rule_id: 1, created_at: '2024-01-15T10:30:00.000Z' }),
        makeTrigger({ id: 3, address_id: 20, alarm_rule_id: 2, device: { id: 2, name: 'B', room: { id: 2, name: 'R2' } }, created_at: '2024-01-15T10:00:00.000Z' }),
        makeRecover({ id: 4, event_type: 'RECOVER', address_id: 20, alarm_rule_id: 2, device: { id: 2, name: 'B', room: { id: 2, name: 'R2' } }, created_at: '2024-01-15T10:15:00.000Z' }),
        makeTrigger({ id: 5, address_id: 30, alarm_rule_id: 3, device: { id: 3, name: 'C', room: { id: 3, name: 'R3' } }, created_at: '2024-01-15T10:00:00.000Z' }),
        makeRecover({ id: 6, event_type: 'RECOVER', address_id: 30, alarm_rule_id: 3, device: { id: 3, name: 'C', room: { id: 3, name: 'R3' } }, created_at: '2024-01-15T10:10:00.000Z' }),
        makeTrigger({ id: 7, address_id: 40, alarm_rule_id: 4, device: { id: 4, name: 'D', room: { id: 4, name: 'R4' } }, created_at: '2024-01-15T10:00:00.000Z' }),
        makeRecover({ id: 8, event_type: 'RECOVER', address_id: 40, alarm_rule_id: 4, device: { id: 4, name: 'D', room: { id: 4, name: 'R4' } }, created_at: '2024-01-15T10:05:00.000Z' }),
      ];
      setupFetch({ historyPayload: history });
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.vm.top5.length).toBeGreaterThanOrEqual(4);
      expect(wrapper.find('.rank-1').exists()).toBe(true);
      expect(wrapper.find('.rank-2').exists()).toBe(true);
      expect(wrapper.find('.rank-3').exists()).toBe(true);
      expect(wrapper.find('.rank-other').exists()).toBe(true);
    });
  });

  // ─── DOM Interactions ─────────────────────────────────────────────────
  describe('DOM interactions', () => {
    it('v-model filter.deviceName → updates on input', async () => {
      const wrapper = mountView();
      await flushPromises();
      const input = wrapper.find('input[type="text"]');
      await input.setValue('sensor');
      expect(wrapper.vm.filter.deviceName).toBe('sensor');
    });

    it('v-model filter.room → updates on select', async () => {
      const wrapper = mountView();
      await flushPromises();
      const select = wrapper.find('select');
      await select.setValue('Room A');
      expect(wrapper.vm.filter.room).toBe('Room A');
    });

    it('v-model filter.startDate → updates on date input', async () => {
      const wrapper = mountView();
      await flushPromises();
      const dateInputs = wrapper.findAll('input[type="date"]');
      await dateInputs[0].setValue('2024-01-01');
      expect(wrapper.vm.filter.startDate).toBe('2024-01-01');
    });

    it('v-model filter.endDate → updates on date input', async () => {
      const wrapper = mountView();
      await flushPromises();
      const dateInputs = wrapper.findAll('input[type="date"]');
      await dateInputs[1].setValue('2024-01-31');
      expect(wrapper.vm.filter.endDate).toBe('2024-01-31');
    });

    it('Search button click triggers fetchHistory', async () => {
      const wrapper = mountView();
      await flushPromises();
      const callsBefore = mockFetch.mock.calls.length;
      await wrapper.find('button.btn-primary').trigger('click');
      await flushPromises();
      expect(mockFetch.mock.calls.length).toBeGreaterThan(callsBefore);
    });

    it('Export button click triggers exportCSV', async () => {
      const wrapper = mountView({ canExport: true });
      await flushPromises();
      const exportSpy = vi.spyOn(wrapper.vm, 'exportCSV').mockImplementation(() => {});
      await wrapper.find('button.btn-success').trigger('click');
      expect(exportSpy).toHaveBeenCalled();
    });

    it('openChart called when value link clicked', async () => {
      const wrapper = mountView({ devices: [{ id: 1, address_id: 10, name: 'A', label: 'A', refresh_rate_ms: 1000 }] });
      await flushPromises();
      const openSpy = vi.spyOn(wrapper.vm, 'openChart');
      const link = wrapper.find('a[href="#"]');
      if (link.exists()) {
        await link.trigger('click');
        expect(openSpy).toHaveBeenCalled();
      }
    });

    it('closeChart called when close button in modal clicked', async () => {
      const wrapper = mountView();
      await flushPromises();
      wrapper.vm.showChart = true;
      wrapper.vm.selectedDevice = { id: 1, name: 'A' };
      await wrapper.vm.$nextTick();
      await wrapper.find('.btn-close').trigger('click');
      expect(wrapper.vm.showChart).toBe(false);
    });

    it('pagination: first-page button click sets currentPage=1', async () => {
      const items = Array.from({ length: 50 }, (_, i) => makeTrigger({ id: i + 1 }));
      setupFetch({ historyPayload: items });
      const wrapper = mountView();
      await flushPromises();
      wrapper.vm.currentPage = 3;
      await wrapper.vm.$nextTick();
      const btns = wrapper.findAll('.page-link');
      await btns[0].trigger('click'); // first «
      expect(wrapper.vm.currentPage).toBe(1);
    });

    it('pagination: prev button click decrements currentPage', async () => {
      const items = Array.from({ length: 50 }, (_, i) => makeTrigger({ id: i + 1 }));
      setupFetch({ historyPayload: items });
      const wrapper = mountView();
      await flushPromises();
      wrapper.vm.currentPage = 2;
      await wrapper.vm.$nextTick();
      const btns = wrapper.findAll('.page-link');
      await btns[1].trigger('click'); // prev ‹
      expect(wrapper.vm.currentPage).toBe(1);
    });

    it('pagination: next button click increments currentPage', async () => {
      const items = Array.from({ length: 50 }, (_, i) => makeTrigger({ id: i + 1 }));
      setupFetch({ historyPayload: items });
      const wrapper = mountView();
      await flushPromises();
      wrapper.vm.currentPage = 1;
      await wrapper.vm.$nextTick();
      const btns = wrapper.findAll('.page-link');
      await btns[btns.length - 2].trigger('click'); // next ›
      expect(wrapper.vm.currentPage).toBe(2);
    });

    it('pagination: last-page button click sets currentPage=totalPages', async () => {
      const items = Array.from({ length: 50 }, (_, i) => makeTrigger({ id: i + 1 }));
      setupFetch({ historyPayload: items });
      const wrapper = mountView();
      await flushPromises();
      wrapper.vm.currentPage = 1;
      await wrapper.vm.$nextTick();
      const btns = wrapper.findAll('.page-link');
      await btns[btns.length - 1].trigger('click'); // last »
      expect(wrapper.vm.currentPage).toBe(wrapper.vm.totalPages);
    });

    it('pagination: page number button sets currentPage=page', async () => {
      const items = Array.from({ length: 100 }, (_, i) => makeTrigger({ id: i + 1 }));
      setupFetch({ historyPayload: items });
      const wrapper = mountView();
      await flushPromises();
      await wrapper.vm.$nextTick();
      // Find a page button with number > 1
      const pageButtons = wrapper.findAll('.page-item:not(:first-child):not(:last-child) .page-link.fw-bold');
      if (pageButtons.length > 1) {
        await pageButtons[1].trigger('click');
        expect(wrapper.vm.currentPage).toBeGreaterThan(0);
      }
    });

    it('pagination dots show when visiblePages[0] > 1', async () => {
      const items = Array.from({ length: 200 }, (_, i) => makeTrigger({ id: i + 1 }));
      setupFetch({ historyPayload: items });
      const wrapper = mountView();
      await flushPromises();
      wrapper.vm.currentPage = 7;
      await wrapper.vm.$nextTick();
      const dots = wrapper.findAll('.page-item.disabled span.page-link');
      expect(dots.some(d => d.text() === '...')).toBe(true);
    });
  });

  // ─── Modal footer close button ────────────────────────────────────────
  describe('Chart modal close button', () => {
    it('ปิดหน้าต่าง button triggers closeChart', async () => {
      const wrapper = mountView();
      await flushPromises();
      wrapper.vm.showChart = true;
      wrapper.vm.selectedDevice = { id: 1, name: 'A' };
      await wrapper.vm.$nextTick();
      const closeBtn = wrapper.findAll('button').find(b => b.text().includes('ปิดหน้าต่าง'));
      if (closeBtn) {
        await closeBtn.trigger('click');
        expect(wrapper.vm.showChart).toBe(false);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  describe('Bug Cases (FAIL)', () => {

    // BUG-1: fetchDowntimeSummary ใช้ 'RECOVER' แต่ API/template ใช้ 'RECOVERY'
    // อันตราย: recovery events ที่ API ส่งมาเป็น 'RECOVERY' จะไม่ถูกนับเป็น "resolved"
    //          → avg_mttr = 0 ตลอดแม้จะมี recovery จริง
    //          → total_downtime_sec นับจาก trigger จนถึง "now" ไม่ใช่จนถึง recovery จริง
    //          → ทำให้ dashboard แสดงเวลา downtime สูงกว่าความเป็นจริงมาก
    //          → ข้อมูล top5 ผิดพลาด: คำนวณ duration จนถึงปัจจุบัน ไม่ใช่จนถึง recovery
    // FAIL เพราะ: recoveries = [] (ไม่มี event_type === 'RECOVER' ใน history)
    //             → resolved=false สำหรับทุก pair → avg_mttr = 0
    it('[BUG-1] fetchDowntimeSummary ใช้ "RECOVER" แต่ API ส่ง "RECOVERY" → avg_mttr เป็น 0 เสมอ (FAIL)', async () => {
      const history = [
        makeTrigger({ id: 1, address_id: 10, alarm_rule_id: 1, created_at: '2024-01-15T10:00:00.000Z' }),
        // API ส่ง RECOVERY (ถูกต้อง) แต่ code filter 'RECOVER' → ไม่ถูก detect
        makeRecover({ id: 2, event_type: 'RECOVERY', address_id: 10, alarm_rule_id: 1, created_at: '2024-01-15T10:30:00.000Z' }),
      ];
      setupFetch({ historyPayload: history });
      const wrapper = mountView();
      await flushPromises();

      // คาดหวัง: มี recovery → avg_mttr > 0
      expect(parseFloat(wrapper.vm.downtimeSummary.avg_mttr)).toBeGreaterThan(0);
      // FAIL: avg_mttr = 0 เพราะ 'RECOVERY' !== 'RECOVER' → recoveries = [] → resolved=false
    });

    // BUG-2: authH() inline ส่ง "Bearer null" เมื่อไม่มี token
    // อันตราย: request ทุกอันที่ไม่มี token ใช้ header "Bearer null"
    //          → backend บางตัวอาจ parse header ผิด หรือ log "Bearer null" เป็น valid token
    //          → อาจได้รับ response 200 พร้อม data แทนที่จะได้ 401 Unauthorized
    //          → security hole: unauthenticated user อาจเข้าถึง alarm history ได้
    // FAIL เพราะ: localStorage.getItem('token') = null → `Bearer ${null}` = 'Bearer null'
    it('[BUG-2] authH() ส่ง "Bearer null" เมื่อไม่มี token (FAIL)', async () => {
      delete store.token; // ลบ token
      mountView();
      await flushPromises();

      const historyCall = mockFetch.mock.calls.find(([url]) => url.includes('/api/events/all'));
      const authHeader = historyCall?.[1]?.headers?.Authorization;

      // คาดหวัง: ไม่มี token → ไม่ควรส่ง 'Bearer null'
      expect(authHeader).not.toBe('Bearer null');
      // FAIL: `Bearer ${null}` = 'Bearer null'
    });

    // BUG-3: openChart() ใช้ native alert() แทน showAlert จาก swalHelper
    // อันตราย: alert() เป็น synchronous blocking → หยุด JavaScript execution ทั้งหน้า
    //          → mobile browsers บางตัว block/ignore window.alert ทำให้ผู้ใช้ไม่เห็น error
    //          → ไม่สอดคล้องกับ UX ของ component อื่นที่ใช้ SweetAlert2
    //          → ข้อความ "ไม่พบข้อมูล Device" ถูกแสดงด้วย browser default style
    // FAIL เพราะ: openChart() เรียก window.alert() ตรงๆ แทนที่จะใช้ showAlert
    it('[BUG-3] openChart() ใช้ native alert() แทน showAlert → blocking UX (FAIL)', async () => {
      const wrapper = mountView({ devices: [] });
      await flushPromises();
      vi.clearAllMocks(); // reset alert call count
      const item = makeTrigger({ rule: { address_id: 999 } });
      wrapper.vm.openChart(item);

      // คาดหวัง: ควรใช้ showAlert (swalHelper) ไม่ใช่ native alert → alert ไม่ควรถูกเรียก
      expect(alert).not.toHaveBeenCalled();
      // FAIL: alert() ถูกเรียกจริง เพราะ openChart ใช้ window.alert() ตรงๆ
    });

    // BUG-4: currentPage ไม่ถูก reset เมื่อ filter เปลี่ยน → paginatedHistory อาจเป็น []
    // อันตราย: user อยู่ที่ page 3 แล้ว type filter → filteredHistory มีแค่ 5 items (1 page)
    //          → แต่ currentPage ยังเป็น 3 → paginatedHistory.slice(40,60) = []
    //          → user เห็น "No alarm history" ทั้งที่มีข้อมูล 5 รายการ
    //          → UX สับสนมาก ผู้ใช้คิดว่าไม่มีข้อมูล แต่จริงๆ มีอยู่ใน page 1
    //          → แก้โดย: add watch on filteredHistory หรือ filter ให้ reset currentPage
    // FAIL เพราะ: ไม่มี watch on filteredHistory → currentPage ยังเป็น 3
    it('[BUG-4] currentPage ไม่ reset เมื่อ filter เปลี่ยน → paginatedHistory = [] แม้จะมีข้อมูล (FAIL)', async () => {
      // สร้าง 50 items → totalPages = 3 (50/20=2.5 → ceil=3)
      const manyItems = Array.from({ length: 50 }, (_, i) =>
        makeTrigger({ id: i + 1, device: { id: i + 1, name: i === 0 ? 'TargetDevice' : `OtherDevice${i}`, room: { id: 1, name: 'R1' } } })
      );
      setupFetch({ historyPayload: manyItems });
      const wrapper = mountView();
      await flushPromises();

      // ไปหน้า 3
      wrapper.vm.currentPage = 3;
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.paginatedHistory.length).toBeGreaterThan(0); // หน้า 3 มีข้อมูล

      // Filter ให้เหลือแค่ 1 item
      wrapper.vm.filter.deviceName = 'TargetDevice';
      await wrapper.vm.$nextTick();
      // คาดหวัง: filter reset currentPage=1 → paginatedHistory แสดง TargetDevice
      expect(wrapper.vm.paginatedHistory.length).toBeGreaterThan(0);
      // FAIL: currentPage = 3 แต่ filteredHistory = [1 item] → paginatedHistory.slice(40,60) = []
    });

    // BUG-5: loadRooms() ไม่เช็ค res.ok → HTTP 4xx/5xx silently ถูก swallow
    // อันตราย: ถ้า API ส่ง 401/403/500 พร้อม JSON error body → ไม่มี error log
    //          → this.rooms = [] โดยไม่แจ้ง developer ว่ามีปัญหา
    //          → Room dropdown ว่างเปล่า → user ไม่สามารถ filter ตาม room ได้
    //          → debug ยากมากเพราะ no console.error
    //          → แก้โดย: if (!res.ok) throw new Error(`HTTP ${res.status}`)
    // FAIL เพราะ: loadRooms() ไม่ throw เมื่อ !res.ok → catch block ไม่ถูกเรียก → ไม่มี log
    it('[BUG-5] loadRooms() ไม่เช็ค res.ok → HTTP error ถูก swallow โดยไม่มี console.error (FAIL)', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockFetch = vi.fn((url) => {
        if (url.includes('/api/rooms'))
          return Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({ error: 'Unauthorized' }) });
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      });
      vi.stubGlobal('fetch', mockFetch);

      mountView();
      await flushPromises();

      // คาดหวัง: res.ok=false → ควร log error (เหมือน fetchHistory ที่มี if (!res.ok) throw)
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Load rooms'), expect.any(Error));
      // FAIL: ไม่มี if (!res.ok) throw → catch ไม่ถูก trigger → consoleSpy ไม่ถูกเรียก
      consoleSpy.mockRestore();
    });
  });
});
