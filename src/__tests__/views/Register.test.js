import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import Register from '../../views/Register.vue';

// ─── Mocks ────────────────────────────────────────────────────────────────────
const { mockShowAlert } = vi.hoisted(() => {
  const mockShowAlert = vi.fn().mockResolvedValue(undefined);
  return { mockShowAlert };
});

vi.mock('../../utils/swalHelper', () => ({
  showAlert: mockShowAlert,
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

function okJson(data) {
  return { ok: true, json: vi.fn().mockResolvedValue(data) };
}

function errJson(data, status = 400) {
  return { ok: false, status, json: vi.fn().mockResolvedValue(data) };
}

function mountComp(lang = 'en') {
  return mount(Register, {
    global: { provide: { locale: makeLocale(lang) } },
  });
}

function fillValid(vm) {
  vm.form.email = 'test@example.com';
  vm.form.password = 'password123';
  vm.form.confirmPassword = 'password123';
  vm.form.role = 'admin';
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
  mockShowAlert.mockResolvedValue(undefined);
  // Default: rooms fetch returns empty data
  mockFetch.mockResolvedValueOnce(okJson({ data: [] }));
});

// ─── mounted() ────────────────────────────────────────────────────────────────
describe('mounted()', () => {
  it('loads rooms from data.data when API returns { data: [...] }', async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce(okJson({ data: [{ id: 1, name: 'Room A' }] }));
    const wrapper = mountComp();
    await flushPromises();
    expect(wrapper.vm.rooms).toEqual([{ id: 1, name: 'Room A' }]);
  });

  it('loads rooms directly from data when data.data is absent (fallback to data array)', async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce(okJson([{ id: 2, name: 'Room B' }]));
    const wrapper = mountComp();
    await flushPromises();
    expect(wrapper.vm.rooms).toEqual([{ id: 2, name: 'Room B' }]);
  });

  it('sets rooms to [] via fallback [] branch when data.data and data are both falsy (data=0)', async () => {
    // null.data throws → catch, but 0.data = undefined (falsy) and 0 is falsy → hits `|| []`
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce(okJson(0));
    const wrapper = mountComp();
    await flushPromises();
    expect(wrapper.vm.rooms).toEqual([]);
  });

  it('sets rooms to [] when fetch throws (catch branch)', async () => {
    mockFetch.mockReset();
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const wrapper = mountComp();
    await flushPromises();
    expect(wrapper.vm.rooms).toEqual([]);
  });
});

// ─── addRoom() / removeRoom() ─────────────────────────────────────────────────
describe('addRoom()', () => {
  it('pushes { room_id: null, scope: "view" } into form.rooms', async () => {
    const wrapper = mountComp();
    await flushPromises();
    wrapper.vm.addRoom();
    expect(wrapper.vm.form.rooms).toEqual([{ room_id: null, scope: 'view' }]);
  });

  it('supports multiple addRoom() calls', async () => {
    const wrapper = mountComp();
    await flushPromises();
    wrapper.vm.addRoom();
    wrapper.vm.addRoom();
    expect(wrapper.vm.form.rooms).toHaveLength(2);
  });
});

describe('removeRoom()', () => {
  it('removes entry at given index', async () => {
    const wrapper = mountComp();
    await flushPromises();
    wrapper.vm.addRoom();
    wrapper.vm.addRoom();
    wrapper.vm.removeRoom(0);
    expect(wrapper.vm.form.rooms).toHaveLength(1);
  });

  it('removes correct entry when multiple entries exist', async () => {
    const wrapper = mountComp();
    await flushPromises();
    wrapper.vm.form.rooms = [{ room_id: 1, scope: 'view' }, { room_id: 2, scope: 'control' }];
    wrapper.vm.removeRoom(0);
    expect(wrapper.vm.form.rooms[0]).toEqual({ room_id: 2, scope: 'control' });
  });
});

