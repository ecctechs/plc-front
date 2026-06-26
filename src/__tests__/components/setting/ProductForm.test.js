import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import ProductForm from "../../../components/setting/ProductForm.vue";

// ─── Mock swalHelper ────────────────────────────────────────
vi.mock("../../../utils/swalHelper", () => ({
  showAlert: vi.fn(),
}));
import { showAlert } from "../../../utils/swalHelper";

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

const mockLocale_th = {
  current: "th",
  t: (key) => key,
};

// ─── Mock product data ──────────────────────────────────────
const mockProduct = {
  id: 1,
  name: "Widget A",
  cycle_time: 10,
  target_oee: 85,
  target_output: 500,
  image_url: "http://example.com/img.png",
};

function mountForm(props = {}, locale = mockLocale) {
  return mount(ProductForm, {
    global: { provide: { locale } },
    props,
  });
}

function setupFetchOk(data = { id: 2 }) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ data }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── 1. Render ──────────────────────────────────────────────
describe("ProductForm > Render", () => {
  it("render สำเร็จ (modal ซ่อนตอนเริ่ม)", () => {
    const wrapper = mountForm();
    expect(wrapper.vm.showModal).toBe(false);
  });

  it("open() → แสดง modal Add", () => {
    const wrapper = mountForm();
    wrapper.vm.open();
    expect(wrapper.vm.showModal).toBe(true);
    expect(wrapper.vm.isEdit).toBe(false);
    expect(wrapper.vm.form.name).toBe("");
  });

  it("open(product) → แสดง modal Edit", () => {
    const wrapper = mountForm();
    wrapper.vm.open(mockProduct);
    expect(wrapper.vm.showModal).toBe(true);
    expect(wrapper.vm.isEdit).toBe(true);
    expect(wrapper.vm.form.name).toBe("Widget A");
    expect(wrapper.vm.editingId).toBe(1);
  });

  it("modal title Add mode = 'Add Product'", async () => {
    const wrapper = mountForm();
    wrapper.vm.open();
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".modal-title").text()).toContain("Add Product");
  });

  it("modal title Edit mode = 'Edit Product'", async () => {
    const wrapper = mountForm();
    wrapper.vm.open(mockProduct);
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".modal-title").text()).toContain("Edit Product");
  });

  it("ปุ่ม Create แสดงใน Add mode", async () => {
    const wrapper = mountForm();
    wrapper.vm.open();
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".modal-footer .btn-primary").text()).toContain("Create");
  });

  it("ปุ่ม Update แสดงใน Edit mode", async () => {
    const wrapper = mountForm();
    wrapper.vm.open(mockProduct);
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".modal-footer .btn-primary").text()).toContain("Update");
  });

  it("modal-backdrop แสดงเมื่อ showModal = true", async () => {
    const wrapper = mountForm();
    wrapper.vm.open();
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".modal-backdrop").exists()).toBe(true);
  });

  it("modal-backdrop ซ่อนเมื่อ showModal = false", async () => {
    const wrapper = mountForm();
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".modal-backdrop").exists()).toBe(false);
  });

  it("spinner แสดงเมื่อ loading = true", async () => {
    const wrapper = mountForm();
    wrapper.vm.open();
    wrapper.vm.loading = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".spinner-border").exists()).toBe(true);
  });

  it("ปุ่ม Save ถูก disabled เมื่อ loading = true", async () => {
    const wrapper = mountForm();
    wrapper.vm.open();
    wrapper.vm.loading = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".modal-footer .btn-primary").attributes("disabled")).toBeDefined();
  });

  it("imagePreview แสดง img tag เมื่อมีค่า", async () => {
    const wrapper = mountForm();
    wrapper.vm.open(mockProduct);
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".img-thumbnail").exists()).toBe(true);
    expect(wrapper.find(".img-thumbnail").attributes("src")).toBe("http://example.com/img.png");
  });
});

