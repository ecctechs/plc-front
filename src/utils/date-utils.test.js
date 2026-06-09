import { describe, it, expect } from "vitest";
import { formatThaiYear, formatISO, toUTC7 } from "./date-utils";

describe("formatThaiYear", () => {
  it("คืนค่าว่างเมื่อไม่มี input", () => {
    expect(formatThaiYear(null)).toBe("");
  });

  it("แปลงปีเป็น พ.ศ. และจัด format ถูกต้อง", () => {
    // 15 ม.ค. 2024 เวลา 09:05 -> พ.ศ. 2567
    const result = formatThaiYear("2024-01-15T09:05:00");
    expect(result).toBe("15/01/2567 09:05 AM");
  });
});

describe("formatISO", () => {
  it("คืน null เมื่อไม่มี input", () => {
    expect(formatISO(null)).toBeNull();
    expect(formatISO(undefined)).toBeNull();
  });

  it("แปลงวันที่เป็น ISO format YYYY-MM-DDTHH:mm", () => {
    // ใช้ string ที่ไม่มี timezone เพื่อให้ Date constructor ตีความตาม local time
    const result = formatISO("2024-03-05T14:07:00");
    expect(result).toBe("2024-03-05T14:07");
  });

  it("รองรับ Date object", () => {
    const d = new Date(2024, 0, 15, 9, 5); // 15 ม.ค. 2024 09:05 local time
    expect(formatISO(d)).toBe("2024-01-15T09:05");
  });
});

describe("toUTC7", () => {
  it("บวกเวลาเข้าไป 7 ชั่วโมง", () => {
    const input = new Date("2024-01-01T00:00:00Z");
    expect(toUTC7(input).getTime()).toBe(input.getTime() + 7 * 3600 * 1000);
  });
});