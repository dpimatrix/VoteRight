import { describe, expect, it } from "vitest";
import { sortRaces } from "./raceOrder";

// The real production race list as of 2026-09-21 (GET /api/races), in the
// alphabetical order the old `ORDER BY o.title` produced.
const school = "school_board";
const county = "county";
const production = [
  { title: "Board of Education — At-Large", level: school, seat_type: "at_large" },
  { title: "Board of Education — District 1", level: school, seat_type: "district" },
  { title: "Board of Education — District 3", level: school, seat_type: "district" },
  { title: "Board of Education — District 5", level: school, seat_type: "district" },
  { title: "Circuit Court Judges", level: "judicial", seat_type: "at_large" },
  { title: "County Council — At-Large", level: county, seat_type: "at_large" },
  { title: "County Council — District 1", level: county, seat_type: "district" },
  { title: "County Council — District 2", level: county, seat_type: "district" },
  { title: "County Council — District 3", level: county, seat_type: "district" },
  { title: "County Council — District 4", level: county, seat_type: "district" },
  { title: "County Council — District 5", level: county, seat_type: "district" },
  { title: "County Council — District 6", level: county, seat_type: "district" },
  { title: "County Council — District 7", level: county, seat_type: "district" },
  { title: "County Executive", level: county, seat_type: "single" },
  { title: "Register of Wills", level: county, seat_type: "single" },
  { title: "Sheriff", level: county, seat_type: "single" },
  { title: "State's Attorney", level: county, seat_type: "single" },
];

describe("sortRaces", () => {
  const titles = sortRaces(production).map((r) => r.title);

  it("opens on the County Executive, not Board of Education (the 2026-09-21 regression)", () => {
    expect(titles[0]).toBe("County Executive");
    expect(titles[0]).not.toMatch(/Board of Education/);
  });

  it("puts the council right after the executive, at-large before districts, districts in numeric order", () => {
    expect(titles.slice(1, 9)).toEqual([
      "County Council — At-Large",
      "County Council — District 1",
      "County Council — District 2",
      "County Council — District 3",
      "County Council — District 4",
      "County Council — District 5",
      "County Council — District 6",
      "County Council — District 7",
    ]);
  });

  it("orders the remaining county offices, then school board, then judicial last", () => {
    expect(titles.slice(9)).toEqual([
      "Register of Wills",
      "Sheriff",
      "State's Attorney",
      "Board of Education — At-Large",
      "Board of Education — District 1",
      "Board of Education — District 3",
      "Board of Education — District 5",
      "Circuit Court Judges",
    ]);
  });

  it("is independent of input order and doesn't mutate its input", () => {
    const shuffled = [...production].reverse();
    const before = shuffled.map((r) => r.title);
    expect(sortRaces(shuffled).map((r) => r.title)).toEqual(titles);
    expect(shuffled.map((r) => r.title)).toEqual(before);
  });

  it("sorts districts numerically, not as text (District 10 after District 2)", () => {
    const out = sortRaces([
      { title: "State Senate — District 10", level: "state", seat_type: "district" },
      { title: "State Senate — District 2", level: "state", seat_type: "district" },
    ]).map((r) => r.title);
    expect(out).toEqual(["State Senate — District 2", "State Senate — District 10"]);
  });

  it("ranks federal above state above county, and an unknown level last", () => {
    const out = sortRaces([
      { title: "Mystery Office", level: "galactic", seat_type: "single" },
      { title: "County Executive", level: "county", seat_type: "single" },
      { title: "Governor", level: "state", seat_type: "single" },
      { title: "U.S. Senate", level: "federal", seat_type: "single" },
    ]).map((r) => r.title);
    expect(out).toEqual(["U.S. Senate", "Governor", "County Executive", "Mystery Office"]);
  });
});
