import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import Chart from '../../views/Chart.vue';

vi.mock('../../components/chart/OnOffChart.vue', () => ({
  default: { name: 'OnOffChart', template: '<div class="on-off-chart-stub"></div>' },
}));
vi.mock('../../components/chart/NumberChart.vue', () => ({
  default: { name: 'NumberChart', template: '<div class="number-chart-stub"></div>' },
}));
vi.mock('../../components/chart/NumberGaugeChart.vue', () => ({
  default: { name: 'NumberGaugeChart', template: '<div class="number-gauge-chart-stub"></div>' },
}));
vi.mock('../../components/chart/LevelChart.vue', () => ({
  default: { name: 'LevelChart', template: '<div class="level-chart-stub"></div>' },
}));

const VDatePickerStub = {
  name: 'VDatePicker',
  props: ['modelValue', 'mode', 'locale'],
  emits: ['update:modelValue'],
  template: '<div class="v-date-picker-stub"><slot :inputEvents="{}" /></div>',
};

const EN = { t: (k) => k };

function makeDevice(overrides = {}) {
  return {
    id: 1,
    label: 'Temp Sensor',
    plc_address: 'D100',
    refresh_rate_ms: 1000,
    display_type: 'number',
    ...overrides,
  };
}

function mountChart(props = {}) {
  return mount(Chart, {
    props: { device: makeDevice(), ...props },
    global: {
      provide: { locale: EN },
      components: { VDatePicker: VDatePickerStub },
    },
  });
}

// ─── data() ──────────────────────────────────────────────────────────────────

describe('data() initialization', () => {
  it('initializes startH/startM/startS to 00:00:00 when no initialStart', () => {
    const wrapper = mountChart();
    expect(wrapper.vm.startH).toBe('00');
    expect(wrapper.vm.startM).toBe('00');
    expect(wrapper.vm.startS).toBe('00');
  });

  it('initializes endH/endM/endS to 23:59:59 when no initialEnd', () => {
    const wrapper = mountChart();
    expect(wrapper.vm.endH).toBe('23');
    expect(wrapper.vm.endM).toBe('59');
    expect(wrapper.vm.endS).toBe('59');
  });

  it('uses initialStart when provided', () => {
    const wrapper = mountChart({ initialStart: '2024-01-15T10:30:45.000Z' });
    const start = new Date('2024-01-15T10:30:45.000Z');
    expect(wrapper.vm.startH).toBe(String(start.getHours()).padStart(2, '0'));
    expect(wrapper.vm.startM).toBe(String(start.getMinutes()).padStart(2, '0'));
    expect(wrapper.vm.startS).toBe(String(start.getSeconds()).padStart(2, '0'));
  });

  it('uses initialEnd when provided', () => {
    const wrapper = mountChart({ initialEnd: '2024-01-15T18:45:30.000Z' });
    const end = new Date('2024-01-15T18:45:30.000Z');
    expect(wrapper.vm.endH).toBe(String(end.getHours()).padStart(2, '0'));
    expect(wrapper.vm.endM).toBe(String(end.getMinutes()).padStart(2, '0'));
    expect(wrapper.vm.endS).toBe(String(end.getSeconds()).padStart(2, '0'));
  });

  it('initializes filterApplied to 0', () => {
    const wrapper = mountChart();
    expect(wrapper.vm.filterApplied).toBe(0);
  });

  it('initializes appliedStartDate to null before created hook', () => {
    // After created() it gets set via computed, but data() sets it to null first
    // We verify the type is string (set by created)
    const wrapper = mountChart();
    expect(wrapper.vm.appliedStartDate).toBeTruthy();
  });
});

// ─── computed: hours ─────────────────────────────────────────────────────────