// ─── 2. Form Fields ─────────────────────────────────────────
describe("ProductForm > Form Fields", () => {
  it("แสดง field ครบ: name, cycle_time, target_oee, target_output", async () => {
    const wrapper = mountForm();
    wrapper.vm.open();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("Model Name");
    expect(wrapper.text()).toContain("Cycle Time");
    expect(wrapper.text()).toContain("Target OEE");
    expect(wrapper.text()).toContain("Target Output");
  });

  it("แสดง image upload input", async () => {
    const wrapper = mountForm();
    wrapper.vm.open();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('input[type="file"]').exists()).toBe(true);
  });

  it("open(product) → imagePreview = product.image_url", () => {
    const wrapper = mountForm();
    wrapper.vm.open(mockProduct);
    expect(wrapper.vm.imagePreview).toBe("http://example.com/img.png");
  });

  it("open(product) image_url null, image มีค่า → imagePreview = product.image", () => {
    const wrapper = mountForm();
    wrapper.vm.open({ id: 2, name: "X", cycle_time: 5, target_oee: 80, target_output: 100,
      image_url: null, image: "blob:http://localhost/abc" });
    expect(wrapper.vm.imagePreview).toBe("blob:http://localhost/abc");
  });

  it("open(product) ทั้ง image_url และ image เป็น null → imagePreview = null", () => {
    const wrapper = mountForm();
    wrapper.vm.open({ id: 3, name: "X", image_url: null, image: null });
    expect(wrapper.vm.imagePreview).toBeNull();
  });

  it("open(product) cycle_time = null → form.cycle_time = ''", () => {
    const wrapper = mountForm();
    wrapper.vm.open({ id: 4, name: "X", cycle_time: null, target_oee: 85, target_output: 500 });
    expect(wrapper.vm.form.cycle_time).toBe("");
  });

  it("open(product) target_oee = null → form.target_oee = ''", () => {
    const wrapper = mountForm();
    wrapper.vm.open({ id: 4, name: "X", cycle_time: 10, target_oee: null, target_output: 500 });
    expect(wrapper.vm.form.target_oee).toBe("");
  });

  it("open(product) target_output = null → form.target_output = ''", () => {
    const wrapper = mountForm();
    wrapper.vm.open({ id: 4, name: "X", cycle_time: 10, target_oee: 85, target_output: null });
    expect(wrapper.vm.form.target_output).toBe("");
  });

  it("open(product) name = null → form.name = ''", () => {
    const wrapper = mountForm();
    wrapper.vm.open({ id: 9, name: null, cycle_time: 5, target_oee: 80, target_output: 100 });
    expect(wrapper.vm.form.name).toBe("");
  });

  it("open(product) selectedFile reset เป็น null", () => {
    const wrapper = mountForm();
    wrapper.vm.selectedFile = new File(["x"], "old.png");
    wrapper.vm.open(mockProduct);
    expect(wrapper.vm.selectedFile).toBeNull();
  });
});

