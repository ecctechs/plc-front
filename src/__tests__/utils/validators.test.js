import { describe, it, expect } from "vitest";
import { isValidEmail, getAlarmEmailError } from "../../utils/validators";

describe("isValidEmail", () => {
  it.each(["a@b.com", "first.last@mail.co.th", "Admin@Mail.COM"])("%s ถูกต้อง", (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each(["", "abc", "a@b", "a@b..com", "@b.com", "a b@c.com", null, undefined])("%s ไม่ถูกต้อง", (email) => {
    expect(isValidEmail(email)).toBe(false);
  });
});

describe("getAlarmEmailError", () => {
  it("ไม่ติ๊กส่งอีเมล → ไม่ตรวจ", () => {
    expect(getAlarmEmailError({ notify_email: false, email_recipients: ["bad"] })).toBe("");
  });

  it("ติ๊กส่งอีเมลแต่ไม่ใส่ → error", () => {
    expect(getAlarmEmailError({ notify_email: true, email_recipients: [] })).toContain("อย่างน้อย 1");
    expect(getAlarmEmailError({ notify_email: true })).toContain("อย่างน้อย 1");
  });

  it("อีเมลผิดรูปแบบ → error ระบุอีเมลนั้น", () => {
    expect(getAlarmEmailError({ notify_email: true, email_recipients: ["a@b.com", "bad@"] })).toContain("bad@");
  });

  it("อีเมลถูกต้อง → ไม่มี error", () => {
    expect(getAlarmEmailError({ notify_email: true, email_recipients: ["a@b.com"] })).toBe("");
  });
});