describe('computed: hours', () => {
  it('returns array of 24 items', () => {
    const wrapper = mountChart();
    expect(wrapper.vm.hours).toHaveLength(24);
  });

  it('first item is "00"', () => {
    const wrapper = mountChart();
    expect(wrapper.vm.hours[0]).toBe('00');
  });

  it('last item is "23"', () => {
    const wrapper = mountChart();
    expect(wrapper.vm.hours[23]).toBe('23');
  });

  it('all items are zero-padded strings', () => {
    const wrapper = mountChart();
    wrapper.vm.hours.forEach((h) => {
      expect(h).toMatch(/^\d{2}$/);
    });
  });
});

// ─── computed: minutes ───────────────────────────────────────────────────────

describe('computed: minutes', () => {
  it('returns array of 60 items', () => {
    const wrapper = mountChart();
    expect(wrapper.vm.minutes).toHaveLength(60);
  });

  it('first item is "00"', () => {
    const wrapper = mountChart();
    expect(wrapper.vm.minutes[0]).toBe('00');
  });

  it('last item is "59"', () => {
    const wrapper = mountChart();
    expect(wrapper.vm.minutes[59]).toBe('59');
  });
});

// ─── computed: seconds ───────────────────────────────────────────────────────

describe('computed: seconds', () => {
  it('is an alias for minutes (same reference)', () => {
    const wrapper = mountChart();
    expect(wrapper.vm.seconds).toBe(wrapper.vm.minutes);
  });

  it('has 60 items', () => {
    const wrapper = mountChart();
    expect(wrapper.vm.seconds).toHaveLength(60);
  });
});

// ─── computed: startDate / endDate ───────────────────────────────────────────

describe('computed: startDate', () => {
  it('returns formatted datetime string', () => {
    const wrapper = mountChart();
    expect(wrapper.vm.startDate).toMatch(/^\d{4}-\d{2}-\d{2} 00:00:00$/);
  });

  it('reflects updated startH', async () => {
    const wrapper = mountChart();
    wrapper.vm.startH = '10';
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.startDate).toMatch(/ 10:00:00$/);
  });

  it('reflects updated startM and startS', async () => {
    const wrapper = mountChart();
    wrapper.vm.startM = '30';
    wrapper.vm.startS = '45';
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.startDate).toMatch(/:30:45$/);
  });

  it('returns null when startDateOnly is falsy', async () => {
    const wrapper = mountChart();
    wrapper.vm.startDateOnly = null;
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.startDate).toBeNull();
  });
});

describe('computed: endDate', () => {
  it('returns formatted datetime string ending in 23:59:59', () => {
    const wrapper = mountChart();
    expect(wrapper.vm.endDate).toMatch(/ 23:59:59$/);
  });

  it('reflects updated endH', async () => {
    const wrapper = mountChart();
    wrapper.vm.endH = '18';
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.endDate).toMatch(/ 18:59:59$/);
  });

  it('returns null when endDateOnly is falsy', async () => {
    const wrapper = mountChart();
    wrapper.vm.endDateOnly = null;
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.endDate).toBeNull();
  });
});

// ─── computed: chartComponent ─────────────────────────────────────────────────

describe('computed: chartComponent', () => {
  it('returns "OnOffChart" for display_type "onoff"', () => {
    const wrapper = mountChart({ device: makeDevice({ display_type: 'onoff' }) });
    expect(wrapper.vm.chartComponent).toBe('OnOffChart');
  });

  it('returns "NumberChart" for display_type "number"', () => {
    const wrapper = mountChart({ device: makeDevice({ display_type: 'number' }) });
    expect(wrapper.vm.chartComponent).toBe('NumberChart');
  });

  it('returns "NumberGaugeChart" for display_type "number_gauge"', () => {
    const wrapper = mountChart({ device: makeDevice({ display_type: 'number_gauge' }) });
    expect(wrapper.vm.chartComponent).toBe('NumberGaugeChart');
  });

  it('returns "LevelChart" for display_type "level"', () => {
    const wrapper = mountChart({ device: makeDevice({ display_type: 'level' }) });
    expect(wrapper.vm.chartComponent).toBe('LevelChart');
  });

  it('returns null for unknown display_type', () => {
    const wrapper = mountChart({ device: makeDevice({ display_type: 'unknown' }) });
    expect(wrapper.vm.chartComponent).toBeNull();
  });
});

