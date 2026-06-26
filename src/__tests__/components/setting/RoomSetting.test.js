import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import RoomSetting from "../../../components/setting/RoomSetting.vue";

// ─── Mock swalHelper ────────────────────────────────────────
vi.mock("../../../utils/swalHelper", () => ({
  showAlert: vi.fn(),
  showConfirm: vi.fn(() => Promise.resolve(true)),
}));
import { showAlert, showConfirm } from "../../../utils/swalHelper";

// ─── Mock fetch & localStorage ──────────────────────────────
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);
vi.stubGlobal("localStorage", {
  getItem: () => "fake-token",
  setItem: () => {},
});

// ─── Locale mocks ───────────────────────────────────────────
const mockLocale = {
  current: "en",
  t: (key) => key,
  toggle: vi.fn(),
};

const mockLocale_th = { current: "th", t: (key) => key };

// ─── Fixtures ───────────────────────────────────────────────
const mockRooms = [
  { id: 1, name: "Room A" },
  { id: 2, name: "Room B" },
];

// ─── Helpers ────────────────────────────────────────────────
function mountComp(locale = mockLocale) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ data: mockRooms }),
  });
  return mount(RoomSetting, {
    global: { provide: { locale } },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════
// 1. RENDER
// ═══════════════════════════════════════════════════════════
describe("RoomSetting > Render", () => {
  it("render สำเร็จ", () => {
    const wrapper = mountComp();
    expect(wrapper.find(".card").exists()).toBe(true);
    expect(wrapper.text()).toContain("Room Setting");
  });

  it("แสดงปุ่ม Add Room", () => {
    const wrapper = mountComp();
    expect(wrapper.text()).toContain("Add Room");
  });

  it("modal ซ่อนตอน render", () => {
    const wrapper = mountComp();
    expect(wrapper.vm.showModal).toBe(false);
  });

  it("rooms.length === 0 → แสดง 'No rooms found.'", async () => {
    const wrapper = mountComp();
    wrapper.vm.rooms = [];
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("No rooms found.");
  });

  it("modal title = 'Edit Room' ใน Edit mode", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal(mockRooms[0]);
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".modal-title").text()).toContain("Edit Room");
  });

  it("modal title = 'Add Room' ใน Add mode", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".modal-title").text()).toContain("Add Room");
  });

  it("ปุ่ม 'Update' แสดงใน Edit mode", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal(mockRooms[0]);
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".modal-footer .btn-primary").text()).toContain("Update");
  });

  it("ปุ่ม 'Create' แสดงใน Add mode", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".modal-footer .btn-primary").text()).toContain("Create");
  });

  it("spinner แสดงใน modal เมื่อ loading = true", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    wrapper.vm.loading = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".spinner-border").exists()).toBe(true);
  });

  it("modal-backdrop แสดงเมื่อ showModal = true", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".modal-backdrop").exists()).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════
// 2. LOAD DATA
// ═══════════════════════════════════════════════════════════
describe("RoomSetting > Load", () => {
  it("mounted → เรียก fetch /api/rooms", async () => {
    mountComp();
    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/rooms");
  });

  it("โหลดสำเร็จ → แสดง rooms ในตาราง", async () => {
    const wrapper = mountComp();
    await vi.waitFor(() => {
      expect(wrapper.vm.rooms).toHaveLength(2);
    });
    expect(wrapper.text()).toContain("Room A");
    expect(wrapper.text()).toContain("Room B");
  });

  it("โหลดสำเร็จ response ไม่มี .data → rooms = [] (|| [] branch)", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    const wrapper = mount(RoomSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalled());
    await Promise.resolve();
    await Promise.resolve();
    expect(wrapper.vm.rooms).toHaveLength(0);
  });

  it("โหลดล้มเหลว EN → showAlert error EN", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockResolvedValue({ ok: false });
    mount(RoomSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("Error", "Cannot load rooms", "error");
    });
    consoleSpy.mockRestore();
  });

  it("โหลดล้มเหลว TH → showAlert TH strings (2 locale branches)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockResolvedValue({ ok: false });
    mount(RoomSetting, { global: { provide: { locale: mockLocale_th } } });
    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("ข้อผิดพลาด", "โหลดข้อมูลห้องไม่สำเร็จ", "error");
    });
    consoleSpy.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════
