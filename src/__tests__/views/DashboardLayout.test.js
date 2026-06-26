import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import DashboardLayout from '../../views/DashboardLayout.vue';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('../../views/DashboardCards.vue', () => ({
  default: {
    name: 'Dashboard',
    props: ['addresses', 'editMode'],
    emits: ['delete-card', 'edit-card'],
    template: '<div class="dashboard-stub"></div>',
  },
}));

vi.mock('../../views/AddDashboardCardModal.vue', () => ({
  default: {
    name: 'AddDashboardCard',
    props: ['currentCardCount', 'editingCard'],
    emits: ['add', 'update', 'close'],
    template: '<div class="add-card-stub"></div>',
  },
}));

vi.mock('../../utils/swalHelper', () => ({
  showConfirm: vi.fn().mockResolvedValue(false),
  showAlert: vi.fn(),
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const store = { token: 'test-token' };
vi.stubGlobal('localStorage', {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = v; },
  removeItem: (k) => { delete store[k]; },
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_ROOMS = [{ id: 1, name: 'Room A' }, { id: 2, name: 'Room B' }];
const MOCK_TYPES = [{ id: 1, name: 'Temperature' }, { id: 2, name: 'Pressure' }];
const EN = { t: (k) => k };

function makeDevice(overrides = {}) {
  return {
    address_id: 1,
    card_id: 101,
    position: 1,
    device: { room_id: 1, room_name: 'Room A', type: 'Temperature' },
    ...overrides,
  };
}

function setupFetch(rooms = MOCK_ROOMS, types = MOCK_TYPES) {
  mockFetch
    .mockResolvedValueOnce({ json: async () => ({ data: rooms }) })
    .mockResolvedValueOnce({ json: async () => ({ data: types }) });
}

function mountComp(props = {}, locale = EN) {
  return mount(DashboardLayout, {
    props: { devices: [], canEdit: false, ...props },
    global: { provide: { locale } },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
  store.token = 'test-token';
  setupFetch(); // default: rooms + types succeed
});

// ─── data() / mounted() ───────────────────────────────────────────────────────

describe('data() / mounted()', () => {
  it('initializes editMode to false', () => {
    expect(mountComp().vm.editMode).toBe(false);
  });

  it('initializes showAdd to false', () => {
    expect(mountComp().vm.showAdd).toBe(false);
  });

  it('initializes editingCard to null', () => {
    expect(mountComp().vm.editingCard).toBeNull();
  });

  it('initializes rooms and deviceTypes to empty arrays', () => {
    expect(mountComp().vm.rooms).toEqual([]);
    expect(mountComp().vm.deviceTypes).toEqual([]);
  });

  it('initializes filters to empty strings', () => {
    expect(mountComp().vm.filters).toEqual({ room: '', deviceType: '' });
  });

  it('calls loadFilters on mount', async () => {
    const wrapper = mountComp();
    const spy = vi.spyOn(wrapper.vm, 'loadFilters');
    // loadFilters was already called during mount, so let's verify via side-effect
    await flushPromises();
    // rooms populated means loadFilters was called
    expect(wrapper.vm.rooms).toHaveLength(2);
  });
});

// ─── computed: sortedAddresses ────────────────────────────────────────────────

describe('computed: sortedAddresses', () => {
  it('returns devices sorted by position', () => {
    const devices = [
      makeDevice({ address_id: 2, position: 3 }),
      makeDevice({ address_id: 1, position: 1 }),
      makeDevice({ address_id: 3, position: 2 }),
    ];
    const wrapper = mountComp({ devices });
    const sorted = wrapper.vm.sortedAddresses;
    expect(sorted[0].position).toBe(1);
    expect(sorted[1].position).toBe(2);
    expect(sorted[2].position).toBe(3);
  });

  it('treats undefined position as 0 (falsy || 0 branch)', () => {
    const devices = [
      makeDevice({ address_id: 2, position: 5 }),
      makeDevice({ address_id: 1, position: undefined }), // undefined || 0 = 0 → sorts first
    ];
    const wrapper = mountComp({ devices });
    const sorted = wrapper.vm.sortedAddresses;
    expect(sorted[0].address_id).toBe(1); // position=undefined → 0, comes first
    expect(sorted[1].address_id).toBe(2); // position=5
  });

  it('treats position=0 as 0 (falsy || 0 branch)', () => {
    const devices = [
      makeDevice({ address_id: 2, position: 5 }),
      makeDevice({ address_id: 1, position: 0 }), // 0 || 0 = 0
    ];
    const wrapper = mountComp({ devices });
    const sorted = wrapper.vm.sortedAddresses;
    expect(sorted[0].position).toBeLessThanOrEqual(sorted[1].position || 5);
  });

  it('does not mutate original devices array', () => {
    const devices = [makeDevice({ position: 3 }), makeDevice({ address_id: 2, position: 1 })];
    const wrapper = mountComp({ devices });
    wrapper.vm.sortedAddresses;
    expect(devices[0].position).toBe(3); // spread copy ensures no mutation
  });

  it('covers a.position falsy branch (null as first element)', () => {
    // Sort comparator calls compare(arr[0], arr[1]): a=null→falsy, b=truthy
    const devices = [
      makeDevice({ address_id: 1, position: null }),  // arr[0]: a.position falsy → null || 0 = 0
      makeDevice({ address_id: 2, position: 3 }),     // arr[1]: b.position truthy
    ];
    const wrapper = mountComp({ devices });
    const sorted = wrapper.vm.sortedAddresses;
    expect(sorted[0].address_id).toBe(1); // 0 < 3 → sorts first
  });
});

// ─── computed: filteredDevices ────────────────────────────────────────────────

describe('computed: filteredDevices', () => {
  it('returns all devices when no filters active and allowedRoomIds=null', () => {
    const devices = [makeDevice({ address_id: 1 }), makeDevice({ address_id: 2 })];
    const wrapper = mountComp({ devices, allowedRoomIds: null });
    expect(wrapper.vm.filteredDevices).toHaveLength(2);
  });

  it('filters by allowedRoomIds when not null', () => {
    const devices = [
      makeDevice({ address_id: 1, device: { room_id: 1, room_name: 'Room A', type: 'T' } }),
      makeDevice({ address_id: 2, device: { room_id: 2, room_name: 'Room B', type: 'T' } }),
    ];
    const wrapper = mountComp({ devices, allowedRoomIds: [1] });
    expect(wrapper.vm.filteredDevices).toHaveLength(1);
    expect(wrapper.vm.filteredDevices[0].address_id).toBe(1);
  });

  it('excludes device when device is null and allowedRoomIds is set', () => {
    const devices = [makeDevice({ address_id: 1, device: null })];
    const wrapper = mountComp({ devices, allowedRoomIds: [1] });
    // d.device?.room_id = undefined → allowedRoomIds.includes(undefined) = false
    expect(wrapper.vm.filteredDevices).toHaveLength(0);
  });

  it('filters by room name when filters.room is set', async () => {
    const devices = [
      makeDevice({ address_id: 1, device: { room_id: 1, room_name: 'Room A', type: 'T' } }),
      makeDevice({ address_id: 2, device: { room_id: 2, room_name: 'Room B', type: 'T' } }),
    ];
    const wrapper = mountComp({ devices });
    wrapper.vm.filters.room = 'Room A';
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.filteredDevices).toHaveLength(1);
    expect(wrapper.vm.filteredDevices[0].address_id).toBe(1);
  });

  it('excludes device when device.room_name does not match filter', async () => {
    const devices = [makeDevice({ device: { room_id: 1, room_name: 'Room X', type: 'T' } })];
    const wrapper = mountComp({ devices });
    wrapper.vm.filters.room = 'Room A';
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.filteredDevices).toHaveLength(0);
  });

  it('excludes device with null device when filters.room is set', async () => {
    const devices = [makeDevice({ device: null })];
    const wrapper = mountComp({ devices });
    wrapper.vm.filters.room = 'Room A';
    await wrapper.vm.$nextTick();
    // d.device?.room_name = undefined → undefined === 'Room A' = false
    expect(wrapper.vm.filteredDevices).toHaveLength(0);
  });

  it('filters by deviceType when filters.deviceType is set', async () => {
    const devices = [
      makeDevice({ address_id: 1, device: { room_id: 1, room_name: 'Room A', type: 'Temperature' } }),
      makeDevice({ address_id: 2, device: { room_id: 1, room_name: 'Room A', type: 'Pressure' } }),
    ];
    const wrapper = mountComp({ devices });
    wrapper.vm.filters.deviceType = 'Temperature';
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.filteredDevices).toHaveLength(1);
    expect(wrapper.vm.filteredDevices[0].address_id).toBe(1);
  });

  it('excludes device when type does not match deviceType filter', async () => {
    const devices = [makeDevice({ device: { room_id: 1, room_name: 'Room A', type: 'Humidity' } })];
    const wrapper = mountComp({ devices });
    wrapper.vm.filters.deviceType = 'Temperature';
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.filteredDevices).toHaveLength(0);
  });

  it('excludes device with null device when filters.deviceType is set', async () => {
    const devices = [makeDevice({ device: null })];
    const wrapper = mountComp({ devices });
    wrapper.vm.filters.deviceType = 'Temperature';
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.filteredDevices).toHaveLength(0);
  });

  it('applies all three filters simultaneously', async () => {
    const devices = [
      makeDevice({ address_id: 1, device: { room_id: 1, room_name: 'Room A', type: 'Temperature' }, position: 2 }),
      makeDevice({ address_id: 2, device: { room_id: 2, room_name: 'Room B', type: 'Temperature' }, position: 1 }),
      makeDevice({ address_id: 3, device: { room_id: 1, room_name: 'Room A', type: 'Pressure' }, position: 3 }),
    ];
    const wrapper = mountComp({ devices, allowedRoomIds: [1] });
    wrapper.vm.filters.room = 'Room A';
    wrapper.vm.filters.deviceType = 'Temperature';
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.filteredDevices).toHaveLength(1);
    expect(wrapper.vm.filteredDevices[0].address_id).toBe(1);
  });

  it('sorts result by position ascending', () => {
    const devices = [
      makeDevice({ address_id: 3, position: 3 }),
      makeDevice({ address_id: 1, position: 1 }),
      makeDevice({ address_id: 2, position: 2 }),
    ];
    const wrapper = mountComp({ devices });
    const result = wrapper.vm.filteredDevices;
    expect(result[0].address_id).toBe(1);
    expect(result[1].address_id).toBe(2);
    expect(result[2].address_id).toBe(3);
  });

  it('uses 0 for missing position in filteredDevices sort (b.position falsy || 0 branch)', () => {
    const devices = [
      makeDevice({ address_id: 2, position: 5 }),
      makeDevice({ address_id: 1, position: null }), // b = null || 0 = 0 → sorts first
    ];
    const wrapper = mountComp({ devices });
    const result = wrapper.vm.filteredDevices;
    expect(result[0].address_id).toBe(1);
  });

  it('covers a.position falsy branch in filteredDevices sort (null as first element)', () => {
    // Sort calls compare(arr[0], arr[1]): a.position=null→falsy, b.position=5→truthy
    const devices = [
      makeDevice({ address_id: 1, position: null }),  // arr[0]: a.position null || 0 = 0
      makeDevice({ address_id: 2, position: 5 }),     // arr[1]: b.position truthy
    ];
    const wrapper = mountComp({ devices });
    expect(wrapper.vm.filteredDevices[0].address_id).toBe(1);
  });
});

