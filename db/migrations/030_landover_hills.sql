-- Town of Landover Hills, MD: Real officeholders live-verified 2026-08-06
-- against: the Maryland Manual's live page (msa.maryland.gov, copyright-dated
-- July 18, 2025); the actual Charter of the Town of Landover Hills (both the
-- Maryland General Assembly's 2008 PDF reprint, extracted via pdftotext, AND
-- the town's own live charter pages at landoverhillsmd.gov, which use
-- slightly different section numbers for identical text -- cross-checked
-- word-for-word); and, decisively, the town's own official Town Council
-- meeting minutes PDFs (extracted via pdftotext after WebFetch alone
-- returned only "binary/encoded, cannot extract text" on every one of them)
-- for June 16 2025, July 21 2025, August 18 2025, June 1 2026, and June 29
-- 2026 -- primary-source attendance rolls and resolution texts, not
-- secondhand summaries.
--
-- CAUGHT A REAL DISCREPANCY, IN THE OPPOSITE DIRECTION FROM THIS SERIES'
-- USUAL TRAP: the Maryland Manual (normally the most reliable source in
-- this series for current officeholders) turned out to be STALE here. Its
-- July 18, 2025 snapshot lists the Ward 1 seat formerly held by Jeannette
-- M. Ripley (who died May 20, 2025) as still VACANT, "no appointment yet
-- made." An initial aggregated WebSearch result and the town's own (also
-- stale-looking, term-date-wise: it shows expired "5/23"/"5/25" dates as if
-- current) council roster page both instead named "Oral Grant" as a Ward 1
-- member -- which at first looked exactly like the kind of stale/
-- third-party name this series has repeatedly had to discard (e.g.
-- Edmonston's "Tracy Gant"). It was NOT: the town's own August 18, 2025
-- Town Council meeting minutes, read directly, record the actual
-- appointment: "Mayor Schomisch entertained a motion for the Council to
-- appoint Dr. Oral Grant to fill the vacant Ward 1 Council seat until the
-- 2027 election ... All present voted in favor. Mayor Schomisch presided
-- over the swearing-in ceremony" -- a Charter Section 306/307 Council
-- appointment-to-fill-vacancy, following the exact procedure the Council
-- had itself laid out one meeting earlier in Resolution R-11-2025 (June 16,
-- 2025: declaring the seat vacant "in accordance with Section 306 of the
-- Town Charter" following Ripley's death). Grant's continued service is
-- independently confirmed by his presence on the attendance rolls of both
-- the June 1, 2026 and June 29, 2026 meeting minutes -- the two most
-- recent posted as of this pass. The Maryland Manual is simply five weeks
-- out of date on this one seat (its July 18, 2025 copyright date precedes
-- Grant's August 18, 2025 appointment). Oral Grant IS used below, sourced
-- to the Town's own primary-source meeting minutes, not to the aggregated
-- search snippet or the stale-dated town roster page.
--
-- GOVERNMENT STRUCTURE, directly confirmed from the Charter (current
-- numbering Section 302; Section 301 in the 2008 MSA reprint -- identical
-- text, offset numbering): "ALL LEGISLATIVE POWERS OF THE TOWN SHALL BE
-- VESTED IN A COUNCIL CONSISTING OF A MAYOR AND SIX (6) COUNCILMEMBERS,"
-- two elected from each of three Wards; Mayor elected at large. All terms
-- are four years. Terms are genuinely staggered per Ward, dating to a
-- one-time 1995 split (Charter Section 607/606: the top vote-getter in
-- each Ward's 1995 election got a 4-year term, the runner-up got a 2-year
-- term to resynchronize onto a parallel 4-year cycle starting 1997) --
-- confirmed by the current roster itself, which shows one seat per Ward
-- expiring 2027 (elected on the "1995-parity" cycle, most recently May 9,
-- 2023 -- the charter-specified "second Tuesday of May") and the other
-- expiring 2029 (elected on the "1997-parity" cycle, most recently May 13,
-- 2025, also a charter-specified second Tuesday); both election dates are
-- computed directly from the charter's "second Tuesday of May" rule
-- (Section 607/606) plus the confirmed expiration years, not estimates --
-- and the May 13, 2025 date is itself corroborated by the Maryland
-- Manual's note that Kathleen D. Walker "ran unopposed in May 2025."
--
-- VICE MAYOR is NOT modeled as a separate office: Charter Section 310/311
-- ("At the organizational meeting, the Council shall elect one (1) of its
-- members as Vice Mayor") makes it an internal leadership title the
-- Council assigns to one of its own elected members, not an independently
-- elected or appointed position -- consistent with this series' convention
-- of not modeling internal committee/leadership titles as separate offices.
-- Ripley held it until her death; the June 1, 2026 and June 29, 2026
-- meeting minutes both show Glenda F. Johnson (Ward 3) now holds it --
-- noted in her bio below, no separate office/politician row created for it.
-- No source found this pass pins down the exact date Johnson was chosen.
--
-- is_partisan set FALSE, DIRECTLY CONFIRMED (not inferred) from Charter
-- Section 608/609.A, quoted directly: "Elections shall be on a non-partisan
-- basis. The ballots and/or voting machines shall show the name of each
-- candidate ... with no party designation of any kind[s]."
--
-- ACCOUNTABILITY: Charter Section 306.C (2008 MSA reprint) / 307.C
-- (current live numbering), "Removal from Office," quoted directly, is a
-- genuine, real, citizen-petition-triggered, binding removal mechanism --
-- functionally a recall despite not using that word. A separate section
-- literally titled "Petitions for Referendum or Recall" (Section 312 in
-- the 2008 MSA reprint) is a placeholder that was never filled in --
-- its only content is the bracketed note "[ADD NEW LANGUAGE]" -- and no
-- longer even appears in the current live charter's section numbering, so
-- it is NOT cited below. The real, operative text: "Upon presentation to
-- the Mayor of a petition for removal signed by not less than twenty
-- percent (20%) of the qualified voters of the Ward in the case of a
-- Councilmember, or in case of the Mayor, twenty percent (20%) of the
-- qualified voters of the Town. Within sixty (60) days following receipt
-- of the petition, a referendum on this question will be held and the
-- concerned member or Mayor shall be removed if approved by a majority of
-- the voters in the Ward or Town." Modeled as one accountability_pathways
-- row per office (Mayor + all 3 Wards), same fan-out pattern as migrations
-- #013/#014/#019.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:landover_hills', 'Town of Landover Hills', 'municipal', 'ocd-division/country:us/state:md/county:prince_georges')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('1c000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:landover_hills', 'Mayor', 'single', 1, 4, FALSE, TRUE, 'municipal'),
  ('1c000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:landover_hills', 'Town Council — Ward 1', 'district', 2, 4, FALSE, TRUE, 'municipal'),
  ('1c000000-0000-4000-8000-000000000003', 'ocd-division/country:us/state:md/place:landover_hills', 'Town Council — Ward 2', 'district', 2, 4, FALSE, TRUE, 'municipal'),
  ('1c000000-0000-4000-8000-000000000004', 'ocd-division/country:us/state:md/place:landover_hills', 'Town Council — Ward 3', 'district', 2, 4, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('1c000000-0000-4000-8000-000000000101', 'Jeffrey W. Schomisch', NULL, '1c000000-0000-4000-8000-000000000001', 'Mayor of Landover Hills since 2019; most recently re-elected at large on the charter-specified second Tuesday of May, May 9, 2023, for a term expiring 2027.'),
  ('1c000000-0000-4000-8000-000000000102', 'Julio Murillo', NULL, '1c000000-0000-4000-8000-000000000002', 'Town Council Ward 1 member; elected May 13, 2025, for a term expiring 2029.'),
  ('1c000000-0000-4000-8000-000000000103', 'Oral Grant', NULL, '1c000000-0000-4000-8000-000000000002', 'Town Council Ward 1 member; appointed by the Council on August 18, 2025 (and sworn in the same night) to fill the seat left vacant by the death of Councilmember Jeannette "Jeannie" Ripley on May 20, 2025, per Charter Section 306/307 and Resolution R-11-2025. Serves the remainder of Ripley''s term until the 2027 Town election. Referred to as "Dr. Oral Grant" in the town''s own meeting minutes.'),
  ('1c000000-0000-4000-8000-000000000104', 'John Michael Walker', NULL, '1c000000-0000-4000-8000-000000000003', 'Town Council Ward 2 member; goes by "Mike Walker" in the town''s own records; elected May 9, 2023, for a term expiring 2027.'),
  ('1c000000-0000-4000-8000-000000000105', 'Kathleen D. Walker', NULL, '1c000000-0000-4000-8000-000000000003', 'Town Council Ward 2 member; elected May 13, 2025 (ran unopposed), for a term expiring 2029.'),
  ('1c000000-0000-4000-8000-000000000106', 'Todd G. Over', NULL, '1c000000-0000-4000-8000-000000000004', 'Town Council Ward 3 member; elected May 13, 2025, for a term expiring 2029.'),
  ('1c000000-0000-4000-8000-000000000107', 'Glenda F. Johnson', NULL, '1c000000-0000-4000-8000-000000000004', 'Town Council Ward 3 member; elected May 9, 2023, for a term expiring 2027. Also currently serves as Vice Mayor, an internal leadership title the Council elects one of its own members to at its organizational meeting (Charter Section 310/311) rather than a separately elected office -- confirmed by her listing as "Vice Mayor Glenda Johnson" in the June 1, 2026 and June 29, 2026 Town Council meeting minutes.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('1c000000-0000-4000-8000-000000000001', '1c000000-0000-4000-8000-000000000101', '2023-05-09', 'elected'),
  ('1c000000-0000-4000-8000-000000000002', '1c000000-0000-4000-8000-000000000102', '2025-05-13', 'elected'),
  ('1c000000-0000-4000-8000-000000000002', '1c000000-0000-4000-8000-000000000103', '2025-08-18', 'appointed'),
  ('1c000000-0000-4000-8000-000000000003', '1c000000-0000-4000-8000-000000000104', '2023-05-09', 'elected'),
  ('1c000000-0000-4000-8000-000000000003', '1c000000-0000-4000-8000-000000000105', '2025-05-13', 'elected'),
  ('1c000000-0000-4000-8000-000000000004', '1c000000-0000-4000-8000-000000000106', '2025-05-13', 'elected'),
  ('1c000000-0000-4000-8000-000000000004', '1c000000-0000-4000-8000-000000000107', '2023-05-09', 'elected');

INSERT INTO accountability_pathways (jurisdiction_id, office_id, mechanism_type, is_binding, legal_citation, signature_requirement_note, description)
SELECT 'ocd-division/country:us/state:md/place:landover_hills', id, 'municipal_recall', TRUE,
  'Charter of the Town of Landover Hills, Section 306.C (2008 Maryland General Assembly reprint) / Section 307.C (current live numbering), "Removal from Office"',
  '20% of the qualified voters of the Ward to remove a Councilmember; 20% of the qualified voters of the Town to remove the Mayor',
  'A petition for removal presented to the Mayor, signed by the required threshold, triggers a binding referendum within 60 days; the concerned Councilmember or the Mayor is removed if a majority of voters in the Ward or Town (as applicable) vote to remove. The Charter also allows involuntary removal upon felony conviction or upon missing three consecutive monthly Council meetings without excuse (same Section, subsections A-B), but those are not citizen-initiated and are not modeled here. A separate section titled "Petitions for Referendum or Recall" (Section 312 in the 2008 reprint) exists only as an unfilled placeholder ("[ADD NEW LANGUAGE]") and has no operative text, so it is not the citation used.'
FROM offices WHERE jurisdiction_id = 'ocd-division/country:us/state:md/place:landover_hills';