// ─── 3. DOM Interactions ───────────────────────────────────
describe("ProductForm > DOM Interactions", () => {
  it("DOM: คลิก btn-close → closeModal()", async () => {
    const wrapper = mountForm();
    wrapper.vm.open();
    await wrapper.vm.$nextTick();
    await wrapper.find(".btn-close").trigger("click");
    expect(wrapper.vm.showModal).toBe(false);
  });

  it("DOM: คลิกปุ่ม Cancel → closeModal()", async () => {
    const wrapper = mountForm();
    wrapper.vm.open();
    await wrapper.vm.$nextTick();
    await wrapper.find(".btn-secondary").trigger("click");
    expect(wrapper.vm.showModal).toBe(false);
  });

  it("DOM: คลิกปุ่ม Save → save() ถูกเรียก", async () => {
    setupFetchOk();
    const wrapper = mountForm();
    wrapper.vm.open();
    wrapper.vm.form.name = "Click Test";
    await wrapper.vm.$nextTick();
    const saveSpy = vi.spyOn(wrapper.vm, "save");
    await wrapper.find(".modal-footer .btn-primary").trigger("click");
    expect(saveSpy).toHaveBeenCalled();
  });

  it("DOM: input name → v-model setter ทำงาน", async () => {
    const wrapper = mountForm();
    wrapper.vm.open();
    await wrapper.vm.$nextTick();
    const nameInput = wrapper.find('input[type="text"]');
    await nameInput.setValue("My Product");
    expect(wrapper.vm.form.name).toBe("My Product");
  });

  it("DOM: input cycle_time → v-model.number setter ทำงาน", async () => {
    const wrapper = mountForm();
    wrapper.vm.open();
    await wrapper.vm.$nextTick();
    const numberInputs = wrapper.findAll('input[type="number"]');
    await numberInputs[0].setValue("15");
    expect(wrapper.vm.form.cycle_time).toBe(15);
  });

  it("DOM: input target_oee → v-model.number setter ทำงาน", async () => {
    const wrapper = mountForm();
    wrapper.vm.open();
    await wrapper.vm.$nextTick();
    const numberInputs = wrapper.findAll('input[type="number"]');
    await numberInputs[1].setValue("90");
    expect(wrapper.vm.form.target_oee).toBe(90);
  });

  it("DOM: input target_output → v-model.number setter ทำงาน", async () => {
    const wrapper = mountForm();
    wrapper.vm.open();
    await wrapper.vm.$nextTick();
    const numberInputs = wrapper.findAll('input[type="number"]');
    await numberInputs[2].setValue("600");
    expect(wrapper.vm.form.target_output).toBe(600);
  });

  it("DOM: change file input → handleImageUpload ถูกเรียก", async () => {
    const wrapper = mountForm();
    wrapper.vm.open();
    await wrapper.vm.$nextTick();
    const spy = vi.spyOn(wrapper.vm, "handleImageUpload");
    await wrapper.find('input[type="file"]').trigger("change");
    expect(spy).toHaveBeenCalled();
  });
});

// ─── 4. handleImageUpload ──────────────────────────────────
describe("ProductForm > handleImageUpload", () => {
  it("handleImageUpload ไม่มีไฟล์ (files[0] = undefined) → ไม่เปลี่ยน state", () => {
    const wrapper = mountForm();
    wrapper.vm.open();
    wrapper.vm.handleImageUpload({ target: { files: [] } });
    expect(wrapper.vm.selectedFile).toBeNull();
    expect(wrapper.vm.imagePreview).toBeNull();
  });

  it("handleImageUpload มีไฟล์ → selectedFile + imagePreview set", () => {
    const origFileReader = globalThis.FileReader;
    globalThis.FileReader = class {
      readAsDataURL(_file) {
        this.onload({ target: { result: "data:image/png;base64,FAKE_DATA" } });
      }
    };

    const wrapper = mountForm();
    wrapper.vm.open();
    const file = new File(["fake image content"], "photo.png", { type: "image/png" });
    wrapper.vm.handleImageUpload({ target: { files: [file] } });

    expect(wrapper.vm.selectedFile).toBe(file);
    expect(wrapper.vm.imagePreview).toBe("data:image/png;base64,FAKE_DATA");

    globalThis.FileReader = origFileReader;
  });
});

// ─── 5. Close ───────────────────────────────────────────────
describe("ProductForm > Close", () => {
  it("closeModal → ปิด modal", () => {
    const wrapper = mountForm();
    wrapper.vm.open();
    expect(wrapper.vm.showModal).toBe(true);
    wrapper.vm.closeModal();
    expect(wrapper.vm.showModal).toBe(false);
  });
});

