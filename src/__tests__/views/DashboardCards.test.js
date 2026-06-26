import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import DashboardCards from '../../views/DashboardCards.vue';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockDraw = vi.fn().mockReturnThis();
const mockUpdate = vi.fn();
const MockRadialGauge = vi.fn().mockImplementation(() => ({
  draw: mockDraw,
  update: mockUpdate,
  value: 0,
}));
vi.mock('canvas-gauges', () => ({ RadialGauge: MockRadialGauge }));

vi.mock('../../views/Chart.vue', () => ({
  default: { name: 'Chart', props: ['device'], template: '<div class="chart-stub"></div>' },
}));

const mockShowConfirm = vi.fn();
vi.mock('../../utils/swalHelper', () => ({ showConfirm: mockShowConfirm }));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const EN = { t: (k) => k };
const TH = { t: (k) => k, current: 'th' };

function makeAddr(overrides = {}) {
  return {
    address_id: 1,
    card_id: 101,
    position: 3,
    label: 'Temperature',
    device_name: 'Sensor A',
    device: { id: 1, name: 'Device A' },
    plc_address: 'D100',
    refresh_rate_ms: 1000,
    display_type: 'number',
    last_value: 42.5,
    is_connected: true,
    updated_at: '2024-01-15T10:30:00.000Z',
    numberConfig: { decimal_places: 1, unit: '°C', min_value: 0, max_value: 100, scale: 1, offset: 0 },
    levelConfigs: [],
    alarms: [],
    ...overrides,
  };
}