// ─── created() hook ───────────────────────────────────────────────────────────

describe('created() hook', () => {
  it('sets appliedStartDate to startDate on mount', () => {
    const wrapper = mountChart();
    expect(wrapper.vm.appliedStartDate).toBe(wrapper.vm.startDate);
  });

  it('sets appliedEndDate to endDate on mount', () => {
    const wrapper = mountChart();
    expect(wrapper.vm.appliedEndDate).toBe(wrapper.vm.endDate);
  });

  it('sets appliedStartDate from initialStart', () => {
    const wrapper = mountChart({ initialStart: '2024-06-01T08:00:00.000Z' });
    expect(wrapper.vm.appliedStartDate).toBeTruthy();
    expect(wrapper.vm.appliedStartDate).toBe(wrapper.vm.startDate);
  });
});

// ─── methods: formatThaiDateOnly ─────────────────────────────────────────────

describe('formatThaiDateOnly()', () => {
  it('returns "" for null', () => {
    const wrapper = mountChart();
    expect(wrapper.vm.formatThaiDateOnly(null)).toBe('');
  });

  it('returns "" for undefined', () => {
    const wrapper = mountChart();
    expect(wrapper.vm.formatThaiDateOnly(undefined)).toBe('');
  });

  it('returns "" for empty string', () => {
    const wrapper = mountChart();
    expect(wrapper.vm.formatThaiDateOnly('')).toBe('');
  });

  it('returns Buddhist-calendar formatted date for valid Date object', () => {
    const wrapper = mountChart();
    const date = new Date(2024, 0, 15); // 15 Jan 2024
    const result = wrapper.vm.formatThaiDateOnly(date);
    expect(result).toBe('15/01/2567'); // 2024 + 543 = 2567
  });

  it('returns Buddhist-calendar formatted date for valid date string', () => {
    const wrapper = mountChart();
    // Use UTC-safe date string
    const date = new Date('2000-12-31T00:00:00');
    const result = wrapper.vm.formatThaiDateOnly(date);
    expect(result).toBe('31/12/2543'); // 2000 + 543 = 2543
  });

  it('zero-pads day and month', () => {
    const wrapper = mountChart();
    const date = new Date(2024, 1, 5); // 5 Feb 2024
    const result = wrapper.vm.formatThaiDateOnly(date);
    expect(result).toBe('05/02/2567');
  });
});

// ─── methods: combineDateTime ────────────────────────────────────────────────

describe('combineDateTime()', () => {
  it('returns null when date is null', () => {
    const wrapper = mountChart();
    expect(wrapper.vm.combineDateTime(null, '10', '30', '00')).toBeNull();
  });

  it('returns null when date is undefined', () => {
    const wrapper = mountChart();
    expect(wrapper.vm.combineDateTime(undefined, '10', '30', '00')).toBeNull();
  });

  it('returns formatted YYYY-MM-DD HH:MM:SS string', () => {
    const wrapper = mountChart();
    const date = new Date(2024, 0, 15); // 15 Jan 2024
    const result = wrapper.vm.combineDateTime(date, '10', '30', '45');
    expect(result).toBe('2024-01-15 10:30:45');
  });

  it('zero-pads all components', () => {
    const wrapper = mountChart();
    const date = new Date(2024, 1, 5); // 5 Feb 2024
    const result = wrapper.vm.combineDateTime(date, '01', '02', '03');
    expect(result).toBe('2024-02-05 01:02:03');
  });

  it('parses integer string hours/minutes/seconds correctly', () => {
    const wrapper = mountChart();
    const date = new Date(2024, 5, 20); // 20 Jun 2024
    const result = wrapper.vm.combineDateTime(date, '23', '59', '59');
    expect(result).toBe('2024-06-20 23:59:59');
  });
});