// 3. MODAL (Open / Close)
// ═══════════════════════════════════════════════════════════
describe("RoomSetting > Modal", () => {
  it("openModal() → เปิด modal Add (form ว่าง)", () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    expect(wrapper.vm.showModal).toBe(true);
    expect(wrapper.vm.isEdit).toBe(false);
    expect(wrapper.vm.form.name).toBe("");
  });

  it("openModal(room) → เปิด modal Edit (form มีข้อมูล)", () => {
    const wrapper = mountComp();
    wrapper.vm.openModal(mockRooms[0]);
    expect(wrapper.vm.showModal).toBe(true);
    expect(wrapper.vm.isEdit).toBe(true);
    expect(wrapper.vm.form.name).toBe("Room A");
    expect(wrapper.vm.editingId).toBe(1);
  });

  it("openModal(room) name = null → form.name = '' (|| branch)", () => {
    const wrapper = mountComp();
    wrapper.vm.openModal({ id: 9, name: null });
    expect(wrapper.vm.form.name).toBe("");
  });

  it("openModal() → loading reset เป็น false", () => {
    const wrapper = mountComp();
    wrapper.vm.loading = true;
    wrapper.vm.openModal(mockRooms[0]);
    expect(wrapper.vm.loading).toBe(false);
  });

  it("closeModal → ปิด modal", () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    wrapper.vm.closeModal();
    expect(wrapper.vm.showModal).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
// 4. DOM INTERACTIONS (template compiled functions)
// ═══════════════════════════════════════════════════════════
describe("RoomSetting > DOM Interactions", () => {
  it("DOM: คลิก Add Room btn → template handler เรียก openModal()", async () => {
    const wrapper = mountComp();
    const spy = vi.spyOn(wrapper.vm, "openModal");
    await wrapper.find(".btn-primary").trigger("click");
    expect(spy).toHaveBeenCalled();
    expect(wrapper.vm.showModal).toBe(true);
  });

  it("DOM: คลิก edit btn ในแถว → template handler เรียก openModal(room)", async () => {
    const wrapper = mountComp();
    wrapper.vm.rooms = mockRooms;
    await wrapper.vm.$nextTick();
    const spy = vi.spyOn(wrapper.vm, "openModal");
    await wrapper.find(".btn-outline-primary").trigger("click");
    expect(spy).toHaveBeenCalledWith(mockRooms[0]);
  });

  it("DOM: คลิก delete btn ในแถว → template handler เรียก confirmDelete(room)", async () => {
    showConfirm.mockResolvedValue(false);
    const wrapper = mountComp();
    wrapper.vm.rooms = mockRooms;
    await wrapper.vm.$nextTick();
    const spy = vi.spyOn(wrapper.vm, "confirmDelete");
    await wrapper.find(".btn-outline-danger").trigger("click");
    expect(spy).toHaveBeenCalledWith(mockRooms[0]);
  });

  it("DOM: คลิก btn-close → template handler เรียก closeModal()", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    await wrapper.vm.$nextTick();
    await wrapper.find(".btn-close").trigger("click");
    expect(wrapper.vm.showModal).toBe(false);
  });

  it("DOM: คลิก Cancel btn → template handler เรียก closeModal()", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    await wrapper.vm.$nextTick();
    await wrapper.find(".btn-secondary").trigger("click");
    expect(wrapper.vm.showModal).toBe(false);
  });

  it("DOM: คลิก Save btn → template handler เรียก save()", async () => {
    mockFetch.mockImplementation((url, opts) => {
      if (opts?.method === "POST") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });
    const wrapper = mount(RoomSetting, { global: { provide: { locale: mockLocale } } });
    wrapper.vm.openModal();
    wrapper.vm.form.name = "DOM Test";
    await wrapper.vm.$nextTick();
    const spy = vi.spyOn(wrapper.vm, "save");
    await wrapper.find(".modal-footer .btn-primary").trigger("click");
    expect(spy).toHaveBeenCalled();
  });

  it("DOM: input name → v-model setter ทำงาน", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    await wrapper.vm.$nextTick();
    await wrapper.find("input.form-control").setValue("Typed Room");
    expect(wrapper.vm.form.name).toBe("Typed Room");
  });
});

