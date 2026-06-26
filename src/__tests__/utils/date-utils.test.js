import { describe, it, expect } from "vitest";
import { formatThaiYear, formatISO, toUTC7 } from "../../utils/date-utils";

// ═══════════════════════════════════════════════════════════
// formatThaiYear
// ═══════════════════════════════════════════════════════════
describe("formatThaiYear", () => {
  // ─── falsy input ─────────────────────────────────────────
  it("null → ''", () => {
    expect(formatThaiYear(null)).toBe("");
  });

  it("undefined → ''", () => {
    expect(formatThaiYear(undefined)).toBe("");
  });

  it("empty string → ''", () => {
    expect(formatThaiYear("")).toBe("");
  });

  it("0 (falsy) → ''", () => {
    expect(formatThaiYear(0)).toBe("");
  });

  // ─── AM (hours < 12) ──────────────────────────────────────
  it("เวลา 09:05 → 09:05 AM + ปี พ.ศ. (AM branch)", () => {
    // line 14: hours=9 < 12 → 'AM'  |  line 16: 9 % 12 = 9 → truthy → 9
    const result = formatThaiYear("2024-01-15T09:05:00");
    expect(result).toBe("15/01/2567 09:05 AM");
  });

  it("เวลา 11:59 → 11:59 AM", () => {
    const result = formatThaiYear("2024-06-20T11:59:00");
    expect(result).toBe("20/06/2567 11:59 AM");
  });

  // ─── PM (hours >= 12) ── covers line 14 'PM' branch ──────
  it("เวลา 15:30 → 03:30 PM (PM branch, line 14)", () => {
    // line 14: hours=15 >= 12 → 'PM'  |  line 16: 15 % 12 = 3 → truthy → 3
    const result = formatThaiYear("2024-01-15T15:30:00");
    expect(result).toBe("15/01/2567 03:30 PM");
  });

  it("เวลา 20:00 → 08:00 PM", () => {
    const result = formatThaiYear("2024-03-10T20:00:00");
    expect(result).toBe("10/03/2567 08:00 PM");
  });

  it("เวลา 23:59 → 11:59 PM", () => {
    const result = formatThaiYear("2024-12-31T23:59:00");
    expect(result).toBe("31/12/2567 11:59 PM");
  });

  // ─── Noon (covers BOTH PM branch AND hours%12=0 branch) ──
  it("เที่ยง 12:00 → 12:00 PM (PM branch + hours%12=0 → 12, line 14+16)", () => {
    // line 14: hours=12 >= 12 → 'PM'
    // line 16: 12 % 12 = 0  →  0 ? 0 : 12  →  12  ← ครอบคลุม false branch
    const result = formatThaiYear("2024-06-15T12:00:00");
    expect(result).toBe("15/06/2567 12:00 PM");
  });

  it("เที่ยง 12:30 → 12:30 PM", () => {
    const result = formatThaiYear("2024-06-15T12:30:00");
    expect(result).toBe("15/06/2567 12:30 PM");
  });

  // ─── Midnight (hours=0, covers hours%12=0 → 12 branch) ───
  it("เที่ยงคืน 00:00 → 12:00 AM (hours=0 → 0%12=0 → 12, line 16)", () => {
    // line 16: 0 % 12 = 0  →  0 ? 0 : 12  →  12  ← ครอบคลุม false branch
    const result = formatThaiYear("2024-01-15T00:00:00");
    expect(result).toBe("15/01/2567 12:00 AM");
  });

  it("00:30 → 12:30 AM", () => {
    const result = formatThaiYear("2024-06-15T00:30:00");
    expect(result).toBe("15/06/2567 12:30 AM");
  });

  // ─── Date object input ────────────────────────────────────
  it("รับ Date object ได้", () => {
    const d = new Date(2024, 0, 15, 9, 5, 0); // local time: Jan 15 2024 09:05
    expect(formatThaiYear(d)).toBe("15/01/2567 09:05 AM");
  });

  // ─── month/day padding ────────────────────────────────────
  it("เดือน/วัน ต่ำกว่า 10 → padStart '0' ถูกต้อง", () => {
    const result = formatThaiYear("2024-03-05T08:07:00");
    expect(result).toBe("05/03/2567 08:07 AM");
  });

  // ─── year conversion ──────────────────────────────────────
  it("ปี ค.ศ. 2000 → พ.ศ. 2543", () => {
    const result = formatThaiYear("2000-06-01T10:00:00");
    expect(result).toBe("01/06/2543 10:00 AM");
  });

  it("ปี ค.ศ. 1900 → พ.ศ. 2443", () => {
    const d = new Date(1900, 5, 1, 10, 0, 0);
    const result = formatThaiYear(d);
    expect(result).toBe("01/06/2443 10:00 AM");
  });
});

