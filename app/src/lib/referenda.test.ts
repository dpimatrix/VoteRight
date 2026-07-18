import { describe, expect, it } from "vitest";
import { computeTally } from "./referenda";

describe("computeTally", () => {
  it("orders counts and computes margin over total", () => {
    const t = computeTally(["yes", "no"], [{ choice: "yes", n: 60 }, { choice: "no", n: 40 }]);
    expect(t.total).toBe(100);
    expect(t.leading).toBe("yes");
    expect(t.margin_pct).toBe(20);
    expect(t.counts.map((c) => c.choice)).toEqual(["yes", "no"]);
  });

  it("includes declared options with zero ballots", () => {
    const t = computeTally(["yes", "no", "abstain"], [{ choice: "no", n: 5 }]);
    expect(t.counts).toEqual([
      { choice: "no", n: 5 },
      { choice: "yes", n: 0 },
      { choice: "abstain", n: 0 },
    ]);
    expect(t.leading).toBe("no");
    expect(t.margin_pct).toBe(100);
  });

  it("handles zero ballots without dividing by zero", () => {
    const t = computeTally(["yes", "no"], []);
    expect(t.total).toBe(0);
    expect(t.leading).toBeNull();
    expect(t.margin_pct).toBe(0);
  });

  it("breaks exact ties by declared option order with zero margin", () => {
    const t = computeTally(["yes", "no"], [{ choice: "no", n: 7 }, { choice: "yes", n: 7 }]);
    expect(t.leading).toBe("yes");
    expect(t.margin_pct).toBe(0);
  });

  it("rounds margin to two decimals", () => {
    const t = computeTally(["yes", "no"], [{ choice: "yes", n: 2 }, { choice: "no", n: 1 }]);
    expect(t.margin_pct).toBe(33.33);
  });

  it("uses leading minus runner-up with more than two options", () => {
    const t = computeTally(
      ["a", "b", "c"],
      [{ choice: "a", n: 50 }, { choice: "b", n: 30 }, { choice: "c", n: 20 }],
    );
    expect(t.leading).toBe("a");
    expect(t.margin_pct).toBe(20);
  });
});
