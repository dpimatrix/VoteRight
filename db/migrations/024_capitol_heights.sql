-- Town of Capitol Heights, MD: sixth of the PG "town" tier (after Cheverly
-- #019, Bladensburg #020, Berwyn Heights #021, Edmonston #022, Brentwood
-- #023). Real officeholders live-verified 2026-08-05 against: the town's
-- own capitolheightsmd.gov "Mayor & Town Council" page; the Maryland
-- Manual's live page (msa.maryland.gov/msa/mdmanual/37mun/capitol/html/c.html
-- -- gives every current officeholder with a 2030 term-expiration year) AND
-- its separate Capitol Heights Mayors history page; the town's own OFFICIAL,
-- DATED, CERTIFIED "Official Election Results -- As of Monday, May 4, 2026"
-- document (capitolheightsmd.gov/DocumentCenter/View/6710, a PDF read
-- directly via pdftotext after WebFetch returned only binary/garbled text --
-- exact vote totals for every candidate, Mayor and all 16 Councilmember
-- candidates); the SAME document independently mirrored on the State of
-- Maryland's own elections.maryland.gov site (byte-for-byte identical
-- content -- a genuine second, independent host of the town's certified
-- results, not just the town's own copy); the town's own May 4, 2026
-- Election-Day/Nomination-Convention Proclamation (DocumentCenter/View/6158,
-- also pdftotext'd after a binary WebFetch failure); and the actual Charter
-- of the Town of Capitol Heights (Maryland General Assembly's own 2022 PDF
-- reprint, mgaleg.maryland.gov -- WebFetch failed with a TLS
-- hostname/certificate mismatch on the "www." host, then returned only
-- binary/garbled text even after removing "www."; the PDF was still saved
-- locally by WebFetch and extracted in full via pdftotext -layout --
-- Articles II and III read in their entirety, not a search-engine snippet).
--
-- GOVERNMENT STRUCTURE, directly confirmed from Charter Section 304
-- ("Election of the Mayor and Council"): "the qualified voters of the Town
-- shall elect one person as Mayor and six persons as councilmembers to each
-- serve for a term of four years." No wards are mentioned anywhere in
-- Section 304 or elsewhere in the Charter, and the certified May 4, 2026
-- results list all 16 Councilmember candidates in one single ranked field
-- (top 6 vote-getters win town-wide) -- confirming a purely AT-LARGE
-- council, term_length_years=4, seat_count=6, elected on the same single
-- cycle as the Mayor with NO staggering (Section 304: "the first Monday in
-- May of 1998 and every four years thereafter"). The Mayor IS a separately,
-- directly elected office on the same ballot (not council-selected): the
-- certified results document lists "The Office of Mayor" with its own
-- distinct vote tally, separate from "The Office of Councilmember."
--
-- CAUGHT A REAL STALE-NAME DISCREPANCY, same pattern flagged in this
-- series' brief: the town's own live "Mayor & Town Council" page (fetched
-- 2026-08-05) lists a 7th name, "Ronald Williams," alongside the same six
-- names given below, and its prose is stale, still describing the "May 2,
-- 2022" election and "sworn into office ... May 9, 2022" -- i.e. that page
-- has not been updated since the PRIOR (2022-2026) term. The town's own
-- certified May 4, 2026 election results (independently mirrored on
-- elections.maryland.gov) show Ronald Williams was a candidate for
-- re-election in 2026 but LOST, finishing 7th of 16 with 152 votes, four
-- votes behind the 6th-place winner, Faith Ford (156). Williams' name is
-- NOT used below as a current officeholder; the six actual 2026 winners
-- (LaTonya Chew, Amanda Anderson, Anita Anderson, Rhonda Akers, Victor L.
-- James, Faith Ford) match, name-for-name, both the certified election
-- document and the live Maryland Manual page (which independently lists
-- the same six plus Mayor Linda D. Monroe, all with a 2030 term-expiration
-- year) -- two independent current sources agreeing with each other against
-- the town's own stale roster subpage.
--
-- CERTIFIED MAY 4, 2026 RESULTS (exact vote totals, read directly from the
-- certified document, cross-verified against the byte-identical
-- elections.maryland.gov mirror): Mayor -- Linda Monroe 192 over Claudia
-- Williams 168. Councilmember (6 seats, at-large, top 6 of 16 candidates
-- win): LaTonya Chew 232, Amanda Anderson 176, Anita Anderson 173, Rhonda
-- Akers 169, Victor L. James 164, Faith Ford 156 -- then Ronald Williams 152
-- (lost), James Brown 143, and eight further candidates down to Donell G.
-- McLennon 26. Total votes cast: 377 (a small-turnout town-wide election,
-- consistent with the town's population).
--
-- TERM-START DATE -- HONEST GAP: the Charter's Section 901 (Oath of Office)
-- requires the Mayor and Council to take an oath "before entering upon the
-- duties of their offices," administered by the Clerk of the Circuit Court
-- for Prince George's County, but pins down no specific calendar date or
-- day-count after the election. The certified results document itself,
-- dated the same day as the election (May 4, 2026), still calls the winners
-- "Mayor-Elect" and "Councilmember-Elect," confirming they had not yet taken
-- office as of that date. The prior (2022) cycle's pattern -- elected
-- Monday, May 2, 2022, sworn in the following Monday, May 9, 2022, per the
-- town's own site -- suggests a similar ~1-week gap might apply again in
-- 2026 (which would put swearing-in around Monday, May 11, 2026), but no
-- source found this pass directly confirms an exact 2026 oath date (the
-- town's Minutes page lists a "05.15.2026 Special Session Minutes" entry
-- with no working document link to check). May 4, 2026 (the certified
-- election date itself) is used below as a reasonable, explicitly disclosed
-- estimate, same convention as Cheverly's migration #019 -- not a
-- fabricated precise oath date.
--
-- is_partisan set FALSE by inference: the full Charter text obtained this
-- pass (Articles II and III, plus Section 901) contains no explicit
-- "nonpartisan" declaration and no party-designation mechanism of any kind
-- -- consistent with every other Maryland municipality modeled so far,
-- though not as directly confirmed as e.g. Bowie/District Heights/Glenarden's
-- explicit charter language.
--
-- ACCOUNTABILITY -- TWO REAL, DISTINCT, DIRECTLY-CITED MECHANISMS FOUND IN
-- THE CHARTER TEXT (Article II, Sections 205-206), modeled as two separate
-- fan-out rows, same pattern as migrations #013/#014:
--
-- (1) Section 205, "Forfeiture of Office": the Mayor or a Councilmember
-- automatically forfeits office for (a) lacking a legal qualification, (b)
-- violating an express Charter prohibition or failing an affirmative
-- Charter duty, (c) a felony conviction, or (d) missing three consecutive
-- regular meetings unexcused. After a public hearing, forfeiture is
-- formalized by "a favorable vote of four (4) members" of the 7-member body
-- (Mayor + 6 Council) -- a genuine supermajority threshold (4 of 7), not
-- merely a majority of those present. Purely internal, not citizen-petition
-- triggered. Modeled as 'supermajority_council_removal', the same bucket
-- used for this pattern in migrations #013/#014/#018.
--
-- (2) Section 206, "Removal Proceedings": the Mayor or a Councilmember may
-- be removed for malfeasance, misfeasance, or nonfeasance in office, but
-- ONLY via a citizen petition signed by at least 25% of the Town's
-- registered voters (with a required per-page circulator affidavit),
-- referred to the Prince George's County Board of Supervisors of Elections
-- for signature verification. If validated, the Mayor and Council MAY hold
-- a quasi-judicial public hearing -- explicitly styled as a "board of
-- inquiry" with a chairman, the Town Attorney acting as prosecutor, the
-- accused as "defendant," subpoena power, and rules of evidence -- and the
-- official "shall be immediately removed... if a majority of the Mayor and
-- Council votes to remove," appealable de novo to the Circuit Court within
-- 10 days. THIS IS A DELIBERATE, DISCLOSED CATEGORIZATION JUDGMENT CALL:
-- despite the citizen-petition trigger and 25%-signature threshold
-- resembling the 'municipal_recall' rows modeled for Cheverly/Glenarden/
-- District Heights, Section 206 is NOT tagged 'municipal_recall' here,
-- because — unlike those towns — the final removal decision in Capitol
-- Heights is made by a MAJORITY VOTE OF THE MAYOR AND COUNCIL ITSELF
-- sitting as a trial body, not by a binding special election of the
-- electorate. The mechanics (accusation, quasi-judicial hearing before the
-- elected body, vote by that body to remove) are structurally an
-- impeachment/trial process, not a ballot-box recall, so it is tagged
-- 'impeachment' instead -- the closest available enum value -- with this
-- reasoning stated plainly in its description field too, same honesty
-- convention as migration #018 Seat Pleasant's "not a citizen-initiated
-- recall and not literally a supermajority-vote requirement" note.

INSERT INTO jurisdictions (ocd_id, name, level, parent_ocd_id) VALUES
  ('ocd-division/country:us/state:md/place:capitol_heights', 'Town of Capitol Heights', 'municipal', 'ocd-division/country:us/state:md/county:prince_georges')
ON CONFLICT (ocd_id) DO NOTHING;

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('16000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:md/place:capitol_heights', 'Mayor', 'single', 1, 4, FALSE, TRUE, 'municipal'),
  ('16000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:md/place:capitol_heights', 'Town Council — At-Large', 'at_large', 6, 4, FALSE, TRUE, 'municipal');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('16000000-0000-4000-8000-000000000101', 'Linda Monroe', NULL, '16000000-0000-4000-8000-000000000001', 'Mayor of Capitol Heights; won re-election May 4, 2026 with 192 votes over Claudia Williams (168). Also given as "Linda D. Monroe" on the Maryland Manual''s live page (term expires 2030).'),
  ('16000000-0000-4000-8000-000000000102', 'LaTonya Chew', NULL, '16000000-0000-4000-8000-000000000002', 'Town Council member; won re-election May 4, 2026 as the top vote-getter of 16 Councilmember candidates, with 232 votes.'),
  ('16000000-0000-4000-8000-000000000103', 'Amanda Anderson', NULL, '16000000-0000-4000-8000-000000000002', 'Town Council member; won re-election May 4, 2026 with 176 votes.'),
  ('16000000-0000-4000-8000-000000000104', 'Anita Anderson', NULL, '16000000-0000-4000-8000-000000000002', 'Town Council member; won re-election May 4, 2026 with 173 votes.'),
  ('16000000-0000-4000-8000-000000000105', 'Rhonda Akers', NULL, '16000000-0000-4000-8000-000000000002', 'Town Council member; won re-election May 4, 2026 with 169 votes.'),
  ('16000000-0000-4000-8000-000000000106', 'Victor L. James', NULL, '16000000-0000-4000-8000-000000000002', 'Town Council member; won re-election May 4, 2026 with 164 votes. Also given as "Victor L. James, Sr." on the town''s website.'),
  ('16000000-0000-4000-8000-000000000107', 'Faith Ford', NULL, '16000000-0000-4000-8000-000000000002', 'Town Council member; won re-election May 4, 2026 with 156 votes, narrowly holding the 6th and final seat 4 votes ahead of 7th-place finisher and outgoing Councilmember Ronald Williams (152). Also given as "Faith T. Ford" on the town''s website.');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('16000000-0000-4000-8000-000000000001', '16000000-0000-4000-8000-000000000101', '2026-05-04', 'elected'),
  ('16000000-0000-4000-8000-000000000002', '16000000-0000-4000-8000-000000000102', '2026-05-04', 'elected'),
  ('16000000-0000-4000-8000-000000000002', '16000000-0000-4000-8000-000000000103', '2026-05-04', 'elected'),
  ('16000000-0000-4000-8000-000000000002', '16000000-0000-4000-8000-000000000104', '2026-05-04', 'elected'),
  ('16000000-0000-4000-8000-000000000002', '16000000-0000-4000-8000-000000000105', '2026-05-04', 'elected'),
  ('16000000-0000-4000-8000-000000000002', '16000000-0000-4000-8000-000000000106', '2026-05-04', 'elected'),
  ('16000000-0000-4000-8000-000000000002', '16000000-0000-4000-8000-000000000107', '2026-05-04', 'elected');

INSERT INTO accountability_pathways (jurisdiction_id, office_id, mechanism_type, is_binding, legal_citation, signature_requirement_note, description)
SELECT 'ocd-division/country:us/state:md/place:capitol_heights', id, 'impeachment', TRUE,
  'Charter of the Town of Capitol Heights, Article II, Section 206 (Removal Proceedings)',
  '25% of the Town''s registered voters, with each petition page signed and notarized by the individual who circulated it',
  'Not a ballot-box recall: a citizen petition signed by at least 25% of the Town''s registered voters, alleging malfeasance, misfeasance, or nonfeasance, is verified by the Prince George''s County Board of Supervisors of Elections; if valid, the Mayor and Council MAY hold a quasi-judicial public hearing, sitting as a "board of inquiry" (with the Town Attorney as prosecutor, the accused as defendant, subpoena power, and evidentiary rules), and the official is immediately removed if a MAJORITY OF THE MAYOR AND COUNCIL ITSELF votes to remove -- the electorate never casts a final removal ballot. Appealable de novo to the Circuit Court for Prince George''s County within 10 days, which may stay the removal pending its decision.'
FROM offices WHERE jurisdiction_id = 'ocd-division/country:us/state:md/place:capitol_heights';

INSERT INTO accountability_pathways (jurisdiction_id, office_id, mechanism_type, is_binding, legal_citation, signature_requirement_note, description)
SELECT 'ocd-division/country:us/state:md/place:capitol_heights', id, 'supermajority_council_removal', TRUE,
  'Charter of the Town of Capitol Heights, Article II, Section 205 (Forfeiture of Office)',
  NULL,
  'An internal, non-citizen-triggered mechanism, distinct from Section 206''s removal proceedings: the Mayor or a Councilmember automatically forfeits office for (1) lacking a legal qualification for office, (2) violating an express Charter prohibition or failing an affirmative Charter duty, (3) a felony conviction, or (4) missing three consecutive regular meetings without being excused. After a public hearing, forfeiture is formalized by a favorable vote of 4 of the 7 members of the Mayor and Council (a genuine supermajority of the full body), with findings of fact and conclusions of law. Appealable de novo to the Circuit Court for Prince George''s County within 10 days, which may stay the forfeiture pending its decision.'
FROM offices WHERE jurisdiction_id = 'ocd-division/country:us/state:md/place:capitol_heights';