// ─── validate() ───────────────────────────────────────────────────────────────
describe('validate()', () => {
  let wrapper;

  beforeEach(async () => {
    wrapper = mountComp();
    await flushPromises();
  });

  // Email
  it('sets errors.email when email is empty', () => {
    wrapper.vm.form.email = '';
    wrapper.vm.validate();
    expect(wrapper.vm.errors.email).toBe('Please enter your email');
  });

  it('sets errors.email when email has invalid format', () => {
    wrapper.vm.form.email = 'not-an-email';
    wrapper.vm.validate();
    expect(wrapper.vm.errors.email).toBe('Please enter a valid email address');
  });

  it('clears errors.email when email is valid', () => {
    wrapper.vm.form.email = 'user@example.com';
    wrapper.vm.form.password = 'pass123';
    wrapper.vm.form.confirmPassword = 'pass123';
    wrapper.vm.form.role = 'admin';
    wrapper.vm.validate();
    expect(wrapper.vm.errors.email).toBe('');
  });

  // Password
  it('sets errors.password when password is empty', () => {
    wrapper.vm.form.password = '';
    wrapper.vm.validate();
    expect(wrapper.vm.errors.password).toBe('Please enter your password');
  });

  it('sets errors.password when password is shorter than 6 chars', () => {
    wrapper.vm.form.password = 'abc';
    wrapper.vm.validate();
    expect(wrapper.vm.errors.password).toBe('Password must be at least 6 characters');
  });

  it('clears errors.password when password is 6+ characters', () => {
    wrapper.vm.form.email = 'a@b.com';
    wrapper.vm.form.password = 'abcdef';
    wrapper.vm.form.confirmPassword = 'abcdef';
    wrapper.vm.form.role = 'admin';
    wrapper.vm.validate();
    expect(wrapper.vm.errors.password).toBe('');
  });

  // ConfirmPassword — empty
  it('sets errors.confirmPassword with EN string when empty and locale=en', () => {
    wrapper.vm.form.password = 'pass123';
    wrapper.vm.form.confirmPassword = '';
    wrapper.vm.validate();
    expect(wrapper.vm.errors.confirmPassword).toBe('Please confirm your password');
  });

  it('sets errors.confirmPassword with TH string when empty and locale=th', async () => {
    const thWrapper = mount(Register, {
      global: { provide: { locale: makeLocale('th') } },
    });
    await flushPromises();
    thWrapper.vm.form.password = 'pass123';
    thWrapper.vm.form.confirmPassword = '';
    thWrapper.vm.validate();
    expect(thWrapper.vm.errors.confirmPassword).toBe('กรุณายืนยันรหัสผ่าน');
  });

  // ConfirmPassword — mismatch
  it('sets errors.confirmPassword when passwords do not match', () => {
    wrapper.vm.form.password = 'pass123';
    wrapper.vm.form.confirmPassword = 'different';
    wrapper.vm.validate();
    expect(wrapper.vm.errors.confirmPassword).toBe('Passwords do not match');
  });

  it('clears errors.confirmPassword when passwords match', () => {
    wrapper.vm.form.email = 'a@b.com';
    wrapper.vm.form.password = 'pass123';
    wrapper.vm.form.confirmPassword = 'pass123';
    wrapper.vm.form.role = 'admin';
    wrapper.vm.validate();
    expect(wrapper.vm.errors.confirmPassword).toBe('');
  });

  // Role
  it('sets errors.role when role is empty', () => {
    wrapper.vm.form.role = '';
    wrapper.vm.validate();
    expect(wrapper.vm.errors.role).toBe('Please select a role');
  });

  it('clears errors.role when role is set', () => {
    wrapper.vm.form.email = 'a@b.com';
    wrapper.vm.form.password = 'pass123';
    wrapper.vm.form.confirmPassword = 'pass123';
    wrapper.vm.form.role = 'operator';
    wrapper.vm.validate();
    expect(wrapper.vm.errors.role).toBe('');
  });

  // Return value
  it('returns false when any field has an error', () => {
    wrapper.vm.form.email = '';
    expect(wrapper.vm.validate()).toBe(false);
  });

  it('returns true when all fields are valid', () => {
    fillValid(wrapper.vm);
    expect(wrapper.vm.validate()).toBe(true);
  });

  it('resets all errors at the start of each validate() call', () => {
    wrapper.vm.errors.email = 'old error';
    fillValid(wrapper.vm);
    wrapper.vm.validate();
    expect(wrapper.vm.errors.email).toBe('');
  });
});

