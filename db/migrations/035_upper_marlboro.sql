-- Town of Upper Marlboro, MD: Prince George's County's county seat -- a
-- small incorporated TOWN government (distinct from the surrounding
-- unincorporated Upper Marlboro CDP/place name and from Prince George's
-- County government itself, both of which sit inside/around it). Real
-- officeholders live-verified 2026-08-06 against: the town's own
-- uppermarlboromd.gov Elected Officials page and individual officeholder
-- bio pages (raw HTML pulled directly via curl after the CMS's revize.com
-- widgets made WebFetch's summarized reads unreliable); the actual Charter
-- Amendment Resolution No. 02-2025 (a scanned PDF from the town's own
-- document center -- pdftotext returned nothing since it's a scan, so read
-- in full directly via vision, all 33 pages, redline [[strikeout]]/ADDED-
-- TEXT format preserved); the Maryland State Board of Elections' own
-- certified results PDF for the town's May 27, 2025 special election (also
-- scanned, also read via vision); the town's own "Meet The Candidates" page
-- for the Nov 4, 2025 general; and the msa.maryland.gov Maryland Manual
-- page for cross-checking (flagged below as STALE for this town).
--
-- CAUGHT A REAL STALE-STRUCTURE DISCREPANCY, the exact failure mode this
-- series warns about: WebSearch's very first aggregated summary, and the
-- live Maryland Manual page itself, both describe Upper Marlboro as a
-- "Board of Commissioners" with a Mayor "chosen by the Board" for 2-year
-- terms, all five members' terms expiring 2027. That description is
-- accurate for the town's PRE-2025 government but is now superseded: the
-- Board of Commissioners itself passed Charter Amendment Resolution No.
-- 02-2025 (introduced June 10, 2025; PASSED at a regular meeting July 22,
-- 2025 by a 3-2 vote -- Franklin, Colbert, and Brooks signed without
-- dissent; Lott and Hourcle each signed with a handwritten "Nay" next to
-- their names on the certified charter document) converting the town to a
-- COUNCIL-MANAGER form of government, renaming the Board "Board of
-- Commissioners" to "TOWN COUNCIL," changing "Commissioner" to "COUNCIL
-- MEMBER," moving from 2-year to 4-year Council terms, and adding a recall
-- provision (Section 82-14.2, see below). Per the amendment's own Section
-- 4, it took effect "upon the later of November 4, 2025 or the fiftieth day
-- after being so ordained," i.e. it was already in force for the Nov 4,
-- 2025 general election that seated the current roster. The Maryland
-- Manual's page had not caught up to this change as of this pass -- its
-- "2027 expiration for all five" and "Board of Commissioners" framing
-- should NOT be trusted for this town until it is refreshed.
--
-- GOVERNMENT STRUCTURE, directly read from the amended Charter text:
-- Section 82-3 -- "THE TOWN SHALL HAVE A COUNCIL-MANAGER FORM OF
-- GOVERNMENT. All legislative powers of the Town shall be vested in a TOWN
-- COUNCIL... consisting of five COUNCIL MEMBERS... elected... for a term of
-- FOUR... years." Section 82-27 confirms all five seats are elected
-- AT-LARGE (townwide, no wards) -- "the qualified voters of the Town shall
-- elect five persons as COUNCIL MEMBERS." Section 82-13 -- "At their FIRST
-- meeting IN DECEMBER 2025 AND AT THEIR FIRST MEETING FOLLOWING EVERY
-- GENERAL ELECTION THEREAFTER, a majority of the COUNCIL shall elect one of
-- their members MAYOR AND ONE OF THEIR MEMBERS AS VICE MAYOR" -- CONFIRMS
-- the exact pattern this task warned about: there is no separately-elected
-- Mayor. The Mayor and Vice Mayor titles are filled by an internal majority
-- vote of the five popularly-elected Council members, at their first
-- post-election meeting. Modeled with the same convention already
-- established for Greenbelt (migration #015): a single-seat 'Mayor' office
-- with is_elected=FALSE, filled via how_obtained='appointed' in
-- office_terms (not 'elected'); Vice Mayor is noted only in bio text, not
-- modeled as a separate office (same as Greenbelt's Mayor Pro Tem). Because
-- Mayor/Vice Mayor are re-chosen at the Council's first meeting after EVERY
-- general election, and general elections now recur every 2 years under
-- the staggered schedule below, the Mayor office's term_length_years is set
-- to 2 (the reorganization cadence), distinct from the 4-year individual
-- Council seat length -- same reasoning Greenbelt's migration used for its
-- Mayor office.
--
-- STAGGERING, directly read from Section 82-27: the Nov 4, 2025 election
-- was a one-time TRANSITION election. All five 2025 winners were elected in
-- a single at-large field, but "THE THREE CANDIDATES RECEIVING THE HIGHEST
-- NUMBER OF VOTES SHALL BE ELECTED TO A FOUR YEAR TERM AND THE TWO
-- CANDIDATES RECEIVING THE NEXT HIGHEST NUMBER OF VOTES SHALL BE ELECTED TO
-- A TWO YEAR TERM" (expiring the second Monday of December 2029 and 2027
-- respectively). Thereafter the seats renew on a genuine staggered cycle:
-- 2 seats up every 4th year starting 2027, the other 3 up every 4th year
-- starting 2029 -- real per-seat staggering, not assumed. offices.
-- term_length_years is set to 4 for the Council office (the Charter's
-- standing/general rule, and what every future cycle will use); the
-- one-time 2025-2027 transitional term for 2 of the 5 current seats is
-- disclosed here in the comment rather than encoded per-seat (see honest
-- gap below).
--
-- HONEST GAP: the Nov 4, 2025 general election was genuinely contested --
-- seven candidates (Brooks, Colbert, Franklin, Hanchett, Hourcle, Lott,
-- Odwori) for five seats, per the town's own "Meet The Candidates" page --
-- so the split into "top 3 = 4-year term" vs "next 2 = 2-year term" is
-- determined by actual vote count, not by who merely won. Despite a real
-- attempt to find those tallies (the Maryland State Board of Elections'
-- own municipal-results archive for this town only has the May 27, 2025
-- SPECIAL election -- Joseph Hourcle 59, Thomas Hanchett 40, certified May
-- 28, 2025, read via vision -- with no November general posted under any
-- filename guessed there; the town's own "Election Results" page for Nov
-- 4, 2025 shows only a pre-election "Candidates Night" flyer image, no
-- tallies; and DuckDuckGo searches -- used because this session's WebSearch
-- budget was exhausted mid-task -- turned up no news coverage with vote
-- counts), no source found this pass says WHICH 3 of the 5 current
-- Council members hold the 2025-2029 four-year term and WHICH 2 hold the
-- transitional 2025-2027 two-year term. This is disclosed rather than
-- guessed: no per-politician term_end is set (matching this series'
-- existing convention that NULL = currently serving, populated nowhere
-- else in this migration series even for a known future expiration), and
-- all five current Council members' bios flag this gap explicitly rather
-- than assert an expiration year.
--
-- TERM-START DATE for the current cohort: Section 82-6, directly read --
-- "The newly elected COUNCIL shall meet... on the second Monday of
-- December following its election for the purpose of organization," and
-- Section 82-13 pins the Mayor/Vice Mayor selection to that same first
-- December 2025 meeting. For the Nov 4, 2025 election, the second Monday
-- of December 2025 is December 8, 2025 (Dec 1, 2025 is itself a Monday) --
-- independently corroborated by the town's own bio pages, which describe
-- Colbert being "selected by his fellow Councilmembers" and Brooks
-- "becom[ing] Vice Mayor" both in "December 2025," not a guess.
--
-- ROSTER, five winners of the Nov 4, 2025 general (2 challengers, Thomas
-- Hanchett and Victor Odwori, did not win seats): Charles J. Colbert
-- (Mayor, selected by the Council Dec 8, 2025; first entered town service
-- 2022 as a Commissioner, later a Councilmember); Derrick Brooks (Vice
-- Mayor, selected by the Council Dec 8, 2025); Sarah Franklin (was Board
-- President/"Mayor" of the outgoing pre-amendment Board -- note her
-- charter-signature line above reads "Sarah Franklin, President," dated
-- July 22, 2025, i.e. she held the OLD Board's top title just before this
-- Council-Manager transition took effect, not a claim she holds any title
-- now beyond Council member); Joseph Hourcle (a former Commissioner
-- 2008-2014, who separately won a May 27, 2025 SPECIAL election for a
-- then-vacant seat, 59-40 over Thomas Hanchett, before also winning a full
-- term in the Nov 4, 2025 general -- his current term_start below uses the
-- Nov 2025/Dec 2025 date, not the superseded May special-election win);
-- Karen Lott. Minor name-format variants exist between sources: an initial
-- aggregated WebSearch summary (sourced from the stale pre-amendment
-- description) gave "Sarah A. Franklin," "Derrick F. Brooks," "Joseph A.
-- Hourcle," and "Karen H. Lott" with middle initials; the town's own
-- current Elected Officials page and the charter's own signature page both
-- consistently drop those middle initials. The no-middle-initial forms
-- (matching the town's own live site and its own certified charter
-- document) are used as full_name below; the middle-initial variants are
-- noted here, not silently discarded as wrong, since they may reflect a
-- fuller legal name used elsewhere.
--
-- is_partisan set FALSE, DIRECTLY CONFIRMED from the Charter text this
-- time, not inferred: Section 82-28, "the ballots or voting machines shall
-- show the name of each candidate, arranged in alphabetical order with no
-- party designation of any kind."
--
-- ACCOUNTABILITY -- a real, directly-quoted recall provision, newly added
-- by the same Charter Amendment 02-2025: Section 82-14.2 ("Recall of
-- Council Members"), read in full. "(A) THE MAYOR AND COUNCIL MEMBERS
-- SHALL BE SUBJECT TO RECALL BY THE QUALIFIED VOTERS OF THE TOWN." A
-- petition signed by at least 20% of the Town's qualified voters (townwide
-- -- there are no wards to draw a smaller petition base from), naming
-- exactly one officeholder, triggers verification by the Board of
-- Supervisors of Elections; no petition may be filed until the officeholder
-- has served at least 3 months, and a petition falling short of 20% gets a
-- 30-day cure window. If verified, the Council must set a special
-- "reaffirm or remove" election within 45 days; a two-thirds (2/3)
-- supermajority of votes cast in that special election is required to
-- recall, at which point the seat is declared vacant and filled per the
-- Charter's ordinary vacancy provisions (Section 82-32: a Council vacancy
-- goes to a special election; a Mayor vacancy is filled by the Council
-- electing one of its own remaining members). Modeled as one
-- accountability_pathways row per office (Mayor + Council), same fan-out
-- pattern as migrations #013/#014/#019. NOT modeled: Section 82-14.1, a
-- separate, narrower provision under which the Mayor or a Council member
-- automatically forfeits office (no vote by anyone required) upon losing
-- basic qualifications, a felony/moral-turpitude conviction, or a
-- substantiated finding of coercing a town employee -- this is an
-- automatic-vacancy trigger tied to a specific disqualifying fact, not a
-- citizen- or body-initiated accountability mechanism, so it is left
-- unmodeled, consistent with similar automatic-vacancy clauses (e.g.
-- residency-loss) going unmodeled elsewhere in this series.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:upper_marlboro', 'Town of Upper Marlboro', 'municipal', 'ocd-division/country:us/state:md/county:prince_georges')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('21000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:upper_marlboro', 'Mayor', 'single', 1, 2, FALSE, FALSE, 'municipal'),
  ('21000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:upper_marlboro', 'Town Council — At-Large', 'at_large', 5, 4, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('21000000-0000-4000-8000-000000000101', 'Charles J. Colbert', NULL, '21000000-0000-4000-8000-000000000001', 'Mayor of Upper Marlboro; first entered town service in 2022 as a Town Commissioner, later served as a Councilmember following the town''s July 22, 2025 charter transition from a Board of Commissioners to a Council-Manager government, won an at-large Town Council seat in the Nov 4, 2025 general election, and was chosen Mayor by a majority of his fellow Council members at their Dec 8, 2025 organizational meeting. Whether his underlying 2025 Council seat carries the transitional two-year term (to Dec 2027) or the regular four-year term (to Dec 2029) could not be confirmed this pass -- see header comment.'),
  ('21000000-0000-4000-8000-000000000102', 'Derrick Brooks', NULL, '21000000-0000-4000-8000-000000000002', 'Town Council member (Vice Mayor, chosen by the Council); won re-election to an at-large seat in the Nov 4, 2025 general election, took office/became Vice Mayor at the Council''s Dec 8, 2025 organizational meeting. Whether his seat carries the transitional two-year term (to Dec 2027) or the regular four-year term (to Dec 2029) could not be confirmed this pass -- see header comment. (One initial aggregated source gave "Derrick F. Brooks"; the town''s own current site and the charter''s own signature page both give "Derrick Brooks," used here.)'),
  ('21000000-0000-4000-8000-000000000103', 'Sarah Franklin', NULL, '21000000-0000-4000-8000-000000000002', 'Town Council member; was President of the outgoing pre-amendment Board of Commissioners (signed the July 22, 2025 charter amendment as "Sarah Franklin, President" just before the Council-Manager transition took effect). Won re-election to an at-large Town Council seat in the Nov 4, 2025 general election, took office Dec 8, 2025. Whether her seat carries the transitional two-year term (to Dec 2027) or the regular four-year term (to Dec 2029) could not be confirmed this pass -- see header comment. (One initial aggregated source gave "Sarah A. Franklin.")'),
  ('21000000-0000-4000-8000-000000000104', 'Joseph Hourcle', NULL, '21000000-0000-4000-8000-000000000002', 'Town Council member; a former Town Commissioner (2008-2014), he won a May 27, 2025 special election for a then-vacant seat (59 votes to Thomas Hanchett''s 40, certified May 28, 2025 by the Board of Supervisors of Elections), then separately won a full at-large term in the Nov 4, 2025 general election, taking office Dec 8, 2025. Whether his current seat carries the transitional two-year term (to Dec 2027) or the regular four-year term (to Dec 2029) could not be confirmed this pass -- see header comment. (The town''s own site spells this "Joseph "Joe" Hourclé"; the charter''s own signature page gives "Joseph Hourcle," used here. One initial aggregated source gave "Joseph A. Hourcle.")'),
  ('21000000-0000-4000-8000-000000000105', 'Karen Lott', NULL, '21000000-0000-4000-8000-000000000002', 'Town Council member; won re-election to an at-large seat in the Nov 4, 2025 general election, took office Dec 8, 2025. Publicly opposed both the move to a Town Manager and the move to four-year terms (per her own Meet-The-Candidates statement), and was one of two dissenting votes ("Nay") on the July 22, 2025 charter amendment that enacted both changes. Whether her seat carries the transitional two-year term (to Dec 2027) or the regular four-year term (to Dec 2029) could not be confirmed this pass -- see header comment. (One initial aggregated source gave "Karen H. Lott.")');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('21000000-0000-4000-8000-000000000002', '21000000-0000-4000-8000-000000000101', '2025-12-08', 'elected'),
  ('21000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000101', '2025-12-08', 'appointed'),
  ('21000000-0000-4000-8000-000000000002', '21000000-0000-4000-8000-000000000102', '2025-12-08', 'elected'),
  ('21000000-0000-4000-8000-000000000002', '21000000-0000-4000-8000-000000000103', '2025-12-08', 'elected'),
  ('21000000-0000-4000-8000-000000000002', '21000000-0000-4000-8000-000000000104', '2025-12-08', 'elected'),
  ('21000000-0000-4000-8000-000000000002', '21000000-0000-4000-8000-000000000105', '2025-12-08', 'elected');

INSERT INTO accountability_pathways (jurisdiction_id, office_id, mechanism_type, is_binding, legal_citation, signature_requirement_note, description)
SELECT 'ocd-division/country:us/state:md/place:upper_marlboro', id, 'municipal_recall', TRUE,
  'Charter of the Town of Upper Marlboro, Section 82-14.2 (Recall of Council Members), added by Charter Amendment Resolution No. 02-2025 (effective Nov 4, 2025)',
  '20% of the qualified voters of the Town (townwide -- there are no wards; the same threshold applies whether the target is the Mayor or a Council member)',
  'The Mayor and Council Members are subject to recall by the qualified voters of the Town. A petition signed by at least 20% of the Town''s qualified voters, naming exactly one officeholder, is presented to the Town Clerk and forwarded to the Board of Supervisors of Elections for verification; no petition may be filed until the officeholder has served at least three months, and a petition initially falling short of the 20% threshold gets a 30-day window to add signatures. If the petition is verified, the Council must by resolution set a special election -- not more than 45 calendar days out -- asking voters a straight "reaffirm or remove" question. A two-thirds (2/3) supermajority of votes cast in that special election is required to recall the officeholder; upon certification, the seat is declared vacant immediately and filled per the Charter''s ordinary vacancy provisions (Section 82-32).'
FROM offices WHERE jurisdiction_id = 'ocd-division/country:us/state:md/place:upper_marlboro';
