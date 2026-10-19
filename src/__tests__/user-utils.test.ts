import { describe, expect, it } from "vitest";
import { getDisplayName, maskPhone } from "@/app/utils/user";

describe("user display helpers", () => {
  it("masks normal phone numbers", () => {
    expect(maskPhone("13800138000")).toBe("138****8000");
  });

  it("falls back when phone is missing", () => {
    expect(maskPhone()).toBe("未绑定手机号");
  });

  it("prefers nickname as display name", () => {
    expect(getDisplayName({ id: 1, phone: "13800138000", nickname: "Tom", role: "member" })).toBe(
      "Tom",
    );
  });

  it("uses personal center when nickname is missing", () => {
    expect(getDisplayName({ id: 1, phone: "13800138000", role: "member" })).toBe("个人中心");
  });
});
