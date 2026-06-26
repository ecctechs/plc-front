import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import Setting from '../../views/Setting.vue';

// ─── Hoisted mock function refs ───────────────────────────────────────────────
const {
  mockDeviceFormOpen,
  mockProductFormOpen,
  mockLoadDevices,
  mockLoadProducts,
} = vi.hoisted(() => ({
  mockDeviceFormOpen: vi.fn(),
  mockProductFormOpen: vi.fn(),
  mockLoadDevices: vi.fn(),
  mockLoadProducts: vi.fn(),
}));

// ─── Child component stubs ────────────────────────────────────────────────────
vi.mock('../../components/setting/TypeSetting.vue', () => ({
  default: { name: 'TypeSetting', template: '<div class="type-setting-stub"></div>' },
}));

vi.mock('../../components/setting/RoomSetting.vue', () => ({
  default: {
    name: 'RoomSetting',
    emits: ['room-updated'],
    template: '<div class="room-setting-stub"></div>',
  },
}));

vi.mock('../../components/setting/ProductSetting.vue', () => ({
  default: {
    name: 'ProductSetting',
    emits: ['edit', 'add'],
    setup() { return { loadProducts: mockLoadProducts }; },
    template: '<div class="product-setting-stub"></div>',
  },
}));

vi.mock('../../components/setting/ProductForm.vue', () => ({
  default: {
    name: 'ProductForm',
    emits: ['saved'],
    props: ['reloadProducts'],
    setup() { return { open: mockProductFormOpen }; },
    template: '<div class="product-form-stub"></div>',
  },
}));

vi.mock('../../components/setting/DeviceSetting.vue', () => ({
  default: {
    name: 'DeviceSetting',
    emits: ['edit', 'add'],
    setup() { return { loadDevices: mockLoadDevices }; },
    template: '<div class="device-setting-stub"></div>',
  },
}));

vi.mock('../../components/setting/EmployeeSetting.vue', () => ({
  default: { name: 'EmployeeSetting', template: '<div class="employee-setting-stub"></div>' },
}));

vi.mock('../../components/setting/WorkingTimeForm.vue', () => ({
  default: { name: 'WorkingTimeForm', template: '<div class="working-time-form-stub"></div>' },
}));

vi.mock('../../components/setting/PlcDebugForm.vue', () => ({
  default: { name: 'PlcDebugForm', template: '<div class="plc-debug-form-stub"></div>' },
}));

vi.mock('../../components/setting/DeviceForm.vue', () => ({
  default: {
    name: 'DeviceForm',
    emits: ['saved'],
    props: ['reloadDevices'],
    setup() { return { open: mockDeviceFormOpen }; },
    template: '<div class="device-form-stub"></div>',
  },
}));