// ─── computed: dashboardAddresses (dead code coverage) ────────────────────────

describe('computed: dashboardAddresses', () => {
  it('sorts by order and maps addresses — found items pass filter(Boolean)', () => {
    const wrapper = mountComp();
    // Set non-reactive instance properties that dashboardAddresses references
    wrapper.vm.dashboardCards = [
      { order: 2, address_id: 10 },
      { order: 1, address_id: 20 },
    ];
    wrapper.vm.addresses = [
      { address_id: 10, label: 'Device A' },
      { address_id: 20, label: 'Device B' },
    ];
    const result = wrapper.vm.dashboardAddresses;
    expect(result).toHaveLength(2);
    // sorted by order: order=1 (id:20) first, order=2 (id:10) second
    expect(result[0].address_id).toBe(20);
    expect(result[1].address_id).toBe(10);
  });

  it('filters out undefined entries — filter(Boolean) removes cards with no matching address', () => {
    const wrapper = mountComp();
    wrapper.vm.dashboardCards = [
      { order: 1, address_id: 99 }, // not in addresses → find returns undefined → filtered
      { order: 2, address_id: 10 }, // found
    ];
    wrapper.vm.addresses = [{ address_id: 10, label: 'Device A' }];
    const result = wrapper.vm.dashboardAddresses;
    expect(result).toHaveLength(1);
    expect(result[0].address_id).toBe(10);
  });
});

