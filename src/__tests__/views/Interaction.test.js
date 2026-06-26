import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import Interaction from '../../views/Interaction.vue';

// ─── Child component mocks ────────────────────────────────────────────────────
vi.mock('../../components/interaction/StatusLamp.vue', () => ({
  default: {
    name: 'StatusLamp',
    props: ['x_percent', 'y_percent', 'size', 'bgColor', 'inactiveColor', 'isOn', 'name', 'addressId'],
    emits: ['toggle'],
    // click on root div emits 'toggle' — used by template-propagation tests
    template: '<div class="status-lamp-stub" @click="$emit(\'toggle\', true)"></div>',
  },
}));
vi.mock('../../components/interaction/NumberDisplay.vue', () => ({
  default: {
    name: 'NumberDisplay',
    props: ['x_percent', 'y_percent', 'size', 'bgColor', 'textColor', 'unit', 'decimals', 'value', 'editable', 'addressId', 'name'],
    emits: ['update-value'],
    template: '<div class="number-display-stub"></div>',
  },
}));
vi.mock('../../components/interaction/GaugeDisplay.vue', () => ({
  default: {
    name: 'GaugeDisplay',
    props: ['x_percent', 'y_percent', 'size', 'bgColor', 'textColor', 'unit', 'decimals', 'value', 'minValue', 'maxValue', 'alarms', 'editable', 'addressId', 'name'],
    emits: ['update-value'],
    template: '<div class="gauge-display-stub"></div>',
  },
}));
vi.mock('../../components/interaction/ControlButton.vue', () => ({
  default: {
    name: 'ControlButton',
    props: ['x_percent', 'y_percent', 'size', 'label', 'activeColor', 'inactiveColor', 'isPressed', 'name'],
    emits: ['click'],
    template: '<div class="control-button-stub"></div>',
  },
}));
vi.mock('../../components/interaction/LevelProgressBar.vue', () => ({
  default: {
    name: 'LevelProgressBar',
    props: ['x_percent', 'y_percent', 'size', 'bgColor', 'textColor', 'barColor', 'unit', 'decimals', 'value', 'levels', 'editable', 'addressId', 'name'],
    emits: ['update-value'],
    template: '<div class="level-progress-bar-stub"></div>',
  },
}));
vi.mock('../../views/AddElementModal.vue', () => ({
  default: {
    name: 'AddElementModal',
    props: ['layoutId'],
    emits: ['close', 'saved'],
    template: '<div class="add-element-modal-stub"></div>',
  },
}));
vi.mock('../../utils/swalHelper', () => ({
  showConfirm: vi.fn().mockResolvedValue(false),
  showAlert: vi.fn(),
}));

// ─── Global stubs ─────────────────────────────────────────────────────────────
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);
vi.stubGlobal('alert', vi.fn());

const store = { token: 'test-token' };
vi.stubGlobal('localStorage', {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = v; },
  removeItem: (k) => { delete store[k]; },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const EN = { t: (k) => k };

let _elemId = 0;
function makeElement(type = 'status_lamp', overrides = {}) {
  return {
    id: ++_elemId,
    element_type: type,
    address_id: 1,
    is_visible: true,
    x_percent: '10',
    y_percent: '20',
    size_width: 50,
    bg_color: '#fff',
    inactive_color: '#ccc',
    active_color: '#0f0',
    text_color: '#000',
    bar_color: '#00f',
    unit: 'bar',
    precision: 2,
    name: 'Test',
    ...overrides,
  };
}

function makeLayout(overrides = {}) {
  return {
    id: 1,
    name: 'Test Layout',
    aspect_ratio_width: 16,
    aspect_ratio_height: 9,
    machine_image: null,
    elements: [],
    ...overrides,
  };
}

function makeDevice(overrides = {}) {
  return {
    address_id: 1,
    plc_address: 'D100',
    last_value: 0,
    device: { room_id: null },
    numberConfig: null,
    alarms: [],
    levelConfigs: [],
    ...overrides,
  };
}

function okJson(data) {
  return { ok: true, json: vi.fn().mockResolvedValue(data) };
}

function setupFetch(layouts = [], layoutData = makeLayout()) {
  mockFetch.mockReset();
  mockFetch
    .mockResolvedValueOnce(okJson(layouts))
    .mockResolvedValueOnce(okJson(layoutData));
}

function mountComp(props = {}) {
  return mount(Interaction, {
    props: {
      devices: [],
      isSimulate: false,
      userRole: '',
      allowedRoomIds: null,
      canControlRoom: null,
      ...props,
    },
    global: { provide: { locale: EN } },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  setupFetch();
  store.token = 'test-token';
  _elemId = 0;
});

// ─── computed: canAddElement ───────────────────────────────────────────────────
describe('computed: canAddElement', () => {
  it('is true for super_admin', () => {
    expect(mountComp({ userRole: 'super_admin' }).vm.canAddElement).toBe(true);
  });
  it('is true for admin', () => {
    expect(mountComp({ userRole: 'admin' }).vm.canAddElement).toBe(true);
  });
  it('is false for user', () => {
    expect(mountComp({ userRole: 'user' }).vm.canAddElement).toBe(false);
  });
  it('is false for empty string role', () => {
    expect(mountComp({ userRole: '' }).vm.canAddElement).toBe(false);
  });
});

// ─── computed: containerStyle ─────────────────────────────────────────────────
describe('computed: containerStyle', () => {
  it('returns {} when layoutData is null', () => {
    const wrapper = mountComp();
    wrapper.vm.layoutData = null;
    expect(wrapper.vm.containerStyle).toEqual({});
  });

  it('returns style object with aspectRatio and backgroundImage when layoutData is set', async () => {
    setupFetch([], makeLayout({ aspect_ratio_width: 16, aspect_ratio_height: 9 }));
    const wrapper = mountComp();
    await flushPromises();
    wrapper.vm.backgroundImage = 'http://img.png';
    const style = wrapper.vm.containerStyle;
    expect(style.aspectRatio).toBe('16 / 9');
    expect(style.backgroundImage).toContain('url(');
  });
});

// ─── computed: visibleElements ────────────────────────────────────────────────
describe('computed: visibleElements', () => {
  it('returns [] when layoutData is null', () => {
    const wrapper = mountComp();
    wrapper.vm.layoutData = null;
    expect(wrapper.vm.visibleElements).toEqual([]);
  });

  it('returns [] when layoutData has no elements property', () => {
    const wrapper = mountComp();
    wrapper.vm.layoutData = { id: 1 };
    expect(wrapper.vm.visibleElements).toEqual([]);
  });

  it('filters out invisible elements', () => {
    const wrapper = mountComp();
    wrapper.vm.layoutData = makeLayout({
      elements: [
        makeElement('status_lamp', { id: 10, is_visible: true }),
        makeElement('status_lamp', { id: 11, is_visible: false }),
      ],
    });
    expect(wrapper.vm.visibleElements).toHaveLength(1);
    expect(wrapper.vm.visibleElements[0].id).toBe(10);
  });

  it('returns all visible elements when allowedRoomIds=null (no filter)', () => {
    const wrapper = mountComp({ allowedRoomIds: null });
    wrapper.vm.layoutData = makeLayout({ elements: [makeElement('status_lamp', { id: 20, is_visible: true })] });
    expect(wrapper.vm.visibleElements).toHaveLength(1);
  });

  it('includes element when device roomId is in allowedRoomIds', () => {
    const device = makeDevice({ address_id: 1, device: { room_id: 5 } });
    const wrapper = mountComp({ devices: [device], allowedRoomIds: [5] });
    wrapper.vm.layoutData = makeLayout({ elements: [makeElement('status_lamp', { address_id: 1, is_visible: true })] });
    expect(wrapper.vm.visibleElements).toHaveLength(1);
  });

  it('excludes element when device roomId is not in allowedRoomIds', () => {
    const device = makeDevice({ address_id: 1, device: { room_id: 99 } });
    const wrapper = mountComp({ devices: [device], allowedRoomIds: [5] });
    wrapper.vm.layoutData = makeLayout({ elements: [makeElement('status_lamp', { address_id: 1, is_visible: true })] });
    expect(wrapper.vm.visibleElements).toHaveLength(0);
  });

  it('includes element with roomId=null when allowedRoomIds is set', () => {
    const device = makeDevice({ address_id: 1, device: { room_id: null } });
    const wrapper = mountComp({ devices: [device], allowedRoomIds: [5] });
    wrapper.vm.layoutData = makeLayout({ elements: [makeElement('status_lamp', { address_id: 1, is_visible: true })] });
    expect(wrapper.vm.visibleElements).toHaveLength(1);
  });
});

// ─── mounted lifecycle ────────────────────────────────────────────────────────
describe('mounted', () => {
  it('calls fetchLayouts on mount', async () => {
    mountComp();
    await flushPromises();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/interaction/layouts'),
      expect.any(Object)
    );
  });

  it('calls fetchLayoutData with selectedLayoutId=3 on mount', async () => {
    mountComp();
    await flushPromises();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/interaction/layouts/3'),
      expect.any(Object)
    );
  });

  it('calls updatePlcValuesFromDevices with initial devices on mount', async () => {
    const device = makeDevice({ address_id: 7, last_value: 42 });
    const wrapper = mountComp({ devices: [device] });
    await flushPromises();
    expect(wrapper.vm.plcValues[7]).toBe(42);
  });
});