// ─── onSubmit() ───────────────────────────────────────────────────────────────
describe('onSubmit()', () => {
  let wrapper;

  beforeEach(async () => {
    wrapper = mountComp();
    await flushPromises();
  });

  it('clears errorMessage at the start', async () => {
    wrapper.vm.errorMessage = 'old error';
    wrapper.vm.form.email = ''; // invalid → returns early
    await wrapper.vm.onSubmit();
    expect(wrapper.vm.errorMessage).toBe('');
  });

  it('returns early without fetching when validate() fails', async () => {
    wrapper.vm.form.email = ''; // will fail
    await wrapper.vm.onSubmit();
    // rooms fetch (1 call) happened in mounted(); no POST call should be made
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('sets isLoading=true during fetch and false after', async () => {
    fillValid(wrapper.vm);
    let loadingDuringFetch = false;
    mockFetch.mockImplementationOnce(() => {
      loadingDuringFetch = wrapper.vm.isLoading;
      return Promise.resolve(okJson({ id: 1 }));
    });
    await wrapper.vm.onSubmit();
    await flushPromises();
    expect(loadingDuringFetch).toBe(true);
    expect(wrapper.vm.isLoading).toBe(false);
  });

  it('calls fetch POST to /users with correct payload', async () => {
    fillValid(wrapper.vm);
    wrapper.vm.form.rooms = [{ room_id: 1, scope: 'view' }];
    mockFetch.mockResolvedValueOnce(okJson({ id: 1 }));
    await wrapper.vm.onSubmit();
    await flushPromises();
    const [url, options] = mockFetch.mock.calls[1]; // calls[0] = rooms, calls[1] = POST
    expect(url).toContain('/users');
    expect(options.method).toBe('POST');
    const body = JSON.parse(options.body);
    expect(body.email).toBe('test@example.com');
    expect(body.password).toBe('password123');
    expect(body.role).toBe('admin');
    expect(body.rooms).toEqual([{ room_id: 1, scope: 'view' }]);
  });

  it('calls showAlert with English message when res.ok and locale=en', async () => {
    fillValid(wrapper.vm);
    mockFetch.mockResolvedValueOnce(okJson({ id: 1 }));
    await wrapper.vm.onSubmit();
    await flushPromises();
    expect(mockShowAlert).toHaveBeenCalledWith(
      'Registration Successful!',
      expect.stringContaining('test@example.com'),
      'success'
    );
  });

  it('calls showAlert with Thai message when res.ok and locale=th', async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce(okJson({ data: [] })); // rooms
    const thWrapper = mount(Register, {
      global: { provide: { locale: makeLocale('th') } },
    });
    await flushPromises();
    fillValid(thWrapper.vm);
    mockFetch.mockResolvedValueOnce(okJson({ id: 1 }));
    await thWrapper.vm.onSubmit();
    await flushPromises();
    expect(mockShowAlert).toHaveBeenCalledWith(
      'ลงทะเบียนสำเร็จ!',
      expect.stringContaining('test@example.com'),
      'success'
    );
  });

  it('emits "show-login" after successful registration', async () => {
    fillValid(wrapper.vm);
    mockFetch.mockResolvedValueOnce(okJson({ id: 1 }));
    await wrapper.vm.onSubmit();
    await flushPromises();
    expect(wrapper.emitted('show-login')).toBeTruthy();
  });

  it('sets errorMessage from data.message when res.ok=false', async () => {
    fillValid(wrapper.vm);
    mockFetch.mockResolvedValueOnce(errJson({ message: 'Email already exists' }));
    await wrapper.vm.onSubmit();
    await flushPromises();
    expect(wrapper.vm.errorMessage).toBe('Email already exists');
  });

  it('sets EN fallback errorMessage when res.ok=false and no data.message (locale=en)', async () => {
    fillValid(wrapper.vm);
    mockFetch.mockResolvedValueOnce(errJson({}));
    await wrapper.vm.onSubmit();
    await flushPromises();
    expect(wrapper.vm.errorMessage).toBe('Registration failed');
  });

  it('sets TH fallback errorMessage when res.ok=false and no data.message (locale=th)', async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce(okJson({ data: [] })); // rooms
    const thWrapper = mount(Register, {
      global: { provide: { locale: makeLocale('th') } },
    });
    await flushPromises();
    fillValid(thWrapper.vm);
    mockFetch.mockResolvedValueOnce(errJson({}));
    await thWrapper.vm.onSubmit();
    await flushPromises();
    expect(thWrapper.vm.errorMessage).toBe('ลงทะเบียนไม่สำเร็จ');
  });

  it('sets errorMessage from locale.t when fetch throws (catch branch)', async () => {
    fillValid(wrapper.vm);
    mockFetch.mockRejectedValueOnce(new Error('Connection refused'));
    await wrapper.vm.onSubmit();
    await flushPromises();
    expect(wrapper.vm.errorMessage).toBe('Connection error. Please try again.');
  });

  it('always sets isLoading=false in finally block even on error', async () => {
    fillValid(wrapper.vm);
    mockFetch.mockRejectedValueOnce(new Error('Net error'));
    await wrapper.vm.onSubmit();
    await flushPromises();
    expect(wrapper.vm.isLoading).toBe(false);
  });
});