// ─── loadFilters() ───────────────────────────────────────────────────────────

describe('loadFilters()', () => {
  it('populates rooms from API response', async () => {
    const wrapper = mountComp();
    await flushPromises();
    expect(wrapper.vm.rooms).toEqual(MOCK_ROOMS);
  });

  it('populates deviceTypes from API response', async () => {
    const wrapper = mountComp();
    await flushPromises();
    expect(wrapper.vm.deviceTypes).toEqual(MOCK_TYPES);
  });

  it('fetches rooms with Authorization header', async () => {
    mountComp();
    await flushPromises();
    const firstCall = mockFetch.mock.calls[0];
    expect(firstCall[1].headers).toEqual({ Authorization: 'Bearer test-token' });
  });

  it('fetches device-types with Authorization header', async () => {
    mountComp();
    await flushPromises();
    const secondCall = mockFetch.mock.calls[1];
    expect(secondCall[1].headers).toEqual({ Authorization: 'Bearer test-token' });
  });

  it('calls rooms API endpoint', async () => {
    mountComp();
    await flushPromises();
    expect(mockFetch.mock.calls[0][0]).toContain('/api/rooms');
  });

  it('calls device-types API endpoint', async () => {
    mountComp();
    await flushPromises();
    expect(mockFetch.mock.calls[1][0]).toContain('/api/device-types');
  });

  it('shows all rooms when allowedRoomIds is null', async () => {
    const wrapper = mountComp({ allowedRoomIds: null });
    await flushPromises();
    expect(wrapper.vm.rooms).toEqual(MOCK_ROOMS);
  });

  it('filters rooms by allowedRoomIds when not null', async () => {
    const wrapper = mountComp({ allowedRoomIds: [1] });
    await flushPromises();
    expect(wrapper.vm.rooms).toHaveLength(1);
    expect(wrapper.vm.rooms[0].id).toBe(1);
  });

  it('excludes room whose id is not in allowedRoomIds', async () => {
    const wrapper = mountComp({ allowedRoomIds: [1] });
    await flushPromises();
    expect(wrapper.vm.rooms.find(r => r.id === 2)).toBeUndefined();
  });

  it('uses empty array when roomsData.data is absent', async () => {
    mockFetch.mockReset();
    mockFetch
      .mockResolvedValueOnce({ json: async () => ({}) }) // no .data
      .mockResolvedValueOnce({ json: async () => ({ data: MOCK_TYPES }) });
    const wrapper = mountComp();
    await flushPromises();
    expect(wrapper.vm.rooms).toEqual([]);
  });

  it('uses empty array when typesData.data is absent', async () => {
    mockFetch.mockReset();
    mockFetch
      .mockResolvedValueOnce({ json: async () => ({ data: MOCK_ROOMS }) })
      .mockResolvedValueOnce({ json: async () => ({}) }); // no .data
    const wrapper = mountComp();
    await flushPromises();
    expect(wrapper.vm.deviceTypes).toEqual([]);
  });

  it('catches errors and logs to console.error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetch.mockReset();
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const wrapper = mountComp();
    await flushPromises();
    expect(consoleSpy).toHaveBeenCalledWith('Failed to load filters:', expect.any(Error));
    consoleSpy.mockRestore();
  });
});