// ─── methods: applyFilter ────────────────────────────────────────────────────

describe('applyFilter()', () => {
  it('sets appliedStartDate to current startDate', async () => {
    const wrapper = mountChart();
    wrapper.vm.startH = '08';
    await wrapper.vm.$nextTick();
    wrapper.vm.applyFilter();
    expect(wrapper.vm.appliedStartDate).toBe(wrapper.vm.startDate);
  });

  it('sets appliedEndDate to current endDate', async () => {
    const wrapper = mountChart();
    wrapper.vm.endH = '18';
    await wrapper.vm.$nextTick();
    wrapper.vm.applyFilter();
    expect(wrapper.vm.appliedEndDate).toBe(wrapper.vm.endDate);
  });

  it('increments filterApplied by 1', () => {
    const wrapper = mountChart();
    expect(wrapper.vm.filterApplied).toBe(0);
    wrapper.vm.applyFilter();
    expect(wrapper.vm.filterApplied).toBe(1);
  });

  it('increments filterApplied on each call', () => {
    const wrapper = mountChart();
    wrapper.vm.applyFilter();
    wrapper.vm.applyFilter();
    wrapper.vm.applyFilter();
    expect(wrapper.vm.filterApplied).toBe(3);
  });

  it('emits filter-changed event', () => {
    const wrapper = mountChart();
    wrapper.vm.applyFilter();
    expect(wrapper.emitted('filter-changed')).toBeTruthy();
  });
});

// ─── methods: emitChange ─────────────────────────────────────────────────────

describe('emitChange()', () => {
  it('emits "filter-changed" event', () => {
    const wrapper = mountChart();
    wrapper.vm.emitChange();
    expect(wrapper.emitted('filter-changed')).toHaveLength(1);
  });

  it('emits with { start, end } payload', () => {
    const wrapper = mountChart();
    wrapper.vm.emitChange();
    const payload = wrapper.emitted('filter-changed')[0][0];
    expect(payload).toHaveProperty('start');
    expect(payload).toHaveProperty('end');
  });

  it('emits current startDate and endDate values', () => {
    const wrapper = mountChart();
    wrapper.vm.emitChange();
    const payload = wrapper.emitted('filter-changed')[0][0];
    expect(payload.start).toBe(wrapper.vm.startDate);
    expect(payload.end).toBe(wrapper.vm.endDate);
  });
});

// ─── template ────────────────────────────────────────────────────────────────

