import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import AddElementModal from '../../views/AddElementModal.vue';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const EN = { current: 'en', t: (k) => k };
const TH = { current: 'th', t: (k) => k };

const store = {};
vi.stubGlobal('localStorage', {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = v; },
  removeItem: (k) => { delete store[k]; },
});

vi.stubGlobal('alert', vi.fn());

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

let mockFetch;

function setupFetch(opts = {}) {
  mockFetch = vi.fn((url) => {
    if (url.includes('/api/devices')) {
      if (opts.devicesThrow) return Promise.reject(new Error('Network error'));
      const payload = opts.devicesPayload !== undefined ? opts.devicesPayload : MOCK_DEVICES;
      return Promise.resolve({ ok: true, json: () => Promise.resolve(payload) });
    }
    if (url.includes('/api/interaction/elements')) {
      if (opts.elementResponse !== undefined) return Promise.resolve(opts.elementResponse);
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 99, name: 'Saved' }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
  vi.stubGlobal('fetch', mockFetch);
}

function mountModal(props = {}, locale = EN) {
  return mount(AddElementModal, {
    props: { layoutId: 1, ...props },
    global: { provide: { locale } },
  });
}

function setValidForm(vm) {
  vm.form.device_id = 1;
  vm.form.address_id = 10;
  vm.form.name = 'My Element';
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
describe('AddElementModal > Render', () => {
  it('renders modal structure (header/body/footer)', async () => {
    const wrapper = mountModal();
    await flushPromises();
    expect(wrapper.find('.modal').exists()).toBe(true);
    expect(wrapper.find('.modal-header').exists()).toBe(true);
    expect(wrapper.find('.modal-body').exists()).toBe(true);
    expect(wrapper.find('.modal-footer').exists()).toBe(true);
  });

  it('title = "Add New Element" เมื่อไม่มี editData (isEdit=false)', async () => {
    const wrapper = mountModal();
    await flushPromises();
    expect(wrapper.find('.modal-title').text()).toContain('Add New Element');
  });

  it('title = "Edit Element" เมื่อมี editData (isEdit=true)', async () => {
    const wrapper = mountModal({ editData: { id: 5, name: 'Old', device_id: 1, address_id: 10 } });
    await flushPromises();
    expect(wrapper.find('.modal-title').text()).toContain('Edit Element');
  });

  it('Address select disabled เมื่อ device_id ว่าง (:disabled="!form.device_id")', async () => {
    const wrapper = mountModal();
    await flushPromises();
    const selects = wrapper.findAll('select');
    // selects[0]=element_type, selects[1]=device, selects[2]=address
    expect(selects[2].attributes('disabled')).toBeDefined();
  });

  it('Address select enabled หลังเลือก device', async () => {
    const wrapper = mountModal();
    await flushPromises();
    wrapper.vm.form.device_id = 1;
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('select')[2].attributes('disabled')).toBeUndefined();
  });

  it('Unit + Precision แสดงเมื่อ element_type = gauge_display (default)', async () => {
    const wrapper = mountModal();
    await flushPromises();
    expect(wrapper.text()).toContain('Unit');
    expect(wrapper.text()).toContain('Precision');
  });

  it('Unit + Precision แสดงเมื่อ element_type = number_display', async () => {
    const wrapper = mountModal();
    await flushPromises();
    wrapper.vm.form.element_type = 'number_display';
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('Unit');
    expect(wrapper.text()).toContain('Precision');
  });

  it('Unit + Precision ซ่อนเมื่อ element_type = status_lamp', async () => {
    const wrapper = mountModal();
    await flushPromises();
    wrapper.vm.form.element_type = 'status_lamp';
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).not.toContain('Unit');
    expect(wrapper.text()).not.toContain('Precision');
  });

  it('Button Label + Active/Inactive Color แสดงเมื่อ element_type = control_button', async () => {
    const wrapper = mountModal();
    await flushPromises();
    wrapper.vm.form.element_type = 'control_button';
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('Button Label');
    expect(wrapper.text()).toContain('Active Color');
    expect(wrapper.text()).toContain('Inactive Color');
  });

  it('Button Label ซ่อนเมื่อ element_type = gauge_display', async () => {
    const wrapper = mountModal();
    await flushPromises();
    expect(wrapper.text()).not.toContain('Button Label');
  });

  it('Bar Color แสดงเมื่อ element_type = level_progress_bar', async () => {
    const wrapper = mountModal();
    await flushPromises();
    wrapper.vm.form.element_type = 'level_progress_bar';
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('Bar Color');
  });

  it('Bar Color ซ่อนเมื่อ element_type = gauge_display', async () => {
    const wrapper = mountModal();
    await flushPromises();
    expect(wrapper.text()).not.toContain('Bar Color');
  });

  it('Clear button แสดงเมื่อ bg_color มีค่า (v-if="form.bg_color")', async () => {
    const wrapper = mountModal();
    await flushPromises();
    wrapper.vm.form.bg_color = '#ff0000';
    await wrapper.vm.$nextTick();
    const clearBtn = wrapper.find('.input-group button');
    expect(clearBtn.exists()).toBe(true);
    expect(clearBtn.text()).toContain('Clear');
  });

  it('Clear button ซ่อนเมื่อ bg_color = null (v-if=false)', async () => {
    const wrapper = mountModal();
    await flushPromises();
    // bg_color starts as null
    expect(wrapper.vm.form.bg_color).toBeNull();
    expect(wrapper.find('.input-group button').exists()).toBe(false);
  });

  it('validationError alert แสดงเมื่อมี error (v-if="validationError")', async () => {
    const wrapper = mountModal();
    await flushPromises();
    wrapper.vm.validationError = 'Please select a Device';
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.alert.alert-warning').exists()).toBe(true);
    expect(wrapper.find('.alert.alert-warning').text()).toContain('Please select a Device');
  });

  it('validationError alert ซ่อนเมื่อไม่มี error', async () => {
    const wrapper = mountModal();
    await flushPromises();
    expect(wrapper.find('.alert.alert-warning').exists()).toBe(false);
  });

  it('footer button = "Add Element" เมื่อไม่ใช่ edit mode', async () => {
    const wrapper = mountModal();
    await flushPromises();
    const btn = wrapper.findAll('.modal-footer button')[1];
    expect(btn.text()).toContain('Add Element');
  });

  it('footer button = "Update" เมื่อ editData มีค่า', async () => {
    const wrapper = mountModal({ editData: { id: 5, name: 'Old', device_id: 1, address_id: 10 } });
    await flushPromises();
    const btn = wrapper.findAll('.modal-footer button')[1];
    expect(btn.text()).toContain('Update');
  });

  it('Device select มี options จาก API', async () => {
    const wrapper = mountModal();
    await flushPromises();
    const opts = wrapper.findAll('select')[1].findAll('option');
    expect(opts.length).toBe(3); // disabled + 2 devices
  });
});

// ═══════════════════════════════════════════════════════════
// 2. Mounted
// ═══════════════════════════════════════════════════════════
describe('AddElementModal > Mounted', () => {
  it('เรียก fetchDevices() ตอน mount', async () => {
    mountModal();
    await flushPromises();
    expect(mockFetch.mock.calls.some((c) => c[0].includes('/api/devices'))).toBe(true);
  });

  it('form.layout_id ตั้งจาก layoutId prop', async () => {
    const wrapper = mountModal({ layoutId: 42 });
    await flushPromises();
    expect(wrapper.vm.form.layout_id).toBe(42);
  });

  it('เรียก populateForm() เมื่อมี editData', async () => {
    const editData = { id: 5, name: 'Test', device_id: 1, address_id: 10, element_type: 'status_lamp' };
    const wrapper = mountModal({ editData });
    await flushPromises();
    expect(wrapper.vm.form.name).toBe('Test');
    expect(wrapper.vm.form.element_type).toBe('status_lamp');
  });

  it('ไม่เรียก populateForm() เมื่อไม่มี editData', async () => {
    const wrapper = mountModal();
    await flushPromises();
    expect(wrapper.vm.form.name).toBe('');
    expect(wrapper.vm.form.element_type).toBe('gauge_display');
  });
});

// ═══════════════════════════════════════════════════════════
// 3. Computed
// ═══════════════════════════════════════════════════════════
describe('AddElementModal > Computed', () => {
  it('isEdit = false เมื่อ editData = null', async () => {
    const wrapper = mountModal();
    await flushPromises();
    expect(wrapper.vm.isEdit).toBe(false);
  });

  it('isEdit = true เมื่อมี editData', async () => {
    const wrapper = mountModal({ editData: { id: 1 } });
    await flushPromises();
    expect(wrapper.vm.isEdit).toBe(true);
  });

  it('selectedDevice คืน device ที่ตรงกับ form.device_id', async () => {
    const wrapper = mountModal();
    await flushPromises();
    wrapper.vm.form.device_id = 1;
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.selectedDevice).toEqual(MOCK_DEVICES[0]);
  });

  it('selectedDevice คืน undefined เมื่อ device_id ไม่ตรงกัน', async () => {
    const wrapper = mountModal();
    await flushPromises();
    expect(wrapper.vm.selectedDevice).toBeUndefined();
  });

  it('filteredAddresses คืน addresses ของ device ที่เลือก', async () => {
    const wrapper = mountModal();
    await flushPromises();
    wrapper.vm.form.device_id = 1;
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.filteredAddresses).toEqual(MOCK_DEVICES[0].addresses);
  });

  it('filteredAddresses = [] เมื่อไม่มี device (optional chaining + || [])', async () => {
    const wrapper = mountModal();
    await flushPromises();
    expect(wrapper.vm.filteredAddresses).toEqual([]);
  });

  it('filteredAddresses = [] เมื่อ device ไม่มี addresses field', async () => {
    const wrapper = mountModal();
    await flushPromises();
    wrapper.vm.devices = [{ id: 1, name: 'No Addr' }];
    wrapper.vm.form.device_id = 1;
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.filteredAddresses).toEqual([]);
  });

  it('canSubmit truthy เมื่อ device_id, address_id, name ครบ', async () => {
    const wrapper = mountModal();
    await flushPromises();
    setValidForm(wrapper.vm);
    expect(wrapper.vm.canSubmit).toBeTruthy();
  });

  it('canSubmit = false เมื่อ device_id ว่าง', async () => {
    const wrapper = mountModal();
    await flushPromises();
    wrapper.vm.form.address_id = 10;
    wrapper.vm.form.name = 'Test';
    expect(wrapper.vm.canSubmit).toBeFalsy();
  });

  it('canSubmit = false เมื่อ name ว่าง', async () => {
    const wrapper = mountModal();
    await flushPromises();
    wrapper.vm.form.device_id = 1;
    wrapper.vm.form.address_id = 10;
    wrapper.vm.form.name = '';
    expect(wrapper.vm.canSubmit).toBeFalsy();
  });
});

