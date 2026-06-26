import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import Demo from '../../views/Demo.vue';

// ─── Mocks (required by convention even though Demo.vue does not use them) ────
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const EN = { t: (k) => k };

function makeDevice(overrides = {}) {
  return {
    address_id: 1,
    label: 'Temp Sensor',
    plc_address: 'D100',
    data_type: 'number',
    last_value: 42,
    min: 0,
    max: 100,
    ...overrides,
  };
}

function mountComp(props = {}) {
  return mount(Demo, {
    props: {
      devices: [],
      isSimulate: false,
      isRunAllRandom: false,
      autoTimers: new Map(),
      ...props,
    },
    global: { provide: { locale: EN } },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── computed: displayDevices ─────────────────────────────────────────────────

describe('computed: displayDevices', () => {
  it('passes through existing min and max values', () => {
    const d = makeDevice({ min: 10, max: 200 });
    const wrapper = mountComp({ devices: [d] });
    expect(wrapper.vm.displayDevices[0].min).toBe(10);
    expect(wrapper.vm.displayDevices[0].max).toBe(200);
  });

  it('defaults min to 0 when d.min is null (nullish coalescing ?? branch)', () => {
    const d = makeDevice({ min: null });
    const wrapper = mountComp({ devices: [d] });
    expect(wrapper.vm.displayDevices[0].min).toBe(0);
  });

  it('defaults min to 0 when d.min is undefined', () => {
    const d = makeDevice({ min: undefined });
    const wrapper = mountComp({ devices: [d] });
    expect(wrapper.vm.displayDevices[0].min).toBe(0);
  });

  it('defaults max to 100 when d.max is null (nullish coalescing ?? branch)', () => {
    const d = makeDevice({ max: null });
    const wrapper = mountComp({ devices: [d] });
    expect(wrapper.vm.displayDevices[0].max).toBe(100);
  });

  it('defaults max to 100 when d.max is undefined', () => {
    const d = makeDevice({ max: undefined });
    const wrapper = mountComp({ devices: [d] });
    expect(wrapper.vm.displayDevices[0].max).toBe(100);
  });

  it('preserves min=0 (0 is not null/undefined — ?? left branch)', () => {
    const d = makeDevice({ min: 0 });
    const wrapper = mountComp({ devices: [d] });
    expect(wrapper.vm.displayDevices[0].min).toBe(0);
  });

  it('spreads all other device properties', () => {
    const d = makeDevice({ label: 'Test', last_value: 55 });
    const wrapper = mountComp({ devices: [d] });
    expect(wrapper.vm.displayDevices[0].label).toBe('Test');
    expect(wrapper.vm.displayDevices[0].last_value).toBe(55);
  });

  it('returns empty array when devices is empty', () => {
    expect(mountComp({ devices: [] }).vm.displayDevices).toEqual([]);
  });
});

// ─── methods: hasRange() ─────────────────────────────────────────────────────

describe('hasRange()', () => {
  let vm;
  beforeEach(() => { vm = mountComp().vm; });

  it('returns true for data_type "number"', () => {
    expect(vm.hasRange(makeDevice({ data_type: 'number' }))).toBe(true);
  });

  it('returns true for data_type "number_gauge"', () => {
    expect(vm.hasRange(makeDevice({ data_type: 'number_gauge' }))).toBe(true);
  });

  it('returns true for data_type "level"', () => {
    expect(vm.hasRange(makeDevice({ data_type: 'level' }))).toBe(true);
  });

  it('returns false for data_type "onoff"', () => {
    expect(vm.hasRange(makeDevice({ data_type: 'onoff' }))).toBe(false);
  });

  it('returns false for unknown data_type', () => {
    expect(vm.hasRange(makeDevice({ data_type: 'humidity' }))).toBe(false);
  });
});

// ─── methods: isAuto() ───────────────────────────────────────────────────────

describe('isAuto()', () => {
  it('returns true when address_id is in autoTimers Map', () => {
    const map = new Map([[1, 'timer']]);
    const wrapper = mountComp({ autoTimers: map });
    expect(wrapper.vm.isAuto(makeDevice({ address_id: 1 }))).toBe(true);
  });

  it('returns false when address_id is not in autoTimers Map', () => {
    const wrapper = mountComp({ autoTimers: new Map() });
    expect(wrapper.vm.isAuto(makeDevice({ address_id: 99 }))).toBe(false);
  });
});

// ─── methods: onInputChange() ────────────────────────────────────────────────

describe('onInputChange()', () => {
  it('returns early (no emit) when isSimulate=false', () => {
    const wrapper = mountComp({ isSimulate: false });
    wrapper.vm.onInputChange(makeDevice(), 50);
    expect(wrapper.emitted('update-device')).toBeFalsy();
  });

  it('emits "update-device" when isSimulate=true', () => {
    const wrapper = mountComp({ isSimulate: true });
    wrapper.vm.onInputChange(makeDevice({ data_type: 'number' }), 50);
    expect(wrapper.emitted('update-device')).toBeTruthy();
  });

  it('sets val=1 for onoff device when newValue is truthy (true)', () => {
    const wrapper = mountComp({ isSimulate: true });
    wrapper.vm.onInputChange(makeDevice({ data_type: 'onoff', address_id: 5 }), true);
    expect(wrapper.emitted('update-device')[0][0]).toEqual({ address_id: 5, value: 1 });
  });

  it('sets val=0 for onoff device when newValue is false', () => {
    const wrapper = mountComp({ isSimulate: true });
    wrapper.vm.onInputChange(makeDevice({ data_type: 'onoff', address_id: 5 }), false);
    expect(wrapper.emitted('update-device')[0][0]).toEqual({ address_id: 5, value: 0 });
  });

  it('sets val=0 for onoff device when newValue is 0 (falsy)', () => {
    const wrapper = mountComp({ isSimulate: true });
    wrapper.vm.onInputChange(makeDevice({ data_type: 'onoff', address_id: 5 }), 0);
    expect(wrapper.emitted('update-device')[0][0].value).toBe(0);
  });

  it('sets val=1 for onoff device when newValue is 1 (truthy)', () => {
    const wrapper = mountComp({ isSimulate: true });
    wrapper.vm.onInputChange(makeDevice({ data_type: 'onoff', address_id: 5 }), 1);
    expect(wrapper.emitted('update-device')[0][0].value).toBe(1);
  });

  it('clamps value to max when newValue exceeds max', () => {
    const device = makeDevice({ data_type: 'number', address_id: 1, min: 0, max: 100 });
    const wrapper = mountComp({ isSimulate: true });
    wrapper.vm.onInputChange(device, '150');
    expect(wrapper.emitted('update-device')[0][0].value).toBe(100);
  });

  it('clamps value to min when newValue is below min', () => {
    const device = makeDevice({ data_type: 'number', address_id: 1, min: 10, max: 100 });
    const wrapper = mountComp({ isSimulate: true });
    wrapper.vm.onInputChange(device, '-5');
    expect(wrapper.emitted('update-device')[0][0].value).toBe(10);
  });

  it('passes through value within range', () => {
    const device = makeDevice({ data_type: 'number', address_id: 1, min: 0, max: 100 });
    const wrapper = mountComp({ isSimulate: true });
    wrapper.vm.onInputChange(device, '42.5');
    expect(wrapper.emitted('update-device')[0][0].value).toBe(42.5);
  });

  it('uses 0 when parseFloat(newValue) is NaN (|| 0 branch)', () => {
    const device = makeDevice({ data_type: 'number', address_id: 1, min: 0, max: 100 });
    const wrapper = mountComp({ isSimulate: true });
    wrapper.vm.onInputChange(device, 'abc');
    // NaN || 0 = 0; Math.min(100, Math.max(0, 0)) = 0
    expect(wrapper.emitted('update-device')[0][0].value).toBe(0);
  });

  it('uses 0 when newValue is undefined (parseFloat(undefined)=NaN || 0 = 0)', () => {
    const device = makeDevice({ data_type: 'number', address_id: 1, min: 0, max: 100 });
    const wrapper = mountComp({ isSimulate: true });
    wrapper.vm.onInputChange(device, undefined);
    expect(wrapper.emitted('update-device')[0][0].value).toBe(0);
  });

  it('emits correct address_id for non-onoff device', () => {
    const device = makeDevice({ data_type: 'number', address_id: 7, min: 0, max: 100 });
    const wrapper = mountComp({ isSimulate: true });
    wrapper.vm.onInputChange(device, '50');
    expect(wrapper.emitted('update-device')[0][0].address_id).toBe(7);
  });

  it('handles numeric 0 newValue for number type (parseFloat(0)=0, 0||0=0)', () => {
    const device = makeDevice({ data_type: 'number', address_id: 1, min: 0, max: 100 });
    const wrapper = mountComp({ isSimulate: true });
    wrapper.vm.onInputChange(device, 0);
    expect(wrapper.emitted('update-device')[0][0].value).toBe(0);
  });
});

// ─── methods: formatTime() ───────────────────────────────────────────────────

describe('formatTime()', () => {
  it('returns "-" when ts is null', () => {
    expect(mountComp().vm.formatTime(null)).toBe('-');
  });

  it('returns "-" when ts is undefined', () => {
    expect(mountComp().vm.formatTime(undefined)).toBe('-');
  });

  it('returns "-" when ts is empty string', () => {
    expect(mountComp().vm.formatTime('')).toBe('-');
  });

  it('returns localeTimeString for valid ISO timestamp', () => {
    const result = mountComp().vm.formatTime('2024-01-15T10:30:00.000Z');
    expect(typeof result).toBe('string');
    expect(result).not.toBe('-');
  });

  it('returns localeTimeString for numeric timestamp', () => {
    const result = mountComp().vm.formatTime(1705312200000);
    expect(result).not.toBe('-');
  });
});

// ─── template rendering ───────────────────────────────────────────────────────

describe('template rendering', () => {
  it('renders page title "Demo / Simulate Mode"', () => {
    expect(mountComp().text()).toContain('Demo / Simulate Mode');
  });

  it('renders subtitle text', () => {
    expect(mountComp().text()).toContain('Test and simulate device values without PLC connection');
  });

  it('checkbox reflects isSimulate=false (unchecked)', () => {
    const wrapper = mountComp({ isSimulate: false });
    expect(wrapper.find('input[type="checkbox"]').element.checked).toBe(false);
  });

  it('checkbox reflects isSimulate=true (checked)', () => {
    const wrapper = mountComp({ isSimulate: true });
    expect(wrapper.find('input[type="checkbox"]').element.checked).toBe(true);
  });

  it('shows "Simulate Mode OFF" when isSimulate=false', () => {
    expect(mountComp({ isSimulate: false }).text()).toContain('Simulate Mode OFF');
  });

  it('shows "Simulate Mode ON" when isSimulate=true', () => {
    expect(mountComp({ isSimulate: true }).text()).toContain('Simulate Mode ON');
  });

  it('emits "update:is-simulate" with true when checkbox changed to checked', async () => {
    const wrapper = mountComp({ isSimulate: false });
    const checkbox = wrapper.find('input[type="checkbox"]');
    checkbox.element.checked = true;
    await checkbox.trigger('change');
    expect(wrapper.emitted('update:is-simulate')).toBeTruthy();
    expect(wrapper.emitted('update:is-simulate')[0][0]).toBe(true);
  });

  it('emits "update:is-simulate" with false when checkbox unchecked', async () => {
    const wrapper = mountComp({ isSimulate: true });
    const checkbox = wrapper.find('input[type="checkbox"]');
    checkbox.element.checked = false;
    await checkbox.trigger('change');
    expect(wrapper.emitted('update:is-simulate')[0][0]).toBe(false);
  });

  it('random button shows "Run Random All" when isRunAllRandom=false', () => {
    expect(mountComp({ isRunAllRandom: false }).text()).toContain('Run Random All');
  });

  it('random button shows "Stop Random" when isRunAllRandom=true', () => {
    expect(mountComp({ isRunAllRandom: true }).text()).toContain('Stop Random');
  });

  it('random button has btn-outline-warning class when isRunAllRandom=false', () => {
    const wrapper = mountComp({ isRunAllRandom: false });
    const btn = wrapper.findAll('button').find(b => b.text().includes('Run Random') || b.text().includes('Stop Random'));
    expect(btn.classes()).toContain('btn-outline-warning');
  });

  it('random button has btn-danger class when isRunAllRandom=true', () => {
    const wrapper = mountComp({ isRunAllRandom: true });
    const btn = wrapper.findAll('button').find(b => b.text().includes('Stop Random'));
    expect(btn.classes()).toContain('btn-danger');
  });

  it('random button has bi-shuffle icon when isRunAllRandom=false', () => {
    const wrapper = mountComp({ isRunAllRandom: false });
    expect(wrapper.find('.bi-shuffle').exists()).toBe(true);
  });

  it('random button has bi-stop-fill icon when isRunAllRandom=true', () => {
    const wrapper = mountComp({ isRunAllRandom: true });
    expect(wrapper.find('.bi-stop-fill').exists()).toBe(true);
  });

  it('random button is disabled when isSimulate=false', () => {
    const wrapper = mountComp({ isSimulate: false, isRunAllRandom: false });
    const btn = wrapper.findAll('button').find(b => b.text().includes('Run Random'));
    expect(btn.element.disabled).toBe(true);
  });

  it('random button is enabled when isSimulate=true', () => {
    const wrapper = mountComp({ isSimulate: true, isRunAllRandom: false });
    const btn = wrapper.findAll('button').find(b => b.text().includes('Run Random'));
    expect(btn.element.disabled).toBe(false);
  });

  it('emits "toggle-run-all-random" when random button clicked', async () => {
    const wrapper = mountComp({ isSimulate: true });
    const btn = wrapper.findAll('button').find(b => b.text().includes('Run Random'));
    await btn.trigger('click');
    expect(wrapper.emitted('toggle-run-all-random')).toBeTruthy();
  });

  it('shows "No devices found." when devices is empty', () => {
    expect(mountComp({ devices: [] }).text()).toContain('No devices found.');
  });

  it('hides "No devices found." when devices exist', () => {
    const wrapper = mountComp({ devices: [makeDevice()] });
    expect(wrapper.text()).not.toContain('No devices found.');
  });

  it('renders a card for each device', () => {
    const devices = [makeDevice({ address_id: 1 }), makeDevice({ address_id: 2 })];
    const wrapper = mountComp({ devices });
    expect(wrapper.findAll('.card')).toHaveLength(2);
  });

  it('renders device label and plc_address', () => {
    const wrapper = mountComp({ devices: [makeDevice({ label: 'My Sensor', plc_address: 'W10' })] });
    expect(wrapper.text()).toContain('My Sensor');
    expect(wrapper.text()).toContain('W10');
  });

  it('renders ON/OFF buttons for onoff device', () => {
    const wrapper = mountComp({ devices: [makeDevice({ data_type: 'onoff', last_value: 0 })] });
    expect(wrapper.text()).toContain('OFF');
    expect(wrapper.text()).toContain('ON');
  });

  it('OFF button has btn-danger class when last_value=0', () => {
    const wrapper = mountComp({ devices: [makeDevice({ data_type: 'onoff', last_value: 0 })] });
    const offBtn = wrapper.findAll('button').find(b => b.text() === 'OFF');
    expect(offBtn.classes()).toContain('btn-danger');
  });

  it('OFF button has btn-outline-danger class when last_value=1', () => {
    const wrapper = mountComp({ devices: [makeDevice({ data_type: 'onoff', last_value: 1 })] });
    const offBtn = wrapper.findAll('button').find(b => b.text() === 'OFF');
    expect(offBtn.classes()).toContain('btn-outline-danger');
  });

  it('ON button has btn-success class when last_value=1', () => {
    const wrapper = mountComp({ devices: [makeDevice({ data_type: 'onoff', last_value: 1 })] });
    const onBtn = wrapper.findAll('button').find(b => b.text() === 'ON');
    expect(onBtn.classes()).toContain('btn-success');
  });

  it('ON button has btn-outline-success class when last_value=0', () => {
    const wrapper = mountComp({ devices: [makeDevice({ data_type: 'onoff', last_value: 0 })] });
    const onBtn = wrapper.findAll('button').find(b => b.text() === 'ON');
    expect(onBtn.classes()).toContain('btn-outline-success');
  });

  it('OFF button calls onInputChange with false when clicked', async () => {
    const device = makeDevice({ data_type: 'onoff', last_value: 1, address_id: 3 });
    const wrapper = mountComp({ devices: [device], isSimulate: true });
    const offBtn = wrapper.findAll('button').find(b => b.text() === 'OFF');
    await offBtn.trigger('click');
    expect(wrapper.emitted('update-device')).toBeTruthy();
    expect(wrapper.emitted('update-device')[0][0].value).toBe(0);
  });

  it('ON button calls onInputChange with true when clicked', async () => {
    const device = makeDevice({ data_type: 'onoff', last_value: 0, address_id: 3 });
    const wrapper = mountComp({ devices: [device], isSimulate: true });
    const onBtn = wrapper.findAll('button').find(b => b.text() === 'ON');
    await onBtn.trigger('click');
    expect(wrapper.emitted('update-device')[0][0].value).toBe(1);
  });

  it('renders range input for number device', () => {
    const wrapper = mountComp({ devices: [makeDevice({ data_type: 'number' })] });
    expect(wrapper.find('input[type="range"]').exists()).toBe(true);
  });

  it('renders number input for number device', () => {
    const wrapper = mountComp({ devices: [makeDevice({ data_type: 'number' })] });
    expect(wrapper.find('input[type="number"]').exists()).toBe(true);
  });

  it('renders range input for number_gauge device', () => {
    const wrapper = mountComp({ devices: [makeDevice({ data_type: 'number_gauge' })] });
    expect(wrapper.find('input[type="range"]').exists()).toBe(true);
  });

  it('renders range input for level device', () => {
    const wrapper = mountComp({ devices: [makeDevice({ data_type: 'level' })] });
    expect(wrapper.find('input[type="range"]').exists()).toBe(true);
  });

  it('does not render range or onoff controls for unknown data_type', () => {
    const wrapper = mountComp({ devices: [makeDevice({ data_type: 'humidity' })] });
    expect(wrapper.find('input[type="range"]').exists()).toBe(false);
    expect(wrapper.find('.btn-group').exists()).toBe(false);
  });

  it('shows last_value in range template (non-null ?? left branch)', () => {
    const wrapper = mountComp({ devices: [makeDevice({ data_type: 'number', last_value: 75 })] });
    expect(wrapper.text()).toContain('75');
  });

  it('shows 0 in range template when last_value is null (?? right branch)', () => {
    const wrapper = mountComp({ devices: [makeDevice({ data_type: 'number', last_value: null })] });
    // last_value ?? 0 = 0
    const rangeInput = wrapper.find('input[type="range"]');
    expect(rangeInput.element.value).toBe('0');
  });

  it('shows min-max range in range template', () => {
    const wrapper = mountComp({ devices: [makeDevice({ data_type: 'number', min: 10, max: 200 })] });
    expect(wrapper.text()).toContain('10 - 200');
  });

  it('range input is disabled when isSimulate=false', () => {
    const wrapper = mountComp({ devices: [makeDevice({ data_type: 'number' })], isSimulate: false });
    expect(wrapper.find('input[type="range"]').element.disabled).toBe(true);
  });

  it('range input is enabled when isSimulate=true', () => {
    const wrapper = mountComp({ devices: [makeDevice({ data_type: 'number' })], isSimulate: true });
    expect(wrapper.find('input[type="range"]').element.disabled).toBe(false);
  });

  it('card has opacity-75 class when isSimulate=false', () => {
    const wrapper = mountComp({ devices: [makeDevice()], isSimulate: false });
    expect(wrapper.find('.card').classes()).toContain('opacity-75');
  });

  it('card does not have opacity-75 class when isSimulate=true', () => {
    const wrapper = mountComp({ devices: [makeDevice()], isSimulate: true });
    expect(wrapper.find('.card').classes()).not.toContain('opacity-75');
  });

  it('range input triggers onInputChange on input event', async () => {
    const device = makeDevice({ data_type: 'number', address_id: 1, min: 0, max: 100 });
    const wrapper = mountComp({ devices: [device], isSimulate: true });
    const rangeInput = wrapper.find('input[type="range"]');
    rangeInput.element.value = '60';
    await rangeInput.trigger('input');
    expect(wrapper.emitted('update-device')).toBeTruthy();
  });

  it('number input triggers onInputChange on input event', async () => {
    const device = makeDevice({ data_type: 'number', address_id: 1, min: 0, max: 100 });
    const wrapper = mountComp({ devices: [device], isSimulate: true });
    const numInput = wrapper.find('input[type="number"]');
    numInput.element.value = '55';
    await numInput.trigger('input');
    expect(wrapper.emitted('update-device')).toBeTruthy();
  });
});

// ─── BUG CASES (all must FAIL intentionally) ─────────────────────────────────

describe('BUG CASES', () => {
  /**
   * BUG-1: isAuto() calls this.autoTimers.has() — prop typed as Object but assumes Map
   * อันตราย: ถ้า parent ส่ง autoTimers เป็น plain object {} แทน Map
   *          → TypeError: this.autoTimers.has is not a function
   *          → ทุก component instance ที่ render device card จะ crash
   *          → หน้า Demo พังทั้งหน้าเพราะ runtime error ใน method
   * FAIL เพราะ: {}.has() → TypeError แต่ test expect ว่าต้องไม่ throw
   */
  it('[BUG-1] isAuto() crashes when autoTimers is plain Object (not a Map)', () => {
    const wrapper = mountComp({ autoTimers: {} }); // plain object, not Map
    // BUG: {}.has is not a function → TypeError
    expect(() => wrapper.vm.isAuto(makeDevice({ address_id: 1 }))).not.toThrow();
  });

  /**
   * BUG-2: formatTime(0) — timestamp 0 is falsy → returns '-' instead of epoch time
   * อันตราย: ถ้าระบบบันทึก timestamp เป็น 0 (เช่น device ที่ยังไม่มีข้อมูล แต่ initialized ด้วย 0)
   *          → formatTime(0) คืน '-' แทนที่จะแสดงเวลา Jan 1, 1970
   *          → user คิดว่า device ยังไม่มีข้อมูล ทั้งที่จริงมีข้อมูลอยู่
   *          ในระบบ PLC ที่ timestamp 0 อาจหมายถึง "just now" หรือ "initialized"
   * FAIL เพราะ: formatTime(0) คืน '-' แต่ test คาดว่าต้องไม่ใช่ '-'
   *             (0 เป็น Unix epoch → new Date(0).toLocaleTimeString() ควรใช้)
   */
  it('[BUG-2] formatTime(0) returns "-" because 0 is falsy — misses Unix epoch timestamp', () => {
    const result = mountComp().vm.formatTime(0);
    // BUG: if (!ts) return '-' → 0 is falsy → returns '-' instead of epoch time
    expect(result).not.toBe('-');
  });

  /**
   * BUG-3: onoff switch uses newValue ? 1 : 0 — string 'false' is truthy → val=1 (wrong!)
   * อันตราย: ถ้ามีการเรียก onInputChange ด้วย string 'false' (เช่น จาก event ที่ stringify value)
   *          → 'false' เป็น truthy string → val = 1 (ON!) แทน 0 (OFF)
   *          → user กดปุ่ม OFF แต่ device ถูก set เป็น ON → พฤติกรรมตรงข้ามกับที่ต้องการ
   *          → ในระบบอุตสาหกรรม การเปิดเครื่องแทนที่จะปิดอาจอันตรายมาก
   * FAIL เพราะ: 'false' ? 1 : 0 = 1 แต่ test คาดว่า val = 0 (OFF)
   */
  it('[BUG-3] onInputChange with string "false" sets onoff to ON (1) instead of OFF (0)', () => {
    const wrapper = mountComp({ isSimulate: true });
    const device = makeDevice({ data_type: 'onoff', address_id: 1 });
    wrapper.vm.onInputChange(device, 'false'); // string 'false' is truthy!
    const emitted = wrapper.emitted('update-device')[0][0];
    // BUG: 'false' ? 1 : 0 = 1 (wrong — should be 0 for OFF)
    expect(emitted.value).toBe(0);
  });

  /**
   * BUG-4: Inverted range (min > max) silently produces wrong clamped values
   * อันตราย: ถ้า admin กรอก min_value > max_value (เช่น min=100, max=0)
   *          → Math.max(100, val) → val ต่ำสุดได้ 100
   *          → Math.min(0, 100) → val = 0 (เป็น max ที่เล็กกว่า min)
   *          → ทุก input clamp เป็น 0 เสมอ ไม่ว่าจะใส่อะไร
   *          → user ไม่สามารถ control device ได้เลย ไม่มี validation error แจ้ง
   * FAIL เพราะ: device.min=100, device.max=0, newValue='50' → val=0 แต่ test คาดว่า val=50
   */
  it('[BUG-4] inverted range (min > max) causes all values to clamp to 0 silently', () => {
    const wrapper = mountComp({ isSimulate: true });
    const device = makeDevice({ data_type: 'number', address_id: 1, min: 100, max: 0 });
    wrapper.vm.onInputChange(device, '50');
    const val = wrapper.emitted('update-device')[0][0].value;
    // BUG: Math.min(0, Math.max(100, 50)) = Math.min(0, 100) = 0
    // Any input → always emits 0, device uncontrollable
    expect(val).toBe(50);
  });

  /**
   * BUG-5: parseFloat(newValue) || 0 — clearing input (value='') forces 0, ignores previous value
   * อันตราย: ถ้า user ลบค่าในช่อง number input ทั้งหมด (value='')
   *          → parseFloat('') = NaN → NaN || 0 = 0
   *          → Math.min(max, Math.max(min, 0)) = clamp to min if min > 0
   *          → ค่า emit เปลี่ยนทันทีแม้ user ยังไม่ได้พิมพ์ค่าใหม่
   *          → device ถูก set ค่าเป็น min โดยอัตโนมัติ โดยไม่รอ user ยืนยัน
   *          ในระบบ PLC ที่ min=50bar จะ set pressure เป็น 50 ทันทีที่ user ลบตัวเลข
   * FAIL เพราะ: test คาดว่า ไม่ควร emit เมื่อ value เป็น empty string
   *             แต่ component emit ทันทีด้วย value=min
   */
  it('[BUG-5] clearing number input (value="") immediately emits min value without user confirmation', () => {
    const wrapper = mountComp({ isSimulate: true });
    const device = makeDevice({ data_type: 'number', address_id: 1, min: 50, max: 100 });
    wrapper.vm.onInputChange(device, ''); // user clears input
    // BUG: parseFloat('') = NaN → 0 → clamped to min=50 → emits 50 immediately
    // Should NOT emit when input is empty (wait for valid input)
    expect(wrapper.emitted('update-device')).toBeFalsy();
  });
});