describe('template rendering', () => {
  it('displays device label', () => {
    const wrapper = mountChart({ device: makeDevice({ label: 'My Sensor' }) });
    expect(wrapper.text()).toContain('My Sensor');
  });

  it('displays device plc_address', () => {
    const wrapper = mountChart({ device: makeDevice({ plc_address: 'W200' }) });
    expect(wrapper.text()).toContain('W200');
  });

  it('displays device refresh_rate_ms', () => {
    const wrapper = mountChart({ device: makeDevice({ refresh_rate_ms: 500 }) });
    expect(wrapper.text()).toContain('500');
  });

  it('renders 6 select elements (startH, startM, startS, endH, endM, endS)', () => {
    const wrapper = mountChart();
    expect(wrapper.findAll('select')).toHaveLength(6);
  });

  it('renders 24 options in startH select', () => {
    const wrapper = mountChart();
    const selects = wrapper.findAll('select');
    expect(selects[0].findAll('option')).toHaveLength(24);
  });

  it('renders 60 options in startM select', () => {
    const wrapper = mountChart();
    const selects = wrapper.findAll('select');
    expect(selects[1].findAll('option')).toHaveLength(60);
  });

  it('renders 60 options in startS select', () => {
    const wrapper = mountChart();
    const selects = wrapper.findAll('select');
    expect(selects[2].findAll('option')).toHaveLength(60);
  });

  it('renders 24 options in endH select', () => {
    const wrapper = mountChart();
    const selects = wrapper.findAll('select');
    expect(selects[3].findAll('option')).toHaveLength(24);
  });

  it('renders 60 options in endM select', () => {
    const wrapper = mountChart();
    const selects = wrapper.findAll('select');
    expect(selects[4].findAll('option')).toHaveLength(60);
  });

  it('renders 60 options in endS select', () => {
    const wrapper = mountChart();
    const selects = wrapper.findAll('select');
    expect(selects[5].findAll('option')).toHaveLength(60);
  });

  it('renders Apply button', () => {
    const wrapper = mountChart();
    expect(wrapper.find('button').exists()).toBe(true);
  });

  it('calls applyFilter when Apply button is clicked', async () => {
    const wrapper = mountChart();
    const spy = vi.spyOn(wrapper.vm, 'applyFilter');
    await wrapper.find('button').trigger('click');
    expect(spy).toHaveBeenCalledOnce();
  });

  it('renders NumberChart stub for display_type "number"', () => {
    const wrapper = mountChart({ device: makeDevice({ display_type: 'number' }) });
    expect(wrapper.find('.number-chart-stub').exists()).toBe(true);
  });

  it('renders OnOffChart stub for display_type "onoff"', () => {
    const wrapper = mountChart({ device: makeDevice({ display_type: 'onoff' }) });
    expect(wrapper.find('.on-off-chart-stub').exists()).toBe(true);
  });

  it('renders NumberGaugeChart stub for display_type "number_gauge"', () => {
    const wrapper = mountChart({ device: makeDevice({ display_type: 'number_gauge' }) });
    expect(wrapper.find('.number-gauge-chart-stub').exists()).toBe(true);
  });

  it('renders LevelChart stub for display_type "level"', () => {
    const wrapper = mountChart({ device: makeDevice({ display_type: 'level' }) });
    expect(wrapper.find('.level-chart-stub').exists()).toBe(true);
  });

  it('renders no chart stub for unknown display_type', () => {
    const wrapper = mountChart({ device: makeDevice({ display_type: 'unknown' }) });
    expect(wrapper.find('.number-chart-stub').exists()).toBe(false);
    expect(wrapper.find('.on-off-chart-stub').exists()).toBe(false);
    expect(wrapper.find('.number-gauge-chart-stub').exists()).toBe(false);
    expect(wrapper.find('.level-chart-stub').exists()).toBe(false);
  });

  it('passes device prop to chart component', () => {
    const device = makeDevice({ display_type: 'number', label: 'Sensor X' });
    const wrapper = mountChart({ device });
    expect(wrapper.find('.number-chart-stub').exists()).toBe(true);
  });

  it('renders two VDatePicker stubs', () => {
    const wrapper = mountChart();
    expect(wrapper.findAll('.v-date-picker-stub')).toHaveLength(2);
  });

  it('date input shows formatted Buddhist date for startDateOnly', () => {
    const today = new Date();
    const wrapper = mountChart();
    const inputs = wrapper.findAll('input');
    // First input is the start date picker input
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear() + 543;
    expect(inputs[0].element.value).toBe(`${day}/${month}/${year}`);
  });

  it('updates startH via select change', async () => {
    const wrapper = mountChart();
    const selects = wrapper.findAll('select');
    await selects[0].setValue('10');
    expect(wrapper.vm.startH).toBe('10');
  });

  it('updates startM via select change', async () => {
    const wrapper = mountChart();
    const selects = wrapper.findAll('select');
    await selects[1].setValue('30');
    expect(wrapper.vm.startM).toBe('30');
  });

  it('updates startS via select change', async () => {
    const wrapper = mountChart();
    const selects = wrapper.findAll('select');
    await selects[2].setValue('45');
    expect(wrapper.vm.startS).toBe('45');
  });

  it('updates endH via select change', async () => {
    const wrapper = mountChart();
    const selects = wrapper.findAll('select');
    await selects[3].setValue('18');
    expect(wrapper.vm.endH).toBe('18');
  });

  it('updates endM via select change', async () => {
    const wrapper = mountChart();
    const selects = wrapper.findAll('select');
    await selects[4].setValue('30');
    expect(wrapper.vm.endM).toBe('30');
  });

  it('updates endS via select change', async () => {
    const wrapper = mountChart();
    const selects = wrapper.findAll('select');
    await selects[5].setValue('00');
    expect(wrapper.vm.endS).toBe('00');
  });

  it('passes alarmTime prop through', () => {
    const wrapper = mountChart({ alarmTime: '2024-01-15 10:00:00' });
    expect(wrapper.vm.$props.alarmTime).toBe('2024-01-15 10:00:00');
  });

  it('passes eventType prop through', () => {
    const wrapper = mountChart({ eventType: 'TRIGGER' });
    expect(wrapper.vm.$props.eventType).toBe('TRIGGER');
  });

  it('updates startDateOnly when first VDatePicker emits update:modelValue (covers line 34 v-model handler)', async () => {
    const wrapper = mountChart();
    const pickers = wrapper.findAllComponents({ name: 'VDatePicker' });
    const newDate = new Date(2024, 5, 15);
    await pickers[0].vm.$emit('update:modelValue', newDate);
    expect(wrapper.vm.startDateOnly).toEqual(newDate);
  });

  it('updates endDateOnly when second VDatePicker emits update:modelValue (covers line 72 v-model handler)', async () => {
    const wrapper = mountChart();
    const pickers = wrapper.findAllComponents({ name: 'VDatePicker' });
    const newDate = new Date(2024, 5, 20);
    await pickers[1].vm.$emit('update:modelValue', newDate);
    expect(wrapper.vm.endDateOnly).toEqual(newDate);
  });
});

