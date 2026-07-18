import { describe, expect, it } from "vitest";
import { APPEAL_DAYS, dueAt, RESPONSE_DAYS } from "./privacy";

describe("MODPA statutory clock", () => {
  const t0 = Date.UTC(2026, 6, 18); // 2026-07-18

  it("standard requests are due in 45 days", () => {
    expect(RESPONSE_DAYS).toBe(45);
    expect(dueAt(t0, "access").toISOString().slice(0, 10)).toBe("2026-09-01");
    expect(dueAt(t0, "deletion").getTime() - t0).toBe(45 * 86_400_000);
  });

  it("appeals are due in 60 days", () => {
    expect(APPEAL_DAYS).toBe(60);
    expect(dueAt(t0, "appeal").getTime() - t0).toBe(60 * 86_400_000);
  });
});