// ═══════════════════════════════════════════════════════════
// formatISO
// ═══════════════════════════════════════════════════════════
describe("formatISO", () => {
  it("null → null", () => {
    expect(formatISO(null)).toBeNull();
  });

  it("undefined → null", () => {
    expect(formatISO(undefined)).toBeNull();
  });

  it("empty string → null (falsy branch)", () => {
    expect(formatISO("")).toBeNull();
  });

  it("0 (falsy) → null", () => {
    expect(formatISO(0)).toBeNull();
  });

  it("แปลงวันที่เป็น ISO format YYYY-MM-DDTHH:mm", () => {
    const result = formatISO("2024-03-05T14:07:00");
    expect(result).toBe("2024-03-05T14:07");
  });

  it("รองรับ Date object", () => {
    const d = new Date(2024, 0, 15, 9, 5); // Jan 15 2024 09:05 local
    expect(formatISO(d)).toBe("2024-01-15T09:05");
  });

  it("month/day/hour/minute ต่ำกว่า 10 → padStart '0'", () => {
    const result = formatISO("2024-03-05T08:07:00");
    expect(result).toBe("2024-03-05T08:07");
  });

  it("ส่ง timestamp (number) ได้", () => {
    const d = new Date(2024, 0, 15, 9, 5);
    const result = formatISO(d.getTime());
    expect(result).toBe("2024-01-15T09:05");
  });
});