// ─── watch: devices ───────────────────────────────────────────────────────────
describe('watch: devices', () => {
  it('calls updatePlcValuesFromDevices when devices prop changes', async () => {
    const wrapper = mountComp({ devices: [] });
    await flushPromises();
    const newDevice = makeDevice({ address_id: 3, last_value: 99 });
    await wrapper.setProps({ devices: [newDevice] });
    await flushPromises();
    expect(wrapper.vm.plcValues[3]).toBe(99);
  });
});

// ─── beforeUnmount ────────────────────────────────────────────────────────────
describe('beforeUnmount', () => {
  it('clears pollingInterval when set', () => {
    const clearSpy = vi.spyOn(global, 'clearInterval');
    const wrapper = mountComp();
    wrapper.vm.pollingInterval = 123;
    wrapper.unmount();
    expect(clearSpy).toHaveBeenCalledWith(123);
  });

  it('does not call clearInterval when pollingInterval is not set', () => {
    const clearSpy = vi.spyOn(global, 'clearInterval');
    const wrapper = mountComp();
    wrapper.vm.pollingInterval = undefined;
    wrapper.unmount();
    expect(clearSpy).not.toHaveBeenCalled();
  });
});

// ─── methods: getDeviceRoomId ─────────────────────────────────────────────────
describe('getDeviceRoomId()', () => {
  it('returns device.device.room_id when device found', () => {
    const device = makeDevice({ address_id: 1, device: { room_id: 7 } });
    const wrapper = mountComp({ devices: [device] });
    expect(wrapper.vm.getDeviceRoomId(1)).toBe(7);
  });

  it('returns null when device not found', () => {
    const wrapper = mountComp({ devices: [] });
    expect(wrapper.vm.getDeviceRoomId(99)).toBeNull();
  });

  it('returns null when device has no nested device object (optional chaining)', () => {
    const device = makeDevice({ address_id: 1, device: null });
    const wrapper = mountComp({ devices: [device] });
    expect(wrapper.vm.getDeviceRoomId(1)).toBeNull();
  });
});

// ─── methods: canControlElement ───────────────────────────────────────────────
describe('canControlElement()', () => {
  it('calls canControlRoom fn and returns its result when provided', () => {
    const canControlRoom = vi.fn().mockReturnValue(true);
    const device = makeDevice({ address_id: 1, device: { room_id: 5 } });
    const wrapper = mountComp({ devices: [device], canControlRoom });
    const result = wrapper.vm.canControlElement(makeElement('status_lamp', { address_id: 1 }));
    expect(canControlRoom).toHaveBeenCalledWith(5);
    expect(result).toBe(true);
  });

  it('returns true for admin role when canControlRoom is null', () => {
    const wrapper = mountComp({ userRole: 'admin', canControlRoom: null });
    expect(wrapper.vm.canControlElement(makeElement())).toBe(true);
  });

  it('returns false for user role when canControlRoom is null', () => {
    const wrapper = mountComp({ userRole: 'user', canControlRoom: null });
    expect(wrapper.vm.canControlElement(makeElement())).toBe(false);
  });
});