vi.mock('../../utils/swalHelper', () => ({
  showAlert: vi.fn(),
  showConfirm: vi.fn().mockResolvedValue(false),
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const store = {};
vi.stubGlobal('localStorage', {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = v; },
  removeItem: (k) => { delete store[k]; },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeLocale(lang = 'en') {
  return { current: lang, t: (k) => k, toggle: vi.fn() };
}

function mountComp(lang = 'en') {
  return mount(Setting, {
    global: { provide: { locale: makeLocale(lang) } },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── initial state ────────────────────────────────────────────────────────────
describe('initial state', () => {
  it('initializes devices as empty array', () => {
    const wrapper = mountComp();
    expect(wrapper.vm.devices).toEqual([]);
  });

  it('initializes products as empty array', () => {
    const wrapper = mountComp();
    expect(wrapper.vm.products).toEqual([]);
  });
});

// ─── template rendering ───────────────────────────────────────────────────────
describe('template rendering', () => {
  it('renders page title via locale.t("System Settings")', () => {
    const wrapper = mountComp();
    expect(wrapper.text()).toContain('System Settings');
  });

  it('renders subtitle via locale.t("Manage PLC system settings")', () => {
    const wrapper = mountComp();
    expect(wrapper.text()).toContain('Manage PLC system settings');
  });

  it('renders TypeSetting child component', () => {
    const wrapper = mountComp();
    expect(wrapper.findComponent({ name: 'TypeSetting' }).exists()).toBe(true);
  });

  it('renders RoomSetting child component', () => {
    const wrapper = mountComp();
    expect(wrapper.findComponent({ name: 'RoomSetting' }).exists()).toBe(true);
  });

  it('renders ProductSetting child component', () => {
    const wrapper = mountComp();
    expect(wrapper.findComponent({ name: 'ProductSetting' }).exists()).toBe(true);
  });

  it('renders DeviceSetting child component', () => {
    const wrapper = mountComp();
    expect(wrapper.findComponent({ name: 'DeviceSetting' }).exists()).toBe(true);
  });

  it('renders EmployeeSetting child component', () => {
    const wrapper = mountComp();
    expect(wrapper.findComponent({ name: 'EmployeeSetting' }).exists()).toBe(true);
  });

  it('renders WorkingTimeForm child component', () => {
    const wrapper = mountComp();
    expect(wrapper.findComponent({ name: 'WorkingTimeForm' }).exists()).toBe(true);
  });

  it('renders PlcDebugForm child component', () => {
    const wrapper = mountComp();
    expect(wrapper.findComponent({ name: 'PlcDebugForm' }).exists()).toBe(true);
  });

  it('renders DeviceForm child component', () => {
    const wrapper = mountComp();
    expect(wrapper.findComponent({ name: 'DeviceForm' }).exists()).toBe(true);
  });

  it('renders ProductForm child component', () => {
    const wrapper = mountComp();
    expect(wrapper.findComponent({ name: 'ProductForm' }).exists()).toBe(true);
  });
});

// ─── openDeviceForm() ─────────────────────────────────────────────────────────
describe('openDeviceForm()', () => {
  it('calls $refs.deviceFormModal.open(null) when called with no argument', () => {
    const wrapper = mountComp();
    wrapper.vm.openDeviceForm();
    expect(mockDeviceFormOpen).toHaveBeenCalledWith(null);
  });

  it('calls $refs.deviceFormModal.open(device) when device is provided', () => {
    const wrapper = mountComp();
    const device = { id: 1, name: 'PLC-01' };
    wrapper.vm.openDeviceForm(device);
    expect(mockDeviceFormOpen).toHaveBeenCalledWith(device);
  });
});

// ─── openProductForm() ────────────────────────────────────────────────────────
describe('openProductForm()', () => {
  it('calls $refs.productFormModal.open(null) when called with no argument', () => {
    const wrapper = mountComp();
    wrapper.vm.openProductForm();
    expect(mockProductFormOpen).toHaveBeenCalledWith(null);
  });

  it('calls $refs.productFormModal.open(product) when product is provided', () => {
    const wrapper = mountComp();
    const product = { id: 5, name: 'Widget' };
    wrapper.vm.openProductForm(product);
    expect(mockProductFormOpen).toHaveBeenCalledWith(product);
  });
});

// ─── reloadDevices() ──────────────────────────────────────────────────────────
describe('reloadDevices()', () => {
  it('calls $refs.deviceSetting.loadDevices()', () => {
    const wrapper = mountComp();
    wrapper.vm.reloadDevices();
    expect(mockLoadDevices).toHaveBeenCalled();
  });
});

// ─── reloadProducts() ─────────────────────────────────────────────────────────
describe('reloadProducts()', () => {
  it('calls $refs.productSetting.loadProducts()', () => {
    const wrapper = mountComp();
    wrapper.vm.reloadProducts();
    expect(mockLoadProducts).toHaveBeenCalled();
  });
});

// ─── onDeviceSaved() ──────────────────────────────────────────────────────────
describe('onDeviceSaved()', () => {
  it('emits "add-device"', () => {
    const wrapper = mountComp();
    wrapper.vm.onDeviceSaved();
    expect(wrapper.emitted('add-device')).toBeTruthy();
  });

  it('emits "add-device" without payload', () => {
    const wrapper = mountComp();
    wrapper.vm.onDeviceSaved();
    const emitted = wrapper.emitted('add-device');
    expect(emitted[0]).toEqual([]);
  });
});

// ─── onProductSaved() ─────────────────────────────────────────────────────────
describe('onProductSaved()', () => {
  it('emits "add-product"', () => {
    const wrapper = mountComp();
    wrapper.vm.onProductSaved();
    expect(wrapper.emitted('add-product')).toBeTruthy();
  });

  it('emits "add-product" without payload', () => {
    const wrapper = mountComp();
    wrapper.vm.onProductSaved();
    const emitted = wrapper.emitted('add-product');
    expect(emitted[0]).toEqual([]);
  });
});

// ─── addDevice() ──────────────────────────────────────────────────────────────
describe('addDevice()', () => {
  it('emits "add-device" with the device payload', () => {
    const wrapper = mountComp();
    const device = { id: 3, name: 'Sensor-C' };
    wrapper.vm.addDevice(device);
    const emitted = wrapper.emitted('add-device');
    expect(emitted).toBeTruthy();
    expect(emitted[0][0]).toEqual(device);
  });

  it('emits "add-device" with undefined when called without arg', () => {
    const wrapper = mountComp();
    wrapper.vm.addDevice();
    const emitted = wrapper.emitted('add-device');
    expect(emitted[0][0]).toBeUndefined();
  });
});

// ─── template event bindings ──────────────────────────────────────────────────
describe('template event bindings', () => {
  it('@room-updated on RoomSetting calls reloadDevices', async () => {
    const wrapper = mountComp();
    const roomSetting = wrapper.findComponent({ name: 'RoomSetting' });
    await roomSetting.vm.$emit('room-updated');
    expect(mockLoadDevices).toHaveBeenCalled();
  });

  it('@edit on ProductSetting calls openProductForm with product', async () => {
    const wrapper = mountComp();
    const product = { id: 2, name: 'Bolt' };
    const productSetting = wrapper.findComponent({ name: 'ProductSetting' });
    await productSetting.vm.$emit('edit', product);
    expect(mockProductFormOpen).toHaveBeenCalledWith(product);
  });

  it('@add on ProductSetting calls openProductForm', async () => {
    const wrapper = mountComp();
    const productSetting = wrapper.findComponent({ name: 'ProductSetting' });
    await productSetting.vm.$emit('add');
    expect(mockProductFormOpen).toHaveBeenCalled();
  });

  it('@edit on DeviceSetting calls openDeviceForm with device', async () => {
    const wrapper = mountComp();
    const device = { id: 7, name: 'PLC-7' };
    const deviceSetting = wrapper.findComponent({ name: 'DeviceSetting' });
    await deviceSetting.vm.$emit('edit', device);
    expect(mockDeviceFormOpen).toHaveBeenCalledWith(device);
  });

  it('@add on DeviceSetting calls openDeviceForm', async () => {
    const wrapper = mountComp();
    const deviceSetting = wrapper.findComponent({ name: 'DeviceSetting' });
    await deviceSetting.vm.$emit('add');
    expect(mockDeviceFormOpen).toHaveBeenCalled();
  });

  it('@saved on DeviceForm calls onDeviceSaved → emits add-device', async () => {
    const wrapper = mountComp();
    const deviceForm = wrapper.findComponent({ name: 'DeviceForm' });
    await deviceForm.vm.$emit('saved');
    expect(wrapper.emitted('add-device')).toBeTruthy();
  });

  it('@saved on ProductForm calls onProductSaved → emits add-product', async () => {
    const wrapper = mountComp();
    const productForm = wrapper.findComponent({ name: 'ProductForm' });
    await productForm.vm.$emit('saved');
    expect(wrapper.emitted('add-product')).toBeTruthy();
  });
});

// ─── prop bindings ────────────────────────────────────────────────────────────
describe('prop bindings', () => {
  it('passes reloadDevices method as prop to DeviceForm', () => {
    const wrapper = mountComp();
    const deviceForm = wrapper.findComponent({ name: 'DeviceForm' });
    const fn = deviceForm.props('reloadDevices');
    expect(typeof fn).toBe('function');
  });

  it('reloadDevices prop on DeviceForm triggers $refs.deviceSetting.loadDevices', () => {
    const wrapper = mountComp();
    const deviceForm = wrapper.findComponent({ name: 'DeviceForm' });
    const reloadFn = deviceForm.props('reloadDevices');
    reloadFn();
    expect(mockLoadDevices).toHaveBeenCalled();
  });

  it('passes reloadProducts method as prop to ProductForm', () => {
    const wrapper = mountComp();
    const productForm = wrapper.findComponent({ name: 'ProductForm' });
    const fn = productForm.props('reloadProducts');
    expect(typeof fn).toBe('function');
  });

  it('reloadProducts prop on ProductForm triggers $refs.productSetting.loadProducts', () => {
    const wrapper = mountComp();
    const productForm = wrapper.findComponent({ name: 'ProductForm' });
    const reloadFn = productForm.props('reloadProducts');
    reloadFn();
    expect(mockLoadProducts).toHaveBeenCalled();
  });
});

// ─── BUG CASES (all must FAIL intentionally) ──────────────────────────────────
describe('BUG CASES', () => {
  /**
   * BUG-1: openDeviceForm(device = null) ใช้ null เป็น default แทน undefined
   * อันตราย: หลาย form component แยก "add mode" ด้วย `device === undefined`
   *          แต่ null !== undefined → form อาจเปิดใน "edit mode" โดยไม่ได้ตั้งใจ
   *          เช่น DeviceForm.open(null) อาจ PUT /api/devices/null → 400/404 error
   * FAIL เพราะ: open() ถูกเรียกด้วย null แต่ test คาดว่าเป็น undefined
   */
  it('[BUG-1] openDeviceForm(): default null is not undefined — may trigger edit mode in DeviceForm', () => {
    const wrapper = mountComp();
    wrapper.vm.openDeviceForm(); // no argument → device = null (default)
    // BUG: null !== undefined; forms checking (device !== undefined) see this as edit mode
    expect(mockDeviceFormOpen).toHaveBeenCalledWith(undefined);
  });

  /**
   * BUG-2: @add="openDeviceForm" บน DeviceSetting รับ raw event object เป็น device
   * อันตราย: ถ้า DeviceSetting emit 'add' พร้อม event object (เช่น MouseEvent)
   *           → openDeviceForm(MouseEvent) ถูกเรียก
   *           → $refs.deviceFormModal.open(MouseEvent) → form ได้รับ DOM event เป็น device
   *           → form อาจ render ข้อมูลผิด หรือ PUT /api/devices/[object MouseEvent]
   *           → binding ไม่ปลอดภัย ควรใช้ wrapper function เช่น @add="() => openDeviceForm()"
   * FAIL เพราะ: open() ถูกเรียกด้วย rawEvent ไม่ใช่ null (ที่ควรจะเป็นสำหรับ add mode)
   */
  it('[BUG-2] @add on DeviceSetting passes raw event payload to openDeviceForm → DeviceForm.open receives event object', async () => {
    const wrapper = mountComp();
    const rawEvent = { type: 'click', target: null }; // simulates accidental event payload
    const deviceSetting = wrapper.findComponent({ name: 'DeviceSetting' });
    await deviceSetting.vm.$emit('add', rawEvent);
    // BUG: openDeviceForm(rawEvent) is called → open(rawEvent) → form gets DOM event as device
    expect(mockDeviceFormOpen).toHaveBeenCalledWith(null);
  });

  /**
   * BUG-3: onDeviceSaved() emits 'add-device' ไม่มี payload
   *         แต่ addDevice(device) emits 'add-device' พร้อม device payload
   * อันตราย: parent ที่ฟัง 'add-device' เพื่อรับ device object จะได้ undefined
   *           เมื่อ onDeviceSaved() fire แทน addDevice()
   *           → parent อาจ update device list ด้วย undefined → list เสียหาย
   * FAIL เพราะ: emitted[0][0] เป็น undefined แต่ test คาดว่ามี device payload
   */
  it('[BUG-3] onDeviceSaved(): emits add-device without device payload (inconsistent with addDevice)', () => {
    const wrapper = mountComp();
    const savedDevice = { id: 42, name: 'NewDevice' };
    wrapper.vm.onDeviceSaved(savedDevice); // caller passes device, but onDeviceSaved ignores it
    const emitted = wrapper.emitted('add-device');
    // BUG: emitted[0][0] is undefined because onDeviceSaved ignores its argument
    expect(emitted[0][0]).toEqual(savedDevice);
  });

  /**
   * BUG-4: reloadDevices prop ที่ส่งไปยัง DeviceForm ใช้ $refs ของ Setting
   *         ถ้า Setting ถูก unmount ก่อน DeviceForm เรียก callback นี้
   *         → $refs.deviceSetting เป็น undefined
   *         → TypeError ใน callback ที่ DeviceForm เรียกหลัง async operation
   * FAIL เพราะ: expect ว่าไม่ throw แต่ $refs.deviceSetting เป็น undefined หลัง unmount
   */
  it('[BUG-4] reloadDevices prop crashes after Setting is unmounted (dangling ref)', () => {
    const wrapper = mountComp();
    const deviceForm = wrapper.findComponent({ name: 'DeviceForm' });
    const reloadFn = deviceForm.props('reloadDevices'); // capture before unmount
    wrapper.unmount();
    // BUG: $refs.deviceSetting is now undefined after unmount
    expect(() => reloadFn()).not.toThrow();
  });

  /**
   * BUG-5: openDeviceForm() / openProductForm() ไม่มี try/catch
   *         ถ้า $refs.deviceFormModal.open() throw error (เช่น modal ปิดไปก่อน)
   *         → error ถูก propagate ออกมาโดยไม่มี error handling
   *         → อาจทำให้ UI หยุดทำงาน หรือ uncaught error ใน console
   * FAIL เพราะ: expect ว่าไม่ throw แต่ error จาก open() ถูก propagate
   */
  it('[BUG-5] openDeviceForm: no error handling when $refs.deviceFormModal.open() throws', () => {
    const wrapper = mountComp();
    mockDeviceFormOpen.mockImplementationOnce(() => {
      throw new Error('Modal initialization failed');
    });
    // BUG: error from open() is not caught → propagates to caller
    expect(() => wrapper.vm.openDeviceForm()).not.toThrow();
  });
});
