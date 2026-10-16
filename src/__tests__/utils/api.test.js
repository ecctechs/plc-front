import { describe, it, expect, beforeEach } from "vitest";
import { BASE_API, authH } from "../../utils/api";

describe("utils/api", () => {
  beforeEach(() => localStorage.clear());

  it("BASE_API เป็น string (ว่างได้ → ใช้ Vite proxy)", () => {
    expect(typeof BASE_API).toBe("string");
  });

  it("authH: มี token → ส่ง Bearer token", () => {
    localStorage.setItem("token", "abc");
    expect(authH()).toEqual({ Authorization: "Bearer abc" });
  });

  it("authH: ไม่มี token → ไม่ส่ง header (ไม่ใช่ 'Bearer null')", () => {
    expect(authH()).toEqual({});
  });
});