// ═══════════════════════════════════════════════════════════
// 4. getValidationError()
// ═══════════════════════════════════════════════════════════
describe('AddElementModal > getValidationError()', () => {
  it('!device_id → error EN', async () => {
    const wrapper = mountModal({}, EN);
    await flushPromises();
    expect(wrapper.vm.getValidationError()).toBe('Please select a Device');
  });

  it('!device_id → error TH', async () => {
    const wrapper = mountModal({}, TH);
    await flushPromises();
    expect(wrapper.vm.getValidationError()).toBe('กรุณาเลือก Device');
  });

  it('!address_id → error EN', async () => {
    const wrapper = mountModal({}, EN);
    await flushPromises();
    wrapper.vm.form.device_id = 1;
    expect(wrapper.vm.getValidationError()).toBe('Please select an Address');
  });

  it('!address_id → error TH', async () => {
    const wrapper = mountModal({}, TH);
    await flushPromises();
    wrapper.vm.form.device_id = 1;
    expect(wrapper.vm.getValidationError()).toBe('กรุณาเลือก Address');
  });

  it('!name → error EN', async () => {
    const wrapper = mountModal({}, EN);
    await flushPromises();
    wrapper.vm.form.device_id = 1;
    wrapper.vm.form.address_id = 10;
    expect(wrapper.vm.getValidationError()).toBe('Please enter a Name');
  });

  it('!name → error TH', async () => {
    const wrapper = mountModal({}, TH);
    await flushPromises();
    wrapper.vm.form.device_id = 1;
    wrapper.vm.form.address_id = 10;
    expect(wrapper.vm.getValidationError()).toBe('กรุณากรอก Name');
  });

  it('ทุกฟิลด์ครบ → คืน ""', async () => {
    const wrapper = mountModal();
    await flushPromises();
    setValidForm(wrapper.vm);
    expect(wrapper.vm.getValidationError()).toBe('');
  });
});