function mountComp(props = {}, locale = EN) {
  return mount(DashboardCards, {
    props: { addresses: [makeAddr()], ...props },
    global: { provide: { locale } },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockShowConfirm.mockResolvedValue(false);
  MockRadialGauge.mockImplementation(() => ({ draw: mockDraw, update: mockUpdate, value: 0 }));
});

// ─── data() / mounted() ───────────────────────────────────────────────────────

describe('data() / mounted()', () => {
  it('initializes selectedAddress to null', () => {
    expect(mountComp().vm.selectedAddress).toBeNull();
  });

  it('initializes showChart to false', () => {
    expect(mountComp().vm.showChart).toBe(false);
  });

  it('initializes gauges to empty object', () => {
    expect(mountComp().vm.gauges).toEqual({});
  });

  it('sets localAddresses from addresses prop on mount', () => {
    const wrapper = mountComp();
    expect(wrapper.vm.localAddresses).toEqual([makeAddr()]);
  });

  it('initializes expandedCards for each address', () => {
    const wrapper = mountComp();
    expect(wrapper.vm.expandedCards[101]).toBe(false);
  });

  it('initializes expandedCards for multiple addresses', () => {
    const wrapper = mountComp({ addresses: [makeAddr({ card_id: 1 }), makeAddr({ card_id: 2, address_id: 2 })] });
    expect(wrapper.vm.expandedCards[1]).toBe(false);
    expect(wrapper.vm.expandedCards[2]).toBe(false);
  });
});

// ─── watch: addresses ─────────────────────────────────────────────────────────

describe('watch: addresses', () => {
  it('updates localAddresses when prop changes', async () => {
    const wrapper = mountComp();
    const newAddr = makeAddr({ address_id: 2, card_id: 202, label: 'Pressure' });
    await wrapper.setProps({ addresses: [newAddr] });
    expect(wrapper.vm.localAddresses).toEqual([newAddr]);
  });

  it('initializes expandedCards for new card_ids', async () => {
    const wrapper = mountComp();
    await wrapper.setProps({ addresses: [makeAddr({ card_id: 999, address_id: 99 })] });
    expect(wrapper.vm.expandedCards[999]).toBe(false);
  });

  it('preserves expandedCards state for existing card_ids', async () => {
    const wrapper = mountComp();
    wrapper.vm.expandedCards[101] = true;
    await wrapper.setProps({ addresses: [makeAddr({ card_id: 101 })] });
    expect(wrapper.vm.expandedCards[101]).toBe(true);
  });

  it('calls updateGauges after addresses change', async () => {
    const wrapper = mountComp();
    const spy = vi.spyOn(wrapper.vm, 'updateGauges');
    await wrapper.setProps({ addresses: [makeAddr({ label: 'Updated' })] });
    expect(spy).toHaveBeenCalled();
  });
});

// ─── getGaugeHighlights() ─────────────────────────────────────────────────────

describe('getGaugeHighlights()', () => {
  it('returns [] when addr.alarms is falsy', () => {
    const wrapper = mountComp();
    expect(wrapper.vm.getGaugeHighlights(makeAddr({ alarms: null }))).toEqual([]);
  });

  it('returns [] when alarms array is empty', () => {
    const wrapper = mountComp();
    expect(wrapper.vm.getGaugeHighlights(makeAddr({ alarms: [] }))).toEqual([]);
  });

  it('uses green (#28a745) for unknown severity', () => {
    const wrapper = mountComp();
    const addr = makeAddr({ alarms: [{ severity: 'none', type: 'BTW', min: 10, max: 50 }] });
    const h = wrapper.vm.getGaugeHighlights(addr);
    expect(h[0].color).toBe('#28a745');
  });

  it('uses yellow (#ffc107) for severity "warning"', () => {
    const wrapper = mountComp();
    const addr = makeAddr({ alarms: [{ severity: 'warning', type: 'BTW', min: 10, max: 50 }] });
    expect(wrapper.vm.getGaugeHighlights(addr)[0].color).toBe('#ffc107');
  });

  it('uses yellow (#ffc107) for severity "Warning" (capital W)', () => {
    const wrapper = mountComp();
    const addr = makeAddr({ alarms: [{ severity: 'Warning', type: 'BTW', min: 10, max: 50 }] });
    expect(wrapper.vm.getGaugeHighlights(addr)[0].color).toBe('#ffc107');
  });

  it('uses red (#dc3545) for severity "critical"', () => {
    const wrapper = mountComp();
    const addr = makeAddr({ alarms: [{ severity: 'critical', type: 'BTW', min: 10, max: 50 }] });
    expect(wrapper.vm.getGaugeHighlights(addr)[0].color).toBe('#dc3545');
  });

  it('uses red (#dc3545) for severity "Error"', () => {
    const wrapper = mountComp();
    const addr = makeAddr({ alarms: [{ severity: 'Error', type: 'BTW', min: 10, max: 50 }] });
    expect(wrapper.vm.getGaugeHighlights(addr)[0].color).toBe('#dc3545');
  });

  it('maps BTW type: from=al.min, to=al.max', () => {
    const wrapper = mountComp();
    const addr = makeAddr({ alarms: [{ severity: 'warning', type: 'BTW', min: 20, max: 80 }] });
    const h = wrapper.vm.getGaugeHighlights(addr);
    expect(h[0]).toMatchObject({ from: 20, to: 80 });
  });

  it('maps MTE type: from=al.min, to=maxGauge', () => {
    const wrapper = mountComp();
    const addr = makeAddr({ alarms: [{ severity: 'critical', type: 'MTE', min: 80, max: null }] });
    const h = wrapper.vm.getGaugeHighlights(addr);
    expect(h[0]).toMatchObject({ from: 80, to: 100 }); // maxGauge = numberConfig.max_value = 100
  });

  it('maps MT type: from=al.min, to=maxGauge', () => {
    const wrapper = mountComp();
    const addr = makeAddr({ alarms: [{ severity: 'critical', type: 'MT', min: 70, max: null }] });
    const h = wrapper.vm.getGaugeHighlights(addr);
    expect(h[0]).toMatchObject({ from: 70, to: 100 });
  });

  it('maps LTE type: from=minGauge, to=al.min', () => {
    const wrapper = mountComp();
    const addr = makeAddr({ alarms: [{ severity: 'warning', type: 'LTE', min: 20, max: null }] });
    const h = wrapper.vm.getGaugeHighlights(addr);
    expect(h[0]).toMatchObject({ from: 0, to: 20 }); // minGauge = numberConfig.min_value = 0
  });

  it('maps LT type: from=minGauge, to=al.min', () => {
    const wrapper = mountComp();
    const addr = makeAddr({ alarms: [{ severity: 'warning', type: 'LT', min: 10, max: null }] });
    const h = wrapper.vm.getGaugeHighlights(addr);
    expect(h[0]).toMatchObject({ from: 0, to: 10 });
  });

  it('defaults from=0, to=0 for unknown alarm type', () => {
    const wrapper = mountComp();
    const addr = makeAddr({ alarms: [{ severity: 'warning', type: 'UNKNOWN', min: 10, max: 20 }] });
    const h = wrapper.vm.getGaugeHighlights(addr);
    expect(h[0]).toMatchObject({ from: 0, to: 0 });
  });

  it('uses defaults min=0 max=100 when numberConfig is absent', () => {
    const wrapper = mountComp();
    const addr = makeAddr({ numberConfig: null, alarms: [{ severity: 'critical', type: 'MT', min: 80, max: null }] });
    const h = wrapper.vm.getGaugeHighlights(addr);
    expect(h[0].to).toBe(100);
  });

  it('returns multiple highlights for multiple alarms', () => {
    const wrapper = mountComp();
    const addr = makeAddr({
      alarms: [
        { severity: 'warning', type: 'LT', min: 10, max: null },
        { severity: 'critical', type: 'MT', min: 80, max: null },
      ],
    });
    expect(wrapper.vm.getGaugeHighlights(addr)).toHaveLength(2);
  });
});

// ─── getValueColor() ──────────────────────────────────────────────────────────

describe('getValueColor()', () => {
  it('returns "text-success" when no alarms', () => {
    const wrapper = mountComp();
    expect(wrapper.vm.getValueColor(makeAddr({ alarms: [] }))).toBe('text-success');
  });

  it('returns "text-success" when alarms is falsy', () => {
    const wrapper = mountComp();
    expect(wrapper.vm.getValueColor(makeAddr({ alarms: null }))).toBe('text-success');
  });

  it('returns "text-danger" when critical alarm condition is met', () => {
    const wrapper = mountComp();
    const addr = makeAddr({
      last_value: 90,
      numberConfig: { decimal_places: 0, min_value: 0, max_value: 100 },
      alarms: [{ severity: 'critical', type: 'MT', min: 80, max: null }],
    });
    expect(wrapper.vm.getValueColor(addr)).toBe('text-danger');
  });

  it('returns "text-danger" when severity "Error" alarm condition is met', () => {
    const wrapper = mountComp();
    const addr = makeAddr({
      last_value: 50,
      numberConfig: { decimal_places: 0 },
      alarms: [{ severity: 'Error', type: 'EXACT', min: 50, max: null }],
    });
    expect(wrapper.vm.getValueColor(addr)).toBe('text-danger');
  });

  it('returns "text-warning" when warning alarm condition is met', () => {
    const wrapper = mountComp();
    const addr = makeAddr({
      last_value: 75,
      numberConfig: { decimal_places: 0 },
      alarms: [{ severity: 'warning', type: 'MT', min: 70, max: null }],
    });
    expect(wrapper.vm.getValueColor(addr)).toBe('text-warning');
  });

  it('returns "text-warning" when severity "Warning" alarm condition is met', () => {
    const wrapper = mountComp();
    const addr = makeAddr({
      last_value: 50,
      numberConfig: { decimal_places: 0 },
      alarms: [{ severity: 'Warning', type: 'EXACT', min: 50, max: null }],
    });
    expect(wrapper.vm.getValueColor(addr)).toBe('text-warning');
  });

  it('returns "text-success" when alarm exists but condition not met', () => {
    const wrapper = mountComp();
    const addr = makeAddr({
      last_value: 30,
      numberConfig: { decimal_places: 0 },
      alarms: [{ severity: 'critical', type: 'EXACT', min: 50, max: null }],
    });
    expect(wrapper.vm.getValueColor(addr)).toBe('text-success');
  });
});

// ─── checkCondition() ─────────────────────────────────────────────────────────

describe('checkCondition()', () => {
  let vm;
  beforeEach(() => { vm = mountComp().vm; });

  it('EXACT: returns true when value === min', () => {
    expect(vm.checkCondition(50, { type: 'EXACT', min: 50, max: null })).toBe(true);
  });
  it('EXACT: returns false when value !== min', () => {
    expect(vm.checkCondition(49, { type: 'EXACT', min: 50, max: null })).toBe(false);
  });

  it('MT: returns true when value > min', () => {
    expect(vm.checkCondition(51, { type: 'MT', min: 50, max: null })).toBe(true);
  });
  it('MT: returns false when value === min', () => {
    expect(vm.checkCondition(50, { type: 'MT', min: 50, max: null })).toBe(false);
  });

  it('MTE: returns true when value >= min', () => {
    expect(vm.checkCondition(50, { type: 'MTE', min: 50, max: null })).toBe(true);
  });
  it('MTE: returns false when value < min', () => {
    expect(vm.checkCondition(49, { type: 'MTE', min: 50, max: null })).toBe(false);
  });

  it('LT: returns true when value < max', () => {
    expect(vm.checkCondition(49, { type: 'LT', min: 30, max: 50 })).toBe(true);
  });
  it('LT: uses min when max is null (nullish coalescing)', () => {
    expect(vm.checkCondition(49, { type: 'LT', min: 50, max: null })).toBe(true);
  });
  it('LT: returns false when value >= boundary', () => {
    expect(vm.checkCondition(50, { type: 'LT', min: 30, max: 50 })).toBe(false);
  });

  it('LTE: returns true when value <= max', () => {
    expect(vm.checkCondition(50, { type: 'LTE', min: 30, max: 50 })).toBe(true);
  });
  it('LTE: returns false when value > boundary', () => {
    expect(vm.checkCondition(51, { type: 'LTE', min: 30, max: 50 })).toBe(false);
  });

  it('BTW: returns true when min <= value <= max', () => {
    expect(vm.checkCondition(50, { type: 'BTW', min: 40, max: 60 })).toBe(true);
  });
  it('BTW: returns false when value out of range', () => {
    expect(vm.checkCondition(70, { type: 'BTW', min: 40, max: 60 })).toBe(false);
  });

  it('default: returns false for unknown type', () => {
    expect(vm.checkCondition(50, { type: 'UNKNOWN', min: 50, max: null })).toBe(false);
  });
});

// ─── initAllGauges() ─────────────────────────────────────────────────────────

describe('initAllGauges()', () => {
  it('returns early when localAddresses is empty', async () => {
    const wrapper = mountComp({ addresses: [] });
    await flushPromises();
    expect(MockRadialGauge).not.toHaveBeenCalled();
  });

  it('skips non-gauge display types', async () => {
    const wrapper = mountComp({ addresses: [makeAddr({ display_type: 'number' })] });
    await flushPromises();
    expect(MockRadialGauge).not.toHaveBeenCalled();
  });

  it('logs skip when canvas element not found', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const wrapper = mountComp({ addresses: [makeAddr({ display_type: 'number_gauge' })] });
    await flushPromises();
    expect(consoleSpy).toHaveBeenCalledWith('Skipping gauge - canvas not found or already initialized');
    consoleSpy.mockRestore();
  });

  it('creates RadialGauge when canvas is found and gauge not yet initialized', async () => {
    const fakeCanvas = document.createElement('canvas');
    const getSpy = vi.spyOn(document, 'getElementById').mockReturnValue(fakeCanvas);
    const wrapper = mountComp({ addresses: [makeAddr({ display_type: 'number_gauge', address_id: 5 })] });
    await flushPromises();
    expect(MockRadialGauge).toHaveBeenCalled();
    expect(mockDraw).toHaveBeenCalled();
    getSpy.mockRestore();
  });

  it('uses defaults (min=0, max=100, unit="") when numberConfig is absent', async () => {
    const fakeCanvas = document.createElement('canvas');
    const getSpy = vi.spyOn(document, 'getElementById').mockReturnValue(fakeCanvas);
    const addr = makeAddr({ display_type: 'number_gauge', address_id: 6, numberConfig: null });
    const wrapper = mountComp({ addresses: [addr] });
    await flushPromises();
    expect(MockRadialGauge).toHaveBeenCalledWith(expect.objectContaining({ minValue: 0, maxValue: 100, units: '' }));
    getSpy.mockRestore();
  });

  it('skips gauge creation when gauge already initialized', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const fakeCanvas = document.createElement('canvas');
    const getSpy = vi.spyOn(document, 'getElementById').mockReturnValue(fakeCanvas);
    const wrapper = mountComp({ addresses: [makeAddr({ display_type: 'number_gauge', address_id: 7 })] });
    // Pre-populate gauge before $nextTick runs
    wrapper.vm.gauges[7] = { draw: vi.fn(), update: vi.fn(), value: 0 };
    await flushPromises();
    expect(MockRadialGauge).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith('Skipping gauge - canvas not found or already initialized');
    getSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('catches RadialGauge construction errors', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fakeCanvas = document.createElement('canvas');
    const getSpy = vi.spyOn(document, 'getElementById').mockReturnValue(fakeCanvas);
    MockRadialGauge.mockImplementationOnce(() => { throw new Error('gauge failed'); });
    const wrapper = mountComp({ addresses: [makeAddr({ display_type: 'number_gauge', address_id: 8 })] });
    await flushPromises();
    expect(errorSpy).toHaveBeenCalledWith('Gauge Error:', expect.any(Error));
    getSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('builds highlights from alarms when creating gauge', async () => {
    const fakeCanvas = document.createElement('canvas');
    const getSpy = vi.spyOn(document, 'getElementById').mockReturnValue(fakeCanvas);
    const addr = makeAddr({
      display_type: 'number_gauge', address_id: 9,
      alarms: [{ severity: 'critical', type: 'MT', min: 80, max: null }],
    });
    const wrapper = mountComp({ addresses: [addr] });
    await flushPromises();
    expect(MockRadialGauge).toHaveBeenCalledWith(
      expect.objectContaining({ highlights: expect.arrayContaining([expect.objectContaining({ color: '#dc3545' })]) })
    );
    getSpy.mockRestore();
  });
});

// ─── updateGauges() ──────────────────────────────────────────────────────────

describe('updateGauges()', () => {
  it('skips addresses with no initialized gauge', () => {
    const wrapper = mountComp();
    wrapper.vm.localAddresses = [makeAddr()];
    wrapper.vm.updateGauges(); // no gauge → should not throw
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('updates gauge with default blue color when text-success', () => {
    const wrapper = mountComp();
    const fakeGauge = { update: vi.fn(), value: 0 };
    wrapper.vm.gauges[1] = fakeGauge;
    wrapper.vm.updateGauges();
    expect(fakeGauge.update).toHaveBeenCalledWith(
      expect.objectContaining({ colorNeedle: '#2a7ad4' })
    );
  });

  it('updates gauge with yellow color when text-warning', () => {
    const wrapper = mountComp();
    const addr = makeAddr({
      last_value: 75,
      numberConfig: { decimal_places: 0 },
      alarms: [{ severity: 'warning', type: 'MT', min: 70, max: null }],
    });
    wrapper.vm.localAddresses = [addr];
    const fakeGauge = { update: vi.fn(), value: 0 };
    wrapper.vm.gauges[1] = fakeGauge;
    wrapper.vm.updateGauges();
    expect(fakeGauge.update).toHaveBeenCalledWith(
      expect.objectContaining({ colorNeedle: '#ffc107' })
    );
  });

  it('updates gauge with red color when text-danger', () => {
    const wrapper = mountComp();
    const addr = makeAddr({
      last_value: 90,
      numberConfig: { decimal_places: 0 },
      alarms: [{ severity: 'critical', type: 'MT', min: 80, max: null }],
    });
    wrapper.vm.localAddresses = [addr];
    const fakeGauge = { update: vi.fn(), value: 0 };
    wrapper.vm.gauges[1] = fakeGauge;
    wrapper.vm.updateGauges();
    expect(fakeGauge.update).toHaveBeenCalledWith(
      expect.objectContaining({ colorNeedle: '#dc3545' })
    );
  });
});

// ─── getDisplayValue() ───────────────────────────────────────────────────────

describe('getDisplayValue()', () => {
  it('formats last_value with decimal_places', () => {
    const wrapper = mountComp();
    expect(wrapper.vm.getDisplayValue(makeAddr({ last_value: 42.567, numberConfig: { decimal_places: 2 } }))).toBe('42.57');
  });

  it('returns "0" when last_value is null (nullish coalescing)', () => {
    const wrapper = mountComp();
    expect(wrapper.vm.getDisplayValue(makeAddr({ last_value: null, numberConfig: { decimal_places: 0 } }))).toBe('0');
  });

  it('returns "0" when last_value is undefined', () => {
    const wrapper = mountComp();
    expect(wrapper.vm.getDisplayValue(makeAddr({ last_value: undefined, numberConfig: { decimal_places: 0 } }))).toBe('0');
  });

  it('uses decimal_places=0 when numberConfig is absent', () => {
    const wrapper = mountComp();
    expect(wrapper.vm.getDisplayValue(makeAddr({ last_value: 42.5, numberConfig: null }))).toBe('43');
  });

  it('uses decimal_places=0 when decimal_places is absent', () => {
    const wrapper = mountComp();
    expect(wrapper.vm.getDisplayValue(makeAddr({ last_value: 42.5, numberConfig: {} }))).toBe('43');
  });
});

// ─── generateTicks() ─────────────────────────────────────────────────────────

describe('generateTicks()', () => {
  it('generates 6 ticks from min to max', () => {
    const wrapper = mountComp();
    const ticks = wrapper.vm.generateTicks(0, 100);
    expect(ticks).toHaveLength(6);
    expect(ticks[0]).toBe('0');
    expect(ticks[5]).toBe('100');
  });

  it('generates correct intermediate values', () => {
    const wrapper = mountComp();
    const ticks = wrapper.vm.generateTicks(0, 50);
    expect(ticks).toEqual(['0', '10', '20', '30', '40', '50']);
  });

  it('generates ticks with non-zero min', () => {
    const wrapper = mountComp();
    const ticks = wrapper.vm.generateTicks(10, 60);
    expect(ticks[0]).toBe('10');
    expect(ticks[5]).toBe('60');
  });
});

// ─── openChart() / closeChart() ──────────────────────────────────────────────

describe('openChart() / closeChart()', () => {
  it('openChart sets selectedAddress and showChart=true', () => {
    const wrapper = mountComp();
    const addr = makeAddr();
    wrapper.vm.openChart(addr);
    expect(wrapper.vm.selectedAddress).toEqual(addr);
    expect(wrapper.vm.showChart).toBe(true);
  });

  it('closeChart sets showChart=false and clears selectedAddress', () => {
    const wrapper = mountComp();
    wrapper.vm.showChart = true;
    wrapper.vm.selectedAddress = makeAddr();
    wrapper.vm.closeChart();
    expect(wrapper.vm.showChart).toBe(false);
    expect(wrapper.vm.selectedAddress).toBeNull();
  });
});

// ─── handleDeleteCard() ──────────────────────────────────────────────────────

describe('handleDeleteCard()', () => {
  it('emits "delete-card" when confirmed', async () => {
    mockShowConfirm.mockResolvedValueOnce(true);
    const wrapper = mountComp();
    const addr = makeAddr();
    await wrapper.vm.handleDeleteCard(addr);
    expect(wrapper.emitted('delete-card')).toBeTruthy();
    expect(wrapper.emitted('delete-card')[0][0]).toEqual(addr);
  });

  it('does NOT emit "delete-card" when cancelled', async () => {
    mockShowConfirm.mockResolvedValueOnce(false);
    const wrapper = mountComp();
    await wrapper.vm.handleDeleteCard(makeAddr());
    expect(wrapper.emitted('delete-card')).toBeFalsy();
  });

  it('uses English text when locale.current is not "th"', async () => {
    const wrapper = mountComp({}, EN);
    await wrapper.vm.handleDeleteCard(makeAddr({ label: 'MyCard' }));
    expect(mockShowConfirm).toHaveBeenCalledWith(
      'Delete Card',
      expect.stringContaining('MyCard'),
      'Delete',
      'Cancel'
    );
  });

  it('uses Thai text when locale.current === "th"', async () => {
    const wrapper = mountComp({}, TH);
    await wrapper.vm.handleDeleteCard(makeAddr({ label: 'MyCard' }));
    expect(mockShowConfirm).toHaveBeenCalledWith(
      'ลบการ์ด',
      expect.stringContaining('MyCard'),
      'ลบ',
      'ยกเลิก'
    );
  });
});

// ─── formatTimeOnly() ────────────────────────────────────────────────────────

describe('formatTimeOnly()', () => {
  it('returns "-" for null', () => {
    expect(mountComp().vm.formatTimeOnly(null)).toBe('-');
  });
  it('returns "-" for undefined', () => {
    expect(mountComp().vm.formatTimeOnly(undefined)).toBe('-');
  });
  it('returns "-" for empty string', () => {
    expect(mountComp().vm.formatTimeOnly('')).toBe('-');
  });
  it('returns time string for valid ISO', () => {
    const result = mountComp().vm.formatTimeOnly('2024-01-15T10:30:00.000Z');
    expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });
});

// ─── formatConditionType() ───────────────────────────────────────────────────

describe('formatConditionType()', () => {
  let vm;
  beforeEach(() => { vm = mountComp().vm; });

  it('maps LT to "<"', () => { expect(vm.formatConditionType('LT')).toBe('<'); });
  it('maps LTE to "≤"', () => { expect(vm.formatConditionType('LTE')).toBe('≤'); });
  it('maps MT to ">"', () => { expect(vm.formatConditionType('MT')).toBe('>'); });
  it('maps MTE to "≥"', () => { expect(vm.formatConditionType('MTE')).toBe('≥'); });
  it('maps BTW to "↔"', () => { expect(vm.formatConditionType('BTW')).toBe('↔'); });
  it('maps EXACT to "="', () => { expect(vm.formatConditionType('EXACT')).toBe('='); });
  it('returns type itself for unknown', () => { expect(vm.formatConditionType('CUSTOM')).toBe('CUSTOM'); });
});

// ─── template ────────────────────────────────────────────────────────────────

describe('template rendering', () => {
  it('renders a card for each address', () => {
    const wrapper = mountComp({ addresses: [makeAddr({ card_id: 1 }), makeAddr({ card_id: 2, address_id: 2 })] });
    expect(wrapper.findAll('.card').length).toBeGreaterThanOrEqual(2);
  });

  it('hides edit/delete buttons when editMode=false', () => {
    const wrapper = mountComp({ editMode: false });
    expect(wrapper.find('.edit-btn').exists()).toBe(false);
    expect(wrapper.find('.delete-btn').exists()).toBe(false);
  });

  it('shows edit/delete buttons and badge when editMode=true', () => {
    const wrapper = mountComp({ editMode: true });
    expect(wrapper.find('.edit-btn').exists()).toBe(true);
    expect(wrapper.find('.delete-btn').exists()).toBe(true);
    expect(wrapper.find('.number.badge').exists()).toBe(true);
  });

  it('displays addr.position in badge when editMode=true', () => {
    const wrapper = mountComp({ editMode: true, addresses: [makeAddr({ position: 7 })] });
    expect(wrapper.find('.number.badge').text()).toBe('7');
  });

  it('emits "edit-card" with addr when edit button clicked', async () => {
    const addr = makeAddr();
    const wrapper = mountComp({ editMode: true, addresses: [addr] });
    await wrapper.find('.edit-btn').trigger('click');
    expect(wrapper.emitted('edit-card')).toBeTruthy();
  });

  it('calls handleDeleteCard when delete button clicked', async () => {
    const wrapper = mountComp({ editMode: true });
    const spy = vi.spyOn(wrapper.vm, 'handleDeleteCard');
    await wrapper.find('.delete-btn').trigger('click');
    expect(spy).toHaveBeenCalled();
  });

  it('shows "online" status dot when is_connected=true', () => {
    const wrapper = mountComp({ addresses: [makeAddr({ is_connected: true })] });
    expect(wrapper.find('.status-dot').classes()).toContain('online');
  });

  it('shows "offline" status dot when is_connected=false', () => {
    const wrapper = mountComp({ addresses: [makeAddr({ is_connected: false })] });
    expect(wrapper.find('.status-dot').classes()).toContain('offline');
  });

  it('shows device.name when available', () => {
    const wrapper = mountComp({ addresses: [makeAddr({ device: { name: 'My Device' } })] });
    expect(wrapper.find('.card-device-name').text()).toBe('MY DEVICE');
  });

  it('falls back to device_name when device.name is absent', () => {
    const wrapper = mountComp({ addresses: [makeAddr({ device: { name: null }, device_name: 'Fallback' })] });
    expect(wrapper.find('.card-device-name').text()).toContain('Fallback');
  });

  it('shows "-" when both device.name and device_name are absent', () => {
    const wrapper = mountComp({ addresses: [makeAddr({ device: null, device_name: null })] });
    expect(wrapper.find('.card-device-name').text()).toBe('-');
  });

  it('renders onoff circle with "on" class when last_value !== 0', () => {
    const wrapper = mountComp({ addresses: [makeAddr({ display_type: 'onoff', last_value: 1 })] });
    expect(wrapper.find('.onoff-circle').classes()).toContain('on');
    expect(wrapper.find('.onoff-inner-text').text()).toBe('ON');
  });

  it('renders onoff circle with "off" class when last_value === 0', () => {
    const wrapper = mountComp({ addresses: [makeAddr({ display_type: 'onoff', last_value: 0 })] });
    expect(wrapper.find('.onoff-circle').classes()).toContain('off');
    expect(wrapper.find('.onoff-inner-text').text()).toBe('OFF');
  });

  it('renders display-value for display_type "number"', () => {
    const wrapper = mountComp({ addresses: [makeAddr({ display_type: 'number', last_value: 42.5 })] });
    expect(wrapper.find('.display-value').exists()).toBe(true);
    expect(wrapper.find('.display-value').text()).toContain('42.5');
  });

  it('renders display-value for display_type "level"', () => {
    const wrapper = mountComp({ addresses: [makeAddr({ display_type: 'level', last_value: 10 })] });
    expect(wrapper.find('.display-value').exists()).toBe(true);
  });

  it('shows unit when numberConfig.unit is set', () => {
    const wrapper = mountComp({ addresses: [makeAddr({ display_type: 'number', numberConfig: { decimal_places: 1, unit: 'kPa', min_value: 0, max_value: 100 } })] });
    expect(wrapper.find('.card-unit').exists()).toBe(true);
    expect(wrapper.find('.card-unit').text()).toBe('kPa');
  });

  it('hides unit div when numberConfig.unit is absent', () => {
    const wrapper = mountComp({ addresses: [makeAddr({ display_type: 'number', numberConfig: { decimal_places: 1 } })] });
    expect(wrapper.find('.card-unit').exists()).toBe(false);
  });

  it('renders canvas for display_type "number_gauge"', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const wrapper = mountComp({ addresses: [makeAddr({ display_type: 'number_gauge', address_id: 20 })] });
    expect(wrapper.find('canvas#gauge-20').exists()).toBe(true);
    consoleSpy.mockRestore();
  });

  it('shows "More Info" text initially', () => {
    const wrapper = mountComp();
    expect(wrapper.findAll('button').some(b => b.text() === 'More Info')).toBe(true);
  });

  it('toggles to "Hide Info" after clicking More Info button', async () => {
    const wrapper = mountComp();
    const buttons = wrapper.findAll('button');
    const moreBtn = buttons.find(b => b.text() === 'More Info');
    await moreBtn.trigger('click');
    expect(wrapper.findAll('button').some(b => b.text() === 'Hide Info')).toBe(true);
  });

  it('shows info panel when expandedCards is true', async () => {
    const wrapper = mountComp();
    wrapper.vm.expandedCards[101] = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.info-panel').exists()).toBe(true);
  });

  it('shows Address and Refresh in info panel', async () => {
    const wrapper = mountComp();
    wrapper.vm.expandedCards[101] = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.info-panel').text()).toContain('D100');
    expect(wrapper.find('.info-panel').text()).toContain('1000');
  });

  it('shows Last Update via formatTimeOnly in info panel', async () => {
    const wrapper = mountComp();
    wrapper.vm.expandedCards[101] = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.info-panel').text()).toContain('Last Update');
  });

  it('shows numberConfig gauge settings in info panel for number_gauge', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const addr = makeAddr({ display_type: 'number_gauge', card_id: 202, address_id: 21 });
    const wrapper = mountComp({ addresses: [addr] });
    wrapper.vm.expandedCards[202] = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.info-panel').text()).toContain('Number Gauge Settings');
    consoleSpy.mockRestore();
  });

  it('shows range when min_value is defined', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const addr = makeAddr({ display_type: 'number_gauge', card_id: 203, address_id: 22 });
    const wrapper = mountComp({ addresses: [addr] });
    wrapper.vm.expandedCards[203] = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.info-panel').text()).toContain('Range');
    consoleSpy.mockRestore();
  });

  it('hides range when min_value is undefined', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const addr = makeAddr({ display_type: 'number_gauge', card_id: 204, address_id: 23, numberConfig: { decimal_places: 0, scale: 1, offset: 0 } });
    const wrapper = mountComp({ addresses: [addr] });
    wrapper.vm.expandedCards[204] = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.info-panel').text()).not.toContain('Range');
    consoleSpy.mockRestore();
  });

  it('shows decimal_places in gauge settings', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const addr = makeAddr({ display_type: 'number_gauge', card_id: 205, address_id: 24, numberConfig: { decimal_places: 2, min_value: 0, max_value: 100, scale: 1, offset: 0 } });
    const wrapper = mountComp({ addresses: [addr] });
    wrapper.vm.expandedCards[205] = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.info-panel').text()).toContain('Decimal');
    consoleSpy.mockRestore();
  });

  it('hides decimal section when decimal_places is undefined', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const addr = makeAddr({ display_type: 'number_gauge', card_id: 206, address_id: 25, numberConfig: { min_value: 0, max_value: 100 } });
    const wrapper = mountComp({ addresses: [addr] });
    wrapper.vm.expandedCards[206] = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.info-panel').text()).not.toContain('Decimal');
    consoleSpy.mockRestore();
  });

  it('shows scale in gauge settings', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const addr = makeAddr({ display_type: 'number_gauge', card_id: 207, address_id: 26, numberConfig: { decimal_places: 1, min_value: 0, max_value: 100, scale: 2, offset: 0 } });
    const wrapper = mountComp({ addresses: [addr] });
    wrapper.vm.expandedCards[207] = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.info-panel').text()).toContain('Scale');
    consoleSpy.mockRestore();
  });

  it('hides scale when scale is undefined', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const addr = makeAddr({ display_type: 'number_gauge', card_id: 208, address_id: 27, numberConfig: { decimal_places: 1, min_value: 0, max_value: 100 } });
    const wrapper = mountComp({ addresses: [addr] });
    wrapper.vm.expandedCards[208] = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.info-panel').text()).not.toContain('Scale');
    consoleSpy.mockRestore();
  });

  it('shows offset in gauge settings', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const addr = makeAddr({ display_type: 'number_gauge', card_id: 209, address_id: 28, numberConfig: { decimal_places: 1, min_value: 0, max_value: 100, scale: 1, offset: 5 } });
    const wrapper = mountComp({ addresses: [addr] });
    wrapper.vm.expandedCards[209] = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.info-panel').text()).toContain('Offset');
    consoleSpy.mockRestore();
  });

  it('hides offset when offset is undefined', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const addr = makeAddr({ display_type: 'number_gauge', card_id: 210, address_id: 29, numberConfig: { decimal_places: 1, min_value: 0, max_value: 100, scale: 1 } });
    const wrapper = mountComp({ addresses: [addr] });
    wrapper.vm.expandedCards[210] = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.info-panel').text()).not.toContain('Offset');
    consoleSpy.mockRestore();
  });

  it('shows Level Settings when levelConfigs has items', async () => {
    const addr = makeAddr({
      card_id: 301, address_id: 30, display_type: 'level',
      levelConfigs: [{ id: 1, level_index: 0, label: 'Low', condition_type: 'LT', min_value: 10, max_value: null }],
    });
    const wrapper = mountComp({ addresses: [addr] });
    wrapper.vm.expandedCards[301] = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.info-panel').text()).toContain('Level Settings');
    expect(wrapper.find('.info-panel').text()).toContain('Low');
  });

  it('renders LT condition as "<min" in level settings', async () => {
    const addr = makeAddr({
      card_id: 302, address_id: 31, display_type: 'level',
      levelConfigs: [{ id: 1, level_index: 0, label: 'Cold', condition_type: 'LT', min_value: 10, max_value: null }],
    });
    const wrapper = mountComp({ addresses: [addr] });
    wrapper.vm.expandedCards[302] = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.info-panel').text()).toContain('<10');
  });

  it('renders MT condition as ">min" in level settings', async () => {
    const addr = makeAddr({
      card_id: 303, address_id: 32, display_type: 'level',
      levelConfigs: [{ id: 1, level_index: 0, label: 'Hot', condition_type: 'MT', min_value: 80, max_value: null }],
    });
    const wrapper = mountComp({ addresses: [addr] });
    wrapper.vm.expandedCards[303] = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.info-panel').text()).toContain('>80');
  });

  it('renders BTW condition as "min-max" in level settings (v-else branch)', async () => {
    const addr = makeAddr({
      card_id: 304, address_id: 33, display_type: 'level',
      levelConfigs: [{ id: 1, level_index: 0, label: 'Normal', condition_type: 'BTW', min_value: 20, max_value: 60 }],
    });
    const wrapper = mountComp({ addresses: [addr] });
    wrapper.vm.expandedCards[304] = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.info-panel').text()).toContain('20-60');
  });

  it('hides Level Settings when levelConfigs is empty', async () => {
    const wrapper = mountComp({ addresses: [makeAddr({ card_id: 305, levelConfigs: [] })] });
    wrapper.vm.expandedCards[305] = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.info-panel').text()).not.toContain('Level Settings');
  });

  it('shows chart modal when showChart=true', async () => {
    const wrapper = mountComp();
    wrapper.vm.showChart = true;
    wrapper.vm.selectedAddress = makeAddr();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.modal').exists()).toBe(true);
    expect(wrapper.find('.chart-stub').exists()).toBe(true);
  });

  it('hides modal when showChart=false', () => {
    const wrapper = mountComp();
    expect(wrapper.find('.modal').exists()).toBe(false);
  });

  it('displays selectedAddress.label in modal title', async () => {
    const wrapper = mountComp({ addresses: [makeAddr({ label: 'Pressure' })] });
    wrapper.vm.showChart = true;
    wrapper.vm.selectedAddress = makeAddr({ label: 'Pressure' });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.modal-title').text()).toContain('Pressure');
  });

  it('closes chart via btn-close click', async () => {
    const wrapper = mountComp();
    wrapper.vm.showChart = true;
    wrapper.vm.selectedAddress = makeAddr();
    await wrapper.vm.$nextTick();
    await wrapper.find('.btn-close').trigger('click');
    expect(wrapper.vm.showChart).toBe(false);
  });

  it('closes chart via ปิดหน้าต่าง button', async () => {
    const wrapper = mountComp();
    wrapper.vm.showChart = true;
    wrapper.vm.selectedAddress = makeAddr();
    await wrapper.vm.$nextTick();
    const closeBtn = wrapper.findAll('button').find(b => b.text() === 'ปิดหน้าต่าง');
    await closeBtn.trigger('click');
    expect(wrapper.vm.showChart).toBe(false);
  });

  it('opens chart modal when Chart button is clicked', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const wrapper = mountComp();
    const chartBtn = wrapper.findAll('button').find(b => b.text() === 'Chart');
    await chartBtn.trigger('click');
    expect(wrapper.vm.showChart).toBe(true);
    consoleSpy.mockRestore();
  });

  it('applies paddingTop style in editMode to device name', () => {
    const wrapper = mountComp({ editMode: true });
    const nameEl = wrapper.find('.card-device-name');
    expect(nameEl.attributes('style')).toContain('padding-top');
  });

  it('no paddingTop when editMode=false', () => {
    const wrapper = mountComp({ editMode: false });
    const nameEl = wrapper.find('.card-device-name');
    expect(nameEl.attributes('style')).toContain('padding-top: 0');
  });
});

