-- Closes the last two known Montgomery County data gaps flagged 2026-08-14
-- (Clerk of the Circuit Court, Board of Education — District 2): both
-- offices existed as bare office rows since the original county seed
-- (db/seed.prod.sql, db/seed.roster-2026-full-scope.sql) with no
-- politicians/office_terms row ever added -- not a lookup failure, just
-- never populated. Hand-verified against each office's own primary
-- source, same discipline as every other real-officeholder fact in this
-- project.
--
-- Clerk of the Circuit Court: Karen A. Bushell -- confirmed directly
-- against Montgomery County's own official page
-- (montgomerycountymd.gov/circuit-court/about-us/clerk-court).
-- Appointed April 1, 2021 (completing her predecessor Barbara
-- Meiklejohn's term after Meiklejohn's retirement -- the source of an
-- outdated "Meiklejohn is the incumbent" mention still findable in an
-- older news search result, resolved in Bushell's favor against the
-- county's own current page), elected outright to her own full 4-year
-- term in the November 2022 general election (Ballotpedia, Bethesda
-- Magazine). term_start below models the ELECTED term, not the 2021
-- appointment. Exact swearing-in date not found in either source;
-- Maryland Clerks of Circuit Court conventionally take office the first
-- Monday in December following the election -- used as a disclosed
-- approximation (2022-12-05), term_start_precise left at its default
-- (false) accordingly, same never-guess-with-false-confidence posture as
-- everything else in that column.
--
-- Board of Education — District 2: Natalie Zimmerman -- confirmed
-- directly against Montgomery County Public Schools' own official
-- members page (montgomeryschoolsmd.org/boe/members/). A Rockville
-- resident, elected to her first term in the November 2024 general
-- election, term runs through 2028. Same disclosed approximation as
-- Bushell's date above (first Monday in December following the
-- election, 2024-12-02 -- exact swearing-in date not found in the
-- source), term_start_precise left at its default (false) accordingly.
-- Nonpartisan by design (Maryland school boards are elected on a
-- nonpartisan basis; this office's own is_partisan=FALSE, set when the
-- seat was originally seeded) -- party left NULL, not guessed.
-- photo_url: official portraits, re-hosted locally (see
-- app/public/politicians/ATTRIBUTION.md) -- Bushell's from Montgomery
-- County's own asset host (assets.montgomerycountymd.gov, the same host
-- the hand-curated County Council portraits already use), Zimmerman's
-- from Montgomery County Public Schools' own site.
INSERT INTO politicians (id, full_name, party, current_office_id, bio, photo_url) VALUES
  ('83000000-0000-4000-8000-000000000001', 'Karen A. Bushell', 'D', '00000000-0000-4000-8000-000000000406', 'Clerk of the Circuit Court, Montgomery County, Maryland. Appointed April 1, 2021; elected to a full 4-year term in the November 2022 general election.', '/politicians/bushell.webp'),
  ('83000000-0000-4000-8000-000000000002', 'Natalie Zimmerman', NULL, '00000000-0000-4000-8000-000000000432', 'Board of Education — District 2, Montgomery County, Maryland. Rockville resident, elected to her first term in the November 2024 general election; term runs through 2028.', '/politicians/zimmerman.webp');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('00000000-0000-4000-8000-000000000406', '83000000-0000-4000-8000-000000000001', '2022-12-05', 'elected'),
  ('00000000-0000-4000-8000-000000000432', '83000000-0000-4000-8000-000000000002', '2024-12-02', 'elected');