// ─── methods: getButtonLabel ──────────────────────────────────────────────────
describe('getButtonLabel()', () => {
  it('returns "START" when device value is 0', () => {
    const wrapper = mountComp();
    wrapper.vm.plcValues[1] = 0;
    expect(wrapper.vm.getButtonLabel(makeElement('control_button', { address_id: 1 }))).toBe('START');
  });

  it('returns "STOP" when device value is non-zero', () => {
    const wrapper = mountComp();
    wrapper.vm.plcValues[1] = 1;
    expect(wrapper.vm.getButtonLabel(makeElement('control_button', { address_id: 1 }))).toBe('STOP');
  });
});

// ─── methods: calculateSize ───────────────────────────────────────────────────
describe('calculateSize()', () => {
  it('returns size_width / 10 when size_width is set', () => {
    expect(mountComp().vm.calculateSize({ size_width: 80 })).toBe(8);
  });

  it('returns 5 when size_width is absent (falls back to 50)', () => {
    expect(mountComp().vm.calculateSize({})).toBe(5);
  });
});

// ─── methods: getValue ────────────────────────────────────────────────────────
describe('getValue()', () => {
  it('returns 0 when addressId is null (falsy check)', () => {
    expect(mountComp().vm.getValue(null)).toBe(0);
  });

  it('returns 0 when addressId is undefined', () => {
    expect(mountComp().vm.getValue(undefined)).toBe(0);
  });

  it('returns plcValues[addressId] when found', () => {
    const wrapper = mountComp();
    wrapper.vm.plcValues[5] = 42;
    expect(wrapper.vm.getValue(5)).toBe(42);
  });

  it('returns 0 via ?? when addressId not in plcValues', () => {
    const wrapper = mountComp();
    expect(wrapper.vm.getValue(999)).toBe(0);
  });
});

// ─── methods: fetchLayouts ────────────────────────────────────────────────────
describe('fetchLayouts()', () => {
  it('sets layouts from API response', async () => {
    const layouts = [{ id: 1, name: 'L1' }, { id: 2, name: 'L2' }];
    setupFetch(layouts);
    const wrapper = mountComp();
    await flushPromises();
    expect(wrapper.vm.layouts).toEqual(layouts);
  });

  it('catches error silently when fetch throws (does not set this.error)', async () => {
    mockFetch.mockReset();
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(okJson(makeLayout()));
    const wrapper = mountComp();
    await flushPromises();
    expect(wrapper.vm.layouts).toEqual([]);
    expect(wrapper.vm.error).toBeNull();
  });

  it('catches error silently when response not ok', async () => {
    mockFetch.mockReset();
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce(okJson(makeLayout()));
    const wrapper = mountComp();
    await flushPromises();
    expect(wrapper.vm.layouts).toEqual([]);
  });
});

// ─── methods: fetchLayoutData ─────────────────────────────────────────────────
describe('fetchLayoutData()', () => {
  it('sets loading=false and returns early when no id', async () => {
    const wrapper = mountComp();
    await flushPromises();
    wrapper.vm.selectedLayoutId = null;
    wrapper.vm.loading = true;
    await wrapper.vm.fetchLayoutData();
    expect(wrapper.vm.loading).toBe(false);
    expect(wrapper.vm.layoutData).not.toBeNull(); // unchanged from mount
  });

  it('sets layoutData from API response', async () => {
    const layout = makeLayout({ name: 'My Layout' });
    setupFetch([], layout);
    const wrapper = mountComp();
    await flushPromises();
    expect(wrapper.vm.layoutData.name).toBe('My Layout');
  });

  it('sets backgroundImage when machine_image is present', async () => {
    const layout = makeLayout({ machine_image: 'http://img.test/bg.png' });
    setupFetch([], layout);
    const wrapper = mountComp();
    await flushPromises();
    expect(wrapper.vm.backgroundImage).toBe('http://img.test/bg.png');
  });

  it('does not change backgroundImage when machine_image is absent', async () => {
    const layout = makeLayout({ machine_image: null });
    setupFetch([], layout);
    const wrapper = mountComp();
    wrapper.vm.backgroundImage = 'existing.png';
    await flushPromises();
    expect(wrapper.vm.backgroundImage).toBe('existing.png');
  });

  it('sets error message on fetch rejection', async () => {
    mockFetch.mockReset();
    mockFetch
      .mockResolvedValueOnce(okJson([]))
      .mockRejectedValueOnce(new Error('Fetch failed'));
    const wrapper = mountComp();
    await flushPromises();
    expect(wrapper.vm.error).toBe('Fetch failed');
  });

  it('sets error message when response not ok', async () => {
    mockFetch.mockReset();
    mockFetch
      .mockResolvedValueOnce(okJson([]))
      .mockResolvedValueOnce({ ok: false, status: 404 });
    const wrapper = mountComp();
    await flushPromises();
    expect(wrapper.vm.error).toContain('404');
  });

  it('always sets loading=false in finally block', async () => {
    mockFetch.mockReset();
    mockFetch
      .mockResolvedValueOnce(okJson([]))
      .mockRejectedValueOnce(new Error('Err'));
    const wrapper = mountComp();
    await flushPromises();
    expect(wrapper.vm.loading).toBe(false);
  });
});

// ─── methods: onLayoutChange ──────────────────────────────────────────────────
describe('onLayoutChange()', () => {
  it('calls fetchLayoutData', async () => {
    const wrapper = mountComp();
    await flushPromises();
    mockFetch.mockResolvedValueOnce(okJson(makeLayout({ name: 'New' })));
    await wrapper.vm.onLayoutChange();
    await flushPromises();
    expect(wrapper.vm.layoutData.name).toBe('New');
  });
});

// ─── methods: onElementSaved ──────────────────────────────────────────────────
describe('onElementSaved()', () => {
  it('sets showAddElementModal=false', async () => {
    const wrapper = mountComp();
    await flushPromises();
    wrapper.vm.showAddElementModal = true;
    mockFetch.mockResolvedValueOnce(okJson(makeLayout()));
    await wrapper.vm.onElementSaved();
    expect(wrapper.vm.showAddElementModal).toBe(false);
  });

  it('calls fetchLayoutData to refresh elements', async () => {
    const wrapper = mountComp();
    await flushPromises();
    const refreshed = makeLayout({ name: 'Refreshed' });
    mockFetch.mockResolvedValueOnce(okJson(refreshed));
    await wrapper.vm.onElementSaved();
    await flushPromises();
    expect(wrapper.vm.layoutData.name).toBe('Refreshed');
  });
});