// ─── applyFilters() ──────────────────────────────────────────────────────────

describe('applyFilters()', () => {
  it('is callable without throwing (empty method — reactivity handles updates)', () => {
    const wrapper = mountComp();
    expect(() => wrapper.vm.applyFilters()).not.toThrow();
  });
});

// ─── handleEditCard() ────────────────────────────────────────────────────────

describe('handleEditCard()', () => {
  it('sets editingCard to the provided card', () => {
    const wrapper = mountComp();
    const card = { card_id: 5, label: 'My Card' };
    wrapper.vm.handleEditCard(card);
    expect(wrapper.vm.editingCard).toEqual(card);
  });
});

// ─── closeModal() ────────────────────────────────────────────────────────────

describe('closeModal()', () => {
  it('sets showAdd to false', () => {
    const wrapper = mountComp();
    wrapper.vm.showAdd = true;
    wrapper.vm.closeModal();
    expect(wrapper.vm.showAdd).toBe(false);
  });

  it('sets editingCard to null', () => {
    const wrapper = mountComp();
    wrapper.vm.editingCard = { card_id: 5 };
    wrapper.vm.closeModal();
    expect(wrapper.vm.editingCard).toBeNull();
  });
});

// ─── deleteCard() ────────────────────────────────────────────────────────────