// ─── template rendering ───────────────────────────────────────────────────────
describe('template rendering', () => {
  it('shows "EN" label in language button when locale=en', async () => {
    const wrapper = mountComp('en');
    await flushPromises();
    expect(wrapper.find('.btn-lang-fixed span').text()).toBe('EN');
  });

  it('shows "TH" label in language button when locale=th', async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce(okJson({ data: [] }));
    const wrapper = mount(Register, {
      global: { provide: { locale: makeLocale('th') } },
    });
    await flushPromises();
    expect(wrapper.find('.btn-lang-fixed span').text()).toBe('TH');
  });

  it('clicking lang button calls locale.toggle()', async () => {
    const locale = makeLocale();
    const wrapper = mount(Register, { global: { provide: { locale } } });
    await flushPromises();
    await wrapper.find('.btn-lang-fixed').trigger('click');
    expect(locale.toggle).toHaveBeenCalled();
  });

  it('shows error banner when errorMessage is set', async () => {
    const wrapper = mountComp();
    await flushPromises();
    wrapper.vm.errorMessage = 'Something went wrong';
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.error-banner').exists()).toBe(true);
    expect(wrapper.find('.error-banner').text()).toContain('Something went wrong');
  });

  it('hides error banner when errorMessage is empty', async () => {
    const wrapper = mountComp();
    await flushPromises();
    expect(wrapper.find('.error-banner').exists()).toBe(false);
  });

  it('password input type is "password" by default', async () => {
    const wrapper = mountComp();
    await flushPromises();
    const inputs = wrapper.findAll('input[type="password"]');
    expect(inputs.length).toBeGreaterThanOrEqual(1);
  });

  it('clicking show-password button toggles showPassword and input type', async () => {
    const wrapper = mountComp();
    await flushPromises();
    const btns = wrapper.findAll('.btn-view');
    expect(wrapper.vm.showPassword).toBe(false);
    await btns[0].trigger('click');
    expect(wrapper.vm.showPassword).toBe(true);
  });

  it('clicking show-confirm-password button toggles showConfirmPassword', async () => {
    const wrapper = mountComp();
    await flushPromises();
    const btns = wrapper.findAll('.btn-view');
    expect(wrapper.vm.showConfirmPassword).toBe(false);
    await btns[1].trigger('click');
    expect(wrapper.vm.showConfirmPassword).toBe(true);
  });

  it('shows helper-text for errors.email', async () => {
    const wrapper = mountComp();
    await flushPromises();
    wrapper.vm.errors.email = 'Bad email';
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.helper-text').text()).toBe('Bad email');
  });

  it('shows helper-text for errors.password', async () => {
    const wrapper = mountComp();
    await flushPromises();
    wrapper.vm.errors.password = 'Too short';
    await wrapper.vm.$nextTick();
    const texts = wrapper.findAll('.helper-text');
    expect(texts.some(t => t.text() === 'Too short')).toBe(true);
  });

  it('shows helper-text for errors.confirmPassword', async () => {
    const wrapper = mountComp();
    await flushPromises();
    wrapper.vm.errors.confirmPassword = 'No match';
    await wrapper.vm.$nextTick();
    const texts = wrapper.findAll('.helper-text');
    expect(texts.some(t => t.text() === 'No match')).toBe(true);
  });

  it('shows helper-text for errors.role', async () => {
    const wrapper = mountComp();
    await flushPromises();
    wrapper.vm.errors.role = 'Select role';
    await wrapper.vm.$nextTick();
    const texts = wrapper.findAll('.helper-text');
    expect(texts.some(t => t.text() === 'Select role')).toBe(true);
  });

  it('shows no-rooms-hint when form.rooms is empty', async () => {
    const wrapper = mountComp();
    await flushPromises();
    expect(wrapper.find('.no-rooms-hint').exists()).toBe(true);
  });

  it('hides no-rooms-hint when form.rooms has entries', async () => {
    const wrapper = mountComp();
    await flushPromises();
    wrapper.vm.addRoom();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.no-rooms-hint').exists()).toBe(false);
  });

  it('shows EN "No room permissions set" text when locale=en', async () => {
    const wrapper = mountComp('en');
    await flushPromises();
    expect(wrapper.find('.no-rooms-hint').text()).toBe('No room permissions set');
  });

  it('shows TH "ไม่มีการกำหนดสิทธิ์ห้อง" text when locale=th', async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce(okJson({ data: [] }));
    const wrapper = mount(Register, {
      global: { provide: { locale: makeLocale('th') } },
    });
    await flushPromises();
    expect(wrapper.find('.no-rooms-hint').text()).toBe('ไม่มีการกำหนดสิทธิ์ห้อง');
  });

  it('renders room rows from form.rooms via v-for', async () => {
    const wrapper = mountComp();
    await flushPromises();
    wrapper.vm.addRoom();
    wrapper.vm.addRoom();
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('.room-row')).toHaveLength(2);
  });

  it('remove-room button removes the corresponding room row', async () => {
    const wrapper = mountComp();
    await flushPromises();
    wrapper.vm.addRoom();
    await wrapper.vm.$nextTick();
    await wrapper.find('.btn-remove-room').trigger('click');
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('.room-row')).toHaveLength(0);
  });

  it('shows room options from rooms data in room selector', async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce(okJson({ data: [{ id: 1, name: 'Room A' }] }));
    const wrapper = mountComp();
    await flushPromises();
    wrapper.vm.addRoom();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('Room A');
  });

  it('shows TH scope labels "ดูเท่านั้น" / "ควบคุม" when locale=th', async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce(okJson({ data: [] }));
    const wrapper = mount(Register, {
      global: { provide: { locale: makeLocale('th') } },
    });
    await flushPromises();
    wrapper.vm.addRoom();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('ดูเท่านั้น');
    expect(wrapper.text()).toContain('ควบคุม');
  });

  it('shows EN scope labels "View" / "Control" when locale=en', async () => {
    const wrapper = mountComp('en');
    await flushPromises();
    wrapper.vm.addRoom();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('View');
    expect(wrapper.text()).toContain('Control');
  });

  it('shows TH room selector "ทุกห้อง" option when locale=th', async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce(okJson({ data: [] }));
    const wrapper = mount(Register, {
      global: { provide: { locale: makeLocale('th') } },
    });
    await flushPromises();
    wrapper.vm.addRoom();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('ทุกห้อง');
  });

  it('shows EN room selector "All Rooms" option when locale=en', async () => {
    const wrapper = mountComp('en');
    await flushPromises();
    wrapper.vm.addRoom();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('All Rooms');
  });

  it('shows loader span when isLoading=true', async () => {
    const wrapper = mountComp();
    await flushPromises();
    wrapper.vm.isLoading = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.loader').exists()).toBe(true);
  });

  it('hides loader span when isLoading=false', async () => {
    const wrapper = mountComp();
    await flushPromises();
    expect(wrapper.find('.loader').exists()).toBe(false);
  });

  it('shows "Registering..." when isLoading=true', async () => {
    const wrapper = mountComp();
    await flushPromises();
    wrapper.vm.isLoading = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.btn-submit').text()).toContain('Registering...');
  });

  it('shows "Register" when isLoading=false', async () => {
    const wrapper = mountComp();
    await flushPromises();
    expect(wrapper.find('.btn-submit').text()).toContain('Register');
  });

  it('shows TH "มีบัญชีแล้ว?" footer text when locale=th', async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce(okJson({ data: [] }));
    const wrapper = mount(Register, {
      global: { provide: { locale: makeLocale('th') } },
    });
    await flushPromises();
    expect(wrapper.text()).toContain('มีบัญชีแล้ว?');
  });

  it('shows EN "Already have an account?" footer text when locale=en', async () => {
    const wrapper = mountComp('en');
    await flushPromises();
    expect(wrapper.text()).toContain('Already have an account?');
  });

  it('emits "show-login" when Sign In button is clicked', async () => {
    const wrapper = mountComp();
    await flushPromises();
    await wrapper.find('.btn-link').trigger('click');
    expect(wrapper.emitted('show-login')).toBeTruthy();
  });

  it('adds error class to email input-control when errors.email is set', async () => {
    const wrapper = mountComp();
    await flushPromises();
    wrapper.vm.errors.email = 'Invalid';
    await wrapper.vm.$nextTick();
    const controls = wrapper.findAll('.input-control');
    expect(controls[0].classes()).toContain('error');
  });

  it('adds error class to role input-control when errors.role is set', async () => {
    const wrapper = mountComp();
    await flushPromises();
    wrapper.vm.errors.role = 'Required';
    await wrapper.vm.$nextTick();
    // Role is the 4th input-control
    const controls = wrapper.findAll('.input-control');
    expect(controls[3].classes()).toContain('error');
  });

  it('shows TH role placeholder "-- เลือกบทบาท --" when locale=th', async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce(okJson({ data: [] }));
    const wrapper = mount(Register, {
      global: { provide: { locale: makeLocale('th') } },
    });
    await flushPromises();
    expect(wrapper.text()).toContain('-- เลือกบทบาท --');
  });

  it('shows EN role placeholder "-- Select Role --" when locale=en', async () => {
    const wrapper = mountComp('en');
    await flushPromises();
    expect(wrapper.text()).toContain('-- Select Role --');
  });

  it('form submit triggers onSubmit (calls fetch when form valid)', async () => {
    const wrapper = mountComp();
    await flushPromises();
    fillValid(wrapper.vm);
    mockFetch.mockResolvedValueOnce(okJson({ id: 1 }));
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/users'),
      expect.any(Object)
    );
  });

  it('Add Room button click calls addRoom()', async () => {
    const wrapper = mountComp();
    await flushPromises();
    await wrapper.find('.btn-add-room').trigger('click');
    expect(wrapper.vm.form.rooms).toHaveLength(1);
  });

  // v-model binding coverage (lines 31, 45, 63, 80, 108, 112)
  it('v-model: email input setValue updates form.email', async () => {
    const wrapper = mountComp();
    await flushPromises();
    await wrapper.find('input[type="email"]').setValue('typed@example.com');
    expect(wrapper.vm.form.email).toBe('typed@example.com');
  });

  it('v-model: password input setValue updates form.password', async () => {
    const wrapper = mountComp();
    await flushPromises();
    const inputs = wrapper.findAll('.password-input');
    await inputs[0].setValue('mypassword');
    expect(wrapper.vm.form.password).toBe('mypassword');
  });

  it('v-model: confirmPassword input setValue updates form.confirmPassword', async () => {
    const wrapper = mountComp();
    await flushPromises();
    const inputs = wrapper.findAll('.password-input');
    await inputs[1].setValue('mypassword');
    expect(wrapper.vm.form.confirmPassword).toBe('mypassword');
  });

  it('v-model: role select setValue updates form.role', async () => {
    const wrapper = mountComp();
    await flushPromises();
    await wrapper.find('.select-input').setValue('operator');
    expect(wrapper.vm.form.role).toBe('operator');
  });

  it('v-model: room_id select setValue updates entry.room_id', async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce(okJson({ data: [{ id: 5, name: 'Room X' }] }));
    const wrapper = mountComp();
    await flushPromises();
    wrapper.vm.addRoom();
    await wrapper.vm.$nextTick();
    const roomSelects = wrapper.findAll('.room-row .select-input');
    await roomSelects[0].setValue('5');
    expect(String(wrapper.vm.form.rooms[0].room_id)).toBe('5');
  });

  it('v-model: scope select setValue updates entry.scope', async () => {
    const wrapper = mountComp();
    await flushPromises();
    wrapper.vm.addRoom();
    await wrapper.vm.$nextTick();
    const roomSelects = wrapper.findAll('.room-row .select-input');
    await roomSelects[1].setValue('control');
    expect(wrapper.vm.form.rooms[0].scope).toBe('control');
  });
});