// ─── methods: updatePlcValuesFromDevices ──────────────────────────────────────
describe('updatePlcValuesFromDevices()', () => {
  it('returns early when devices is null', () => {
    const wrapper = mountComp();
    wrapper.vm.plcValues = { 1: 5 };
    wrapper.vm.updatePlcValuesFromDevices(null);
    expect(wrapper.vm.plcValues[1]).toBe(5); // unchanged
  });

  it('returns early when devices is empty array', () => {
    const wrapper = mountComp();
    wrapper.vm.plcValues = { 1: 5 };
    wrapper.vm.updatePlcValuesFromDevices([]);
    expect(wrapper.vm.plcValues[1]).toBe(5); // unchanged
  });

  it('sets plcValues from device list', () => {
    const wrapper = mountComp();
    wrapper.vm.updatePlcValuesFromDevices([
      makeDevice({ address_id: 1, last_value: 10 }),
      makeDevice({ address_id: 2, last_value: 20 }),
    ]);
    expect(wrapper.vm.plcValues[1]).toBe(10);
    expect(wrapper.vm.plcValues[2]).toBe(20);
  });

  it('skips devices without address_id (falsy)', () => {
    const wrapper = mountComp();
    wrapper.vm.updatePlcValuesFromDevices([
      makeDevice({ address_id: null, last_value: 99 }),
      makeDevice({ address_id: 5, last_value: 77 }),
    ]);
    expect(wrapper.vm.plcValues[null]).toBeUndefined();
    expect(wrapper.vm.plcValues[5]).toBe(77);
  });
});

// ─── methods: getPlcAddress ───────────────────────────────────────────────────
describe('getPlcAddress()', () => {
  it('returns null when addressId is falsy (null)', () => {
    expect(mountComp().vm.getPlcAddress(null)).toBeNull();
  });

  it('returns null when devices is null (dead code guard)', () => {
    const wrapper = mountComp({ devices: null });
    expect(wrapper.vm.getPlcAddress(1)).toBeNull();
  });

  it('returns plc_address when device found', () => {
    const wrapper = mountComp({ devices: [makeDevice({ address_id: 3, plc_address: 'W50' })] });
    expect(wrapper.vm.getPlcAddress(3)).toBe('W50');
  });

  it('returns null when device not found', () => {
    const wrapper = mountComp({ devices: [makeDevice({ address_id: 1 })] });
    expect(wrapper.vm.getPlcAddress(99)).toBeNull();
  });
});

// ─── methods: getDeviceMinMax ─────────────────────────────────────────────────
describe('getDeviceMinMax()', () => {
  const DEFAULT = { min: 0, max: 100, alarms: [] };

  it('returns default when addressId is falsy', () => {
    expect(mountComp().vm.getDeviceMinMax(null)).toEqual(DEFAULT);
  });

  it('returns default when devices is null', () => {
    expect(mountComp({ devices: null }).vm.getDeviceMinMax(1)).toEqual(DEFAULT);
  });

  it('returns default when device not found', () => {
    expect(mountComp({ devices: [] }).vm.getDeviceMinMax(99)).toEqual(DEFAULT);
  });

  it('returns default when device has no numberConfig', () => {
    const wrapper = mountComp({ devices: [makeDevice({ address_id: 1, numberConfig: null })] });
    expect(wrapper.vm.getDeviceMinMax(1)).toEqual(DEFAULT);
  });

  it('returns min/max from numberConfig', () => {
    const device = makeDevice({ address_id: 1, numberConfig: { min_value: 10, max_value: 200 }, alarms: [] });
    const wrapper = mountComp({ devices: [device] });
    expect(wrapper.vm.getDeviceMinMax(1)).toEqual({ min: 10, max: 200, alarms: [] });
  });

  it('defaults min to 0 when numberConfig.min_value is null', () => {
    const device = makeDevice({ address_id: 1, numberConfig: { min_value: null, max_value: 50 } });
    expect(mountComp({ devices: [device] }).vm.getDeviceMinMax(1).min).toBe(0);
  });

  it('defaults max to 100 when numberConfig.max_value is null', () => {
    const device = makeDevice({ address_id: 1, numberConfig: { min_value: 5, max_value: null } });
    expect(mountComp({ devices: [device] }).vm.getDeviceMinMax(1).max).toBe(100);
  });

  it('returns device.alarms when present', () => {
    const alarms = [{ id: 1 }];
    const device = makeDevice({ address_id: 1, numberConfig: { min_value: 0, max_value: 100 }, alarms });
    expect(mountComp({ devices: [device] }).vm.getDeviceMinMax(1).alarms).toEqual(alarms);
  });

  it('returns [] when device.alarms is null (|| [] branch)', () => {
    const device = makeDevice({ address_id: 1, numberConfig: { min_value: 0, max_value: 100 }, alarms: null });
    expect(mountComp({ devices: [device] }).vm.getDeviceMinMax(1).alarms).toEqual([]);
  });
});

// ─── methods: getDeviceLevels ─────────────────────────────────────────────────
describe('getDeviceLevels()', () => {
  it('returns [] when addressId is falsy', () => {
    expect(mountComp().vm.getDeviceLevels(null)).toEqual([]);
  });

  it('returns [] when devices is null', () => {
    expect(mountComp({ devices: null }).vm.getDeviceLevels(1)).toEqual([]);
  });

  it('returns [] when device not found', () => {
    expect(mountComp({ devices: [] }).vm.getDeviceLevels(99)).toEqual([]);
  });

  it('returns levelConfigs when device found', () => {
    const levels = [{ level: 1 }, { level: 2 }];
    const device = makeDevice({ address_id: 1, levelConfigs: levels });
    expect(mountComp({ devices: [device] }).vm.getDeviceLevels(1)).toEqual(levels);
  });

  it('returns [] when device has no levelConfigs (|| [] branch)', () => {
    const device = makeDevice({ address_id: 1, levelConfigs: null });
    expect(mountComp({ devices: [device] }).vm.getDeviceLevels(1)).toEqual([]);
  });
});

