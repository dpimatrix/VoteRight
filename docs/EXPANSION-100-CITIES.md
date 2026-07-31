# VoteRight — Target list: 100 most populous US cities + counties

Status: v0.1 — reference list only, **not built, not scheduled** · 2026-07-31
Scope note: this is a candidate target list for a *future* domestic expansion
phase, analogous to how `EXPANSION-READINESS.md` lists candidate countries
without operating in them. Nothing here is seeded, coded, or committed to a
timeline — see the parent conversation for context.

## How this was produced (read before using it)

- **Population and ranking**: fetched live from a July 2025 Census Bureau
  Vintage population-estimates summary (via Wikipedia's "List of United
  States cities by population"). This part is source-backed but not
  cross-checked row-by-row against the Census Bureau's own site directly —
  re-verify against the latest Vintage release before relying on exact
  figures or order, especially for cities clustered near a rank boundary.
- **County assignment**: filled in from general geographic knowledge, **not
  live-verified per row** (100 individual lookups wasn't a proportionate use
  of time for a "not tackling now" reference list — flag if that changes).
  County lines are far more stable over time than population rank, so
  confidence here is reasonably high, but treat every row as
  re-verify-before-use, same discipline as `EXPANSION-READINESS.md`'s
  provisional country table.
- **Structural flags matter more than the county name.** A meaningful
  fraction of these 100 cities don't fit the simple "city sits inside one
  county" model our schema currently assumes (a `jurisdictions` row with a
  `county`-level parent) — see the Notes column. These are the cases that
  will actually cost engineering time if this list is ever acted on.

## The list