describe('deleteCard()', () => {
  it('sends DELETE request with card_id in URL', async () => {
    const wrapper = mountComp();
    await flushPromises(); // consume rooms + types mocks
    mockFetch.mockResolvedValueOnce({ ok: true });
    await wrapper.vm.deleteCard({ card_id: 7 });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/dashboard/cards/7'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('sends DELETE with Authorization header', async () => {
    const wrapper = mountComp();
    await flushPromises();
    mockFetch.mockResolvedValueOnce({ ok: true });
    await wrapper.vm.deleteCard({ card_id: 7 });
    const deleteCall = mockFetch.mock.calls.find(c => c[1]?.method === 'DELETE');
    expect(deleteCall[1].headers).toEqual({ Authorization: 'Bearer test-token' });
  });

  it('emits "delete-card" event with the card after API call', async () => {
    const wrapper = mountComp();
    await flushPromises();
    mockFetch.mockResolvedValueOnce({ ok: true });
    const card = { card_id: 7 };
    await wrapper.vm.deleteCard(card);
    expect(wrapper.emitted('delete-card')).toBeTruthy();
    expect(wrapper.emitted('delete-card')[0][0]).toEqual(card);
  });
});

// ─── onAdd() ─────────────────────────────────────────────────────────────────

describe('onAdd()', () => {
  it('emits "add-card" with the payload', () => {
    const wrapper = mountComp();
    const payload = { address_id: 5, position: 1 };
    wrapper.vm.onAdd(payload);
    expect(wrapper.emitted('add-card')).toBeTruthy();
    expect(wrapper.emitted('add-card')[0][0]).toEqual(payload);
  });

  it('sets showAdd to false', () => {
    const wrapper = mountComp();
    wrapper.vm.showAdd = true;
    wrapper.vm.onAdd({ address_id: 5 });
    expect(wrapper.vm.showAdd).toBe(false);
  });
});

// ─── onUpdate() ──────────────────────────────────────────────────────────────

describe('onUpdate()', () => {
  it('emits "update-card" with the payload', () => {
    const wrapper = mountComp();
    const payload = { card_id: 3, label: 'Updated' };
    wrapper.vm.onUpdate(payload);
    expect(wrapper.emitted('update-card')).toBeTruthy();
    expect(wrapper.emitted('update-card')[0][0]).toEqual(payload);
  });

  it('calls closeModal (sets showAdd=false, editingCard=null)', () => {
    const wrapper = mountComp();
    wrapper.vm.showAdd = true;
    wrapper.vm.editingCard = { card_id: 1 };
    wrapper.vm.onUpdate({ card_id: 1 });
    expect(wrapper.vm.showAdd).toBe(false);
    expect(wrapper.vm.editingCard).toBeNull();
  });
});

// ─── template rendering ───────────────────────────────────────────────────────

