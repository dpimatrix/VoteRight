import { describe, expect, it } from "vitest";
import { formatFeeCents } from "./paymentVerification";

describe("formatFeeCents (payment-as-verification checkout display)", () => {
  it("formats whole dollars with two decimal places", () => {
    expect(formatFeeCents(500)).toBe("$5.00");
  });
  it("formats amounts with cents", () => {
    expect(formatFeeCents(1099)).toBe("$10.99");
  });
  it("formats sub-dollar amounts", () => {
    expect(formatFeeCents(50)).toBe("$0.50");
  });
});