| # | City | State | Pop. (Jul 2025 est.) | Primary county | Notes |
|---|---|---|---|---|---|
| 1 | New York | NY | 8,584,629 | — | **5 counties**, one per borough: New York (Manhattan), Kings (Brooklyn), Queens, Bronx, Richmond (Staten Island). Breaks the one-city-one-county assumption entirely. |
| 2 | Los Angeles | CA | 3,869,089 | Los Angeles | |
| 3 | Chicago | IL | 2,731,585 | Cook | Sliver in DuPage Co. |
| 4 | Houston | TX | 2,397,315 | Harris | Extends into Fort Bend, Montgomery, Waller |
| 5 | Phoenix | AZ | 1,665,481 | Maricopa | |
| 6 | Philadelphia | PA | 1,574,281 | — | Consolidated city-county (Philadelphia Co. = the city) |
| 7 | San Antonio | TX | 1,548,422 | Bexar | Slivers in Comal, Medina |
| 8 | San Diego | CA | 1,406,106 | San Diego | |
| 9 | Dallas | TX | 1,329,491 | Dallas | Extends into Collin, Denton, Kaufman, Rockwall |
| 10 | Fort Worth | TX | 1,028,117 | Tarrant | Extends into Denton, Parker, Wise, Johnson |
| 11 | Jacksonville | FL | 1,017,689 | — | Consolidated city-county (Duval Co. = the city) |
| 12 | Austin | TX | 1,002,632 | Travis | Extends into Williamson, Hays |
| 13 | San Jose | CA | 989,814 | Santa Clara | |
| 14 | Charlotte | NC | 964,784 | Mecklenburg | |
| 15 | Columbus | OH | 938,396 | Franklin | Slivers in Delaware, Fairfield |
| 16 | Indianapolis | IN | 901,116 | — | Consolidated city-county (Unigov; Marion Co. = the city) |
| 17 | San Francisco | CA | 826,079 | — | Consolidated city-county |
| 18 | Seattle | WA | 784,777 | King | |
| 19 | Denver | CO | 740,613 | — | Consolidated city-county |
| 20 | Nashville | TN | 721,074 | — | Consolidated metro government (Davidson Co. = the city) |
| 21 | Oklahoma City | OK | 719,849 | Oklahoma | Extends into Cleveland, Canadian, Pottawatomie |
| 22 | Washington | DC | 693,645 | — | No county layer — **already seeded** in VoteRight |
| 23 | El Paso | TX | 683,012 | El Paso | |
| 24 | Las Vegas | NV | 679,817 | Clark | |
| 25 | Boston | MA | 672,973 | Suffolk | |
| 26 | Detroit | MI | 649,095 | Wayne | |
| 27 | Louisville | KY | 641,962 | — | Consolidated metro government (Jefferson Co. = the city) |
| 28 | Portland | OR | 635,109 | Multnomah | Slivers in Washington, Clackamas |
| 29 | Memphis | TN | 609,647 | Shelby | |
| 30 | Baltimore | MD | 569,997 | — | **Independent city** — not part of any county |
| 31 | Milwaukee | WI | 562,407 | Milwaukee | |
| 32 | Albuquerque | NM | 556,588 | Bernalillo | |
| 33 | Fresno | CA | 555,549 | Fresno | |
| 34 | Tucson | AZ | 548,371 | Pima | |
| 35 | Sacramento | CA | 536,449 | Sacramento | |
| 36 | Atlanta | GA | 529,110 | Fulton | Extends into DeKalb |
| 37 | Kansas City | MO | 521,220 | Jackson | Extends into Clay, Cass, Platte |
| 38 | Mesa | AZ | 513,656 | Maricopa | |
| 39 | Raleigh | NC | 506,306 | Wake | |
| 40 | Colorado Springs | CO | 494,743 | El Paso (CO) | |
| 41 | Miami | FL | 489,812 | Miami-Dade | |
| 42 | Omaha | NE | 488,797 | Douglas | |
| 43 | Virginia Beach | VA | 453,737 | — | **Independent city** — not part of any county |
| 44 | Long Beach | CA | 450,469 | Los Angeles | |
| 45 | Oakland | CA | 440,838 | Alameda | |
| 46 | Minneapolis | MN | 430,324 | Hennepin | |
| 47 | Bakersfield | CA | 422,165 | Kern | |
| 48 | Tulsa | OK | 416,209 | Tulsa | Slivers in Osage, Wagoner, Rogers |
| 49 | Tampa | FL | 413,554 | Hillsborough | |
| 50 | Aurora | CO | 410,053 | Arapahoe | Extends into Adams, Douglas |
| 51 | Arlington | TX | 402,134 | Tarrant | |
| 52 | Wichita | KS | 400,987 | Sedgwick | |
| 53 | Cleveland | OH | 363,608 | Cuyahoga | |
| 54 | New Orleans | LA | 362,154 | — | Louisiana has no counties — consolidated city-**parish** (Orleans Parish) |
| 55 | Henderson | NV | 353,289 | Clark | |
| 56 | Honolulu | HI | 341,868 | — | Consolidated City and County of Honolulu (covers all of Oahu) |
| 57 | Anaheim | CA | 341,008 | Orange | |
| 58 | Orlando | FL | 333,888 | Orange (FL) | |
| 59 | Lexington | KY | 329,751 | — | Consolidated urban-county government (Fayette Co. = the city) |
| 60 | Stockton | CA | 324,597 | San Joaquin | |
| 61 | Newark | NJ | 323,808 | Essex | |
| 62 | Riverside | CA | 323,057 | Riverside | |
| 63 | Irvine | CA | 318,764 | Orange | |
| 64 | Corpus Christi | TX | 317,247 | Nueces | Sliver in San Patricio |
| 65 | Santa Ana | CA | 315,586 | Orange | |
| 66 | Cincinnati | OH | 314,367 | Hamilton | |
| 67 | Greensboro | NC | 308,667 | Guilford | |
| 68 | Pittsburgh | PA | 307,632 | Allegheny | |
| 69 | St. Paul | MN | 306,684 | Ramsey | |
| 70 | Durham | NC | 305,561 | Durham | Slivers in Wake, Orange, Person |
| 71 | Jersey City | NJ | 302,013 | Hudson | |
| 72 | Lincoln | NE | 301,522 | Lancaster | |
| 73 | North Las Vegas | NV | 296,653 | Clark | |
| 74 | Plano | TX | 293,028 | Collin | Sliver in Denton |
| 75 | Gilbert | AZ | 287,285 | Maricopa | |
| 76 | Anchorage | AK | 287,155 | — | Alaska has no counties — unified home-rule municipality/borough-equivalent |
| 77 | Madison | WI | 286,233 | Dane | |
| 78 | Reno | NV | 283,621 | Washoe | |
| 79 | Chandler | AZ | 278,748 | Maricopa | |
| 80 | St. Louis | MO | 278,144 | — | **Independent city** — not part of any county (separate from St. Louis County) |
| 81 | Chula Vista | CA | 275,533 | San Diego | |
| 82 | Fort Wayne | IN | 275,203 | Allen | |
| 83 | Buffalo | NY | 274,613 | Erie | |
| 84 | Lubbock | TX | 273,071 | Lubbock | |
| 85 | Laredo | TX | 269,515 | Webb | |
| 86 | Port St. Lucie | FL | 268,062 | St. Lucie | |
| 87 | St. Petersburg | FL | 264,033 | Pinellas | |
| 88 | Toledo | OH | 263,423 | Lucas | |
| 89 | Glendale | AZ | 260,572 | Maricopa | |
| 90 | Winston-Salem | NC | 257,271 | Forsyth | |
| 91 | Irving | TX | 257,076 | Dallas | Sliver in Denton |
| 92 | Chesapeake | VA | 255,332 | — | **Independent city** — not part of any county |
| 93 | Garland | TX | 249,625 | Dallas | Slivers in Collin, Rockwall |
| 94 | Scottsdale | AZ | 243,006 | Maricopa | |
| 95 | Boise | ID | 238,429 | Ada | |
| 96 | Richmond | VA | 237,257 | — | **Independent city** — not part of any county |
| 97 | Frisco | TX | 236,955 | — | Genuinely split between Collin and Denton counties, no clear majority |
| 98 | Cape Coral | FL | 236,264 | Lee | |
| 99 | McKinney | TX | 236,001 | Collin | |
| 100 | Huntsville | AL | 233,627 | Madison (AL) | Sliver in Limestone |