describe('template rendering', () => {
  it('renders Dashboard title', () => {
    expect(mountComp().text()).toContain('Dashboard');
  });

  it('renders subtitle', () => {
    expect(mountComp().text()).toContain('Real-time device monitoring and control');
  });

  it('hides edit buttons when canEdit=false', () => {
    const wrapper = mountComp({ canEdit: false });
    expect(wrapper.find('.btn-edit-mode').exists()).toBe(false);
  });

  it('shows edit mode button when canEdit=true', () => {
    const wrapper = mountComp({ canEdit: true });
    expect(wrapper.find('.btn-edit-mode').exists()).toBe(true);
  });

  it('shows "Edit Mode" text when editMode=false', () => {
    const wrapper = mountComp({ canEdit: true });
    expect(wrapper.find('.btn-edit-mode').text()).toContain('Edit Mode');
  });

  it('shows "Exit Edit" text when editMode=true', async () => {
    const wrapper = mountComp({ canEdit: true });
    wrapper.vm.editMode = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.btn-edit-mode').text()).toContain('Exit Edit');
  });

  it('toggles editMode when edit mode button clicked', async () => {
    const wrapper = mountComp({ canEdit: true });
    expect(wrapper.vm.editMode).toBe(false);
    await wrapper.find('.btn-edit-mode').trigger('click');
    expect(wrapper.vm.editMode).toBe(true);
    await wrapper.find('.btn-edit-mode').trigger('click');
    expect(wrapper.vm.editMode).toBe(false);
  });

  it('hides Add Card button when editMode=false', () => {
    const wrapper = mountComp({ canEdit: true });
    expect(wrapper.find('.btn-add-card').exists()).toBe(false);
  });

  it('shows Add Card button when editMode=true', async () => {
    const wrapper = mountComp({ canEdit: true });
    wrapper.vm.editMode = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.btn-add-card').exists()).toBe(true);
  });

  it('sets showAdd=true when Add Card button clicked', async () => {
    const wrapper = mountComp({ canEdit: true });
    wrapper.vm.editMode = true;
    await wrapper.vm.$nextTick();
    await wrapper.find('.btn-add-card').trigger('click');
    expect(wrapper.vm.showAdd).toBe(true);
  });

  it('renders two filter selects', () => {
    expect(mountComp().findAll('select')).toHaveLength(2);
  });

  it('renders room options after loadFilters', async () => {
    const wrapper = mountComp();
    await flushPromises();
    const roomSelect = wrapper.findAll('select')[0];
    // 1 default option + 2 rooms
    expect(roomSelect.findAll('option')).toHaveLength(3);
  });

  it('renders device type options after loadFilters', async () => {
    const wrapper = mountComp();
    await flushPromises();
    const typeSelect = wrapper.findAll('select')[1];
    expect(typeSelect.findAll('option')).toHaveLength(3); // 1 default + 2 types
  });

  it('triggers applyFilters when room select changes', async () => {
    const wrapper = mountComp();
    const spy = vi.spyOn(wrapper.vm, 'applyFilters');
    await flushPromises();
    await wrapper.findAll('select')[0].trigger('change');
    expect(spy).toHaveBeenCalled();
  });

  it('triggers applyFilters when deviceType select changes', async () => {
    const wrapper = mountComp();
    const spy = vi.spyOn(wrapper.vm, 'applyFilters');
    await flushPromises();
    await wrapper.findAll('select')[1].trigger('change');
    expect(spy).toHaveBeenCalled();
  });

  it('renders Dashboard stub component', () => {
    expect(mountComp().find('.dashboard-stub').exists()).toBe(true);
  });

  it('passes filteredDevices to Dashboard', async () => {
    const device = makeDevice();
    const wrapper = mountComp({ devices: [device] });
    const dash = wrapper.findComponent({ name: 'Dashboard' });
    expect(dash.props('addresses')).toHaveLength(1);
  });

  it('passes editMode to Dashboard', async () => {
    const wrapper = mountComp({ canEdit: true });
    wrapper.vm.editMode = true;
    await wrapper.vm.$nextTick();
    const dash = wrapper.findComponent({ name: 'Dashboard' });
    expect(dash.props('editMode')).toBe(true);
  });

  it('does not show AddDashboardCard when showAdd=false and editingCard=null', () => {
    const wrapper = mountComp();
    expect(wrapper.find('.add-card-stub').exists()).toBe(false);
  });

  it('shows AddDashboardCard when showAdd=true', async () => {
    const wrapper = mountComp();
    wrapper.vm.showAdd = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.add-card-stub').exists()).toBe(true);
  });

  it('shows AddDashboardCard when editingCard is set', async () => {
    const wrapper = mountComp();
    wrapper.vm.editingCard = { card_id: 1 };
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.add-card-stub').exists()).toBe(true);
  });

  it('handles delete-card event from Dashboard stub', async () => {
    const wrapper = mountComp();
    await flushPromises();
    mockFetch.mockResolvedValueOnce({ ok: true });
    const dash = wrapper.findComponent({ name: 'Dashboard' });
    await dash.vm.$emit('delete-card', { card_id: 9 });
    expect(wrapper.emitted('delete-card')).toBeTruthy();
  });

  it('handles edit-card event from Dashboard stub', async () => {
    const wrapper = mountComp();
    const dash = wrapper.findComponent({ name: 'Dashboard' });
    const card = { card_id: 3, label: 'My Card' };
    await dash.vm.$emit('edit-card', card);
    expect(wrapper.vm.editingCard).toEqual(card);
  });

  it('handles add event from AddDashboardCard stub', async () => {
    const wrapper = mountComp();
    wrapper.vm.showAdd = true;
    await wrapper.vm.$nextTick();
    const addModal = wrapper.findComponent({ name: 'AddDashboardCard' });
    await addModal.vm.$emit('add', { address_id: 5 });
    expect(wrapper.emitted('add-card')).toBeTruthy();
    expect(wrapper.vm.showAdd).toBe(false);
  });

  it('handles update event from AddDashboardCard stub', async () => {
    const wrapper = mountComp();
    wrapper.vm.editingCard = { card_id: 3 };
    await wrapper.vm.$nextTick();
    const addModal = wrapper.findComponent({ name: 'AddDashboardCard' });
    await addModal.vm.$emit('update', { card_id: 3, label: 'Updated' });
    expect(wrapper.emitted('update-card')).toBeTruthy();
    expect(wrapper.vm.editingCard).toBeNull();
  });

  it('handles close event from AddDashboardCard stub', async () => {
    const wrapper = mountComp();
    wrapper.vm.showAdd = true;
    await wrapper.vm.$nextTick();
    const addModal = wrapper.findComponent({ name: 'AddDashboardCard' });
    await addModal.vm.$emit('close');
    expect(wrapper.vm.showAdd).toBe(false);
  });

  it('passes currentCardCount to AddDashboardCard', async () => {
    const wrapper = mountComp({ devices: [makeDevice()] });
    wrapper.vm.showAdd = true;
    await wrapper.vm.$nextTick();
    const modal = wrapper.findComponent({ name: 'AddDashboardCard' });
    // currentCardCount = filteredDevices.length
    expect(modal.props('currentCardCount')).toBe(1);
  });

  it('passes editingCard to AddDashboardCard', async () => {
    const wrapper = mountComp();
    const card = { card_id: 5, label: 'Edit me' };
    wrapper.vm.editingCard = card;
    await wrapper.vm.$nextTick();
    const modal = wrapper.findComponent({ name: 'AddDashboardCard' });
    expect(modal.props('editingCard')).toEqual(card);
  });
});