// ─── BUG CASES (all must FAIL intentionally) ─────────────────────────────────

describe('BUG CASES', () => {
  /**
   * BUG-1: addr.label.toUpperCase() crashes when label is null/undefined
   * อันตราย: ถ้า API ส่ง address ที่ไม่มี label (null หรือ undefined)
   *          → line 37: `addr.label.toUpperCase()` → TypeError: Cannot read properties of null
   *          → component พัง หน้า dashboard ขาวทั้งหน้า ไม่มี error handling
   * FAIL เพราะ: mount จะ throw TypeError เมื่อ label=null
   *             แต่ test expect ว่า render ได้โดยไม่ throw
   */
  it('[BUG-1] addr.label is null → crashes with TypeError in template', () => {
    expect(() => {
      mountComp({ addresses: [makeAddr({ label: null })] });
    }).not.toThrow();
  });

  /**
   * BUG-2: getDisplayValue returns 'NaN' when last_value is a non-numeric string
   * อันตราย: ถ้า PLC ส่งค่า 'ERR' หรือ 'TIMEOUT' แทนตัวเลข
   *          → Number('ERR') = NaN → 'NaN'.toFixed(0) = 'NaN'
   *          → user เห็น 'NaN' บนหน้าจอแทนค่าจริง ไม่มี fallback
   * FAIL เพราะ: getDisplayValue คืน 'NaN' แต่ test คาดว่าต้องไม่มี 'NaN'
   */
  it('[BUG-2] last_value="ERR" string causes getDisplayValue to return "NaN"', () => {
    const wrapper = mountComp();
    const result = wrapper.vm.getDisplayValue(makeAddr({ last_value: 'ERR', numberConfig: { decimal_places: 1 } }));
    expect(result).not.toBe('NaN');
  });

  /**
   * BUG-3: handleDeleteCard uses locale.current === 'th' but injected locale may not have .current
   * อันตราย: locale ถูก inject เป็น { t: fn } ไม่มี .current property
   *          → locale.current === 'th' → undefined === 'th' → always false
   *          → ผู้ใช้ภาษาไทยได้รับ confirm dialog ภาษาอังกฤษ → UX ไม่ถูกต้อง
   *          ถ้า locale inject มี current='th' → ควรใช้ข้อความไทย
   * FAIL เพราะ: locale ที่ inject มี current='th' แต่ถ้าไม่มี .current → ใช้ EN ตลอด
   *             test นี้ใช้ locale ที่ไม่มี .current และ expect ว่าได้ Thai text
   */
  it('[BUG-3] Thai locale without .current property always shows English text', async () => {
    const localeWithoutCurrent = { t: (k) => k }; // no .current property
    const wrapper = mountComp({}, localeWithoutCurrent);
    await wrapper.vm.handleDeleteCard(makeAddr({ label: 'TestCard' }));
    // BUG: locale.current is undefined → always English
    // Should be Thai if user's UI is in Thai mode
    expect(mockShowConfirm).toHaveBeenCalledWith(
      'ลบการ์ด',
      expect.anything(),
      'ลบ',
      'ยกเลิก'
    );
  });

  /**
   * BUG-4: getGaugeHighlights does NOT handle severity 'Critical' (capital C)
   * อันตราย: ถ้า backend/admin กรอก severity ว่า 'Critical' (capital C)
   *          → ไม่ match ทั้ง 'critical' และ 'Error'
   *          → gauge แสดงสีเขียว (safe) แทนสีแดง (danger)
   *          → ผู้ใช้คิดว่าค่าปกติทั้งที่เป็น critical alarm
   *          → อาจทำให้เกิดอุบัติเหตุในระบบอุตสาหกรรม
   * FAIL เพราะ: severity='Critical' คาดว่าได้สีแดง (#dc3545) แต่จริงๆ ได้สีเขียว (#28a745)
   */
  it('[BUG-4] severity "Critical" (capital C) falls through to green instead of red', () => {
    const wrapper = mountComp();
    const addr = makeAddr({ alarms: [{ severity: 'Critical', type: 'BTW', min: 80, max: 100 }] });
    const highlights = wrapper.vm.getGaugeHighlights(addr);
    // BUG: 'Critical' !== 'critical' and !== 'Error' → gets green (#28a745)
    expect(highlights[0].color).toBe('#dc3545');
  });

  /**
   * BUG-5: generateTicks when min === max (e.g. misconfigured gauge) → step=0 → all ticks are identical
   * อันตราย: ถ้า admin กรอก min_value === max_value (เช่น ทั้งคู่ = 0)
   *          → step = (0-0)/5 = 0 → ทุก tick คือ '0'
   *          → gauge แสดง scale ที่ไม่มีความหมาย อ่านค่าไม่ได้
   *          → ไม่มี validation หรือ error message ใดๆ
   * FAIL เพราะ: generateTicks(0,0) คืน ['0','0','0','0','0','0'] แต่ test คาดว่า ticks ต้องต่างกัน
   */
  it('[BUG-5] generateTicks(0, 0) produces all-identical ticks (no min=max validation)', () => {
    const wrapper = mountComp();
    const ticks = wrapper.vm.generateTicks(0, 0);
    const unique = new Set(ticks);
    // BUG: step=0 → all ticks are '0' → unique.size = 1
    expect(unique.size).toBeGreaterThan(1);
  });
});
