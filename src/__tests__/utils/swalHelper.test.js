import { describe, it, expect, vi, beforeEach } from "vitest";
import { showAlert, showConfirm } from "../../utils/swalHelper";

// Mock sweetalert2
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

// ─── showAlert ───────────────────────────────────────────────

describe("showAlert", () => {
  it("เรียก Swal.fire ด้วย icon และ title ที่ระบุ", async () => {
    await showAlert("สำเร็จ", "บันทึกเรียบร้อย", "success");

    expect(Swal.fire).toHaveBeenCalledOnce();
    const args = Swal.fire.mock.calls[0][0];
    expect(args.icon).toBe("success");
    expect(args.title).toContain("สำเร็จ");
    expect(args.html).toContain("บันทึกเรียบร้อย");
  });

  it("ใช้สี icon ถูกต้องตามประเภท", async () => {
    await showAlert("ผิดพลาด", "เกิดข้อผิดพลาด", "error");

    const args = Swal.fire.mock.calls[0][0];
    expect(args.title).toContain("#dc3545");
  });

  it("icon = success ตั้ง timer 1800ms และซ่อนปุ่ม confirm", async () => {
    await showAlert("สำเร็จ", "OK", "success");

    const args = Swal.fire.mock.calls[0][0];
    expect(args.timer).toBe(1800);
    expect(args.showConfirmButton).toBe(false);
  });

  it("icon = error ตั้ง timer 3000ms และแสดงปุ่ม confirm", async () => {
    await showAlert("ผิดพลาด", "Error", "error");

    const args = Swal.fire.mock.calls[0][0];
    expect(args.timer).toBe(3000);
    expect(args.showConfirmButton).toBe(true);
  });

  it("icon default เป็น success ถ้าไม่ระบุ", async () => {
    await showAlert("หัวข้อ", "รายละเอียด");

    const args = Swal.fire.mock.calls[0][0];
    expect(args.icon).toBe("success");
    expect(args.timer).toBe(1800);
  });
});

// ─── showConfirm ─────────────────────────────────────────────

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
    Swal.fire.mockResolvedValue({ isConfirmed: false });

    await showConfirm("ลบ?", "แน่ใจ?", "ลบเลย", "ไม่ลบ");

    const args = Swal.fire.mock.calls[0][0];
    expect(args.confirmButtonText).toBe("ลบเลย");
    expect(args.cancelButtonText).toBe("ไม่ลบ");
  });

  it("ใช้ข้อความปุ่ม default ถ้าไม่ระบุ", async () => {
    Swal.fire.mockResolvedValue({ isConfirmed: false });

    await showConfirm("ลบ?", "แน่ใจ?");

    const args = Swal.fire.mock.calls[0][0];
    expect(args.confirmButtonText).toBe("ยืนยัน");
    expect(args.cancelButtonText).toBe("ยกเลิก");
  });
});