// ─── BUG CASES (all must FAIL intentionally) ──────────────────────────────────
describe('BUG CASES', () => {
  /**
   * BUG-1: mounted() — `data.data || data || []` returns object when data.data=null
   * อันตราย: ถ้า API คืน { data: null, message: 'no rooms' }
   *          → data.data = null (falsy) → || → this.rooms = { data: null, message: '...' }
   *          → rooms เป็น object ไม่ใช่ array!
   *          → v-for="room in rooms" → iterate object keys → template พัง / ไม่มี options
   *          → user ไม่สามารถเลือก room ได้ หรือ Vue throw runtime error
   * FAIL เพราะ: rooms เป็น object แต่ test คาดว่าเป็น array
   */
  it('[BUG-1] mounted: rooms is non-array when API returns { data: null }', async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce(okJson({ data: null, message: 'no rooms found' }));
    const wrapper = mountComp();
    await flushPromises();
    // BUG: data.data = null → data = { data: null, message: '...' } → truthy object!
    // rooms = { data: null, message: '...' } — not an array
    expect(Array.isArray(wrapper.vm.rooms)).toBe(true);
  });

  /**
   * BUG-2: Double submit — no isLoading check at start of onSubmit()
   * อันตราย: user กด submit เร็วๆ 2 ครั้ง หรือ network ช้า → onSubmit() ถูกเรียก 2 ครั้ง
   *          → ทั้ง 2 call เห็น isLoading=false ก่อนที่ call แรกจะ set isLoading=true
   *          → API POST ถูกเรียก 2 ครั้ง → duplicate account / race condition
   *          → ระบบ production: สร้าง user ซ้ำ หรือ 2 response มา interleave กัน
   * FAIL เพราะ: คาดว่า POST เรียกแค่ 1 ครั้ง แต่เรียก 2 ครั้ง
   */
  it('[BUG-2] double-submit makes 2 POST requests (no isLoading guard)', async () => {
    const wrapper = mountComp();
    await flushPromises();
    fillValid(wrapper.vm);
    mockFetch.mockResolvedValue(okJson({ id: 1 }));
    // Call twice without awaiting — simulates rapid double-click
    wrapper.vm.onSubmit();
    wrapper.vm.onSubmit();
    await flushPromises();
    const postCalls = mockFetch.mock.calls.filter(c => String(c[0]).includes('/users'));
    // BUG: both calls proceed because isLoading is not checked at function start
    expect(postCalls).toHaveLength(1);
  });

  /**
   * BUG-3: validate() — confirmPassword empty message is hardcoded, bypasses locale.t()
   * อันตราย: ระบบ i18n อาศัย locale.t() สำหรับทุก message แต่บรรทัดนี้ใช้ string ตรงๆ
   *          → ถ้ามีการเพิ่มภาษาใหม่หรือเปลี่ยน translation key
   *          → message นี้จะไม่ถูก translate — ขัดแย้งกับ pattern ที่ใช้ในทั้ง component
   *          → user เห็นข้อความไม่ตรงกับภาษาที่เลือก
   * FAIL เพราะ: locale.t() return '[T] ...' แต่ errorMessage เป็น hardcoded string ธรรมดา
   */
  it('[BUG-3] validate: confirmPassword empty message bypasses locale.t()', async () => {
    const customLocale = { current: 'en', t: (k) => '[T] ' + k, toggle: vi.fn() };
    const wrapper = mount(Register, {
      global: { provide: { locale: customLocale } },
    });
    await flushPromises();
    wrapper.vm.form.email = 'a@b.com';
    wrapper.vm.form.password = 'pass123';
    wrapper.vm.form.confirmPassword = ''; // empty → triggers the hardcoded message
    wrapper.vm.validate();
    // BUG: actual = 'Please confirm your password' (hardcoded)
    // expected = '[T] Please confirm your password' (via locale.t)
    expect(wrapper.vm.errors.confirmPassword).toBe('[T] Please confirm your password');
  });

  /**
   * BUG-4: validate() — email with leading/trailing whitespace fails regex
   * อันตราย: user paste email จากที่อื่นที่มี space ติดมา เช่น " user@example.com "
   *          → regex /^[^\s@]+@[^\s@]+\.[^\s@]+$/ → fail เพราะ [^\s@] ไม่ match space
   *          → แสดง "Please enter a valid email address" ทั้งที่ email ถูกต้อง
   *          → user สับสน ไม่สามารถ register ได้ ต้องหา space มาลบเอง
   * FAIL เพราะ: expect ว่า email valid (no error) แต่ validate() บอกว่า invalid format
   */
  it('[BUG-4] validate: email with leading/trailing spaces fails valid-format check', async () => {
    const wrapper = mountComp();
    await flushPromises();
    wrapper.vm.form.email = '  test@example.com  '; // spaces around valid email
    wrapper.vm.form.password = 'pass123';
    wrapper.vm.form.confirmPassword = 'pass123';
    wrapper.vm.form.role = 'admin';
    wrapper.vm.validate();
    // BUG: regex fails for ' test@example.com ' → errors.email is set
    expect(wrapper.vm.errors.email).toBe('');
  });

  /**
   * BUG-5: showAlert error is caught by onSubmit's try/catch → connection error shown despite success
   * อันตราย: การ register สำเร็จแล้ว (res.ok=true) แต่ถ้า showAlert ล้มเหลว (dialog closed, etc.)
   *          → catch block รัน → this.errorMessage = locale.t('Connection error...')
   *          → user เห็นข้อความ "Connection error" ทั้งๆ ที่ account ถูกสร้างไปแล้ว
   *          → user กด submit ซ้ำ → สร้าง duplicate account หรือ "email already exists" error
   *          → 'show-login' ไม่ถูก emit → user ไม่ถูก redirect ไป login หน้า
   * FAIL เพราะ: errorMessage ไม่ควรมีค่า แต่มีค่า "Connection error..." อยู่
   */
  it('[BUG-5] onSubmit: showAlert throw sets connection-error despite successful registration', async () => {
    const wrapper = mountComp();
    await flushPromises();
    fillValid(wrapper.vm);
    mockFetch.mockResolvedValueOnce(okJson({ id: 1 }));         // register succeeds
    mockShowAlert.mockRejectedValueOnce(new Error('Dialog error')); // showAlert throws
    await wrapper.vm.onSubmit();
    await flushPromises();
    // BUG: catch catches showAlert error → errorMessage = 'Connection error...'
    // registration was successful but user sees error and 'show-login' is NOT emitted
    expect(wrapper.vm.errorMessage).toBe('');
    expect(wrapper.emitted('show-login')).toBeTruthy();
  });
});