// ─── 6. Save ────────────────────────────────────────────────
describe("ProductForm > Save", () => {
  it("ชื่อว่าง → แสดง warning EN", async () => {
    const wrapper = mountForm();
    wrapper.vm.open();
    wrapper.vm.form.name = "";
    await wrapper.vm.save();
    expect(showAlert).toHaveBeenCalledWith("Error", "Model Name is required", "warning");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("ชื่อว่าง → แสดง warning TH", async () => {
    const wrapper = mountForm({}, mockLocale_th);
    wrapper.vm.open();
    wrapper.vm.form.name = "";
    await wrapper.vm.save();
    expect(showAlert).toHaveBeenCalledWith("ข้อผิดพลาด", "กรุณากรอกชื่อรุ่น", "warning");
  });

  it("cycle_time ติดลบ → แสดง warning EN", async () => {
    const wrapper = mountForm();
    wrapper.vm.open();
    wrapper.vm.form.name = "Test";
    wrapper.vm.form.cycle_time = -5;
    await wrapper.vm.save();
    expect(showAlert).toHaveBeenCalledWith("Error", "Cycle Time must not be negative", "warning");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("cycle_time ติดลบ → แสดง warning TH", async () => {
    const wrapper = mountForm({}, mockLocale_th);
    wrapper.vm.open();
    wrapper.vm.form.name = "Test";
    wrapper.vm.form.cycle_time = -1;
    await wrapper.vm.save();
    expect(showAlert).toHaveBeenCalledWith("ข้อผิดพลาด", "Cycle Time ต้องไม่ติดลบ", "warning");
  });

  it("save สำเร็จ (Add) → fetch POST", async () => {
    setupFetchOk({ id: 2 });
    const wrapper = mountForm();
    wrapper.vm.open();
    wrapper.vm.form.name = "New Product";
    await wrapper.vm.save();
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/products");
    expect(opts.method).toBe("POST");
    expect(showAlert).toHaveBeenCalledWith("Success", "Product saved successfully", "success");
  });

  it("save สำเร็จ (Add) → showAlert success TH", async () => {
    setupFetchOk({ id: 2 });
    const wrapper = mountForm({}, mockLocale_th);
    wrapper.vm.open();
    wrapper.vm.form.name = "Test";
    await wrapper.vm.save();
    expect(showAlert).toHaveBeenCalledWith("สำเร็จ", "บันทึกผลิตภัณฑ์สำเร็จ", "success");
  });

  it("save สำเร็จ (Edit) → fetch PUT", async () => {
    setupFetchOk({ id: 1 });
    const wrapper = mountForm();
    wrapper.vm.open(mockProduct);
    wrapper.vm.form.name = "Updated Product";
    await wrapper.vm.save();
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/products/1");
    expect(opts.method).toBe("PUT");
  });

  it("save ล้มเหลว → showAlert error พร้อม API message EN", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: "Duplicate name" }),
    });
    const wrapper = mountForm();
    wrapper.vm.open();
    wrapper.vm.form.name = "Dup";
    await wrapper.vm.save();
    expect(showAlert).toHaveBeenCalledWith("Error", "Duplicate name", "error");
  });

  it("save ล้มเหลว → showAlert error TH", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: "ข้อผิดพลาด API" }),
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapper = mountForm({}, mockLocale_th);
    wrapper.vm.open();
    wrapper.vm.form.name = "Test";
    await wrapper.vm.save();
    expect(showAlert).toHaveBeenCalledWith("ข้อผิดพลาด", "ข้อผิดพลาด API", "error");
    consoleSpy.mockRestore();
  });

  it("save ล้มเหลว ไม่มี message → fallback 'Save failed'", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}), // no message
    });
    const wrapper = mountForm();
    wrapper.vm.open();
    wrapper.vm.form.name = "Test";
    await wrapper.vm.save();
    expect(showAlert).toHaveBeenCalledWith("Error", "Save failed", "error");
    consoleSpy.mockRestore();
  });

  it("save ใช้ FormData (ไม่ใช่ JSON)", async () => {
    setupFetchOk({ id: 3 });
    const wrapper = mountForm();
    wrapper.vm.open();
    wrapper.vm.form.name = "Test";
    await wrapper.vm.save();
    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.body).toBeInstanceOf(FormData);
  });

  it("save ที่มี cycle_time/target_oee/target_output → FormData มีค่าเหล่านั้น", async () => {
    setupFetchOk({ id: 3 });
    const wrapper = mountForm();
    wrapper.vm.open();
    wrapper.vm.form.name = "Test";
    wrapper.vm.form.cycle_time = 10;
    wrapper.vm.form.target_oee = 85;
    wrapper.vm.form.target_output = 500;
    await wrapper.vm.save();
    const [, opts] = mockFetch.mock.calls[0];
    const body = opts.body;
    expect(body.get("cycle_time")).toBe("10");
    expect(body.get("target_oee")).toBe("85");
    expect(body.get("target_output")).toBe("500");
  });

  it("save ที่ cycle_time/target_oee/target_output เป็น '' → ไม่รวมใน FormData", async () => {
    setupFetchOk({ id: 3 });
    const wrapper = mountForm();
    wrapper.vm.open();
    wrapper.vm.form.name = "Test";
    wrapper.vm.form.cycle_time = "";
    wrapper.vm.form.target_oee = "";
    wrapper.vm.form.target_output = "";
    await wrapper.vm.save();
    const [, opts] = mockFetch.mock.calls[0];
    const body = opts.body;
    expect(body.get("cycle_time")).toBeNull();
    expect(body.get("target_oee")).toBeNull();
    expect(body.get("target_output")).toBeNull();
  });

  it("save ที่มี selectedFile → FormData มี image", async () => {
    setupFetchOk({ id: 3 });
    const wrapper = mountForm();
    wrapper.vm.open();
    wrapper.vm.form.name = "Test";
    wrapper.vm.selectedFile = new File(["img"], "product.png", { type: "image/png" });
    await wrapper.vm.save();
    const [, opts] = mockFetch.mock.calls[0];
    const body = opts.body;
    expect(body.get("image")).toBeTruthy();
  });

  it("save สำเร็จ → closeModal", async () => {
    setupFetchOk({ id: 2 });
    const wrapper = mountForm();
    wrapper.vm.open();
    wrapper.vm.form.name = "Test";
    await wrapper.vm.save();
    expect(wrapper.vm.showModal).toBe(false);
  });

  it("save สำเร็จ → emit 'saved'", async () => {
    setupFetchOk({ id: 2 });
    const wrapper = mountForm();
    wrapper.vm.open();
    wrapper.vm.form.name = "Test";
    await wrapper.vm.save();
    expect(wrapper.emitted("saved")).toBeTruthy();
  });

  it("save สำเร็จ → เรียก reloadProducts callback", async () => {
    setupFetchOk({ id: 4 });
    const reload = vi.fn();
    const wrapper = mountForm({ reloadProducts: reload });
    wrapper.vm.open();
    wrapper.vm.form.name = "Callback Test";
    await wrapper.vm.save();
    expect(reload).toHaveBeenCalled();
  });

  it("save สำเร็จไม่มี reloadProducts → ไม่ crash", async () => {
    setupFetchOk({ id: 5 });
    const wrapper = mountForm(); // reloadProducts = null (default)
    wrapper.vm.open();
    wrapper.vm.form.name = "No Reload Test";
    await expect(wrapper.vm.save()).resolves.not.toThrow();
  });

  it("save → loading กลับ false เสมอ (finally)", async () => {
    setupFetchOk({ id: 5 });
    const wrapper = mountForm();
    wrapper.vm.open();
    wrapper.vm.form.name = "Loading Test";
    await wrapper.vm.save();
    expect(wrapper.vm.loading).toBe(false);
  });

  it("save ล้มเหลว → loading กลับ false (finally)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: "err" }),
    });
    const wrapper = mountForm();
    wrapper.vm.open();
    wrapper.vm.form.name = "Fail Test";
    await wrapper.vm.save();
    expect(wrapper.vm.loading).toBe(false);
    consoleSpy.mockRestore();
  });
});

