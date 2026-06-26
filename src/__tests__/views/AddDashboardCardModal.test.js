import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import AddDashboardCardModal from '../../views/AddDashboardCardModal.vue';
import { showAlert } from '../../utils/swalHelper';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../utils/swalHelper', () => ({
  showAlert: vi.fn().mockResolvedValue(undefined),
  showConfirm: vi.fn().mockResolvedValue(true),
}));

const EN = { current: 'en', t: (k) => k };
const TH = { current: 'th', t: (k) => k };

const store = {};
vi.stubGlobal('localStorage', {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = v; },
  removeItem: (k) => { delete store[k]; },
});

const MOCK_DEVICES = [
  {
    id: 1,
    name: 'Device A',
    addresses: [
      { id: 10, label: 'Temp', plc_address: 'D100' },
      { id: 11, label: 'Speed', plc_address: 'D200' },
    ],
  },
  {
    id: 2,
    name: 'Device B',
    addresses: [
      { id: 20, label: 'Pressure', plc_address: 'D300' },
    ],
  },
];

const MOCK_ROOMS = [
  { id: 1, name: 'Room A' },
  { id: 2, name: 'Room B' },
];

let mockFetch;

function setupFetch(opts = {}) {
  mockFetch = vi.fn((url) => {
    if (url.includes('/api/devices')) {
      if (opts.devicesThrow) return Promise.reject(new Error('Network error'));
      const payload = opts.devicesPayload !== undefined ? opts.devicesPayload : { data: MOCK_DEVICES };
      return Promise.resolve({ ok: true, json: () => Promise.resolve(payload) });
    }
    if (url.includes('/api/rooms')) {
      if (opts.roomsThrow) return Promise.reject(new Error('Network error'));
      const payload = opts.roomsPayload !== undefined ? opts.roomsPayload : { data: MOCK_ROOMS };
      return Promise.resolve({ ok: true, json: () => Promise.resolve(payload) });
    }
    if (url.includes('/dashboard/cards')) {
      if (opts.dashboardResponse !== undefined) return Promise.resolve(opts.dashboardResponse);
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
  vi.stubGlobal('fetch', mockFetch);
}

function mountModal(props = {}, locale = EN) {
  return mount(AddDashboardCardModal, {
    props,
    global: { provide: { locale } },
  });
}

function setValidState(vm) {
  vm.selectedDeviceId = 1;
  vm.selectedAddressId = 10;
  vm.selectedDisplayType = 'number';
  vm.selectedPosition = 1;
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.keys(store).forEach((k) => delete store[k]);
  store.token = 'test-token';
  setupFetch();
});

// ═══════════════════════════════════════════════════════════
// 1. Render
// ═══════════════════════════════════════════════════════════
describe('AddDashboardCardModal > Render', () => {
  it('renders modal structure (header/body/footer)', async () => {
    const wrapper = mountModal();
    await flushPromises();
    expect(wrapper.find('.modal').exists()).toBe(true);
    expect(wrapper.find('.modal-header').exists()).toBe(true);
    expect(wrapper.find('.modal-body').exists()).toBe(true);
    expect(wrapper.find('.modal-footer').exists()).toBe(true);
  });

  it('title = "Add Card" เมื่อไม่มี editingCard (ternary false branch)', async () => {
    const wrapper = mountModal();
    await flushPromises();
    expect(wrapper.find('.modal-title').text()).toContain('Add Card');
  });

  it('title = "Edit Card" เมื่อมี editingCard (ternary true branch)', async () => {
    const editingCard = { card_id: 1, address_id: 10, display_type: 'number', position: 1, device: { room_id: 1 } };
    const wrapper = mountModal({ editingCard });
    await flushPromises();
    expect(wrapper.find('.modal-title').text()).toContain('Edit Card');
  });

  it('Address select disabled เมื่อยังไม่เลือก device (:disabled="!selectedDeviceId")', async () => {
    const wrapper = mountModal();
    await flushPromises();
    const selects = wrapper.findAll('select');
    expect(selects[2].attributes('disabled')).toBeDefined();
  });

  it('Address select enabled หลังเลือก device', async () => {
    const wrapper = mountModal();
    await flushPromises();
    wrapper.vm.selectedDeviceId = 1;
    await wrapper.vm.$nextTick();
    const selects = wrapper.findAll('select');
    expect(selects[2].attributes('disabled')).toBeUndefined();
  });

  it('Display Type + Position ซ่อนอยู่เมื่อยังไม่เลือก address (v-if="selectedAddress" = false)', async () => {
    const wrapper = mountModal();
    await flushPromises();
    expect(wrapper.text()).not.toContain('Insert Position');
  });

  it('Display Type + Position แสดงหลังเลือก device + address (v-if="selectedAddress" = true)', async () => {
    const wrapper = mountModal();
    await flushPromises();
    wrapper.vm.selectedDeviceId = 1;
    wrapper.vm.selectedAddressId = 10;
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('Insert Position');
  });

  it('Room select มี Unassigned option + rooms จาก API', async () => {
    const wrapper = mountModal();
    await flushPromises();
    const opts = wrapper.findAll('select')[0].findAll('option');
    expect(opts.length).toBe(3); // Unassigned + Room A + Room B
    expect(opts[1].text()).toBe('Room A');
    expect(opts[2].text()).toBe('Room B');
  });

  it('Device select มี options จาก API', async () => {
    const wrapper = mountModal();
    await flushPromises();
    const opts = wrapper.findAll('select')[1].findAll('option');
    expect(opts.length).toBe(3); // disabled + Device A + Device B
  });

  it('Footer มีปุ่ม Cancel และ Submit', () => {
    const wrapper = mountModal();
    expect(wrapper.findAll('.modal-footer button').length).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════
// 2. Mounted – Data Loading
// ═══════════════════════════════════════════════════════════
describe('AddDashboardCardModal > Mounted: Data Loading', () => {
  it('เรียก fetch /api/devices และ /api/rooms พร้อมกัน', async () => {
    mountModal();
    await flushPromises();
    const urls = mockFetch.mock.calls.map((c) => c[0]);
    expect(urls.some((u) => u.includes('/api/devices'))).toBe(true);
    expect(urls.some((u) => u.includes('/api/rooms'))).toBe(true);
  });

  it('ส่ง Authorization header ด้วย token จาก localStorage', async () => {
    mountModal();
    await flushPromises();
    const deviceCall = mockFetch.mock.calls.find((c) => c[0].includes('/api/devices'));
    expect(deviceCall[1].headers['Authorization']).toBe('Bearer test-token');
  });

  it('devices = devicesData.data เมื่อ API ตอบ { data: [...] } (branch 1)', async () => {
    const wrapper = mountModal();
    await flushPromises();
    expect(wrapper.vm.devices).toEqual(MOCK_DEVICES);
  });

  it('devices = devicesData เมื่อ API ตอบ array โดยตรง, ไม่มี .data (branch 2)', async () => {
    setupFetch({ devicesPayload: MOCK_DEVICES });
    const wrapper = mountModal();
    await flushPromises();
    expect(wrapper.vm.devices).toEqual(MOCK_DEVICES);
  });

  it('devices = [] เมื่อ API ตอบค่า falsy (branch 3: || [])', async () => {
    // devicesPayload = false → devicesData.data = undefined → devicesData = false → [] used
    setupFetch({ devicesPayload: false });
    const wrapper = mountModal();
    await flushPromises();
    expect(wrapper.vm.devices).toEqual([]);
  });

  it('rooms = roomsData.data เมื่อ API ตอบ { data: [...] } (branch 1)', async () => {
    const wrapper = mountModal();
    await flushPromises();
    expect(wrapper.vm.rooms).toEqual(MOCK_ROOMS);
  });

  it('rooms = roomsData เมื่อ API ตอบ array โดยตรง (branch 2)', async () => {
    setupFetch({ roomsPayload: MOCK_ROOMS });
    const wrapper = mountModal();
    await flushPromises();
    expect(wrapper.vm.rooms).toEqual(MOCK_ROOMS);
  });

  it('rooms = [] เมื่อ API ตอบค่า falsy (branch 3: || [])', async () => {
    setupFetch({ roomsPayload: false });
    const wrapper = mountModal();
    await flushPromises();
    expect(wrapper.vm.rooms).toEqual([]);
  });

  it('fetch ล้มเหลว → catch → devices=[], rooms=[], console.error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    setupFetch({ devicesThrow: true });
    const wrapper = mountModal();
    await flushPromises();
    expect(wrapper.vm.devices).toEqual([]);
    expect(wrapper.vm.rooms).toEqual([]);
    expect(spy).toHaveBeenCalledWith('Failed to load devices:', expect.any(Error));
    spy.mockRestore();
  });

  it('editingCard → ตั้งค่า room_id, deviceId, addressId, displayType, position', async () => {
    const editingCard = {
      card_id: 5, address_id: 10, display_type: 'number_gauge', position: 2,
      device: { room_id: 1 },
    };
    const wrapper = mountModal({ editingCard });
    await flushPromises();
    expect(wrapper.vm.form.room_id).toBe(1);
    expect(wrapper.vm.selectedDeviceId).toBe(1);
    expect(wrapper.vm.selectedAddressId).toBe(10);
    expect(wrapper.vm.selectedDisplayType).toBe('number_gauge');
    expect(wrapper.vm.selectedPosition).toBe(2);
  });

  it('editingCard ไม่มี device field → room_id = "" (optional chaining falsy)', async () => {
    const editingCard = { card_id: 5, address_id: 10, display_type: 'number', position: 1 };
    const wrapper = mountModal({ editingCard });
    await flushPromises();
    expect(wrapper.vm.form.room_id).toBe('');
  });

  it('editingCard ไม่มี device.room_id → room_id = "" (|| "" branch)', async () => {
    const editingCard = { card_id: 5, address_id: 10, display_type: 'number', position: 1, device: {} };
    const wrapper = mountModal({ editingCard });
    await flushPromises();
    expect(wrapper.vm.form.room_id).toBe('');
  });

  it('editingCard ไม่มี position → selectedPosition = 1 (|| 1 branch)', async () => {
    const editingCard = { card_id: 5, address_id: 10, display_type: 'number', device: { room_id: 1 } };
    const wrapper = mountModal({ editingCard });
    await flushPromises();
    expect(wrapper.vm.selectedPosition).toBe(1);
  });

  it('editingCard.address_id ไม่ตรงกับ device ใด → selectedDeviceId ยังเป็น "" (loop ครบไม่เจอ)', async () => {
    const editingCard = { card_id: 5, address_id: 999, display_type: 'number', position: 1, device: { room_id: 1 } };
    const wrapper = mountModal({ editingCard });
    await flushPromises();
    expect(wrapper.vm.selectedDeviceId).toBe('');
  });
});

// ═══════════════════════════════════════════════════════════
// 3. Computed
// ═══════════════════════════════════════════════════════════
describe('AddDashboardCardModal > Computed', () => {
  it('isEditMode = false เมื่อไม่มี editingCard', async () => {
    const wrapper = mountModal();
    await flushPromises();
    expect(wrapper.vm.isEditMode).toBe(false);
  });

  it('isEditMode = true เมื่อมี editingCard', async () => {
    const wrapper = mountModal({ editingCard: { card_id: 1, address_id: 10, display_type: 'number', position: 1 } });
    await flushPromises();
    expect(wrapper.vm.isEditMode).toBe(true);
  });

  it('selectedDevice คืน device ที่ตรงกับ selectedDeviceId', async () => {
    const wrapper = mountModal();
    await flushPromises();
    wrapper.vm.selectedDeviceId = 1;
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.selectedDevice).toEqual(MOCK_DEVICES[0]);
  });

  it('selectedDevice คืน undefined เมื่อไม่เลือก device', async () => {
    const wrapper = mountModal();
    await flushPromises();
    expect(wrapper.vm.selectedDevice).toBeUndefined();
  });

  it('filteredAddresses คืน addresses ของ device ที่เลือก', async () => {
    const wrapper = mountModal();
    await flushPromises();
    wrapper.vm.selectedDeviceId = 1;
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.filteredAddresses).toEqual(MOCK_DEVICES[0].addresses);
  });

  it('filteredAddresses = [] เมื่อไม่มี selectedDevice (optional chaining + || [])', async () => {
    const wrapper = mountModal();
    await flushPromises();
    expect(wrapper.vm.filteredAddresses).toEqual([]);
  });

  it('filteredAddresses = [] เมื่อ device ไม่มี addresses field', async () => {
    const wrapper = mountModal();
    await flushPromises();
    wrapper.vm.devices = [{ id: 1, name: 'No Addr' }];
    wrapper.vm.selectedDeviceId = 1;
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.filteredAddresses).toEqual([]);
  });

  it('selectedAddress คืน address ที่ตรงกับ selectedAddressId', async () => {
    const wrapper = mountModal();
    await flushPromises();
    wrapper.vm.selectedDeviceId = 1;
    wrapper.vm.selectedAddressId = 10;
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.selectedAddress).toEqual(MOCK_DEVICES[0].addresses[0]);
  });

  it('selectedAddress คืน undefined เมื่อไม่มีที่ตรงกัน', async () => {
    const wrapper = mountModal();
    await flushPromises();
    expect(wrapper.vm.selectedAddress).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════
// 4. getValidationError()
// ═══════════════════════════════════════════════════════════
describe('AddDashboardCardModal > getValidationError()', () => {
  it('!selectedDeviceId → error EN', async () => {
    const wrapper = mountModal({}, EN);
    await flushPromises();
    expect(wrapper.vm.getValidationError()).toBe('Please select a Device');
  });

  it('!selectedDeviceId → error TH', async () => {
    const wrapper = mountModal({}, TH);
    await flushPromises();
    expect(wrapper.vm.getValidationError()).toBe('กรุณาเลือก Device');
  });

  it('!selectedAddressId → error EN', async () => {
    const wrapper = mountModal({}, EN);
    await flushPromises();
    wrapper.vm.selectedDeviceId = 1;
    expect(wrapper.vm.getValidationError()).toBe('Please select an Address');
  });

  it('!selectedAddressId → error TH', async () => {
    const wrapper = mountModal({}, TH);
    await flushPromises();
    wrapper.vm.selectedDeviceId = 1;
    expect(wrapper.vm.getValidationError()).toBe('กรุณาเลือก Address');
  });

  it('!selectedDisplayType → error EN', async () => {
    const wrapper = mountModal({}, EN);
    await flushPromises();
    wrapper.vm.selectedDeviceId = 1;
    wrapper.vm.selectedAddressId = 10;
    expect(wrapper.vm.getValidationError()).toBe('Please select a Display Type');
  });

  it('!selectedDisplayType → error TH', async () => {
    const wrapper = mountModal({}, TH);
    await flushPromises();
    wrapper.vm.selectedDeviceId = 1;
    wrapper.vm.selectedAddressId = 10;
    expect(wrapper.vm.getValidationError()).toBe('กรุณาเลือก Display Type');
  });

  it('selectedPosition = null → !null = true → error EN (! branch)', async () => {
    const wrapper = mountModal({}, EN);
    await flushPromises();
    wrapper.vm.selectedDeviceId = 1;
    wrapper.vm.selectedAddressId = 10;
    wrapper.vm.selectedDisplayType = 'number';
    wrapper.vm.selectedPosition = null;
    expect(wrapper.vm.getValidationError()).toBe('Please select a valid position');
  });

  it('selectedPosition = -1 → !(-1)=false แต่ -1 < 1 → error TH (< 1 branch)', async () => {
    const wrapper = mountModal({}, TH);
    await flushPromises();
    wrapper.vm.selectedDeviceId = 1;
    wrapper.vm.selectedAddressId = 10;
    wrapper.vm.selectedDisplayType = 'number';
    wrapper.vm.selectedPosition = -1;
    expect(wrapper.vm.getValidationError()).toBe('กรุณาเลือกตำแหน่งที่ถูกต้อง');
  });

  it('ทุกฟิลด์ครบ → คืน "" (valid, no error)', async () => {
    const wrapper = mountModal();
    await flushPromises();
    setValidState(wrapper.vm);
    expect(wrapper.vm.getValidationError()).toBe('');
  });
});

// ═══════════════════════════════════════════════════════════
// 5. submit() – Add Mode
// ═══════════════════════════════════════════════════════════
describe('AddDashboardCardModal > submit(): Add Mode', () => {
  it('validation fail → showAlert warning, ไม่เรียก dashboard API', async () => {
    const wrapper = mountModal({}, EN);
    await flushPromises();
    await wrapper.vm.submit();
    expect(showAlert).toHaveBeenCalledWith('Incomplete Data', expect.any(String), 'warning');
    expect(mockFetch.mock.calls.some((c) => c[0].includes('/dashboard'))).toBe(false);
  });

  it('validation fail locale TH → showAlert ใช้ title ภาษาไทย', async () => {
    const wrapper = mountModal({}, TH);
    await flushPromises();
    await wrapper.vm.submit();
    expect(showAlert).toHaveBeenCalledWith('ข้อมูลไม่ครบถ้วน', expect.any(String), 'warning');
  });

  it('POST success → showAlert success, emit "add", emit "close"', async () => {
    const wrapper = mountModal({}, EN);
    await flushPromises();
    setValidState(wrapper.vm);
    await wrapper.vm.submit();
    expect(showAlert).toHaveBeenCalledWith('Success!', 'Card added to dashboard', 'success');
    expect(wrapper.emitted('add')).toBeTruthy();
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('POST success locale TH → showAlert ข้อความไทย', async () => {
    const wrapper = mountModal({}, TH);
    await flushPromises();
    setValidState(wrapper.vm);
    await wrapper.vm.submit();
    expect(showAlert).toHaveBeenCalledWith('สำเร็จ!', 'เพิ่มการ์ดลงแดชบอร์ดแล้ว', 'success');
  });

  it('POST success → emit "add" ส่ง payload ถูกต้อง', async () => {
    const wrapper = mountModal({}, EN);
    await flushPromises();
    setValidState(wrapper.vm);
    await wrapper.vm.submit();
    const payload = wrapper.emitted('add')[0][0];
    expect(payload.address_id).toBe(10);
    expect(payload.display_type).toBe('number');
    expect(payload.position).toBe(1);
  });

  it('POST ส่ง body ถูกต้องไปยัง API', async () => {
    const wrapper = mountModal({}, EN);
    await flushPromises();
    setValidState(wrapper.vm);
    await wrapper.vm.submit();
    const dashCall = mockFetch.mock.calls.find((c) => c[0].includes('/dashboard/cards'));
    const body = JSON.parse(dashCall[1].body);
    expect(dashCall[1].method).toBe('POST');
    expect(body.address_id).toBe(10);
    expect(body.display_type).toBe('number');
    expect(body.position).toBe(1);
  });

  it('POST ส่ง Authorization header', async () => {
    const wrapper = mountModal({}, EN);
    await flushPromises();
    setValidState(wrapper.vm);
    await wrapper.vm.submit();
    const dashCall = mockFetch.mock.calls.find((c) => c[0].includes('/dashboard/cards'));
    expect(dashCall[1].headers['Authorization']).toBe('Bearer test-token');
  });

  it('POST !response.ok + มี err.message → showAlert ใช้ err.message', async () => {
    setupFetch({
      dashboardResponse: {
        ok: false,
        json: () => Promise.resolve({ message: 'Slot limit reached' }),
      },
    });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const wrapper = mountModal({}, EN);
    await flushPromises();
    setValidState(wrapper.vm);
    await wrapper.vm.submit();
    expect(showAlert).toHaveBeenCalledWith('Error', 'Slot limit reached', 'error');
    spy.mockRestore();
  });

  it('POST !response.ok ไม่มี err.message locale EN → showAlert fallback EN', async () => {
    setupFetch({
      dashboardResponse: {
        ok: false,
        json: () => Promise.resolve({}),
      },
    });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const wrapper = mountModal({}, EN);
    await flushPromises();
    setValidState(wrapper.vm);
    await wrapper.vm.submit();
    expect(showAlert).toHaveBeenCalledWith('Error', 'Failed to add card', 'error');
    spy.mockRestore();
  });

  it('POST !response.ok ไม่มี err.message locale TH → showAlert fallback TH', async () => {
    setupFetch({
      dashboardResponse: {
        ok: false,
        json: () => Promise.resolve({}),
      },
    });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const wrapper = mountModal({}, TH);
    await flushPromises();
    setValidState(wrapper.vm);
    await wrapper.vm.submit();
    expect(showAlert).toHaveBeenCalledWith('เกิดข้อผิดพลาด', 'ไม่สามารถเพิ่มการ์ดได้', 'error');
    spy.mockRestore();
  });

  it('fetch reject (network error) → catch → showAlert error', async () => {
    mockFetch = vi.fn((url) => {
      if (url.includes('/api/devices')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: MOCK_DEVICES }) });
      if (url.includes('/api/rooms')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: MOCK_ROOMS }) });
      if (url.includes('/dashboard/cards')) return Promise.reject(new Error('Network fail'));
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    vi.stubGlobal('fetch', mockFetch);

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const wrapper = mountModal({}, EN);
    await flushPromises();
    setValidState(wrapper.vm);
    await wrapper.vm.submit();
    expect(showAlert).toHaveBeenCalledWith('Error', 'Network fail', 'error');
    spy.mockRestore();
  });

  it('catch err ไม่มี message → showAlert fallback EN (catch || branch)', async () => {
    // json() rejects ด้วย object ที่ไม่มี message
    mockFetch = vi.fn((url) => {
      if (url.includes('/api/devices')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: MOCK_DEVICES }) });
      if (url.includes('/api/rooms')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: MOCK_ROOMS }) });
      if (url.includes('/dashboard/cards')) return Promise.resolve({ ok: false, json: () => Promise.reject({}) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    vi.stubGlobal('fetch', mockFetch);

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const wrapper = mountModal({}, EN);
    await flushPromises();
    setValidState(wrapper.vm);
    await wrapper.vm.submit();
    expect(showAlert).toHaveBeenCalledWith('Error', 'Please try again', 'error');
    spy.mockRestore();
  });

  it('catch err ไม่มี message locale TH → showAlert fallback TH (catch || branch)', async () => {
    mockFetch = vi.fn((url) => {
      if (url.includes('/api/devices')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: MOCK_DEVICES }) });
      if (url.includes('/api/rooms')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: MOCK_ROOMS }) });
      if (url.includes('/dashboard/cards')) return Promise.resolve({ ok: false, json: () => Promise.reject({}) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    vi.stubGlobal('fetch', mockFetch);

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const wrapper = mountModal({}, TH);
    await flushPromises();
    setValidState(wrapper.vm);
    await wrapper.vm.submit();
    expect(showAlert).toHaveBeenCalledWith('เกิดข้อผิดพลาด', 'กรุณาลองใหม่อีกครั้ง', 'error');
    spy.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════
// 6. submit() – Edit Mode
// ═══════════════════════════════════════════════════════════
describe('AddDashboardCardModal > submit(): Edit Mode', () => {
  const baseEditing = {
    card_id: 7, address_id: 10, display_type: 'number', position: 1,
    device: { room_id: 1 },
  };

  it('PUT success → showAlert success (EN), emit "update", emit "close"', async () => {
    const wrapper = mountModal({ editingCard: baseEditing }, EN);
    await flushPromises();
    setValidState(wrapper.vm);
    await wrapper.vm.submit();
    expect(showAlert).toHaveBeenCalledWith('Success!', 'Card updated successfully', 'success');
    expect(wrapper.emitted('update')).toBeTruthy();
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('PUT success locale TH → showAlert ข้อความไทย', async () => {
    const wrapper = mountModal({ editingCard: baseEditing }, TH);
    await flushPromises();
    setValidState(wrapper.vm);
    await wrapper.vm.submit();
    expect(showAlert).toHaveBeenCalledWith('สำเร็จ!', 'อัปเดตการ์ดสำเร็จ', 'success');
  });

  it('PUT ส่ง request ไปยัง URL ที่มี card_id, method PUT, body ถูกต้อง', async () => {
    const wrapper = mountModal({ editingCard: baseEditing }, EN);
    await flushPromises();
    setValidState(wrapper.vm);
    wrapper.vm.selectedDisplayType = 'level';
    wrapper.vm.selectedPosition = 2;
    await wrapper.vm.submit();
    const putCall = mockFetch.mock.calls.find((c) => c[0].includes('/dashboard/cards/7'));
    expect(putCall[1].method).toBe('PUT');
    const body = JSON.parse(putCall[1].body);
    expect(body.selectedDeviceId).toBe(1);
    expect(body.selectedAddressId).toBe(10);
    expect(body.selectedDisplayType).toBe('level');
    expect(body.selectedPosition).toBe(2);
  });

  it('PUT emit "update" ส่ง payload ครบถ้วน', async () => {
    const wrapper = mountModal({ editingCard: baseEditing }, EN);
    await flushPromises();
    setValidState(wrapper.vm);
    await wrapper.vm.submit();
    const payload = wrapper.emitted('update')[0][0];
    expect(payload).toHaveProperty('selectedDeviceId');
    expect(payload).toHaveProperty('selectedAddressId');
    expect(payload).toHaveProperty('selectedDisplayType');
    expect(payload).toHaveProperty('selectedPosition');
  });

  it('PUT !response.ok + มี err.message → showAlert ใช้ err.message', async () => {
    setupFetch({
      dashboardResponse: {
        ok: false,
        json: () => Promise.resolve({ message: 'Card not found' }),
      },
    });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const wrapper = mountModal({ editingCard: baseEditing }, EN);
    await flushPromises();
    setValidState(wrapper.vm);
    await wrapper.vm.submit();
    expect(showAlert).toHaveBeenCalledWith('Error', 'Card not found', 'error');
    spy.mockRestore();
  });

  it('PUT !response.ok ไม่มี err.message locale EN → fallback EN', async () => {
    setupFetch({
      dashboardResponse: {
        ok: false,
        json: () => Promise.resolve({}),
      },
    });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const wrapper = mountModal({ editingCard: baseEditing }, EN);
    await flushPromises();
    setValidState(wrapper.vm);
    await wrapper.vm.submit();
    expect(showAlert).toHaveBeenCalledWith('Error', 'Failed to update card', 'error');
    spy.mockRestore();
  });

  it('PUT !response.ok ไม่มี err.message locale TH → fallback TH', async () => {
    setupFetch({
      dashboardResponse: {
        ok: false,
        json: () => Promise.resolve({}),
      },
    });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const wrapper = mountModal({ editingCard: baseEditing }, TH);
    await flushPromises();
    setValidState(wrapper.vm);
    await wrapper.vm.submit();
    expect(showAlert).toHaveBeenCalledWith('เกิดข้อผิดพลาด', 'ไม่สามารถอัปเดตการ์ดได้', 'error');
    spy.mockRestore();
  });

  it('console.error ใช้ locale TH ใน catch', async () => {
    mockFetch = vi.fn((url) => {
      if (url.includes('/api/devices')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: MOCK_DEVICES }) });
      if (url.includes('/api/rooms')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: MOCK_ROOMS }) });
      if (url.includes('/dashboard/cards')) return Promise.reject(new Error('fail'));
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    vi.stubGlobal('fetch', mockFetch);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const wrapper = mountModal({ editingCard: baseEditing }, TH);
    await flushPromises();
    setValidState(wrapper.vm);
    await wrapper.vm.submit();
    expect(spy).toHaveBeenCalledWith('เกิดข้อผิดพลาด:', expect.any(Error));
    spy.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════
// 7. Loading State
// ═══════════════════════════════════════════════════════════
describe('AddDashboardCardModal > Loading State', () => {
  it('isLoading = true ระหว่าง request', async () => {
    let resolveFn;
    mockFetch = vi.fn((url) => {
      if (url.includes('/api/devices')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: MOCK_DEVICES }) });
      if (url.includes('/api/rooms')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: MOCK_ROOMS }) });
      if (url.includes('/dashboard/cards')) return new Promise((r) => { resolveFn = r; });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    vi.stubGlobal('fetch', mockFetch);
    const wrapper = mountModal();
    await flushPromises();
    setValidState(wrapper.vm);
    wrapper.vm.submit();
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.isLoading).toBe(true);
    resolveFn({ ok: true, json: () => Promise.resolve({}) });
    await flushPromises();
  });

  it('isLoading = false หลัง submit สำเร็จ (finally block)', async () => {
    const wrapper = mountModal();
    await flushPromises();
    setValidState(wrapper.vm);
    await wrapper.vm.submit();
    expect(wrapper.vm.isLoading).toBe(false);
  });

  it('isLoading = false หลัง submit fail (finally block)', async () => {
    setupFetch({ dashboardResponse: { ok: false, json: () => Promise.resolve({}) } });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const wrapper = mountModal();
    await flushPromises();
    setValidState(wrapper.vm);
    await wrapper.vm.submit();
    expect(wrapper.vm.isLoading).toBe(false);
    spy.mockRestore();
  });

  it('ปุ่ม Submit + Cancel disabled เมื่อ isLoading = true', async () => {
    const wrapper = mountModal();
    wrapper.vm.isLoading = true;
    await wrapper.vm.$nextTick();
    const buttons = wrapper.findAll('.modal-footer button');
    buttons.forEach((btn) => {
      expect(btn.attributes('disabled')).toBeDefined();
    });
  });

  it('spinner แสดงเมื่อ isLoading = true', async () => {
    const wrapper = mountModal();
    wrapper.vm.isLoading = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.spinner-border').exists()).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════
// 8. Template Branches: locale, isLoading text, position (End)
// ═══════════════════════════════════════════════════════════
describe('AddDashboardCardModal > Template Branches', () => {
  it('locale EN → Room unassigned text = "Unassigned"', async () => {
    const wrapper = mountModal({}, EN);
    await flushPromises();
    const firstOpt = wrapper.findAll('select')[0].findAll('option')[0];
    expect(firstOpt.text()).toBe('Unassigned');
  });

  it('locale TH → Room unassigned text = "ไม่มีห้อง"', async () => {
    const wrapper = mountModal({}, TH);
    await flushPromises();
    const firstOpt = wrapper.findAll('select')[0].findAll('option')[0];
    expect(firstOpt.text()).toBe('ไม่มีห้อง');
  });

  it('locale EN → Device placeholder = "-- Select Device --"', async () => {
    const wrapper = mountModal({}, EN);
    await flushPromises();
    const firstDeviceOpt = wrapper.findAll('select')[1].findAll('option')[0];
    expect(firstDeviceOpt.text()).toContain('Select Device');
  });

  it('locale TH → Device placeholder มี "เลือก Device"', async () => {
    const wrapper = mountModal({}, TH);
    await flushPromises();
    const firstDeviceOpt = wrapper.findAll('select')[1].findAll('option')[0];
    expect(firstDeviceOpt.text()).toContain('เลือก Device');
  });

  it('locale EN → Address placeholder = "-- Select Address --"', async () => {
    const wrapper = mountModal({}, EN);
    await flushPromises();
    const firstAddrOpt = wrapper.findAll('select')[2].findAll('option')[0];
    expect(firstAddrOpt.text()).toContain('Select Address');
  });

  it('locale TH → Address placeholder มี "เลือก Address"', async () => {
    const wrapper = mountModal({}, TH);
    await flushPromises();
    const firstAddrOpt = wrapper.findAll('select')[2].findAll('option')[0];
    expect(firstAddrOpt.text()).toContain('เลือก Address');
  });

  it('isLoading = true, locale EN → ปุ่ม Submit text = "Saving..."', async () => {
    const wrapper = mountModal({}, EN);
    wrapper.vm.isLoading = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('.modal-footer button')[1].text()).toContain('Saving...');
  });

  it('isLoading = true, locale TH → ปุ่ม Submit text = "กำลังบันทึก..."', async () => {
    const wrapper = mountModal({}, TH);
    wrapper.vm.isLoading = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('.modal-footer button')[1].text()).toContain('กำลังบันทึก...');
  });

  it('isLoading = false, ไม่มี editingCard → ปุ่ม Submit text = "Add Card"', async () => {
    const wrapper = mountModal({}, EN);
    await flushPromises();
    expect(wrapper.findAll('.modal-footer button')[1].text()).toContain('Add Card');
  });

  it('isLoading = false, มี editingCard → ปุ่ม Submit text = "Save Changes"', async () => {
    const editingCard = { card_id: 1, address_id: 10, display_type: 'number', position: 1 };
    const wrapper = mountModal({ editingCard }, EN);
    await flushPromises();
    expect(wrapper.findAll('.modal-footer button')[1].text()).toContain('Save Changes');
  });

  it('currentCardCount=2 → Position มี 3 options, position 3 มี "(End)"', async () => {
    const wrapper = mountModal({ currentCardCount: 2 }, EN);
    await flushPromises();
    wrapper.vm.selectedDeviceId = 1;
    wrapper.vm.selectedAddressId = 10;
    await wrapper.vm.$nextTick();
    // selects: [0]=Room [1]=Device [2]=Address [3]=DisplayType [4]=Position
    const positionSelect = wrapper.findAll('select')[4];
    const opts = positionSelect.findAll('option');
    expect(opts.length).toBe(3);
    expect(opts[2].text()).toContain('(End)');
    expect(opts[0].text()).not.toContain('(End)'); // branch '' สำหรับ position ที่ไม่ใช่ last
  });

  it('locale TH → DisplayType placeholder มี "Select ประเภท Display"', async () => {
    const wrapper = mountModal({}, TH);
    await flushPromises();
    wrapper.vm.selectedDeviceId = 1;
    wrapper.vm.selectedAddressId = 10;
    await wrapper.vm.$nextTick();
    // selects: [0]=Room [1]=Device [2]=Address [3]=DisplayType
    const displaySelect = wrapper.findAll('select')[3];
    const firstOpt = displaySelect.findAll('option')[0];
    expect(firstOpt.text()).toContain('Select ประเภท Display');
  });

  it('locale EN → DisplayType placeholder = "-- Select Display Type --"', async () => {
    const wrapper = mountModal({}, EN);
    await flushPromises();
    wrapper.vm.selectedDeviceId = 1;
    wrapper.vm.selectedAddressId = 10;
    await wrapper.vm.$nextTick();
    const displaySelect = wrapper.findAll('select')[3];
    const firstOpt = displaySelect.findAll('option')[0];
    expect(firstOpt.text()).toContain('Select Display Type');
  });
});

// ═══════════════════════════════════════════════════════════
// 9. DOM Interactions
// ═══════════════════════════════════════════════════════════
describe('AddDashboardCardModal > DOM Interactions', () => {
  it('คลิก btn-close (header) → emit "close"', async () => {
    const wrapper = mountModal();
    await wrapper.find('.btn-close').trigger('click');
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('คลิกปุ่ม Cancel → emit "close"', async () => {
    const wrapper = mountModal();
    await wrapper.findAll('.modal-footer button')[0].trigger('click');
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('DOM: setValue บน Room select → v-model form.room_id อัปเดต', async () => {
    const wrapper = mountModal();
    await flushPromises();
    await wrapper.findAll('select')[0].setValue(1);
    expect(Number(wrapper.vm.form.room_id)).toBe(1);
  });

  it('DOM: setValue บน Device select → v-model selectedDeviceId อัปเดต', async () => {
    const wrapper = mountModal();
    await flushPromises();
    await wrapper.findAll('select')[1].setValue(1);
    expect(Number(wrapper.vm.selectedDeviceId)).toBe(1);
  });

  it('DOM: setValue บน Address select → v-model selectedAddressId อัปเดต (line 42)', async () => {
    const wrapper = mountModal();
    await flushPromises();
    wrapper.vm.selectedDeviceId = 1;
    await wrapper.vm.$nextTick();
    // selects[2] = Address select (เปิดใช้งานแล้วเพราะมี device)
    await wrapper.findAll('select')[2].setValue(10);
    expect(Number(wrapper.vm.selectedAddressId)).toBe(10);
  });

  it('DOM: setValue บน DisplayType select → v-model selectedDisplayType อัปเดต (line 55)', async () => {
    const wrapper = mountModal();
    await flushPromises();
    wrapper.vm.selectedDeviceId = 1;
    wrapper.vm.selectedAddressId = 10;
    await wrapper.vm.$nextTick();
    // selects[3] = DisplayType select
    await wrapper.findAll('select')[3].setValue('level');
    expect(wrapper.vm.selectedDisplayType).toBe('level');
  });

  it('DOM: setValue บน Position select → v-model.number selectedPosition อัปเดต (line 67)', async () => {
    const wrapper = mountModal({ currentCardCount: 2 }, EN);
    await flushPromises();
    wrapper.vm.selectedDeviceId = 1;
    wrapper.vm.selectedAddressId = 10;
    await wrapper.vm.$nextTick();
    // selects[4] = Position select
    await wrapper.findAll('select')[4].setValue(2);
    expect(Number(wrapper.vm.selectedPosition)).toBe(2);
  });

  it('DOM: คลิกปุ่ม Submit → เรียก submit()', async () => {
    const wrapper = mountModal();
    await flushPromises();
    const spy = vi.spyOn(wrapper.vm, 'submit');
    await wrapper.findAll('.modal-footer button')[1].trigger('click');
    expect(spy).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════
// 10. Bug Cases (FAIL) — อันตราย ยังไม่แก้ component
// ═══════════════════════════════════════════════════════════
describe('AddDashboardCardModal > Bug Cases (FAIL)', () => {

  // BUG-1: ไม่มี isLoading guard ใน submit() → double-click ยิง 2 API calls
  // อันตราย: submit() เริ่มต้นด้วย validation check แต่ไม่มี if (this.isLoading) return
  //          → user คลิก "Add Card" สองครั้งรวดก่อน request แรกเสร็จ
  //          → 2 POST requests ถูกยิงพร้อมกัน → dashboard มีการ์ดซ้ำ 2 ใบ
  //          → หรือ race condition ทำให้ position ชนกัน → database constraint error
  //          → ต่างจาก Login.vue ที่มี if (this.isLoading) return ป้องกันไว้
  //          → ควรเพิ่ม: if (this.isLoading) return ที่บรรทัดแรกของ submit()
  // FAIL เพราะ: ไม่มี guard → 2 fetch calls ต่อ /dashboard/cards ถูก fire
  it('[BUG-1] double-click submit → ยิง 2 POST calls ไม่มี isLoading guard (FAIL)', async () => {
    const resolvers = [];
    mockFetch = vi.fn((url) => {
      if (url.includes('/api/devices')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: MOCK_DEVICES }) });
      if (url.includes('/api/rooms')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: MOCK_ROOMS }) });
      if (url.includes('/dashboard/cards')) return new Promise((r) => resolvers.push(r));
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    vi.stubGlobal('fetch', mockFetch);

    const wrapper = mountModal();
    await flushPromises();
    setValidState(wrapper.vm);

    // click submit twice rapidly (ไม่ await)
    wrapper.vm.submit();
    wrapper.vm.submit();
    await wrapper.vm.$nextTick();

    const dashCalls = mockFetch.mock.calls.filter((c) => c[0].includes('/dashboard/cards'));

    // คาดหวัง: isLoading guard ป้องกัน → แค่ 1 call
    expect(dashCalls.length).toBeLessThanOrEqual(1);
    // FAIL: dashCalls.length = 2 เพราะ submit() ไม่เช็ค isLoading ก่อน

    // cleanup
    resolvers.forEach((r) => r({ ok: true, json: () => Promise.resolve({}) }));
    await flushPromises();
  });

  // BUG-2: editingCard.position = 0 → || 1 falsy trap → position 0 กลายเป็น 1
  // อันตราย: บางระบบ position เริ่มที่ 0 (zero-indexed) หรือ backend ส่ง position: 0
  //          → mounted(): this.selectedPosition = this.editingCard.position || 1
  //          → 0 || 1 = 1 (ผิด! position 0 ถูกแปลงเป็น 1)
  //          → user เปิด Edit modal → เห็น position 1 แต่ card จริงอยู่ที่ position 0
  //          → กด Save → PUT ส่ง position: 1 → card ย้ายตำแหน่งโดยไม่ได้ตั้งใจ
  //          → dashboard layout เสีย: card เลื่อนตำแหน่งทุกครั้งที่ edit
  //          → แก้ได้โดย: this.editingCard.position ?? 1 (nullish coalescing)
  // FAIL เพราะ: 0 || 1 = 1 → selectedPosition = 1 ไม่ใช่ 0
  it('[BUG-2] editingCard.position=0 → || 1 falsy trap → selectedPosition เปลี่ยนเป็น 1 (FAIL)', async () => {
    const editingCard = {
      card_id: 5, address_id: 10, display_type: 'number',
      position: 0, // ← 0 ซึ่งเป็น falsy
      device: { room_id: 1 },
    };
    const wrapper = mountModal({ editingCard });
    await flushPromises();

    // คาดหวัง: position=0 ควรถูก preserve → selectedPosition = 0
    expect(wrapper.vm.selectedPosition).toBe(0);
    // FAIL: 0 || 1 = 1 → selectedPosition = 1 (position หาย)
  });

  // BUG-3: authH() ส่ง 'Bearer null' เมื่อไม่มี token ใน localStorage
  // อันตราย: localStorage.getItem('token') คืน null (JS native null)
  //          → template literal: `Bearer ${null}` = "Bearer null" (string ไม่ใช่ empty)
  //          → ทุก API call ส่ง Authorization: "Bearer null"
  //          → server บางตัวอาจ parse แล้ว decode "null" เป็น valid payload (ถ้า misconfigured)
  //          → ทำให้ unauthenticated user อาจผ่าน authorization ได้
  //          → ยิ่งอันตรายเพราะ header ดูถูกรูปแบบ (Bearer xxx) → log ไม่แจ้งเตือน
  //          → แก้ได้: const token = localStorage.getItem('token'); return token ? {Authorization: `Bearer ${token}`} : {}
  // FAIL เพราะ: `Bearer ${null}` = "Bearer null" → header มีค่าที่ไม่ควรมี
  it('[BUG-3] authH() ส่ง "Bearer null" เมื่อไม่มี token ใน localStorage (FAIL)', async () => {
    delete store.token; // ลบ token ออกก่อน mount
    mountModal();
    await flushPromises();

    const deviceCall = mockFetch.mock.calls.find((c) => c[0].includes('/api/devices'));
    const authHeader = deviceCall?.[1]?.headers?.['Authorization'];

    // คาดหวัง: ไม่มี token → ไม่ควรส่ง 'Bearer null' (ควรไม่มี header หรือ throw)
    expect(authHeader).not.toBe('Bearer null');
    // FAIL: `Bearer ${localStorage.getItem('token')}` = `Bearer ${null}` = 'Bearer null'
  });

  // BUG-4: response.json() บน error response ที่ไม่ใช่ JSON → SyntaxError message ถึง user
  // อันตราย: server ส่ง 500 Internal Server Error เป็น HTML (nginx/apache default page)
  //          → !response.ok = true → const err = await response.json()
  //          → json() throws SyntaxError: "Unexpected token '<', "<!DOCTYPE..." is not valid JSON"
  //          → catch (err): err.message = technical SyntaxError message
  //          → showAlert(..., "Unexpected token '<', ...", 'error')
  //          → user เห็น error ทางเทคนิค ไม่ใช่ friendly message
  //          → อันตราย: อาจเปิดเผย server technology/config ผ่าน error message
  //          → developer debug ยาก: "Unexpected token" ไม่บอกว่า request ผิดอะไร
  //          → แก้: try { const err = await response.json(); ... } catch { throw new Error(fallback); }
  // FAIL เพราะ: SyntaxError.message ถูก truthy → err.message || fallback = SyntaxError msg
  //             → showAlert แสดง technical error message แทน friendly message
  it('[BUG-4] non-JSON error response → SyntaxError message โชว์ถึง user แทน friendly msg (FAIL)', async () => {
    const syntaxErrMsg = "Unexpected token '<', \"<!DOCTYPE...\" is not valid JSON";
    mockFetch = vi.fn((url) => {
      if (url.includes('/api/devices')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: MOCK_DEVICES }) });
      if (url.includes('/api/rooms')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: MOCK_ROOMS }) });
      if (url.includes('/dashboard/cards')) {
        return Promise.resolve({
          ok: false,
          // จำลอง server ตอบ HTML แทน JSON → json() throws SyntaxError
          json: () => Promise.reject(new SyntaxError(syntaxErrMsg)),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    vi.stubGlobal('fetch', mockFetch);

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const wrapper = mountModal({}, EN);
    await flushPromises();
    setValidState(wrapper.vm);
    await wrapper.vm.submit();
    spy.mockRestore();

    // คาดหวัง: user ควรเห็น friendly message ไม่ใช่ SyntaxError
    expect(showAlert).toHaveBeenCalledWith(
      'Error',
      'Please try again', // ← friendly fallback ที่ควรเห็น
      'error'
    );
    // FAIL: showAlert ถูกเรียกด้วย SyntaxError message แทน "Please try again"
    //       เพราะ SyntaxError.message เป็น truthy → err.message || fallback = SyntaxError.message
  });

  // BUG-5: form.room_id ถูกเลือกแต่ไม่ถูกส่งใน POST/PUT body → silent data loss
  // อันตราย: user เลือก "Room A" ใน Room select → form.room_id = 1
  //          → กด "Add Card" → POST body = { address_id, display_type, position }
  //          → room_id ไม่ถูกส่งไปเลย! (ดู submit() lines 247-251)
  //          → backend ไม่รู้ว่า card ควรอยู่ห้องไหน → card ถูก assign ให้ห้อง default/null
  //          → dashboard แสดง card ใน "Unassigned" ทุกครั้งแม้ user เลือกห้องแล้ว
  //          → เหมือนกันกับ PUT (edit mode) ก็ไม่ส่ง room_id ใน body
  //          → user ไม่รู้ว่า room selection ไม่มีผล → UX หลอกลวง
  //          → แก้: เพิ่ม room_id: this.form.room_id ใน body ของ POST และ PUT
  // FAIL เพราะ: body ของ POST/PUT ไม่มี room_id → POST body = { address_id, display_type, position }
  it('[BUG-5] form.room_id ถูกเลือกแต่ไม่ถูกส่งใน POST body → room assignment หาย (FAIL)', async () => {
    const capturedBodies = [];
    mockFetch = vi.fn((url, opts) => {
      if (url.includes('/api/devices')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: MOCK_DEVICES }) });
      if (url.includes('/api/rooms')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: MOCK_ROOMS }) });
      if (url.includes('/dashboard/cards')) {
        if (opts?.body) capturedBodies.push(JSON.parse(opts.body));
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    vi.stubGlobal('fetch', mockFetch);

    const wrapper = mountModal({}, EN);
    await flushPromises();
    wrapper.vm.form.room_id = 2; // user เลือก Room B
    setValidState(wrapper.vm);
    await wrapper.vm.submit();

    expect(capturedBodies.length).toBe(1);
    // คาดหวัง: body ควรมี room_id = 2
    expect(capturedBodies[0]).toHaveProperty('room_id', 2);
    // FAIL: body = { address_id, display_type, position } → ไม่มี room_id เลย
  });
});