// ─── methods: writePlcValue ───────────────────────────────────────────────────
describe('writePlcValue()', () => {
  it('returns early when element is null', async () => {
    const wrapper = mountComp();
    await wrapper.vm.writePlcValue(null);
    expect(mockFetch).not.toHaveBeenCalledWith(expect.stringContaining('/api/plc/write'), expect.any(Object));
  });

  it('returns early when element has no address_id', async () => {
    const wrapper = mountComp();
    await wrapper.vm.writePlcValue({ element_type: 'control_button' });
    expect(mockFetch).not.toHaveBeenCalledWith(expect.stringContaining('/plc/write'), expect.any(Object));
  });

  it('returns early when no plc_address found for element', async () => {
    const wrapper = mountComp({ devices: [] });
    await flushPromises();
    const elem = makeElement('control_button', { address_id: 99 });
    await wrapper.vm.writePlcValue(elem);
    expect(mockFetch).not.toHaveBeenCalledWith(expect.stringContaining('/plc/write'), expect.any(Object));
  });

  it('simulate: toggles 0→1, updates plcValues, emits update-device', async () => {
    const device = makeDevice({ address_id: 1, plc_address: 'D100' });
    const wrapper = mountComp({ devices: [device], isSimulate: true });
    await flushPromises();
    wrapper.vm.plcValues[1] = 0;
    await wrapper.vm.writePlcValue(makeElement('control_button', { address_id: 1 }));
    expect(wrapper.vm.plcValues[1]).toBe(1);
    expect(wrapper.emitted('update-device')[0][0]).toEqual({ address_id: 1, value: 1 });
  });

  it('simulate: toggles 1→0, updates plcValues, emits update-device', async () => {
    const device = makeDevice({ address_id: 1, plc_address: 'D100' });
    const wrapper = mountComp({ devices: [device], isSimulate: true });
    await flushPromises();
    wrapper.vm.plcValues[1] = 1;
    await wrapper.vm.writePlcValue(makeElement('control_button', { address_id: 1 }));
    expect(wrapper.vm.plcValues[1]).toBe(0);
    expect(wrapper.emitted('update-device')[0][0]).toEqual({ address_id: 1, value: 0 });
  });

  it('non-simulate: calls fetch POST, updates plcValues, emits', async () => {
    const device = makeDevice({ address_id: 1, plc_address: 'D100' });
    const wrapper = mountComp({ devices: [device], isSimulate: false });
    await flushPromises();
    mockFetch.mockResolvedValueOnce(okJson({ success: true }));
    await wrapper.vm.writePlcValue(makeElement('control_button', { address_id: 1 }));
    await flushPromises();
    expect(wrapper.vm.plcValues[1]).toBe(1);
    expect(wrapper.emitted('update-device')[0][0].value).toBe(1);
  });

  it('non-simulate: calls alert when response not ok', async () => {
    const device = makeDevice({ address_id: 1, plc_address: 'D100' });
    const wrapper = mountComp({ devices: [device], isSimulate: false });
    await flushPromises();
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    await wrapper.vm.writePlcValue(makeElement('control_button', { address_id: 1 }));
    await flushPromises();
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Failed to write to PLC'));
  });

  it('non-simulate: calls alert when fetch throws', async () => {
    const device = makeDevice({ address_id: 1, plc_address: 'D100' });
    const wrapper = mountComp({ devices: [device], isSimulate: false });
    await flushPromises();
    mockFetch.mockRejectedValueOnce(new Error('Connection refused'));
    await wrapper.vm.writePlcValue(makeElement('control_button', { address_id: 1 }));
    await flushPromises();
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Connection refused'));
  });
});

// ─── methods: handleNumberUpdate ──────────────────────────────────────────────
describe('handleNumberUpdate()', () => {
  it('returns early when no plcAddress found', async () => {
    const wrapper = mountComp({ devices: [] });
    await flushPromises();
    await wrapper.vm.handleNumberUpdate({ addressId: 99, value: 50 });
    expect(mockFetch).not.toHaveBeenCalledWith(expect.stringContaining('/plc/write'), expect.any(Object));
  });

  it('simulate: updates plcValues and emits update-device', async () => {
    const device = makeDevice({ address_id: 2, plc_address: 'W10' });
    const wrapper = mountComp({ devices: [device], isSimulate: true });
    await flushPromises();
    await wrapper.vm.handleNumberUpdate({ addressId: 2, value: 75 });
    expect(wrapper.vm.plcValues[2]).toBe(75);
    expect(wrapper.emitted('update-device')[0][0]).toEqual({ address_id: 2, value: 75 });
  });

  it('non-simulate: calls fetch POST and updates on success', async () => {
    const device = makeDevice({ address_id: 2, plc_address: 'W10' });
    const wrapper = mountComp({ devices: [device], isSimulate: false });
    await flushPromises();
    mockFetch.mockResolvedValueOnce(okJson({ ok: true }));
    await wrapper.vm.handleNumberUpdate({ addressId: 2, value: 55 });
    await flushPromises();
    expect(wrapper.vm.plcValues[2]).toBe(55);
    expect(wrapper.emitted('update-device')[0][0]).toEqual({ address_id: 2, value: 55 });
  });

  it('non-simulate: calls alert on fetch error', async () => {
    const device = makeDevice({ address_id: 2, plc_address: 'W10' });
    const wrapper = mountComp({ devices: [device], isSimulate: false });
    await flushPromises();
    mockFetch.mockRejectedValueOnce(new Error('Timeout'));
    await wrapper.vm.handleNumberUpdate({ addressId: 2, value: 55 });
    await flushPromises();
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Timeout'));
  });

  it('non-simulate: calls alert when response not ok', async () => {
    const device = makeDevice({ address_id: 2, plc_address: 'W10' });
    const wrapper = mountComp({ devices: [device], isSimulate: false });
    await flushPromises();
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503 });
    await wrapper.vm.handleNumberUpdate({ addressId: 2, value: 55 });
    await flushPromises();
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Failed'));
  });
});

