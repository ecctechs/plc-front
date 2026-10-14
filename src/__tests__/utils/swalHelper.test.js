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
    expect(args.text).toContain("บันทึกเรียบร้อย");
  });

  it("ใช้สี icon ถูกต้องตามประเภท (error → #dc3545)", async () => {
    await showAlert("ผิดพลาด", "เกิดข้อผิดพลาด", "error");
    const args = Swal.fire.mock.calls[0][0];
    expect(args.confirmButtonColor).toBe("#dc3545");
  });

  it("ใช้สี warning → #ffc107", async () => {
    await showAlert("แจ้งเตือน", "ข้อความ", "warning");
    const args = Swal.fire.mock.calls[0][0];
    expect(args.confirmButtonColor).toBe("#ffc107");
  });

  it("ใช้สี info → #17a2b8", async () => {
    await showAlert("ข้อมูล", "ข้อความ", "info");
    const args = Swal.fire.mock.calls[0][0];
    expect(args.confirmButtonColor).toBe("#17a2b8");
  });

  it("ใช้สี success → #28a745", async () => {
    await showAlert("สำเร็จ", "ข้อความ", "success");
    const args = Swal.fire.mock.calls[0][0];
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
    expect(args.text).toContain("ข้อมูลจะหายถาวร");
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

  it("title เป็นข้อความธรรมดา (ไม่มี HTML)", async () => {
    await showConfirm("ยืนยัน?", "text");
    const args = Swal.fire.mock.calls[0][0];
    expect(args.title).toBe("ยืนยัน?");
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