// ─── 7. Bug Cases (PASS) ───────────────────────────────────
describe("ProductForm > Bug Cases (PASS)", () => {
  it("[BUG-1] ชื่อ product เป็น space ล้วน → ต้องแสดง warning (.trim() check)", async () => {
    const wrapper = mountForm();
    wrapper.vm.open();
    wrapper.vm.form.name = "   ";
    await wrapper.vm.save();
    expect(showAlert).toHaveBeenCalledWith("Error", "Model Name is required", "warning");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("[BUG-2] cycle_time ติดลบ → ต้อง validate ก่อนส่ง", async () => {
    const wrapper = mountForm();
    wrapper.vm.open();
    wrapper.vm.form.name = "Test";
    wrapper.vm.form.cycle_time = -5;
    await wrapper.vm.save();
    expect(showAlert).toHaveBeenCalledWith("Error", "Cycle Time must not be negative", "warning");
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ─── 8. Bug Cases (FAIL — อันตราย) ─────────────────────────
describe("ProductForm > Bug Cases (FAIL)", () => {

  // BUG-3: open(product) ใช้ `cycle_time: product.cycle_time || ""` (||) แทน ?? (nullish)
  // อันตราย: cycle_time = 0 เป็นค่าที่สมเหตุสมผลในบาง process (ไม่มี cycle limit)
  //          `0 || ""` = "" → form แสดงช่องว่าง แทนที่จะเป็น 0
  //          ผู้ใช้เห็น cycle_time ว่างใน edit form แล้วไม่รู้ว่าเดิมเป็น 0 หรือไม่ได้ตั้ง
  //          เมื่อ save → cycle_time ไม่ถูกส่งไป API (เพราะ form.cycle_time = "" → ไม่ append)
  //          → ค่า cycle_time เดิมใน DB ถูกลบโดยไม่ตั้งใจ (silent data loss)
  //          เปรียบกับ target_oee ซึ่งใช้ ?? ถูกต้อง: `0 ?? ""` = 0 (ไม่สูญหาย)
  // FAIL เพราะ: `product.cycle_time || ""` → `0 || ""` = "" ไม่ใช่ 0
  it("[BUG-3] open(product) cycle_time=0 → form.cycle_time ควรเป็น 0 ไม่ใช่ '' (FAIL)", () => {
    const wrapper = mountForm();
    wrapper.vm.open({ id: 5, name: "X", cycle_time: 0, target_oee: 85, target_output: 500 });

    // คาดหวัง: form.cycle_time = 0 (ค่าที่ผู้ใช้ตั้ง)
    expect(wrapper.vm.form.cycle_time).toBe(0); // FAIL: ได้ "" เพราะ 0 || "" = ""
  });

  // BUG-4: handleImageUpload ไม่ validate file type
  // อันตราย: HTML มี accept="image/*" แต่ user สามารถ bypass ผ่าน code หรือ tamper request
  //          ไฟล์ .js, .exe, .php ถูก accept ได้โดยไม่มี frontend validation
  //          server อาจยอมรับและ store ไว้ หรือ execute ได้ถ้า misconfigure
  //          โดยเฉพาะอันตรายถ้า server path ถูก guess และ file ถูก execute (webshell)
  // FAIL เพราะ: `if (file) { this.selectedFile = file; ... }` ไม่มีตรวจ file.type
  it("[BUG-4] handleImageUpload รับ .js file โดยไม่มี type validation (FAIL)", () => {
    const wrapper = mountForm();
    wrapper.vm.open();

    const jsFile = new File(["alert('hacked')"], "malicious.js", { type: "text/javascript" });
    wrapper.vm.handleImageUpload({ target: { files: [jsFile] } });

    // คาดหวัง: ไม่ควรรับไฟล์ที่ไม่ใช่ image
    expect(wrapper.vm.selectedFile).toBeNull(); // FAIL: selectedFile = jsFile (ยอมรับ JS file)
  });

  // BUG-5: save() ไม่ trim form.name ก่อน append ลง FormData
  // อันตราย: validate ด้วย `form.name.trim()` (ถูกต้อง) แต่ส่ง formData.append("name", form.name) ดิบ
  //          "  Widget A  " ผ่าน validation (trim() ไม่ว่าง) แต่ DB บันทึก "  Widget A  " (มี spaces)
  //          ค้นหาด้วย "Widget A" ไม่เจอ, duplicate check โดย name อาจพลาด
  //          UI แสดงชื่อที่มี leading spaces → alignment พัง หรือ sort ผิดลำดับ
  // FAIL เพราะ: `formData.append("name", this.form.name)` ส่งค่าดิบไม่ trim
  it("[BUG-5] save() ส่ง form.name ที่มี spaces ไปยัง API โดยไม่ trim (FAIL)", async () => {
    setupFetchOk({ id: 2 });
    const wrapper = mountForm();
    wrapper.vm.open();
    wrapper.vm.form.name = "  Widget A  "; // มี leading/trailing spaces
    await wrapper.vm.save();

    const [, opts] = mockFetch.mock.calls[0];
    const body = opts.body;

    // คาดหวัง: API รับชื่อที่ trim แล้ว = "Widget A"
    expect(body.get("name")).toBe("Widget A"); // FAIL: ได้ "  Widget A  " (ไม่ trim)
  });
});