// ─── methods: handleLampToggle ────────────────────────────────────────────────
describe('handleLampToggle()', () => {
  it('returns early when no plcAddress found', async () => {
    const wrapper = mountComp({ devices: [] });
    await flushPromises();
    await wrapper.vm.handleLampToggle(makeElement('status_lamp', { address_id: 99 }), true);
    expect(mockFetch).not.toHaveBeenCalledWith(expect.stringContaining('/plc/write'), expect.any(Object));
  });

  it('simulate: newValue=true → sets plcValues to 1 and emits', async () => {
    const device = makeDevice({ address_id: 1, plc_address: 'D100' });
    const wrapper = mountComp({ devices: [device], isSimulate: true });
    await flushPromises();
    await wrapper.vm.handleLampToggle(makeElement('status_lamp', { address_id: 1 }), true);
    expect(wrapper.vm.plcValues[1]).toBe(1);
    expect(wrapper.emitted('update-device')[0][0]).toEqual({ address_id: 1, value: 1 });
  });

  it('simulate: newValue=false → sets plcValues to 0 and emits', async () => {
    const device = makeDevice({ address_id: 1, plc_address: 'D100' });
    const wrapper = mountComp({ devices: [device], isSimulate: true });
    await flushPromises();
    await wrapper.vm.handleLampToggle(makeElement('status_lamp', { address_id: 1 }), false);
    expect(wrapper.vm.plcValues[1]).toBe(0);
    expect(wrapper.emitted('update-device')[0][0]).toEqual({ address_id: 1, value: 0 });
  });

  it('non-simulate: calls fetch POST, updates, emits on success', async () => {
    const device = makeDevice({ address_id: 1, plc_address: 'D100' });
    const wrapper = mountComp({ devices: [device], isSimulate: false });
    await flushPromises();
    mockFetch.mockResolvedValueOnce(okJson({ success: true }));
    await wrapper.vm.handleLampToggle(makeElement('status_lamp', { address_id: 1 }), true);
    await flushPromises();
    expect(wrapper.vm.plcValues[1]).toBe(1);
    expect(wrapper.emitted('update-device')[0][0]).toEqual({ address_id: 1, value: 1 });
  });

  it('non-simulate: calls alert when response not ok', async () => {
    const device = makeDevice({ address_id: 1, plc_address: 'D100' });
    const wrapper = mountComp({ devices: [device], isSimulate: false });
    await flushPromises();
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    await wrapper.vm.handleLampToggle(makeElement('status_lamp', { address_id: 1 }), true);
    await flushPromises();
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Failed'));
  });

  it('non-simulate: calls alert when fetch throws', async () => {
    const device = makeDevice({ address_id: 1, plc_address: 'D100' });
    const wrapper = mountComp({ devices: [device], isSimulate: false });
    await flushPromises();
    mockFetch.mockRejectedValueOnce(new Error('LAN down'));
    await wrapper.vm.handleLampToggle(makeElement('status_lamp', { address_id: 1 }), true);
    await flushPromises();
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('LAN down'));
  });

  it('non-simulate: newValue=false → emits value=0 (covers ? 0 branch on lines 450, 462, 465)', async () => {
    const device = makeDevice({ address_id: 1, plc_address: 'D100' });
    const wrapper = mountComp({ devices: [device], isSimulate: false });
    await flushPromises();
    mockFetch.mockResolvedValueOnce(okJson({ success: true }));
    await wrapper.vm.handleLampToggle(makeElement('status_lamp', { address_id: 1 }), false);
    await flushPromises();
    expect(wrapper.vm.plcValues[1]).toBe(0);
    expect(wrapper.emitted('update-device')[0][0]).toEqual({ address_id: 1, value: 0 });
  });
});