// ═══════════════════════════════════════════════════════════
// 5. fetchDevices()
// ═══════════════════════════════════════════════════════════
describe('AddElementModal > fetchDevices()', () => {
  it('โหลด devices สำเร็จ → this.devices = data', async () => {
    const wrapper = mountModal();
    await flushPromises();
    expect(wrapper.vm.devices).toEqual(MOCK_DEVICES);
  });

  it('ส่ง Authorization header ด้วย token', async () => {
    mountModal();
    await flushPromises();
    const call = mockFetch.mock.calls.find((c) => c[0].includes('/api/devices'));
    expect(call[1].headers['Authorization']).toBe('Bearer test-token');
  });

  it('fetch throw → catch → devices=[], console.error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    setupFetch({ devicesThrow: true });
    const wrapper = mountModal();
    await flushPromises();
    expect(wrapper.vm.devices).toEqual([]);
    expect(spy).toHaveBeenCalledWith('Failed to load devices:', expect.any(Error));
    spy.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════
// 6. onDeviceChange()
// ═══════════════════════════════════════════════════════════
describe('AddElementModal > onDeviceChange()', () => {
  it('reset form.address_id = null เมื่อเปลี่ยน device', async () => {
    const wrapper = mountModal();
    await flushPromises();
    wrapper.vm.form.device_id = 1;
    wrapper.vm.form.address_id = 10;
    wrapper.vm.onDeviceChange();
    expect(wrapper.vm.form.address_id).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════
// 7. populateForm()
// ═══════════════════════════════════════════════════════════
describe('AddElementModal > populateForm()', () => {
  it('guard: ถ้าไม่มี editData → return ก่อน (ไม่ crash)', async () => {
    const wrapper = mountModal();
    await flushPromises();
    // editData = null → guard ใน populateForm
    expect(() => wrapper.vm.populateForm()).not.toThrow();
    expect(wrapper.vm.form.name).toBe(''); // ไม่เปลี่ยนแปลง
  });

  it('copy keys จาก editData ลง form (key ที่มีใน editData)', async () => {
    const editData = {
      id: 5, name: 'Updated Name', device_id: 2, address_id: 20,
      element_type: 'status_lamp', x_percent: 25, y_percent: 50,
    };
    const wrapper = mountModal({ editData });
    await flushPromises();
    expect(wrapper.vm.form.name).toBe('Updated Name');
    expect(wrapper.vm.form.device_id).toBe(2);
    expect(wrapper.vm.form.address_id).toBe(20);
    expect(wrapper.vm.form.element_type).toBe('status_lamp');
    expect(wrapper.vm.form.x_percent).toBe(25);
  });

  it('ไม่ copy key ที่ editData[key] = undefined (editData[key] !== undefined check)', async () => {
    const editData = {
      id: 5, name: 'Test', device_id: 1, address_id: 10,
      font_size: undefined, // undefined ไม่ควรถูก copy
    };
    const wrapper = mountModal({ editData });
    await flushPromises();
    expect(wrapper.vm.form.font_size).toBeNull(); // ค่า default ยังอยู่
  });

  it('copy null value จาก editData ลง form (null !== undefined = true)', async () => {
    const editData = {
      id: 5, name: 'Test', device_id: 1, address_id: 10,
      bg_color: null, // null ควรถูก copy
    };
    const wrapper = mountModal({ editData });
    await flushPromises();
    expect(wrapper.vm.form.bg_color).toBeNull();
  });

  it('copy zero value จาก editData ลง form (0 !== undefined = true)', async () => {
    const editData = {
      id: 5, name: 'Test', device_id: 1, address_id: 10,
      x_percent: 0, y_percent: 0,
    };
    const wrapper = mountModal({ editData });
    await flushPromises();
    expect(wrapper.vm.form.x_percent).toBe(0);
    expect(wrapper.vm.form.y_percent).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════
// 8. submit() – Add Mode
// ═══════════════════════════════════════════════════════════
describe('AddElementModal > submit(): Add Mode', () => {
  it('validation fail → validationError ถูกตั้ง, ไม่เรียก API', async () => {
    const wrapper = mountModal({}, EN);
    await flushPromises();
    await wrapper.vm.submit();
    expect(wrapper.vm.validationError).toBe('Please select a Device');
    expect(mockFetch.mock.calls.some((c) => c[0].includes('/interaction'))).toBe(false);
  });

  it('validationError ถูก clear เมื่อ submit valid', async () => {
    const wrapper = mountModal({}, EN);
    await flushPromises();
    wrapper.vm.validationError = 'old error';
    setValidForm(wrapper.vm);
    await wrapper.vm.submit();
    expect(wrapper.vm.validationError).toBe('');
  });

  it('POST ส่ง method=POST, URL=/interaction/elements, body=form', async () => {
    const wrapper = mountModal({}, EN);
    await flushPromises();
    setValidForm(wrapper.vm);
    await wrapper.vm.submit();
    const call = mockFetch.mock.calls.find((c) => c[0].includes('/interaction/elements'));
    expect(call[1].method).toBe('POST');
    const body = JSON.parse(call[1].body);
    expect(body.device_id).toBe(1);
    expect(body.address_id).toBe(10);
    expect(body.name).toBe('My Element');
    expect(body.layout_id).toBe(1);
  });

  it('POST ส่ง Authorization header', async () => {
    const wrapper = mountModal({}, EN);
    await flushPromises();
    setValidForm(wrapper.vm);
    await wrapper.vm.submit();
    const call = mockFetch.mock.calls.find((c) => c[0].includes('/interaction/elements'));
    expect(call[1].headers['Authorization']).toBe('Bearer test-token');
  });

  it('POST success → console.log, emit "saved" พร้อม result', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const wrapper = mountModal({}, EN);
    await flushPromises();
    setValidForm(wrapper.vm);
    await wrapper.vm.submit();
    expect(logSpy).toHaveBeenCalledWith('Element saved successfully:', expect.anything());
    expect(wrapper.emitted('saved')).toBeTruthy();
    expect(wrapper.emitted('saved')[0][0]).toEqual({ id: 99, name: 'Saved' });
    logSpy.mockRestore();
  });

  it('POST !response.ok → throw Error → catch → alert()', async () => {
    setupFetch({ elementResponse: { ok: false, status: 500, json: () => Promise.resolve({}) } });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const wrapper = mountModal({}, EN);
    await flushPromises();
    setValidForm(wrapper.vm);
    await wrapper.vm.submit();
    expect(spy).toHaveBeenCalledWith('Failed to save element:', expect.any(Error));
    expect(alert).toHaveBeenCalledWith(expect.stringContaining('Failed to save element'));
    spy.mockRestore();
  });

  it('fetch throw (network) → catch → alert()', async () => {
    mockFetch = vi.fn((url) => {
      if (url.includes('/api/devices')) return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_DEVICES) });
      if (url.includes('/interaction/elements')) return Promise.reject(new Error('Connection refused'));
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    vi.stubGlobal('fetch', mockFetch);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const wrapper = mountModal({}, EN);
    await flushPromises();
    setValidForm(wrapper.vm);
    await wrapper.vm.submit();
    expect(alert).toHaveBeenCalledWith('Failed to save element: Connection refused');
    spy.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════
// 9. submit() – Edit Mode
// ═══════════════════════════════════════════════════════════
describe('AddElementModal > submit(): Edit Mode', () => {
  const baseEdit = { id: 7, name: 'Old Name', device_id: 1, address_id: 10, element_type: 'gauge_display' };

  it('PUT ส่ง method=PUT, URL มี editData.id', async () => {
    const wrapper = mountModal({ editData: baseEdit }, EN);
    await flushPromises();
    wrapper.vm.form.device_id = 1;
    wrapper.vm.form.address_id = 10;
    wrapper.vm.form.name = 'Updated';
    await wrapper.vm.submit();
    const call = mockFetch.mock.calls.find((c) => c[0].includes('/interaction/elements/7'));
    expect(call[1].method).toBe('PUT');
  });

  it('PUT success → emit "saved"', async () => {
    const wrapper = mountModal({ editData: baseEdit }, EN);
    await flushPromises();
    setValidForm(wrapper.vm);
    await wrapper.vm.submit();
    expect(wrapper.emitted('saved')).toBeTruthy();
  });

  it('PUT !response.ok → catch → alert()', async () => {
    setupFetch({ elementResponse: { ok: false, status: 404, json: () => Promise.resolve({}) } });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const wrapper = mountModal({ editData: baseEdit }, EN);
    await flushPromises();
    setValidForm(wrapper.vm);
    await wrapper.vm.submit();
    expect(alert).toHaveBeenCalledWith(expect.stringContaining('Failed to save element'));
    spy.mockRestore();
  });

  it('isEdit → error message ใช้ response.status (HTTP error! status: 404)', async () => {
    setupFetch({ elementResponse: { ok: false, status: 404, json: () => Promise.resolve({}) } });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const wrapper = mountModal({ editData: baseEdit }, EN);
    await flushPromises();
    setValidForm(wrapper.vm);
    await wrapper.vm.submit();
    expect(alert).toHaveBeenCalledWith(expect.stringContaining('404'));
    spy.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════
// 10. Template Branches: locale, element_type
// ═══════════════════════════════════════════════════════════
describe('AddElementModal > Template Branches', () => {
  it('locale EN → Name placeholder = "e.g. Production Gauge"', async () => {
    const wrapper = mountModal({}, EN);
    await flushPromises();
    const nameInput = wrapper.find('input[type="text"]');
    expect(nameInput.attributes('placeholder')).toBe('e.g. Production Gauge');
  });

  it('locale TH → Name placeholder = "เช่น Production Gauge"', async () => {
    const wrapper = mountModal({}, TH);
    await flushPromises();
    const nameInput = wrapper.find('input[type="text"]');
    expect(nameInput.attributes('placeholder')).toBe('เช่น Production Gauge');
  });

  it('locale EN → Device option = "Select Device"', async () => {
    const wrapper = mountModal({}, EN);
    await flushPromises();
    expect(wrapper.findAll('select')[1].findAll('option')[0].text()).toBe('Select Device');
  });

  it('locale TH → Device option = "เลือก Device"', async () => {
    const wrapper = mountModal({}, TH);
    await flushPromises();
    expect(wrapper.findAll('select')[1].findAll('option')[0].text()).toBe('เลือก Device');
  });

  it('locale EN → Address option = "Select Address"', async () => {
    const wrapper = mountModal({}, EN);
    await flushPromises();
    expect(wrapper.findAll('select')[2].findAll('option')[0].text()).toBe('Select Address');
  });

  it('locale TH → Address option = "เลือก Address"', async () => {
    const wrapper = mountModal({}, TH);
    await flushPromises();
    expect(wrapper.findAll('select')[2].findAll('option')[0].text()).toBe('เลือก Address');
  });

  it('locale EN → Unit placeholder = "e.g. pcs, %, °C"', async () => {
    const wrapper = mountModal({}, EN);
    await flushPromises();
    const unitInput = wrapper.find('input[placeholder="e.g. pcs, %, °C"]');
    expect(unitInput.exists()).toBe(true);
  });

  it('locale TH → Unit placeholder = "เช่น pcs, %, °C"', async () => {
    const wrapper = mountModal({}, TH);
    await flushPromises();
    const unitInput = wrapper.find('input[placeholder="เช่น pcs, %, °C"]');
    expect(unitInput.exists()).toBe(true);
  });

  it('locale EN → Button Label placeholder = "e.g. START, STOP" (control_button)', async () => {
    const wrapper = mountModal({}, EN);
    await flushPromises();
    wrapper.vm.form.element_type = 'control_button';
    await wrapper.vm.$nextTick();
    const btnLabelInput = wrapper.find('input[placeholder="e.g. START, STOP"]');
    expect(btnLabelInput.exists()).toBe(true);
  });

  it('locale TH → Button Label placeholder = "เช่น START, STOP"', async () => {
    const wrapper = mountModal({}, TH);
    await flushPromises();
    wrapper.vm.form.element_type = 'control_button';
    await wrapper.vm.$nextTick();
    const btnLabelInput = wrapper.find('input[placeholder="เช่น START, STOP"]');
    expect(btnLabelInput.exists()).toBe(true);
  });

  it('คลิก Clear bg_color → form.bg_color = null', async () => {
    const wrapper = mountModal();
    await flushPromises();
    wrapper.vm.form.bg_color = '#ff0000';
    await wrapper.vm.$nextTick();
    await wrapper.find('.input-group button').trigger('click');
    expect(wrapper.vm.form.bg_color).toBeNull();
  });

  it('element_type = control_button + locale EN → Unit section ซ่อน (ไม่ใช่ gauge/number)', async () => {
    const wrapper = mountModal({}, EN);
    await flushPromises();
    wrapper.vm.form.element_type = 'control_button';
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).not.toContain('Unit');
  });
});

// ═══════════════════════════════════════════════════════════
// 11. DOM Interactions (v-model setters + events)
// ═══════════════════════════════════════════════════════════
describe('AddElementModal > DOM Interactions', () => {
  it('คลิก btn-close (header) → emit "close"', async () => {
    const wrapper = mountModal();
    await wrapper.find('.btn-close').trigger('click');
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('คลิก Cancel button → emit "close"', async () => {
    const wrapper = mountModal();
    await wrapper.findAll('.modal-footer button')[0].trigger('click');
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('DOM: setValue element_type select → v-model form.element_type อัปเดต', async () => {
    const wrapper = mountModal();
    await flushPromises();
    await wrapper.findAll('select')[0].setValue('status_lamp');
    expect(wrapper.vm.form.element_type).toBe('status_lamp');
  });

  it('DOM: setValue device select → v-model form.device_id อัปเดต + @change fires', async () => {
    const wrapper = mountModal();
    await flushPromises();
    wrapper.vm.form.address_id = 10; // set ก่อน เพื่อ verify reset
    await wrapper.findAll('select')[1].setValue(1);
    // @change → onDeviceChange → address_id = null
    expect(wrapper.vm.form.address_id).toBeNull();
  });

  it('DOM: setValue address select → v-model form.address_id อัปเดต', async () => {
    const wrapper = mountModal();
    await flushPromises();
    wrapper.vm.form.device_id = 1;
    await wrapper.vm.$nextTick();
    await wrapper.findAll('select')[2].setValue(11);
    expect(Number(wrapper.vm.form.address_id)).toBe(11);
  });

  it('DOM: setValue name input → v-model form.name อัปเดต', async () => {
    const wrapper = mountModal();
    await flushPromises();
    await wrapper.find('input[type="text"]').setValue('New Name');
    expect(wrapper.vm.form.name).toBe('New Name');
  });

  it('DOM: setValue x_percent input → v-model.number form.x_percent อัปเดต', async () => {
    const wrapper = mountModal();
    await flushPromises();
    const xInput = wrapper.find('input[min="0"][max="100"][step="0.5"]');
    await xInput.setValue(35);
    expect(Number(wrapper.vm.form.x_percent)).toBe(35);
  });

  it('DOM: setValue Unit input → v-model form.unit อัปเดต', async () => {
    const wrapper = mountModal();
    await flushPromises();
    // element_type = gauge_display (default) → Unit input แสดง
    const unitInput = wrapper.find('input[placeholder="e.g. pcs, %, °C"]');
    await unitInput.setValue('kg');
    expect(wrapper.vm.form.unit).toBe('kg');
  });

  it('DOM: setValue button_label input → v-model form.button_label อัปเดต', async () => {
    const wrapper = mountModal();
    await flushPromises();
    wrapper.vm.form.element_type = 'control_button';
    await wrapper.vm.$nextTick();
    const btnInput = wrapper.find('input[placeholder="e.g. START, STOP"]');
    await btnInput.setValue('START');
    expect(wrapper.vm.form.button_label).toBe('START');
  });

  it('DOM: checkbox is_visible → v-model form.is_visible อัปเดต', async () => {
    const wrapper = mountModal();
    await flushPromises();
    const checkbox = wrapper.find('input[type="checkbox"]');
    expect(wrapper.vm.form.is_visible).toBe(true); // default
    await checkbox.setValue(false);
    expect(wrapper.vm.form.is_visible).toBe(false);
  });

  it('DOM: คลิกปุ่ม submit → เรียก submit()', async () => {
    const wrapper = mountModal();
    await flushPromises();
    const spy = vi.spyOn(wrapper.vm, 'submit');
    await wrapper.findAll('.modal-footer button')[1].trigger('click');
    expect(spy).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════
// 12. เพิ่มเติม DOM v-model สำหรับ lines ที่อาจขาด
// ═══════════════════════════════════════════════════════════
describe('AddElementModal > Additional DOM v-model coverage', () => {
  it('DOM: setValue y_percent input → v-model.number form.y_percent อัปเดต', async () => {
    const wrapper = mountModal();
    await flushPromises();
    const inputs = wrapper.findAll('input[type="number"]');
    // inputs[0]=x_percent, inputs[1]=y_percent
    await inputs[1].setValue(40);
    expect(Number(wrapper.vm.form.y_percent)).toBe(40);
  });

  it('DOM: setValue size_width input → v-model.number form.size_width อัปเดต', async () => {
    const wrapper = mountModal();
    await flushPromises();
    const inputs = wrapper.findAll('input[type="number"]');
    // inputs[2]=size_width
    await inputs[2].setValue(20);
    expect(Number(wrapper.vm.form.size_width)).toBe(20);
  });

  it('DOM: setValue size_height input → v-model.number form.size_height อัปเดต', async () => {
    const wrapper = mountModal();
    await flushPromises();
    const inputs = wrapper.findAll('input[type="number"]');
    // inputs[3]=size_height
    await inputs[3].setValue(50);
    expect(Number(wrapper.vm.form.size_height)).toBe(50);
  });

  it('DOM: setValue precision input → v-model.number form.precision อัปเดต', async () => {
    const wrapper = mountModal();
    await flushPromises();
    // element_type=gauge_display → precision input แสดง
    const inputs = wrapper.findAll('input[type="number"]');
    // inputs[4]=precision (หลังจาก x,y,w,h)
    await inputs[4].setValue(2);
    expect(Number(wrapper.vm.form.precision)).toBe(2);
  });

  it('DOM: setValue active_color → v-model form.active_color อัปเดต (control_button)', async () => {
    const wrapper = mountModal();
    await flushPromises();
    wrapper.vm.form.element_type = 'control_button';
    await wrapper.vm.$nextTick();
    const colorInputs = wrapper.findAll('input[type="color"]');
    // active_color เป็น input[type=color] ใน control_button section
    await colorInputs[0].setValue('#ff0000');
    expect(wrapper.vm.form.active_color).toBe('#ff0000');
  });

  it('DOM: setValue inactive_color → v-model form.inactive_color อัปเดต (control_button)', async () => {
    const wrapper = mountModal();
    await flushPromises();
    wrapper.vm.form.element_type = 'control_button';
    await wrapper.vm.$nextTick();
    const colorInputs = wrapper.findAll('input[type="color"]');
    await colorInputs[1].setValue('#0000ff');
    expect(wrapper.vm.form.inactive_color).toBe('#0000ff');
  });

  it('DOM: setValue bg_color → v-model form.bg_color อัปเดต', async () => {
    const wrapper = mountModal();
    await flushPromises();
    // bg_color input[type=color]
    const bgInput = wrapper.find('input.form-control-color');
    await bgInput.setValue('#123456');
    expect(wrapper.vm.form.bg_color).toBe('#123456');
  });

  it('DOM: setValue text_color → v-model form.text_color อัปเดต', async () => {
    const wrapper = mountModal();
    await flushPromises();
    wrapper.vm.form.element_type = 'status_lamp'; // ซ่อน gauge section
    await wrapper.vm.$nextTick();
    const colorInputs = wrapper.findAll('input[type="color"]');
    // bg_color=index0, text_color=index1
    await colorInputs[1].setValue('#abcdef');
    expect(wrapper.vm.form.text_color).toBe('#abcdef');
  });

  it('DOM: setValue bar_color → v-model form.bar_color อัปเดต (level_progress_bar)', async () => {
    const wrapper = mountModal();
    await flushPromises();
    wrapper.vm.form.element_type = 'level_progress_bar';
    await wrapper.vm.$nextTick();
    const colorInputs = wrapper.findAll('input[type="color"]');
    // ใน level_progress_bar: bg_color, text_color, bar_color
    await colorInputs[2].setValue('#00ff00');
    expect(wrapper.vm.form.bar_color).toBe('#00ff00');
  });

  it('DOM: setValue font_size → v-model.number form.font_size อัปเดต', async () => {
    const wrapper = mountModal();
    await flushPromises();
    const fontInput = wrapper.find('input[min="8"][max="72"]');
    await fontInput.setValue(16);
    expect(Number(wrapper.vm.form.font_size)).toBe(16);
  });

  it('DOM: setValue display_order → v-model.number form.display_order อัปเดต', async () => {
    const wrapper = mountModal();
    await flushPromises();
    const orderInput = wrapper.find('input[min="0"]:not([max])');
    await orderInput.setValue(5);
    expect(Number(wrapper.vm.form.display_order)).toBe(5);
  });
});

// ═══════════════════════════════════════════════════════════
// 13. Bug Cases (FAIL) — อันตราย ยังไม่แก้ component
// ═══════════════════════════════════════════════════════════
describe('AddElementModal > Bug Cases (FAIL)', () => {

  // BUG-1: ไม่มี submitting guard ใน submit() → double-click → 2 API calls
  // อันตราย: submit() ไม่มี flag isSubmitting ป้องกัน
  //          → user คลิก "Add Element" สองครั้งรวดก่อน request แรกเสร็จ
  //          → 2 POST requests ถูกยิงพร้อมกัน → สร้าง element ซ้ำ 2 ตัวใน database
  //          → dashboard layout มี element ซ้ำ → UX เสีย + ต้องลบด้วยมือ
  //          → ต่างจาก AddDashboardCardModal ที่ก็มีปัญหาเดียวกัน
  //          → แก้โดย: เพิ่ม `if (this.isSubmitting) return` + toggle flag ใน finally
  // FAIL เพราะ: ไม่มี guard → submit() สองครั้ง → 2 POST calls
  it('[BUG-1] double-click submit → ยิง 2 POST calls ไม่มี submitting guard (FAIL)', async () => {
    const resolvers = [];
    mockFetch = vi.fn((url) => {
      if (url.includes('/api/devices')) return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_DEVICES) });
      if (url.includes('/interaction/elements')) return new Promise((r) => resolvers.push(r));
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    vi.stubGlobal('fetch', mockFetch);

    const wrapper = mountModal();
    await flushPromises();
    setValidForm(wrapper.vm);

    // submit 2 ครั้งรวด (ไม่ await)
    wrapper.vm.submit();
    wrapper.vm.submit();
    await wrapper.vm.$nextTick();

    const apiCalls = mockFetch.mock.calls.filter((c) => c[0].includes('/interaction/elements'));

    // คาดหวัง: มี flag guard → แค่ 1 call
    expect(apiCalls.length).toBeLessThanOrEqual(1);
    // FAIL: apiCalls.length = 2 เพราะไม่มี submitting guard

    resolvers.forEach((r) => r({ ok: true, json: () => Promise.resolve({ id: 1 }) }));
    await flushPromises();
  });

  // BUG-2: `fetchDevices()` assign raw response โดยไม่เช็คว่าเป็น array
  // อันตราย: backend เปลี่ยน response format เป็น { data: [...] }
  //          → this.devices = { data: [...] } (object ไม่ใช่ array)
  //          → selectedDevice computed: this.devices.find(...) → TypeError: find is not a function
  //          → UI crash: selectedDevice/filteredAddresses throw → white screen
  //          → devices dropdown แสดง object keys แทน device names
  //          → operator ไม่สามารถเลือก device ได้ → element ไม่สามารถสร้างได้
  //          → แก้โดย: this.devices = data.data || data || []
  // FAIL เพราะ: this.devices = { data: [...] } → selectedDevice computed throws TypeError
  it('[BUG-2] fetchDevices ไม่ unwrap data.data → ถ้า API ส่ง {data:[...]} → devices เป็น object ไม่ใช่ array (FAIL)', async () => {
    // จำลอง API response แบบ wrapped { data: [...] }
    setupFetch({ devicesPayload: { data: MOCK_DEVICES, message: 'ok' } });
    // suppress Vue warn/error ที่เกิดจาก TypeError ใน computed (เป็นพฤติกรรมที่ bug ก่อ)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const wrapper = mountModal();
    await flushPromises();
    warnSpy.mockRestore();
    errorSpy.mockRestore();

    // คาดหวัง: devices ควรเป็น array (unwrapped)
    expect(Array.isArray(wrapper.vm.devices)).toBe(true);
    // FAIL: this.devices = { data: MOCK_DEVICES, message: 'ok' } (object ไม่ใช่ array)
    //       → Array.isArray(object) = false
  });

  // BUG-3: authH() → 'Bearer null' เมื่อไม่มี token ใน localStorage
  // อันตราย: localStorage.getItem('token') คืน null
  //          → `Bearer ${null}` = 'Bearer null' (string ไม่ใช่ empty)
  //          → ทุก API call (fetchDevices + submit) ส่ง Authorization: 'Bearer null'
  //          → server misconfigured อาจ parse 'null' เป็น valid → security hole
  //          → หรือ server reject ด้วย 401 แต่ error message ไม่ชัดเจน
  //          → แก้: const t = localStorage.getItem('token'); return t ? {Authorization: `Bearer ${t}`} : {}
  // FAIL เพราะ: `Bearer ${null}` = 'Bearer null' → header มีค่าที่ไม่ควรมี
  it('[BUG-3] authH() ส่ง "Bearer null" เมื่อไม่มี token (FAIL)', async () => {
    delete store.token;
    mountModal();
    await flushPromises();

    const devicesCall = mockFetch.mock.calls.find((c) => c[0].includes('/api/devices'));
    const authHeader = devicesCall?.[1]?.headers?.['Authorization'];

    // คาดหวัง: ไม่มี token → ไม่ควรส่ง 'Bearer null'
    expect(authHeader).not.toBe('Bearer null');
    // FAIL: `Bearer ${localStorage.getItem('token')}` = `Bearer ${null}` = 'Bearer null'
  });

  // BUG-4: submit() ใช้ native alert() แทน showAlert (swalHelper) → UX inconsistent
  // อันตราย: เมื่อ submit ล้มเหลว → alert('Failed to save element: ...')
  //          → native browser alert() เป็น synchronous blocking modal ที่ ugly
  //          → ไม่สามารถ style หรือ customize ได้ (ต่างจาก component อื่นที่ใช้ showAlert)
  //          → ใน mobile browser บางตัว: alert() อาจถูก block โดย browser policy
  //          → ใน automated testing: alert() ไม่ถูก mock โดย vi.mock → test ค้าง
  //          → production issue: หน้าจอ freeze จนกว่า user จะกด OK
  //          → ควรแทนที่ด้วย showAlert() จาก swalHelper เพื่อ consistency
  // FAIL เพราะ: alert() ถูกเรียกจริง ไม่ใช่ showAlert ดังนั้น showAlert mock ไม่ถูก trigger
  it('[BUG-4] submit error ใช้ native alert() แทน showAlert → inconsistent UX (FAIL)', async () => {
    // mock showAlert เพิ่มเติมใน scope นี้เพื่อ verify
    const { showAlert: mockShowAlert } = await vi.importMock('../../utils/swalHelper').catch(() => ({ showAlert: vi.fn() }));

    setupFetch({ elementResponse: { ok: false, status: 500, json: () => Promise.resolve({}) } });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const wrapper = mountModal({}, EN);
    await flushPromises();
    setValidForm(wrapper.vm);
    await wrapper.vm.submit();
    spy.mockRestore();

    // คาดหวัง: error ควรแสดงด้วย showAlert (swalHelper) ไม่ใช่ native alert()
    // (หรืออย่างน้อย: alert() ไม่ควรถูกเรียก เพราะ showAlert ทำงานแทน)
    expect(alert).not.toHaveBeenCalled();
    // FAIL: alert() ถูกเรียกจริง → native alert() ถูก invoke
  });

  // BUG-5: canSubmit computed ถูก define แต่ Submit button ไม่ได้ใช้ :disabled="!canSubmit"
  // อันตราย: canSubmit = this.form.device_id && this.form.address_id && this.form.name
  //          → เป็น computed ที่คำนวณถูกต้อง แต่ template button ไม่ได้ bind:
  //            <button @click="submit"> ← ไม่มี :disabled="!canSubmit"
  //          → Submit button ถูกคลิกได้ตลอดเวลา แม้ form ยังไม่ครบ
  //          → user กด Submit โดยไม่ได้เลือก device → เห็น validationError message
  //            (validation ยังทำงาน แต่ UX ไม่ดี: ควรปุ่ม disabled แทนที่จะรอให้กดแล้ว error)
  //          → ปัญหาใหญ่กว่าคือ: canSubmit ถูก compute ทุก render แต่ไม่มีผลต่อ UI
  //            → dead code ที่ทำให้ developer สับสนว่า "ทำไม submit ปุ่มยัง clickable"
  //          → แก้: เพิ่ม :disabled="!canSubmit" บนปุ่ม submit
  // FAIL เพราะ: ปุ่ม Submit ไม่มี disabled attribute แม้ canSubmit = false
  it('[BUG-5] canSubmit=false แต่ Submit button ไม่ถูก disabled (canSubmit ไม่ได้ใช้ใน template) (FAIL)', async () => {
    const wrapper = mountModal();
    await flushPromises();
    // form ว่าง: device_id=null, address_id=null, name="" → canSubmit = false
    expect(wrapper.vm.canSubmit).toBeFalsy();

    const submitBtn = wrapper.findAll('.modal-footer button')[1];

    // คาดหวัง: canSubmit=false → ปุ่ม Submit ควร disabled
    expect(submitBtn.attributes('disabled')).toBeDefined();
    // FAIL: :disabled="!canSubmit" ไม่ได้ bind ใน template → button ไม่มี disabled attribute
  });
});