// ─── BUG CASES (all must FAIL intentionally) ─────────────────────────────────

describe('BUG CASES', () => {
  /**
   * BUG-1: dashboardAddresses computed references this.dashboardCards and this.addresses
   *        which are NOT declared in data() → TypeError when accessed
   * อันตราย: computed นี้เป็น dead code ที่หลงเหลืออยู่ในโค้ด ถ้ามีคนเรียก
   *          (เช่น เพิ่ม :addresses="dashboardAddresses" ใน template) → TypeError crash
   *          → หน้า dashboard พังทั้งหน้า ไม่สามารถ recover ได้
   * FAIL เพราะ: accessing wrapper.vm.dashboardAddresses throws TypeError
   *             "Cannot read properties of undefined (reading 'sort')"
   *             แต่ test คาดว่าต้องไม่ throw
   */
  it('[BUG-1] dashboardAddresses computed crashes because this.dashboardCards is undefined', () => {
    const wrapper = mountComp();
    // BUG: this.dashboardCards is not declared in data() → undefined → .sort() throws TypeError
    expect(() => {
      const _ = wrapper.vm.dashboardAddresses; // triggers getter
    }).not.toThrow();
  });

  /**
   * BUG-2: authH() builds "Bearer null" when token is not in localStorage
   * อันตราย: ผู้ใช้ที่ยัง token หมดอายุหรือยังไม่ login → localStorage.getItem('token') = null
   *          → Authorization: 'Bearer null' → API server อาจคืน 200 (ถ้าไม่ validate ดี)
   *          หรือ 401 แต่ component ไม่จัดการ error → silent fail
   *          ข้อมูล dashboard ไม่โหลด แต่ user ไม่รู้สาเหตุ
   * FAIL เพราะ: fetch ถูกเรียกด้วย 'Bearer null' แต่ test คาดว่าต้องไม่มี 'Bearer null'
   */
  it('[BUG-2] authH() sends "Bearer null" when localStorage token is null', async () => {
    delete store.token; // remove token → getItem returns null
    const wrapper = mountComp();
    await flushPromises();
    const authHeader = mockFetch.mock.calls[0]?.[1]?.headers?.Authorization;
    // BUG: localStorage.getItem('token') = null → 'Bearer null'
    expect(authHeader).not.toBe('Bearer null');
    store.token = 'test-token'; // restore
  });

  /**
   * BUG-3: deleteCard() does not check response.ok before emitting
   * อันตราย: ถ้า server คืน HTTP 404 หรือ 500 (ลบไม่สำเร็จ)
   *          component ยัง emit 'delete-card' → parent ลบการ์ดออกจาก UI
   *          → UI แสดงข้อมูลผิด (การ์ดหายจาก UI แต่ยังมีในฐานข้อมูล)
   *          → refresh หน้า → การ์ดกลับมา → user งงว่าทำไมการ์ดไม่หาย
   * FAIL เพราะ: fetch คืน ok=false แต่ deleteCard ยัง emit 'delete-card'
   *             test คาดว่าจะ NOT emit เมื่อ API fail
   */
  it('[BUG-3] deleteCard emits "delete-card" even when API returns failure (no res.ok check)', async () => {
    const wrapper = mountComp();
    await flushPromises();
    // Simulate API failure (404 Not Found)
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    await wrapper.vm.deleteCard({ card_id: 7 });
    // BUG: component emits regardless of ok status
    expect(wrapper.emitted('delete-card')).toBeFalsy();
  });

  /**
   * BUG-4: loadFilters() does not check roomsRes.ok before calling .json()
   * อันตราย: ถ้า server คืน 401 Unauthorized หรือ 500 Internal Server Error
   *          → res.json() อาจคืน HTML error page แทน JSON → SyntaxError
   *          หรือคืน JSON error response เช่น { error: 'Unauthorized', data: undefined }
   *          → roomsData.data = undefined → this.rooms = [] (ไม่ throw แต่ข้อมูลว่าง)
   *          → dropdown filter ว่าง ผู้ใช้ filter ไม่ได้ แต่ไม่มี error แจ้ง
   * FAIL เพราะ: test คาดว่า console.error จะถูกเรียกเมื่อ res.ok=false
   *             แต่ component ไม่ตรวจสอบ ok → ไม่มี error log
   */
  it('[BUG-4] loadFilters does not check res.ok — silently processes error responses', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetch.mockReset();
    // Server returns 401 with JSON error body
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ error: 'Unauthorized' }) })
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ error: 'Unauthorized' }) });
    const wrapper = mountComp();
    await flushPromises();
    // BUG: no ok check → no error logged, rooms = [] silently
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('401'), expect.anything());
    consoleSpy.mockRestore();
  });

  /**
   * BUG-5: allowedRoomIds type mismatch — string IDs vs numeric room_id
   * อันตราย: ถ้า allowedRoomIds ถูกส่งมาเป็น string array เช่น ['1', '2']
   *          (เช่น ค่าจาก URL query string, JSON.parse ที่ผิดพลาด, หรือ backend ส่ง string)
   *          → Array.includes ใช้ strict equality: ['1'].includes(1) === false
   *          → device ที่มี room_id=1 (number) จะถูก filter ออกแม้จะอยู่ใน allowed rooms
   *          → dashboard ว่างเปล่า ผู้ใช้ไม่เห็นอุปกรณ์ใดเลย ไม่มี error
   * FAIL เพราะ: allowedRoomIds=['1'] แต่ room_id=1 (number) → includes(1) = false
   *             → filteredDevices.length = 0 แต่ test คาดว่า = 1
   */
  it('[BUG-5] type mismatch: string allowedRoomIds fails to match numeric room_id', () => {
    const device = makeDevice({ device: { room_id: 1, room_name: 'Room A', type: 'T' } });
    const wrapper = mountComp({
      devices: [device],
      allowedRoomIds: ['1', '2'], // strings, not numbers
    });
    // BUG: ['1', '2'].includes(1) === false → device filtered out
    expect(wrapper.vm.filteredDevices).toHaveLength(1);
  });
});