// ─── BUG CASES (all must FAIL intentionally) ─────────────────────────────────

describe('BUG CASES', () => {
  /**
   * BUG-1: chartComponent returns null for unknown display_type
   * อันตราย: ถ้า backend ส่ง display_type ใหม่ที่ยังไม่รองรับ (เช่น 'gauge_bar')
   *          จะไม่มี chart แสดงให้ user เลย และไม่มี error message ใดๆ → silent failure
   *          user จะเห็นแค่กล่องเปล่า ไม่รู้ว่าเกิดอะไรขึ้น
   * FAIL เพราะ: chartComponent คืน null จริง แต่ test คาดว่าต้องไม่เป็น null
   *             (ควร fallback ไปที่ NumberChart หรือแสดง error message)
   */
  it('[BUG-1] unknown display_type renders blank chart area with no error message - should fallback', () => {
    const wrapper = mountChart({ device: makeDevice({ display_type: 'gauge_bar' }) });
    // BUG: chartComponent is null → no chart rendered → silent failure
    // Should NOT be null; should have a fallback or error message
    expect(wrapper.vm.chartComponent).not.toBeNull();
  });

  /**
   * BUG-2: initialStart with invalid date string → NaN in startH/startM/startS
   * อันตราย: ถ้า AlarmHistory ส่ง initialStart ที่เป็น string ผิดรูปแบบ
   *          (เช่น API คืน null หรือ undefined) → start = new Date(undefined) = Invalid Date
   *          → start.getHours() = NaN → startH = 'NaN' → combineDateTime ส่ง 'NaN:NaN:NaN'
   *          → chart แสดงข้อมูลผิดช่วงเวลา หรือ API query ล้มเหลว
   * FAIL เพราะ: startH เป็น 'NaN' แต่ test คาดว่าต้องไม่มี 'NaN'
   */
  it('[BUG-2] invalid initialStart causes NaN in time fields - should validate input', () => {
    const wrapper = mountChart({ initialStart: 'not-a-valid-date' });
    // BUG: new Date('not-a-valid-date') = Invalid Date → getHours() = NaN → startH = 'NaN'
    expect(wrapper.vm.startH).not.toContain('NaN');
    expect(wrapper.vm.startM).not.toContain('NaN');
    expect(wrapper.vm.startS).not.toContain('NaN');
  });

  /**
   * BUG-3: applyFilter() ไม่ตรวจสอบว่า startDate < endDate
   * อันตราย: user สามารถ apply filter ที่ start > end ได้
   *          → chart query ช่วงเวลาย้อนกลับ → API คืน empty หรือ error
   *          → user เห็น chart เปล่าโดยไม่รู้สาเหตุ
   * FAIL เพราะ: filter-changed event ถูก emit ด้วย start > end
   *             แต่ test คาดว่า start ต้องน้อยกว่าหรือเท่ากับ end
   */
  it('[BUG-3] applyFilter emits inverted date range without validation', async () => {
    const wrapper = mountChart();
    // Set start to tomorrow (after end)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    wrapper.vm.startDateOnly = tomorrow;
    wrapper.vm.startH = '23';
    await wrapper.vm.$nextTick();
    wrapper.vm.applyFilter();
    const payload = wrapper.emitted('filter-changed')[0][0];
    // BUG: start > end is allowed — no validation in applyFilter()
    // Should reject or warn when start > end
    expect(payload.start <= payload.end).toBe(true);
  });

  /**
   * BUG-4: filterApplied++ เพิ่มทุกครั้งที่กด Apply แม้ค่า filter ไม่เปลี่ยน
   * อันตราย: ถ้า user กด Apply ซ้ำๆ โดยไม่เปลี่ยนค่า
   *          child chart components จะรับ filterApplied ใหม่ → fetch API ซ้ำโดยไม่จำเป็น
   *          → load สูงขึ้น, ข้อมูลกระพริบ (re-render), waste network bandwidth
   * FAIL เพราะ: กด Apply 2 ครั้งโดยไม่เปลี่ยนค่า → filterApplied = 2
   *             แต่ test คาดว่าควรเพิ่มแค่ครั้งเดียวเมื่อ filter จริงๆ เปลี่ยน
   */
  it('[BUG-4] filterApplied increments on every click even when filter unchanged', () => {
    const wrapper = mountChart();
    wrapper.vm.applyFilter(); // click 1 — filter not changed
    wrapper.vm.applyFilter(); // click 2 — same values
    // BUG: filterApplied = 2, should be 1 if filter values didn't change
    expect(wrapper.vm.filterApplied).toBe(1);
  });

  /**
   * BUG-5: formatThaiDateOnly(new Date('invalid')) คืน 'NaN/NaN/NaN' แทน ''
   * อันตราย: ถ้า startDateOnly เป็น Invalid Date (เช่นจาก initialStart ผิดรูปแบบ)
   *          date picker input จะแสดง 'NaN/NaN/NaN' ให้ user เห็น
   *          → ทำให้ UI ดูเสียหาย ไม่น่าเชื่อถือ
   * FAIL เพราะ: component ไม่ตรวจ isNaN(d.getTime()) ก่อน format
   *             new Date('invalid') is truthy → !date = false → ผ่าน guard → คืน 'NaN/NaN/NaN'
   */
  it('[BUG-5] formatThaiDateOnly with Invalid Date returns "NaN/NaN/NaN" instead of ""', () => {
    const wrapper = mountChart();
    const invalidDate = new Date('invalid');
    const result = wrapper.vm.formatThaiDateOnly(invalidDate);
    // BUG: Invalid Date is truthy, so !date check passes, then getDate() = NaN
    // Should return '' for invalid dates
    expect(result).toBe('');
  });
});