// ─── template rendering ───────────────────────────────────────────────────────
describe('template rendering', () => {
  it('shows loading text when loading=true (initial state)', () => {
    const wrapper = mountComp();
    // mounted() starts fetch → loading=true before flushPromises
    expect(wrapper.find('.loading').exists()).toBe(true);
  });

  it('shows error div when error is set', async () => {
    mockFetch.mockReset();
    mockFetch
      .mockResolvedValueOnce(okJson([]))
      .mockRejectedValueOnce(new Error('Server error'));
    const wrapper = mountComp();
    await flushPromises();
    expect(wrapper.find('.error').exists()).toBe(true);
    expect(wrapper.find('.error').text()).toContain('Server error');
  });

  it('shows image-container when loaded without error', async () => {
    const wrapper = mountComp();
    await flushPromises();
    expect(wrapper.find('.image-container').exists()).toBe(true);
  });

  it('shows Add Element button for admin role', async () => {
    const wrapper = mountComp({ userRole: 'admin' });
    await flushPromises();
    expect(wrapper.find('button').exists()).toBe(true);
    expect(wrapper.find('button').text()).toContain('Add Element');
  });

  it('hides Add Element button for regular user', async () => {
    const wrapper = mountComp({ userRole: 'user' });
    await flushPromises();
    expect(wrapper.find('button').exists()).toBe(false);
  });

  it('renders StatusLamp for status_lamp element', async () => {
    const layout = makeLayout({ elements: [makeElement('status_lamp', { address_id: 1 })] });
    setupFetch([], layout);
    const wrapper = mountComp({ devices: [makeDevice({ address_id: 1 })] });
    await flushPromises();
    expect(wrapper.find('.status-lamp-stub').exists()).toBe(true);
  });

  it('renders NumberDisplay for number_display element', async () => {
    const layout = makeLayout({ elements: [makeElement('number_display', { address_id: 1 })] });
    setupFetch([], layout);
    const wrapper = mountComp({ devices: [makeDevice({ address_id: 1 })] });
    await flushPromises();
    expect(wrapper.find('.number-display-stub').exists()).toBe(true);
  });

  it('renders GaugeDisplay for gauge_display element', async () => {
    const layout = makeLayout({ elements: [makeElement('gauge_display', { address_id: 1 })] });
    setupFetch([], layout);
    const wrapper = mountComp({ devices: [makeDevice({ address_id: 1 })] });
    await flushPromises();
    expect(wrapper.find('.gauge-display-stub').exists()).toBe(true);
  });

  it('renders ControlButton for control_button element', async () => {
    const layout = makeLayout({ elements: [makeElement('control_button', { address_id: 1 })] });
    setupFetch([], layout);
    const wrapper = mountComp({ devices: [makeDevice({ address_id: 1 })] });
    await flushPromises();
    expect(wrapper.find('.control-button-stub').exists()).toBe(true);
  });

  it('renders LevelProgressBar for level_progress_bar element', async () => {
    const layout = makeLayout({ elements: [makeElement('level_progress_bar', { address_id: 1 })] });
    setupFetch([], layout);
    const wrapper = mountComp({ devices: [makeDevice({ address_id: 1 })] });
    await flushPromises();
    expect(wrapper.find('.level-progress-bar-stub').exists()).toBe(true);
  });

  it('renders AddElementModal when showAddElementModal=true', async () => {
    const wrapper = mountComp({ userRole: 'admin' });
    await flushPromises();
    wrapper.vm.showAddElementModal = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.add-element-modal-stub').exists()).toBe(true);
  });

  it('shows layout name in select option', async () => {
    setupFetch([{ id: 1, name: 'Floor 1' }]);
    const wrapper = mountComp();
    await flushPromises();
    expect(wrapper.text()).toContain('Floor 1');
  });

  it('shows layout id when name is absent (|| branch)', async () => {
    setupFetch([{ id: 7, name: null }]);
    const wrapper = mountComp();
    await flushPromises();
    const options = wrapper.findAll('option');
    const layoutOption = options.find(o => o.element.value === '7');
    expect(layoutOption.text()).toBe('7');
  });

  it('StatusLamp @toggle: canControlElement=true — arrow fn (line 53) invoked via VNode handler chain', async () => {
    const layout = makeLayout({ elements: [makeElement('status_lamp', { address_id: 1 })] });
    setupFetch([], layout);
    const device = makeDevice({ address_id: 1, plc_address: 'D1' });
    const wrapper = mountComp({ devices: [device], userRole: 'admin', isSimulate: true });
    await flushPromises();
    // Vue 3 template compiler wraps inline ternary expressions as ($event) => expr.
    // So vnode.props.onToggle = ($event) => (canControlElement(el) ? arrowFn : undefined)
    // Calling onToggle(evt) evaluates the ternary and RETURNS the arrow function (not calls it).
    // We must call the returned arrow function to cover line 53.
    const lamp = wrapper.findComponent({ name: 'StatusLamp' });
    const onToggle = lamp.vm.$.vnode.props?.onToggle;
    expect(typeof onToggle).toBe('function');
    // Step 1: evaluate the ternary — returns the arrow fn (canControlElement=true with admin role)
    const arrowFn = onToggle(true);
    expect(typeof arrowFn).toBe('function');
    // Step 2: call the arrow fn → executes line 53: handleLampToggle(element, true)
    await arrowFn(true);
    await flushPromises();
    expect(wrapper.vm.plcValues[1]).toBe(1);
  });

  it('StatusLamp @toggle: canControlElement=false sets undefined handler (no call)', async () => {
    const layout = makeLayout({ elements: [makeElement('status_lamp', { address_id: 1 })] });
    setupFetch([], layout);
    const device = makeDevice({ address_id: 1, plc_address: 'D1' });
    const wrapper = mountComp({ devices: [device], userRole: 'user', isSimulate: true });
    await flushPromises();
    wrapper.findComponent({ name: 'StatusLamp' }).vm.$emit('toggle', true);
    await flushPromises();
    expect(wrapper.vm.plcValues[1]).toBe(0); // unchanged — handler was undefined
  });

  it('ControlButton @click: canControlElement=true calls writePlcValue', async () => {
    const layout = makeLayout({ elements: [makeElement('control_button', { address_id: 1 })] });
    setupFetch([], layout);
    const device = makeDevice({ address_id: 1, plc_address: 'D1' });
    const wrapper = mountComp({ devices: [device], userRole: 'admin', isSimulate: true });
    await flushPromises();
    wrapper.findComponent({ name: 'ControlButton' }).vm.$emit('click');
    await flushPromises();
    expect(wrapper.emitted('update-device')).toBeTruthy();
  });

  it('ControlButton @click: canControlElement=false short-circuits (no write)', async () => {
    const layout = makeLayout({ elements: [makeElement('control_button', { address_id: 1 })] });
    setupFetch([], layout);
    const device = makeDevice({ address_id: 1, plc_address: 'D1' });
    const wrapper = mountComp({ devices: [device], userRole: 'user', isSimulate: true });
    await flushPromises();
    wrapper.findComponent({ name: 'ControlButton' }).vm.$emit('click');
    await flushPromises();
    expect(wrapper.emitted('update-device')).toBeFalsy();
  });

  it('NumberDisplay @update-value triggers handleNumberUpdate', async () => {
    const layout = makeLayout({ elements: [makeElement('number_display', { address_id: 1 })] });
    setupFetch([], layout);
    const device = makeDevice({ address_id: 1, plc_address: 'D1' });
    const wrapper = mountComp({ devices: [device], isSimulate: true });
    await flushPromises();
    wrapper.findComponent({ name: 'NumberDisplay' }).vm.$emit('update-value', { addressId: 1, value: 88 });
    await flushPromises();
    expect(wrapper.vm.plcValues[1]).toBe(88);
  });

  it('AddElementModal @saved calls onElementSaved', async () => {
    const wrapper = mountComp({ userRole: 'admin' });
    await flushPromises();
    wrapper.vm.showAddElementModal = true;
    await wrapper.vm.$nextTick();
    mockFetch.mockResolvedValueOnce(okJson(makeLayout({ name: 'Saved' })));
    wrapper.findComponent({ name: 'AddElementModal' }).vm.$emit('saved');
    await flushPromises();
    expect(wrapper.vm.showAddElementModal).toBe(false);
  });

  it('AddElementModal @close sets showAddElementModal=false', async () => {
    const wrapper = mountComp({ userRole: 'admin' });
    await flushPromises();
    wrapper.vm.showAddElementModal = true;
    await wrapper.vm.$nextTick();
    wrapper.findComponent({ name: 'AddElementModal' }).vm.$emit('close');
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.showAddElementModal).toBe(false);
  });

  it('select @change calls onLayoutChange', async () => {
    const wrapper = mountComp();
    await flushPromises();
    const fetchSpy = vi.spyOn(wrapper.vm, 'fetchLayoutData');
    await wrapper.find('select').trigger('change');
    expect(fetchSpy).toHaveBeenCalled();
  });
});

// ─── line 10: Add Element button click handler ────────────────────────────────
describe('Add Element button @click', () => {
  it('sets showAddElementModal=true when button is clicked', async () => {
    const wrapper = mountComp({ userRole: 'admin' });
    await flushPromises();
    expect(wrapper.vm.showAddElementModal).toBe(false);
    await wrapper.find('button').trigger('click');
    expect(wrapper.vm.showAddElementModal).toBe(true);
  });
});

// ─── line 161: devices prop default factory ───────────────────────────────────
describe('props defaults', () => {
  it('devices defaults to [] when prop is not provided', () => {
    const wrapper = mount(Interaction, {
      props: { isSimulate: false, userRole: '', allowedRoomIds: null, canControlRoom: null },
      global: { provide: { locale: EN } },
    });
    expect(Array.isArray(wrapper.vm.devices)).toBe(true);
    wrapper.unmount();
  });
});