// ═══════════════════════════════════════════════════════════
// toUTC7
// ═══════════════════════════════════════════════════════════
describe("toUTC7", () => {
  it("บวกเวลา 7 ชั่วโมงเข้า Date object (UTC baseline)", () => {
    const input = new Date("2024-01-01T00:00:00Z");
    expect(toUTC7(input).getTime()).toBe(input.getTime() + 7 * 3600 * 1000);
  });

  it("บวกเวลา 7 ชั่วโมงเข้า string ISO", () => {
    const input = "2024-06-15T10:00:00Z";
    const expected = new Date(input).getTime() + 7 * 3600 * 1000;
    expect(toUTC7(input).getTime()).toBe(expected);
  });

  it("คืน Date object เสมอ", () => {
    const result = toUTC7(new Date("2024-01-01T12:00:00Z"));
    expect(result).toBeInstanceOf(Date);
  });

  it("ส่ง timestamp (number) ได้", () => {
    const ts = Date.UTC(2024, 0, 1, 0, 0, 0);
    expect(toUTC7(ts).getTime()).toBe(ts + 7 * 3600 * 1000);
  });

  it("ข้ามวัน: 2024-01-01T20:00:00Z → Jan 2 03:00 UTC", () => {
    const input = new Date("2024-01-01T20:00:00Z");
    const result = toUTC7(input);
    expect(result.getUTCHours()).toBe(3);
    expect(result.getUTCDate()).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════
// Bug Cases (FAIL — อันตราย ยังไม่แก้ utility)
// ═══════════════════════════════════════════════════════════
describe("date-utils > Bug Cases (FAIL)", () => {

  // BUG-3: formatThaiYear ไม่ตรวจสอบ Invalid Date string → คืน "NaN/NaN/NaN NaN:NaN AM"
  // อันตราย: ถ้า API ส่ง date string ที่มีรูปแบบผิด (เช่น "15-01-2024" แทน "2024-01-15")
  //          → new Date("15-01-2024") = Invalid Date → d.getDate() = NaN
  //          → แสดง "NaN/NaN/NaN NaN:NaN AM" บน UI → user เห็นข้อมูลที่ผิดพลาด
  //          → ถ้าใช้ใน table/report ผู้ใช้ไม่รู้ว่าข้อมูลพัง ข้อมูลผิดทั้ง row
  //          → ถ้าใช้กับ daterange picker อาจ highlight วันผิดหรือ filter ผิด
  //          → ควรตรวจสอบ isNaN(d.getTime()) แล้วคืน "" (เหมือน null case)
  // FAIL เพราะ: ไม่มี isNaN(d.getTime()) check → คืน "NaN/NaN/NaN NaN:NaN AM"
  it("[BUG-3] formatThaiYear('not-a-date') ควรคืน '' ไม่ใช่ NaN string (FAIL)", () => {
    const result = formatThaiYear("not-a-date");
    // คาดหวัง: invalid date string → คืน "" (graceful fallback)
    expect(result).toBe("");
    // FAIL: คืน "NaN/NaN/NaN NaN:NaN AM" เพราะ new Date("not-a-date") = Invalid Date
    //       แต่ไม่มีการตรวจสอบ isNaN(d.getTime())
  });

  // BUG-4: formatISO ไม่ตรวจสอบ Invalid Date string → คืน "NaN-NaN-NaNTNaN:NaN"
  // อันตราย: ถ้า API endpoint รับ date string และส่ง invalid string มาจาก user input
  //          → formatISO("2024/01/15") หรือ formatISO("invalid")
  //          → คืน "NaN-NaN-NaNTNaN:NaN" แทน null
  //          → ถ้าส่งค่านี้เป็น query parameter ไป API → API parse ผิด/error
  //          → Chart library รับ "NaN-..." เป็น x-axis label → chart พัง/render ผิด
  //          → ถ้า cache lastFetchTime ด้วยค่านี้ → deduplication logic เสีย
  //          → ควรตรวจ isNaN(d.getTime()) แล้วคืน null
  // FAIL เพราะ: ไม่มี isNaN check → คืน "NaN-NaN-NaNTNaN:NaN"
  it("[BUG-4] formatISO('not-a-date') ควรคืน null ไม่ใช่ NaN string (FAIL)", () => {
    const result = formatISO("not-a-date");
    // คาดหวัง: invalid date string → คืน null (graceful fallback)
    expect(result).toBeNull();
    // FAIL: คืน "NaN-NaN-NaNTNaN:NaN" เพราะ new Date("not-a-date") = Invalid Date
    //       แต่ไม่มีการตรวจสอบ isNaN
  });

  // BUG-5: formatISO รับ Invalid Date object → !date = false (object เป็น truthy) → คืน NaN string
  // อันตราย: ต่างจาก BUG-4 ตรงที่ผ่าน !date guard เพราะ new Date("bad") เป็น object (truthy)
  //          → formatISO(new Date("bad")) → !date = false → ดำเนินการต่อ → NaN result
  //          → กรณีนี้เกิดได้เมื่อ caller ทำ new Date(someString) ก่อนส่งเข้า formatISO
  //          → ถ้า someString มาจาก user input/API ที่ validate ไม่ครบ → silent bug
  //          → caller คิดว่า formatISO จะ return null ถ้า invalid → แต่ได้ NaN string
  //          → ข้อมูลที่ส่งไป API/Chart เป็น "NaN-NaN-NaNTNaN:NaN" โดยไม่รู้ตัว
  //          → ควรตรวจ isNaN(d.getTime()) ภายใน formatISO ด้วย
  // FAIL เพราะ: new Date("bad") เป็น truthy object → !date = false → ผ่าน guard → NaN output
  it("[BUG-5] formatISO(new Date('invalid')) ควรคืน null (object truthy bypass guard) (FAIL)", () => {
    const invalidDate = new Date("invalid");
    expect(isNaN(invalidDate.getTime())).toBe(true); // ยืนยันว่าเป็น Invalid Date จริง
    const result = formatISO(invalidDate);
    // คาดหวัง: Invalid Date → คืน null
    expect(result).toBeNull();
    // FAIL: new Date("invalid") เป็น truthy → !date = false → ผ่าน guard
    //       → d.getFullYear() = NaN → คืน "NaN-NaN-NaNTNaN:NaN"
  });

  // BUG-6: toUTC7(null) ถือว่า null = epoch (Jan 1 1970) → คืน epoch+7h แทนที่จะ guard null
  // อันตราย: ถ้า API ส่ง timestamp เป็น null (ยังไม่มีข้อมูล) และ caller ไม่ตรวจก่อน
  //          → toUTC7(null) → new Date(null) = new Date(0) = epoch (Jan 1 1970 00:00:00 UTC)
  //          → คืน Jan 1 1970 07:00:00 UTC+7 ซึ่งเป็นวันที่ผิดพลาดอย่างมาก
  //          → Chart แสดง data point ที่ x-axis = Jan 1970 แทนที่จะไม่แสดง
  //          → ถ้า deduplicate by timestamp → null timestamp ชนกับ epoch+7h → logic พัง
  //          → OEE report แสดงจุดข้อมูลผิดในกราฟ ผู้ใช้เห็น spike ที่ไม่มีจริง
  //          → ควร guard: if (!date || isNaN(new Date(date).getTime())) return null
  // FAIL เพราะ: new Date(null) = epoch (valid Date) → +7h → คืน valid Date ไม่ใช่ null/Invalid
  it("[BUG-6] toUTC7(null) ควรคืน null หรือ Invalid Date ไม่ใช่ epoch+7h (FAIL)", () => {
    const result = toUTC7(null);
    // คาดหวัง: null input → คืน null หรือ Invalid Date
    const isNullOrInvalid = result === null || isNaN(result.getTime());
    expect(isNullOrInvalid).toBe(true);
    // FAIL: new Date(null) = new Date(0) = epoch → epoch + 7*3600*1000 = valid Date (Jan 1 1970 07:00 UTC)
    //       isNaN(result.getTime()) = false → isNullOrInvalid = false → test fails
  });
});
