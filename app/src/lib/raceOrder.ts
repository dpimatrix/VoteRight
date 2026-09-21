/* Display order for races (Matches chips, Priorities, the native app's race
   picker). Every caller takes races()[0] as the default selection, so this
   order decides what a resident sees first.

   It used to be plain `ORDER BY o.title` -- alphabetical -- which put "Board
   of Education -- At-Large" first for every Montgomery County resident. Its
   candidates are all newcomers with no photo, so Matches opened on a screen
   of initials and looked like it had lost its thumbnails (owner report,
   2026-09-21). Alphabetical is arbitrary; prominence isn't.

   Order: government level (federal, state, county, municipal, school board,
   judicial), then within a level the chief executive, then legislative
   bodies, then everything else, then at-large before single-seat before
   districts, with "District 2" before "District 10". Title is the final
   tiebreak so the result is fully deterministic. Title matching is a
   heuristic -- an unrecognized title falls to "everything else", which
   sorts last within its level rather than breaking anything. */

export interface OrderableRace {
  title: string;
  level: string;
  seat_type: string;
}

const LEVEL_RANK: Record<string, number> = {
  federal: 0,
  state: 1,
  county: 2,
  municipal: 3,
  school_board: 4,
  judicial: 5,
};

const EXECUTIVE = /\b(executive|governor|president|mayor)\b/i;
const LEGISLATIVE = /\b(council|senat\w*|house|assembl\w*|delegate\w*|representative\w*|legislat\w*|supervisor\w*)\b/i;

const SEAT_RANK: Record<string, number> = { at_large: 0, single: 1, district: 2 };

function bodyRank(title: string): number {
  if (EXECUTIVE.test(title)) return 0;
  if (LEGISLATIVE.test(title)) return 1;
  return 2;
}

// First number in the title ("County Council -- District 10" -> 10), so
// districts sort numerically instead of as text. 0 when there isn't one.
function districtNumber(title: string): number {
  const m = title.match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

export function compareRaces(a: OrderableRace, b: OrderableRace): number {
  return (
    (LEVEL_RANK[a.level] ?? 99) - (LEVEL_RANK[b.level] ?? 99) ||
    bodyRank(a.title) - bodyRank(b.title) ||
    (SEAT_RANK[a.seat_type] ?? 9) - (SEAT_RANK[b.seat_type] ?? 9) ||
    districtNumber(a.title) - districtNumber(b.title) ||
    a.title.localeCompare(b.title)
  );
}

export function sortRaces<T extends OrderableRace>(rows: T[]): T[] {
  return [...rows].sort(compareRaces);
}