// ═══════════════════════════════════════════════════════════
// 5. SAVE
// ═══════════════════════════════════════════════════════════
describe("RoomSetting > Save", () => {
  it("ชื่อว่าง → warning ไม่ส่ง API", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    wrapper.vm.form.name = "";
    await wrapper.vm.save();
    expect(showAlert).toHaveBeenCalledWith("Error", "Room name is required", "warning");
    expect(mockFetch.mock.calls.filter(([, o]) => o?.method === "POST")).toHaveLength(0);
  });

  it("ชื่อว่าง TH → warning TH strings (2 locale branches)", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ data: [] }) });
    const wrapper = mount(RoomSetting, { global: { provide: { locale: mockLocale_th } } });
    wrapper.vm.openModal();
    wrapper.vm.form.name = "";
    await wrapper.vm.save();
    expect(showAlert).toHaveBeenCalledWith("ข้อผิดพลาด", "กรุณากรอกชื่อห้อง", "warning");
  });

  it("space-only name → warning (trim branch)", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    wrapper.vm.form.name = "   ";
    await wrapper.vm.save();
    expect(showAlert).toHaveBeenCalledWith("Error", "Room name is required", "warning");
  });

  it("save สำเร็จ (Add) EN → fetch POST + showAlert success EN", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: 3 } }),
    });
    const wrapper = mountComp();
    wrapper.vm.openModal();
    wrapper.vm.form.name = "Room C";
    await wrapper.vm.save();
    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("Success", "Room saved successfully", "success");
    });
    const postCall = mockFetch.mock.calls.find(([, opts]) => opts?.method === "POST");
    expect(postCall).toBeTruthy();
  });

  it("save สำเร็จ (Add) TH → showAlert TH strings (2 locale branches)", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    const wrapper = mount(RoomSetting, { global: { provide: { locale: mockLocale_th } } });
    wrapper.vm.openModal();
    wrapper.vm.form.name = "ห้องทดสอบ";
    await wrapper.vm.save();
    expect(showAlert).toHaveBeenCalledWith("สำเร็จ", "บันทึกข้อมูลห้องสำเร็จ", "success");
  });

  it("save สำเร็จ (Edit) → fetch PUT", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: 1 } }),
    });
    const wrapper = mountComp();
    wrapper.vm.openModal(mockRooms[0]);
    wrapper.vm.form.name = "Room A Updated";
    await wrapper.vm.save();
    const putCall = mockFetch.mock.calls.find(
      ([url, opts]) => opts?.method === "PUT" && url.includes("/api/rooms/1")
    );
    expect(putCall).toBeTruthy();
  });

  it("save ล้มเหลว → showAlert error พร้อม err.message", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapper = mountComp();
    wrapper.vm.openModal();
    wrapper.vm.form.name = "Dup";
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: "Duplicate" }),
    });
    await wrapper.vm.save();
    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("Error", "Duplicate", "error");
    });
    consoleSpy.mockRestore();
  });

  it("save ล้มเหลว ไม่มี message → fallback 'Save failed' (|| branch)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockImplementation((url, opts) => {
      if (opts?.method === "POST") {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });
    const wrapper = mount(RoomSetting, { global: { provide: { locale: mockLocale } } });
    wrapper.vm.openModal();
    wrapper.vm.form.name = "Test";
    await wrapper.vm.save();
    expect(showAlert).toHaveBeenCalledWith("Error", "Save failed", "error");
    consoleSpy.mockRestore();
  });

  it("save สำเร็จ → closeModal (showModal = false)", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    const wrapper = mount(RoomSetting, { global: { provide: { locale: mockLocale } } });
    wrapper.vm.openModal();
    wrapper.vm.form.name = "Test";
    await wrapper.vm.save();
    expect(wrapper.vm.showModal).toBe(false);
  });

  it("save สำเร็จ → emit 'room-updated'", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: 3 } }),
    });
    const wrapper = mountComp();
    wrapper.vm.openModal();
    wrapper.vm.form.name = "New";
    await wrapper.vm.save();
    expect(wrapper.emitted("room-updated")).toBeTruthy();
  });

  it("save สำเร็จ → loading กลับ false (finally)", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: 3 } }),
    });
    const wrapper = mountComp();
    wrapper.vm.openModal();
    wrapper.vm.form.name = "Test";
    await wrapper.vm.save();
    expect(wrapper.vm.loading).toBe(false);
  });

  it("save ล้มเหลว → loading กลับ false (finally)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockImplementation((url, opts) => {
      if (opts?.method === "POST") {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({ message: "Err" }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });
    const wrapper = mount(RoomSetting, { global: { provide: { locale: mockLocale } } });
    wrapper.vm.openModal();
    wrapper.vm.form.name = "Test";
    await wrapper.vm.save();
    expect(wrapper.vm.loading).toBe(false);
    consoleSpy.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════
// 6. DELETE
// ═══════════════════════════════════════════════════════════
describe("RoomSetting > Delete", () => {
  function setupDeleteMock(deleteOk = true, locale = mockLocale) {
    mockFetch.mockImplementation((url, opts) => {
      if (opts?.method === "DELETE") {
        return Promise.resolve({
          ok: deleteOk,
          json: () =>
            Promise.resolve(deleteOk ? {} : { message: "Room is in use" }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockRooms }) });
    });
    return mount(RoomSetting, { global: { provide: { locale } } });
  }

  it("confirmDelete EN → showConfirm EN strings", async () => {
    showConfirm.mockResolvedValue(false);
    const wrapper = mountComp();
    await wrapper.vm.confirmDelete(mockRooms[0]);
    expect(showConfirm).toHaveBeenCalledWith(
      "Confirm Delete",
      `Delete room "${mockRooms[0].name}"?`,
      "Delete",
      "Cancel"
    );
  });

  it("confirmDelete TH → showConfirm TH strings (4 locale branches)", async () => {
    showConfirm.mockResolvedValue(false);
    const wrapper = mountComp(mockLocale_th);
    await wrapper.vm.confirmDelete(mockRooms[0]);
    expect(showConfirm).toHaveBeenCalledWith(
      "ยืนยันการลบ",
      `คุณต้องการลบห้อง "${mockRooms[0].name}" หรือไม่?`,
      "ลบ",
      "ยกเลิก"
    );
  });

  it("confirmDelete ยืนยัน EN → fetch DELETE + showAlert success EN", async () => {
    showConfirm.mockResolvedValue(true);
    const wrapper = setupDeleteMock(true, mockLocale);
    await wrapper.vm.confirmDelete(mockRooms[0]);
    const delCall = mockFetch.mock.calls.find(([, opts]) => opts?.method === "DELETE");
    expect(delCall[0]).toContain(`/api/rooms/${mockRooms[0].id}`);
    expect(showAlert).toHaveBeenCalledWith("Success", "Room deleted successfully", "success");
  });

  it("confirmDelete ยืนยัน TH → showAlert success TH (2 locale branches)", async () => {
    showConfirm.mockResolvedValue(true);
    const wrapper = setupDeleteMock(true, mockLocale_th);
    await wrapper.vm.confirmDelete(mockRooms[0]);
    expect(showAlert).toHaveBeenCalledWith("สำเร็จ", "ลบห้องสำเร็จ", "success");
  });

  it("confirmDelete ยกเลิก → ไม่เรียก DELETE", async () => {
    showConfirm.mockResolvedValue(false);
    const wrapper = mountComp();
    await wrapper.vm.confirmDelete(mockRooms[0]);
    const delCalls = mockFetch.mock.calls.filter(([, opts]) => opts?.method === "DELETE");
    expect(delCalls).toHaveLength(0);
  });

  it("confirmDelete สำเร็จ → emit 'room-updated'", async () => {
    showConfirm.mockResolvedValue(true);
    const wrapper = setupDeleteMock(true);
    await wrapper.vm.confirmDelete(mockRooms[0]);
    expect(wrapper.emitted("room-updated")).toBeTruthy();
  });

  it("confirmDelete สำเร็จ → loadRooms ถูกเรียกซ้ำ", async () => {
    showConfirm.mockResolvedValue(true);
    const wrapper = setupDeleteMock(true);
    const spy = vi.spyOn(wrapper.vm, "loadRooms");
    await wrapper.vm.confirmDelete(mockRooms[0]);
    expect(spy).toHaveBeenCalled();
  });

  it("confirmDelete DELETE !res.ok → res.json() + throw + catch → showAlert error (lines 181-182,189-190)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    showConfirm.mockResolvedValue(true);
    const wrapper = setupDeleteMock(false, mockLocale);
    await wrapper.vm.confirmDelete(mockRooms[0]);
    expect(showAlert).toHaveBeenCalledWith("Error", "Room is in use", "error");
    consoleSpy.mockRestore();
  });

  it("confirmDelete DELETE !res.ok ไม่มี message → fallback 'Delete failed' (|| branch)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    showConfirm.mockResolvedValue(true);
    mockFetch.mockImplementation((url, opts) => {
      if (opts?.method === "DELETE") {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({}) }); // no message
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });
    const wrapper = mount(RoomSetting, { global: { provide: { locale: mockLocale } } });
    await wrapper.vm.confirmDelete(mockRooms[0]);
    expect(showAlert).toHaveBeenCalledWith("Error", "Delete failed", "error");
    consoleSpy.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════
// 7. BUG CASES (PASS)
// ═══════════════════════════════════════════════════════════
describe("RoomSetting > Bug Cases (PASS)", () => {
  it("[BUG-1] openModal() ขณะ loading ค้าง → reset loading = false", () => {
    const wrapper = mountComp();
    wrapper.vm.loading = true;
    wrapper.vm.openModal(mockRooms[0]);
    expect(wrapper.vm.loading).toBe(false);
  });

  it("[BUG-2] ชื่อ room เป็น space ล้วน → แสดง warning (trim check)", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    wrapper.vm.form.name = "   ";
    await wrapper.vm.save();
    expect(showAlert).toHaveBeenCalledWith("Error", "Room name is required", "warning");
  });
});

// ═══════════════════════════════════════════════════════════
// 8. BUG CASES (FAIL — อันตราย ยังไม่แก้ component)
// ═══════════════════════════════════════════════════════════
describe("RoomSetting > Bug Cases (FAIL)", () => {

  // BUG-3: save() catch ใช้ showAlert("Error", ...) แบบ hardcoded ไม่ผ่าน locale
  // อันตราย: loadRooms() catch ใช้ locale ternary ถูกต้อง เช่น
  //            locale.current === 'th' ? 'ข้อผิดพลาด' : 'Error'
  //          แต่ save() catch: await showAlert("Error", err.message, "error") ← hardcoded!
  //          → ใน TH mode title ยังเป็น "Error" ไม่ใช่ "ข้อผิดพลาด"
  //          → inconsistent UX: ผู้ใช้ TH เห็น modal ภาษาไทยทั้งหมด
  //            แต่ error dialog จาก save fail เป็นภาษาอังกฤษ
  //          → ถ้า analytics/monitoring track error title จะมีทั้ง "Error" และ "ข้อผิดพลาด"
  //            → filter ข้อมูลยาก ทำ alerting พัง
  // FAIL เพราะ: ใน TH mode showAlert ถูกเรียกด้วย "Error" ไม่ใช่ "ข้อผิดพลาด"
  it("[BUG-3] save() catch TH → title ควรเป็น 'ข้อผิดพลาด' ไม่ใช่ 'Error' (FAIL)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockImplementation((url, opts) => {
      if (opts?.method === "POST") {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ message: "ชื่อซ้ำในระบบ" }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });
    const wrapper = mount(RoomSetting, { global: { provide: { locale: mockLocale_th } } });
    wrapper.vm.openModal();
    wrapper.vm.form.name = "ซ้ำ";
    await wrapper.vm.save();

    // คาดหวัง: TH mode → title = 'ข้อผิดพลาด' (locale-aware เหมือน loadRooms)
    expect(showAlert).toHaveBeenCalledWith("ข้อผิดพลาด", expect.any(String), "error");
    // FAIL: ได้ showAlert("Error", ...) เพราะ title hardcoded ไม่ดูค่า locale
    consoleSpy.mockRestore();
  });

  // BUG-4: confirmDelete() catch ใช้ showAlert("Error", ...) hardcoded เช่นเดียวกับ save()
  // อันตราย: confirmDelete() catch: await showAlert("Error", err.message, "error") ← hardcoded!
  //          → ใน TH mode title เป็น "Error" แทน "ข้อผิดพลาด"
  //          → ผู้ใช้ TH ที่ delete ห้องแล้วเจอ error เห็น "Error" ไม่ใช่ "ข้อผิดพลาด"
  //          → inconsistent กับ loadRooms error, confirmDelete success ที่ใช้ TH strings
  //          → อาจทำให้ผู้ใช้คิดว่า error เป็น "ส่วนที่ไม่รองรับภาษาไทย" และไม่รายงาน bug
  // FAIL เพราะ: ใน TH mode showAlert ถูกเรียกด้วย "Error" ไม่ใช่ "ข้อผิดพลาด"
  it("[BUG-4] confirmDelete() catch TH → title ควรเป็น 'ข้อผิดพลาด' ไม่ใช่ 'Error' (FAIL)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    showConfirm.mockResolvedValue(true);
    mockFetch.mockImplementation((url, opts) => {
      if (opts?.method === "DELETE") {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ message: "ห้องนี้มีการใช้งานอยู่" }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });
    const wrapper = mount(RoomSetting, { global: { provide: { locale: mockLocale_th } } });
    await wrapper.vm.confirmDelete(mockRooms[0]);

    // คาดหวัง: TH mode → title = 'ข้อผิดพลาด'
    expect(showAlert).toHaveBeenCalledWith("ข้อผิดพลาด", expect.any(String), "error");
    // FAIL: ได้ showAlert("Error", ...) เพราะ title hardcoded
    consoleSpy.mockRestore();
  });

  // BUG-5: save() ส่ง form.name ดิบโดยไม่ trim → ชื่อห้องที่มี spaces ถูกบันทึกใน DB
  // อันตราย: validate ด้วย `!this.form.name.trim()` (ถูกต้อง: จับ space-only)
  //          แต่ส่ง `JSON.stringify(this.form)` → body มี name: "  ห้อง A  " (ดิบ)
  //          → DB บันทึก "  ห้อง A  " มี leading/trailing spaces
  //          → UI แสดงชื่อ misaligned
  //          → ค้นหาด้วย "ห้อง A" ไม่พบ (ถ้า DB ไม่ trim)
  //          → สร้างซ้ำได้ เพราะ "  ห้อง A  " ≠ "ห้อง A" ใน string comparison
  //          → ถ้า system ส่ง room name ไป PLC config อาจทำให้ address ผิดพลาด
  // FAIL เพราะ: API body มี name = "  ห้อง A  " ไม่ใช่ "ห้อง A" (ไม่ trim)
  it("[BUG-5] save() ส่ง form.name ที่มี spaces โดยไม่ trim ก่อน POST (FAIL)", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    const wrapper = mount(RoomSetting, { global: { provide: { locale: mockLocale } } });
    wrapper.vm.openModal();
    wrapper.vm.form.name = "  ห้อง A  "; // มี leading/trailing spaces
    await wrapper.vm.save();

    const postCall = mockFetch.mock.calls.find(([, opts]) => opts?.method === "POST");
    expect(postCall).toBeTruthy();
    const body = JSON.parse(postCall[1].body);

    // คาดหวัง: name ถูก trim แล้วก่อนส่ง API
    expect(body.name).toBe("ห้อง A"); // FAIL: ได้ "  ห้อง A  " (ไม่ trim)
  });
});