## Structural implications for the schema (if/when this is ever acted on)

Roughly 15 of these 100 don't fit VoteRight's current `jurisdictions` model
(a city's `parent_ocd_id` points at one county-level parent), the same way
D.C. required a special case in the DMV expansion:

- **5 consolidated city-county governments** (Philadelphia, Indianapolis,
  San Francisco, Denver, Honolulu) plus **3 consolidated metro governments**
  (Nashville, Louisville, Lexington) — same pattern already used for D.C.:
  one `jurisdictions` row at the county-equivalent level, no separate
  parent.
- **5 Virginia/Missouri/Maryland independent cities** (Virginia Beach,
  Chesapeake, Richmond VA, St. Louis, Baltimore) — no county parent at all,
  same as D.C.
- **New Orleans** — Louisiana's "parish" terminology, not "county"; the
  `jurisdictions.level` CHECK constraint would need a look (currently
  `county|municipal|...` — parishes are the county-equivalent, so probably
  just modeled as `level='county'` with a note, but worth a real decision
  rather than silently mislabeling).
- **Alaska has no counties at all** — Anchorage is a unified
  home-rule borough-equivalent; any future Alaska city needs the same
  no-county-parent treatment.
- **Frisco, TX** — genuinely split across two counties with no dominant
  one; the real fix is address-level (not city-level) resolution, same as
  how VoteRight already resolves *county* council districts by exact
  address today.
- Several more (Chicago, Houston, Dallas, Fort Worth, Austin, Columbus,
  Atlanta, Kansas City, Oklahoma City, Portland, Tulsa, Aurora, Durham,
  Corpus Christi, Plano, Irving, Garland, Huntsville) have a clear primary
  county but genuinely extend into 1-4 secondary counties — fine to model
  as single-county for a v1 (matches how Fairfax/Arlington were modeled
  this pass), but an address near the edge could resolve wrong until
  address-level precision exists.

No further action planned — this file exists purely as a reference for
whenever domestic expansion beyond the DMV is picked back up.