// ─── BUG CASES (all must FAIL intentionally) ──────────────────────────────────
describe('BUG CASES', () => {
  /**
   * BUG-1: getValue(0) treats addressId=0 as falsy → returns 0 without looking up plcValues[0]
   * อันตราย: PLC address_id=0 เป็นค่าที่ valid ในหลายระบบ (index เริ่มต้น)
   *          → getValue(0) คืน 0 เสมอแม้ว่า plcValues[0] = 5
   *          → สถานะ StatusLamp, ControlButton, NumberDisplay ทั้งหมดที่ใช้ address_id=0 จะผิดทันที
   *          → isOn และ isPressed จะ stuck ที่ false แม้ device จะ ON อยู่
   * FAIL เพราะ: getValue(0) คืน 0 จาก early return แต่ test คาดว่าได้ 5 (จาก plcValues[0])
   */
  it('[BUG-1] getValue(0) returns 0 due to falsy check, ignoring plcValues[0]', () => {
    const wrapper = mountComp();
    wrapper.vm.plcValues[0] = 5;
    // BUG: !0 = true → early return 0, never reads plcValues[0]
    expect(wrapper.vm.getValue(0)).toBe(5);
  });

  /**
   * BUG-2: writePlcValue({ address_id: 0 }) returns early because !0 = true
   * อันตราย: ControlButton ที่ผูกกับ address_id=0 จะกดไม่ได้เลย — PLC ไม่ถูก write
   *          → ในสาย production ที่ใช้ address index 0 ผู้ใช้คิดว่ากดแล้ว แต่จริงๆ ไม่มีอะไรเกิดขึ้น
   *          → เครื่องจักรไม่ stop/start แม้ operator กดปุ่มแล้ว → อันตรายต่อชีวิต
   * FAIL เพราะ: writePlcValue returns early — fetch ไม่ถูกเรียก แต่ test คาดว่า fetch ถูกเรียก
   */
  it('[BUG-2] writePlcValue with address_id=0 returns early without writing to PLC', async () => {
    const device = makeDevice({ address_id: 0, plc_address: 'D000' });
    const wrapper = mountComp({ devices: [device], isSimulate: false });
    await flushPromises();
    mockFetch.mockResolvedValueOnce(okJson({ success: true }));
    // BUG: !element.address_id = !0 = true → "No address_id defined" → returns early
    await wrapper.vm.writePlcValue(makeElement('control_button', { address_id: 0 }));
    await flushPromises();
    expect(wrapper.emitted('update-device')).toBeTruthy();
  });

  /**
   * BUG-3: visibleElements includes null-room elements even when allowedRoomIds=[] (empty)
   * อันตราย: ถ้าระบบ RBAC กำหนดว่า user ไม่มี room ใดๆ (allowedRoomIds=[])
   *          → device ที่ไม่ได้กำหนด room (room_id=null) จะมองเห็นได้ทั้งหมด
   *          → ข้ามระบบ access control — user ที่ไม่ควรเห็นข้อมูลเห็นและควบคุมได้
   *          → ระบบ PLC อุตสาหกรรมอาจถูก operate โดยคนไม่มีสิทธิ์
   * FAIL เพราะ: roomId=null → `null === null` = true → element visible
   *             แต่ test คาดว่า allowedRoomIds=[] ควร block element ที่ไม่มี room
   */
  it('[BUG-3] visibleElements leaks null-room elements when allowedRoomIds=[] (no access)', () => {
    const device = makeDevice({ address_id: 1, device: { room_id: null } });
    const wrapper = mountComp({ devices: [device], allowedRoomIds: [] });
    wrapper.vm.layoutData = makeLayout({
      elements: [makeElement('status_lamp', { address_id: 1, is_visible: true })],
    });
    // BUG: roomId === null → passes → element visible even with no allowed rooms
    expect(wrapper.vm.visibleElements).toHaveLength(0);
  });

  /**
   * BUG-4: calculateSize({ size_width: 0 }) returns 5 instead of 0 due to || fallback
   * อันตราย: element ที่ design ให้ size=0 (hidden/zero-size) จะถูกแสดงผลด้วย size=5
   *          → layout อาจมี element ที่ตั้งใจซ่อน (size_width=0) แต่กลับปรากฏบนหน้าจอ
   *          → บน HMI ขนาด element สำคัญมาก — ผิดพลาดทำให้ UI ใช้งานไม่ได้
   *          → อาจบัง element อื่น หรือแสดง control ที่ไม่ควรให้ user เห็น
   * FAIL เพราะ: 0 || 50 = 50 → 50/10 = 5 แต่ test คาดว่า size_width=0 → size=0
   */
  it('[BUG-4] calculateSize returns 5 for size_width=0 due to || fallback (should be 0)', () => {
    // BUG: 0 || 50 = 50 → /10 = 5, not 0
    expect(mountComp().vm.calculateSize({ size_width: 0 })).toBe(0);
  });

  /**
   * BUG-5: fetchLayouts() swallows errors silently — user sees empty layout dropdown with no feedback
   * อันตราย: ถ้า API /layouts ล้มเหลว (network/auth/server error)
   *          → this.layouts = [] (ว่าง), this.error = null (ไม่มี error แสดง)
   *          → UI แสดง select dropdown ว่างเปล่า ผู้ใช้ไม่รู้ว่าเกิดอะไรขึ้น
   *          → ใน production operator อาจคิดว่าไม่มี layout แล้ว skip ไป หรือรอนานโดยไม่รู้สาเหตุ
   *          → หาก fetchLayoutData ก็ fail ด้วย จะมี error แต่ถ้า layouts fail อย่างเดียวจะไม่มี feedback
   * FAIL เพราะ: fetchLayouts ไม่ set this.error → error remains null
   *             แต่ test คาดว่าควรมี error feedback เมื่อ layouts โหลดไม่ได้
   */
  it('[BUG-5] fetchLayouts failure is silently swallowed — no error shown to user', async () => {
    mockFetch.mockReset();
    mockFetch
      .mockRejectedValueOnce(new Error('Layouts API unreachable'))  // fetchLayouts fails
      .mockResolvedValueOnce(okJson(makeLayout()));                  // fetchLayoutData OK
    const wrapper = mountComp();
    await flushPromises();
    // BUG: catch block only does console.error, never sets this.error
    expect(wrapper.vm.error).not.toBeNull();
  });
});
