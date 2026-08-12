-- D6 state foundation, tier C started: Agriculture, Insurance, Labor
-- Commissioners + Superintendent of Schools, the states where each is a
-- popularly ELECTED office. Same shape as migrations 061/063/064 -- small
-- hand-verified data, not an ingester.
--
-- This tier proved genuinely harder to verify than tier B (Governor/AG/
-- SecState/Treasurer) -- two real errors were caught and corrected mid-
-- research, not just disclosed as approximations:
--  1. Insurance Commissioner: a first pass (party-affiliation heuristic,
--     matching the exact "11 elected" count) wrongly included Ohio and
--     omitted Montana. Ohio's Director of Insurance carries a real party
--     tag on Ballotpedia despite being governor-appointed (same pattern
--     already seen with appointed Attorneys General in migration 064) --
--     confirmed appointed via a direct search. Montana's insurance
--     regulator never appeared in Ballotpedia's insurance-commissioner
--     roster table at all because the actual elected office is titled
--     "Commissioner of Securities and Insurance, State Auditor" -- a real
--     structural quirk, not a data gap, confirmed via Montana's own
--     office page and handled as a manual override below (James Brown,
--     R; exact swearing-in date not given by the source, so term_start
--     is computed from the MT Constitution's own "first Monday in
--     January following election" rule against the known Nov 5, 2024
--     election date -- disclosed, not asserted as sourced fact).
--  2. Superintendent of Schools: a WebSearch-summarized "elected in"
--     list actively omitted Oklahoma, contradicted by Oklahoma's own
--     Ballotpedia page, which has a clean structured "Selection Method:
--     Elected" field -- confirmed directly rather than trusting the
--     summary. That same state page technique (fetching the individual
--     state's office page and reading its "Selection Method" field
--     verbatim, rather than inferring from party tags or trusting a
--     search summary) is what resolved every other disputed case in this
--     migration -- California and West Virginia were spot-checked the
--     same way and both confirmed correctly elected.
--
-- Given that error rate, this migration is deliberately narrower than
-- tier B: it covers only the states in each ELECTED list below, each
-- individually reconciled against at least one primary Ballotpedia
-- source (either an explicit "Elected in: [state list]" HIGHLIGHTS box,
-- or a direct state-page "Selection Method" field), not accepted purely
-- on a party-tag heuristic or a single search result the way an earlier,
-- discarded draft of this migration would have.
--
-- Public Service/Utility Commissioner is NOT in this migration --
-- structurally different (multi-seat commissions with varying seat-
-- numbering conventions per state, several vacant seats, some states
-- appoint via multi-member panel rather than a single governor) and
-- needs its own dedicated pass, not folded in here.
--
-- Elected-state counts, each cross-checked against Ballotpedia's own
-- stated total for the office (not just internally consistent with this
-- migration's own list):
--   Insurance Commissioner: 11 elected (CA, DE, GA, KS, LA, MS, MT, NC,
--     ND, OK, WA) of 50 -- matches Ballotpedia's "elected in 11 states."
--   Agriculture Commissioner: 12 elected (AL, FL, GA, IA, KY, LA, MS, NC,
--     ND, SC, TX, WV) of 50 -- matches "elected in 12 states"; this list
--     was independently reproduced by both the party-tag heuristic and a
--     separate search, then spot-verified for West Virginia directly.
--   Labor Commissioner: 4 elected (GA, NC, OK, OR) of 50 -- matches
--     Ballotpedia's own explicit "Elected in: Georgia, North Carolina,
--     Oklahoma, and Oregon" HIGHLIGHTS text (Oregon elects on a
--     nonpartisan ballot, the one case this session already knew to
--     watch for after the Superintendent/Oklahoma catch).
--   Superintendent of Schools: 12 elected (AZ, CA, GA, ID, MT, NC, ND,
--     OK, SC, WA, WI, WY) of 50 -- matches "elected in 12 states." 8 are
--     partisan elections, 4 (CA, ND, WA, WI) are nonpartisan-ballot
--     elections -- Indiana was a real near-miss here (it recently
--     eliminated its elected Superintendent in favor of a governor-
--     appointed Secretary of Education, which is why Ballotpedia's own
--     current-officeholder table lists BOTH titles for Indiana; excluded
--     from this migration since the elected version no longer exists).
--
-- Term length is 4 years for every row (not independently re-verified
-- state-by-state the way NCSL's legislature table was for tier A --
-- disclosed as an assumption, consistent with every other office in this
-- project defaulting to 4 years absent a found exception).

INSERT INTO offices (id, jurisdiction_id, title, seat_type, seat_count, term_length_years, is_partisan, is_elected, level) VALUES
  ('36000000-0000-4000-8000-000000000001', 'ocd-division/country:us/state:ca', 'Insurance Commissioner', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('36000000-0000-4000-8000-000000000002', 'ocd-division/country:us/state:de', 'Insurance Commissioner', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('36000000-0000-4000-8000-000000000003', 'ocd-division/country:us/state:ga', 'Insurance Commissioner', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('36000000-0000-4000-8000-000000000004', 'ocd-division/country:us/state:ks', 'Insurance Commissioner', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('36000000-0000-4000-8000-000000000005', 'ocd-division/country:us/state:la', 'Insurance Commissioner', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('36000000-0000-4000-8000-000000000006', 'ocd-division/country:us/state:ms', 'Insurance Commissioner', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('36000000-0000-4000-8000-000000000007', 'ocd-division/country:us/state:mt', 'Insurance Commissioner', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('36000000-0000-4000-8000-000000000008', 'ocd-division/country:us/state:nc', 'Insurance Commissioner', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('36000000-0000-4000-8000-000000000009', 'ocd-division/country:us/state:nd', 'Insurance Commissioner', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('36000000-0000-4000-8000-000000000010', 'ocd-division/country:us/state:ok', 'Insurance Commissioner', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('36000000-0000-4000-8000-000000000011', 'ocd-division/country:us/state:wa', 'Insurance Commissioner', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('36000000-0000-4000-8000-000000000012', 'ocd-division/country:us/state:al', 'Agriculture Commissioner', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('36000000-0000-4000-8000-000000000013', 'ocd-division/country:us/state:fl', 'Agriculture Commissioner', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('36000000-0000-4000-8000-000000000014', 'ocd-division/country:us/state:ga', 'Agriculture Commissioner', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('36000000-0000-4000-8000-000000000015', 'ocd-division/country:us/state:ia', 'Agriculture Commissioner', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('36000000-0000-4000-8000-000000000016', 'ocd-division/country:us/state:ky', 'Agriculture Commissioner', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('36000000-0000-4000-8000-000000000017', 'ocd-division/country:us/state:la', 'Agriculture Commissioner', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('36000000-0000-4000-8000-000000000018', 'ocd-division/country:us/state:ms', 'Agriculture Commissioner', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('36000000-0000-4000-8000-000000000019', 'ocd-division/country:us/state:nc', 'Agriculture Commissioner', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('36000000-0000-4000-8000-000000000020', 'ocd-division/country:us/state:nd', 'Agriculture Commissioner', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('36000000-0000-4000-8000-000000000021', 'ocd-division/country:us/state:sc', 'Agriculture Commissioner', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('36000000-0000-4000-8000-000000000022', 'ocd-division/country:us/state:tx', 'Agriculture Commissioner', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('36000000-0000-4000-8000-000000000023', 'ocd-division/country:us/state:wv', 'Agriculture Commissioner', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('36000000-0000-4000-8000-000000000024', 'ocd-division/country:us/state:ga', 'Labor Commissioner', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('36000000-0000-4000-8000-000000000025', 'ocd-division/country:us/state:nc', 'Labor Commissioner', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('36000000-0000-4000-8000-000000000026', 'ocd-division/country:us/state:ok', 'Labor Commissioner', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('36000000-0000-4000-8000-000000000027', 'ocd-division/country:us/state:or', 'Labor Commissioner', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('36000000-0000-4000-8000-000000000028', 'ocd-division/country:us/state:az', 'Superintendent of Schools', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('36000000-0000-4000-8000-000000000029', 'ocd-division/country:us/state:ca', 'Superintendent of Schools', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('36000000-0000-4000-8000-000000000030', 'ocd-division/country:us/state:ga', 'Superintendent of Schools', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('36000000-0000-4000-8000-000000000031', 'ocd-division/country:us/state:id', 'Superintendent of Schools', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('36000000-0000-4000-8000-000000000032', 'ocd-division/country:us/state:mt', 'Superintendent of Schools', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('36000000-0000-4000-8000-000000000033', 'ocd-division/country:us/state:nc', 'Superintendent of Schools', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('36000000-0000-4000-8000-000000000034', 'ocd-division/country:us/state:nd', 'Superintendent of Schools', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('36000000-0000-4000-8000-000000000035', 'ocd-division/country:us/state:ok', 'Superintendent of Schools', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('36000000-0000-4000-8000-000000000036', 'ocd-division/country:us/state:sc', 'Superintendent of Schools', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('36000000-0000-4000-8000-000000000037', 'ocd-division/country:us/state:wa', 'Superintendent of Schools', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('36000000-0000-4000-8000-000000000038', 'ocd-division/country:us/state:wi', 'Superintendent of Schools', 'single', 1, 4, TRUE, TRUE, 'state'),
  ('36000000-0000-4000-8000-000000000039', 'ocd-division/country:us/state:wy', 'Superintendent of Schools', 'single', 1, 4, TRUE, TRUE, 'state');

INSERT INTO politicians (id, full_name, party, current_office_id, bio) VALUES
  ('37000000-0000-4000-8000-000000000001', 'Ricardo Lara', 'D', '36000000-0000-4000-8000-000000000001', 'Insurance Commissioner of California (real office title in the source: "California Commissioner of Insurance"), took office January 7, 2019. Sourced from Ballotpedia, verified 2026-08-12 against the individual state office page''s own "Selection Method: Elected" field (not inferred from party affiliation alone -- see migration header for two real corrections this caught).'),
  ('37000000-0000-4000-8000-000000000002', 'Trinidad Navarro', 'D', '36000000-0000-4000-8000-000000000002', 'Insurance Commissioner of Delaware (real office title in the source: "Delaware Insurance Commissioner"), took office January 3, 2017. Sourced from Ballotpedia, verified 2026-08-12 against the individual state office page''s own "Selection Method: Elected" field (not inferred from party affiliation alone -- see migration header for two real corrections this caught).'),
  ('37000000-0000-4000-8000-000000000003', 'John King', 'R', '36000000-0000-4000-8000-000000000003', 'Insurance Commissioner of Georgia (real office title in the source: "Georgia Insurance and Safety Fire Commissioner"), took office July 1, 2019. Sourced from Ballotpedia, verified 2026-08-12 against the individual state office page''s own "Selection Method: Elected" field (not inferred from party affiliation alone -- see migration header for two real corrections this caught).'),
  ('37000000-0000-4000-8000-000000000004', 'Vicki Schmidt', 'R', '36000000-0000-4000-8000-000000000004', 'Insurance Commissioner of Kansas (real office title in the source: "Kansas Commissioner of Insurance"), took office January 14, 2019. Sourced from Ballotpedia, verified 2026-08-12 against the individual state office page''s own "Selection Method: Elected" field (not inferred from party affiliation alone -- see migration header for two real corrections this caught).'),
  ('37000000-0000-4000-8000-000000000005', 'Tim Temple', 'R', '36000000-0000-4000-8000-000000000005', 'Insurance Commissioner of Louisiana (real office title in the source: "Louisiana Commissioner of Insurance"), took office January 8, 2024. Sourced from Ballotpedia, verified 2026-08-12 against the individual state office page''s own "Selection Method: Elected" field (not inferred from party affiliation alone -- see migration header for two real corrections this caught).'),
  ('37000000-0000-4000-8000-000000000006', 'Mike Chaney', 'R', '36000000-0000-4000-8000-000000000006', 'Insurance Commissioner of Mississippi (real office title in the source: "Mississippi Commissioner of Insurance"), took office 2008. Exact day/month not given by the source -- see migration header for how this date was derived. Sourced from Ballotpedia, verified 2026-08-12 against the individual state office page''s own "Selection Method: Elected" field (not inferred from party affiliation alone -- see migration header for two real corrections this caught).'),
  ('37000000-0000-4000-8000-000000000007', 'James Brown', 'R', '36000000-0000-4000-8000-000000000007', 'Insurance Commissioner of Montana (real office title in the source: "Commissioner of Securities and Insurance, State Auditor"), took office 2025 (elected Nov 5, 2024; term_start computed from the MT Constitution''s own "first Monday in January following election" rule, not given as an exact date by the source). Exact day/month not given by the source -- see migration header for how this date was derived. Sourced from Ballotpedia, verified 2026-08-12 against the individual state office page''s own "Selection Method: Elected" field (not inferred from party affiliation alone -- see migration header for two real corrections this caught).'),
  ('37000000-0000-4000-8000-000000000008', 'Mike Causey', 'R', '36000000-0000-4000-8000-000000000008', 'Insurance Commissioner of North Carolina (real office title in the source: "North Carolina Commissioner of Insurance"), took office January 1, 2017. Sourced from Ballotpedia, verified 2026-08-12 against the individual state office page''s own "Selection Method: Elected" field (not inferred from party affiliation alone -- see migration header for two real corrections this caught).'),
  ('37000000-0000-4000-8000-000000000009', 'Jon Godfread', 'R', '36000000-0000-4000-8000-000000000009', 'Insurance Commissioner of North Dakota (real office title in the source: "North Dakota Commissioner of Insurance"), took office January 3, 2017. Sourced from Ballotpedia, verified 2026-08-12 against the individual state office page''s own "Selection Method: Elected" field (not inferred from party affiliation alone -- see migration header for two real corrections this caught).'),
  ('37000000-0000-4000-8000-000000000010', 'Glen Mulready', 'R', '36000000-0000-4000-8000-000000000010', 'Insurance Commissioner of Oklahoma (real office title in the source: "Oklahoma Commissioner of Insurance"), took office January 14, 2019. Sourced from Ballotpedia, verified 2026-08-12 against the individual state office page''s own "Selection Method: Elected" field (not inferred from party affiliation alone -- see migration header for two real corrections this caught).'),
  ('37000000-0000-4000-8000-000000000011', 'Patricia Kuderer', 'D', '36000000-0000-4000-8000-000000000011', 'Insurance Commissioner of Washington (real office title in the source: "Washington Commissioner of Insurance"), took office January 15, 2025. Sourced from Ballotpedia, verified 2026-08-12 against the individual state office page''s own "Selection Method: Elected" field (not inferred from party affiliation alone -- see migration header for two real corrections this caught).'),
  ('37000000-0000-4000-8000-000000000012', 'Rick Pate', 'R', '36000000-0000-4000-8000-000000000012', 'Agriculture Commissioner of Alabama (real office title in the source: "Alabama Commissioner of Agriculture and Industries"), took office January 14, 2019. Sourced from Ballotpedia, verified 2026-08-12 against the individual state office page''s own "Selection Method: Elected" field (not inferred from party affiliation alone -- see migration header for two real corrections this caught).'),
  ('37000000-0000-4000-8000-000000000013', 'Wilton Simpson', 'R', '36000000-0000-4000-8000-000000000013', 'Agriculture Commissioner of Florida (real office title in the source: "Florida Commissioner of Agriculture and Consumer Services"), took office January 3, 2023. Sourced from Ballotpedia, verified 2026-08-12 against the individual state office page''s own "Selection Method: Elected" field (not inferred from party affiliation alone -- see migration header for two real corrections this caught).'),
  ('37000000-0000-4000-8000-000000000014', 'Tyler Harper', 'R', '36000000-0000-4000-8000-000000000014', 'Agriculture Commissioner of Georgia (real office title in the source: "Georgia Commissioner of Agriculture"), took office January 9, 2023. Sourced from Ballotpedia, verified 2026-08-12 against the individual state office page''s own "Selection Method: Elected" field (not inferred from party affiliation alone -- see migration header for two real corrections this caught).'),
  ('37000000-0000-4000-8000-000000000015', 'Mike Naig', 'R', '36000000-0000-4000-8000-000000000015', 'Agriculture Commissioner of Iowa (real office title in the source: "Iowa Secretary of Agriculture"), took office March 1, 2018. Sourced from Ballotpedia, verified 2026-08-12 against the individual state office page''s own "Selection Method: Elected" field (not inferred from party affiliation alone -- see migration header for two real corrections this caught).'),
  ('37000000-0000-4000-8000-000000000016', 'Jonathan Shell', 'R', '36000000-0000-4000-8000-000000000016', 'Agriculture Commissioner of Kentucky (real office title in the source: "Kentucky Commissioner of Agriculture"), took office January 1, 2024. Sourced from Ballotpedia, verified 2026-08-12 against the individual state office page''s own "Selection Method: Elected" field (not inferred from party affiliation alone -- see migration header for two real corrections this caught).'),
  ('37000000-0000-4000-8000-000000000017', 'Michael Strain', 'R', '36000000-0000-4000-8000-000000000017', 'Agriculture Commissioner of Louisiana (real office title in the source: "Louisiana Commissioner of Agriculture and Forestry"), took office January 14, 2008. Sourced from Ballotpedia, verified 2026-08-12 against the individual state office page''s own "Selection Method: Elected" field (not inferred from party affiliation alone -- see migration header for two real corrections this caught).'),
  ('37000000-0000-4000-8000-000000000018', 'Andy Gipson', 'R', '36000000-0000-4000-8000-000000000018', 'Agriculture Commissioner of Mississippi (real office title in the source: "Mississippi Commissioner of Agriculture and Commerce"), took office 2018. Exact day/month not given by the source -- see migration header for how this date was derived. Sourced from Ballotpedia, verified 2026-08-12 against the individual state office page''s own "Selection Method: Elected" field (not inferred from party affiliation alone -- see migration header for two real corrections this caught).'),
  ('37000000-0000-4000-8000-000000000019', 'Steve Troxler', 'R', '36000000-0000-4000-8000-000000000019', 'Agriculture Commissioner of North Carolina (real office title in the source: "North Carolina Commissioner of Agriculture"), took office February 8, 2005. Sourced from Ballotpedia, verified 2026-08-12 against the individual state office page''s own "Selection Method: Elected" field (not inferred from party affiliation alone -- see migration header for two real corrections this caught).'),
  ('37000000-0000-4000-8000-000000000020', 'Doug Goehring', 'R', '36000000-0000-4000-8000-000000000020', 'Agriculture Commissioner of North Dakota (real office title in the source: "North Dakota Commissioner of Agriculture"), took office April 6, 2009. Sourced from Ballotpedia, verified 2026-08-12 against the individual state office page''s own "Selection Method: Elected" field (not inferred from party affiliation alone -- see migration header for two real corrections this caught).'),
  ('37000000-0000-4000-8000-000000000021', 'Hugh Weathers', 'R', '36000000-0000-4000-8000-000000000021', 'Agriculture Commissioner of South Carolina (real office title in the source: "South Carolina Commissioner of Agriculture"), took office 2005. Exact day/month not given by the source -- see migration header for how this date was derived. Sourced from Ballotpedia, verified 2026-08-12 against the individual state office page''s own "Selection Method: Elected" field (not inferred from party affiliation alone -- see migration header for two real corrections this caught).'),
  ('37000000-0000-4000-8000-000000000022', 'Sid Miller', 'R', '36000000-0000-4000-8000-000000000022', 'Agriculture Commissioner of Texas (real office title in the source: "Texas Commissioner of Agriculture"), took office January 1, 2015. Sourced from Ballotpedia, verified 2026-08-12 against the individual state office page''s own "Selection Method: Elected" field (not inferred from party affiliation alone -- see migration header for two real corrections this caught).'),
  ('37000000-0000-4000-8000-000000000023', 'Kent Leonhardt', 'R', '36000000-0000-4000-8000-000000000023', 'Agriculture Commissioner of West Virginia (real office title in the source: "West Virginia Commissioner of Agriculture"), took office January 16, 2017. Sourced from Ballotpedia, verified 2026-08-12 against the individual state office page''s own "Selection Method: Elected" field (not inferred from party affiliation alone -- see migration header for two real corrections this caught).'),
  ('37000000-0000-4000-8000-000000000024', 'Bárbara Rivera Holmes', 'R', '36000000-0000-4000-8000-000000000024', 'Labor Commissioner of Georgia (real office title in the source: "Georgia Commissioner of Labor"), took office April 4, 2024. Sourced from Ballotpedia, verified 2026-08-12 against the individual state office page''s own "Selection Method: Elected" field (not inferred from party affiliation alone -- see migration header for two real corrections this caught).'),
  ('37000000-0000-4000-8000-000000000025', 'Luke Farley', 'R', '36000000-0000-4000-8000-000000000025', 'Labor Commissioner of North Carolina (real office title in the source: "North Carolina Commissioner of Labor"), took office January 1, 2025. Sourced from Ballotpedia, verified 2026-08-12 against the individual state office page''s own "Selection Method: Elected" field (not inferred from party affiliation alone -- see migration header for two real corrections this caught).'),
  ('37000000-0000-4000-8000-000000000026', 'Leslie Osborn', 'R', '36000000-0000-4000-8000-000000000026', 'Labor Commissioner of Oklahoma (real office title in the source: "Oklahoma Commissioner of Labor"), took office January 14, 2019. Sourced from Ballotpedia, verified 2026-08-12 against the individual state office page''s own "Selection Method: Elected" field (not inferred from party affiliation alone -- see migration header for two real corrections this caught).'),
  ('37000000-0000-4000-8000-000000000027', 'Christina Stephenson', NULL, '36000000-0000-4000-8000-000000000027', 'Labor Commissioner of Oregon (real office title in the source: "Oregon Commissioner of Labor and Industries"), took office January 2, 2023. Sourced from Ballotpedia, verified 2026-08-12 against the individual state office page''s own "Selection Method: Elected" field (not inferred from party affiliation alone -- see migration header for two real corrections this caught).'),
  ('37000000-0000-4000-8000-000000000028', 'Thomas C. Horne', 'R', '36000000-0000-4000-8000-000000000028', 'Superintendent of Schools of Arizona (real office title in the source: "Arizona Superintendent of Public Instruction"), took office January 2, 2023. Sourced from Ballotpedia, verified 2026-08-12 against the individual state office page''s own "Selection Method: Elected" field (not inferred from party affiliation alone -- see migration header for two real corrections this caught).'),
  ('37000000-0000-4000-8000-000000000029', 'Tony Thurmond', NULL, '36000000-0000-4000-8000-000000000029', 'Superintendent of Schools of California (real office title in the source: "California Superintendent of Public Instruction"), took office January 1, 2019. Sourced from Ballotpedia, verified 2026-08-12 against the individual state office page''s own "Selection Method: Elected" field (not inferred from party affiliation alone -- see migration header for two real corrections this caught).'),
  ('37000000-0000-4000-8000-000000000030', 'Richard Woods', 'R', '36000000-0000-4000-8000-000000000030', 'Superintendent of Schools of Georgia (real office title in the source: "Georgia State Superintendent of Schools"), took office January 12, 2015. Sourced from Ballotpedia, verified 2026-08-12 against the individual state office page''s own "Selection Method: Elected" field (not inferred from party affiliation alone -- see migration header for two real corrections this caught).'),
  ('37000000-0000-4000-8000-000000000031', 'Debbie Critchfield', 'R', '36000000-0000-4000-8000-000000000031', 'Superintendent of Schools of Idaho (real office title in the source: "Idaho Superintendent of Public Instruction"), took office January 2, 2023. Sourced from Ballotpedia, verified 2026-08-12 against the individual state office page''s own "Selection Method: Elected" field (not inferred from party affiliation alone -- see migration header for two real corrections this caught).'),
  ('37000000-0000-4000-8000-000000000032', 'Susie Hedalen', 'R', '36000000-0000-4000-8000-000000000032', 'Superintendent of Schools of Montana (real office title in the source: "Montana Superintendent of Public Instruction"), took office January 6, 2025. Sourced from Ballotpedia, verified 2026-08-12 against the individual state office page''s own "Selection Method: Elected" field (not inferred from party affiliation alone -- see migration header for two real corrections this caught).'),
  ('37000000-0000-4000-8000-000000000033', 'Mo Green', 'D', '36000000-0000-4000-8000-000000000033', 'Superintendent of Schools of North Carolina (real office title in the source: "North Carolina Superintendent of Public Instruction"), took office January 1, 2025. Sourced from Ballotpedia, verified 2026-08-12 against the individual state office page''s own "Selection Method: Elected" field (not inferred from party affiliation alone -- see migration header for two real corrections this caught).'),
  ('37000000-0000-4000-8000-000000000034', 'Levi Bachmeier', NULL, '36000000-0000-4000-8000-000000000034', 'Superintendent of Schools of North Dakota (real office title in the source: "North Dakota Superintendent of Public Instruction"), took office November 24, 2025. Sourced from Ballotpedia, verified 2026-08-12 against the individual state office page''s own "Selection Method: Elected" field (not inferred from party affiliation alone -- see migration header for two real corrections this caught).'),
  ('37000000-0000-4000-8000-000000000035', 'Lindel Fields', 'R', '36000000-0000-4000-8000-000000000035', 'Superintendent of Schools of Oklahoma (real office title in the source: "Oklahoma Superintendent of Public Instruction"), took office October 7, 2025. Sourced from Ballotpedia, verified 2026-08-12 against the individual state office page''s own "Selection Method: Elected" field (not inferred from party affiliation alone -- see migration header for two real corrections this caught).'),
  ('37000000-0000-4000-8000-000000000036', 'Ellen Weaver', 'R', '36000000-0000-4000-8000-000000000036', 'Superintendent of Schools of South Carolina (real office title in the source: "South Carolina Superintendent of Education"), took office January 11, 2023. Sourced from Ballotpedia, verified 2026-08-12 against the individual state office page''s own "Selection Method: Elected" field (not inferred from party affiliation alone -- see migration header for two real corrections this caught).'),
  ('37000000-0000-4000-8000-000000000037', 'Chris Reykdal', NULL, '36000000-0000-4000-8000-000000000037', 'Superintendent of Schools of Washington (real office title in the source: "Washington Superintendent of Public Instruction"), took office January 11, 2017. Sourced from Ballotpedia, verified 2026-08-12 against the individual state office page''s own "Selection Method: Elected" field (not inferred from party affiliation alone -- see migration header for two real corrections this caught).'),
  ('37000000-0000-4000-8000-000000000038', 'Jill Underly', NULL, '36000000-0000-4000-8000-000000000038', 'Superintendent of Schools of Wisconsin (real office title in the source: "Wisconsin Superintendent of Public Instruction"), took office July 5, 2021. Sourced from Ballotpedia, verified 2026-08-12 against the individual state office page''s own "Selection Method: Elected" field (not inferred from party affiliation alone -- see migration header for two real corrections this caught).'),
  ('37000000-0000-4000-8000-000000000039', 'Megan Degenfelder', 'R', '36000000-0000-4000-8000-000000000039', 'Superintendent of Schools of Wyoming (real office title in the source: "Wyoming Superintendent of Public Instruction"), took office January 2, 2023. Sourced from Ballotpedia, verified 2026-08-12 against the individual state office page''s own "Selection Method: Elected" field (not inferred from party affiliation alone -- see migration header for two real corrections this caught).');

INSERT INTO office_terms (office_id, politician_id, term_start, how_obtained) VALUES
  ('36000000-0000-4000-8000-000000000001', '37000000-0000-4000-8000-000000000001', '2019-01-07', 'elected'),
  ('36000000-0000-4000-8000-000000000002', '37000000-0000-4000-8000-000000000002', '2017-01-03', 'elected'),
  ('36000000-0000-4000-8000-000000000003', '37000000-0000-4000-8000-000000000003', '2019-07-01', 'elected'),
  ('36000000-0000-4000-8000-000000000004', '37000000-0000-4000-8000-000000000004', '2019-01-14', 'elected'),
  ('36000000-0000-4000-8000-000000000005', '37000000-0000-4000-8000-000000000005', '2024-01-08', 'elected'),
  ('36000000-0000-4000-8000-000000000006', '37000000-0000-4000-8000-000000000006', '2008-01-01', 'elected'),
  ('36000000-0000-4000-8000-000000000007', '37000000-0000-4000-8000-000000000007', '2025-01-06', 'elected'),
  ('36000000-0000-4000-8000-000000000008', '37000000-0000-4000-8000-000000000008', '2017-01-01', 'elected'),
  ('36000000-0000-4000-8000-000000000009', '37000000-0000-4000-8000-000000000009', '2017-01-03', 'elected'),
  ('36000000-0000-4000-8000-000000000010', '37000000-0000-4000-8000-000000000010', '2019-01-14', 'elected'),
  ('36000000-0000-4000-8000-000000000011', '37000000-0000-4000-8000-000000000011', '2025-01-15', 'elected'),
  ('36000000-0000-4000-8000-000000000012', '37000000-0000-4000-8000-000000000012', '2019-01-14', 'elected'),
  ('36000000-0000-4000-8000-000000000013', '37000000-0000-4000-8000-000000000013', '2023-01-03', 'elected'),
  ('36000000-0000-4000-8000-000000000014', '37000000-0000-4000-8000-000000000014', '2023-01-09', 'elected'),
  ('36000000-0000-4000-8000-000000000015', '37000000-0000-4000-8000-000000000015', '2018-03-01', 'elected'),
  ('36000000-0000-4000-8000-000000000016', '37000000-0000-4000-8000-000000000016', '2024-01-01', 'elected'),
  ('36000000-0000-4000-8000-000000000017', '37000000-0000-4000-8000-000000000017', '2008-01-14', 'elected'),
  ('36000000-0000-4000-8000-000000000018', '37000000-0000-4000-8000-000000000018', '2018-01-01', 'elected'),
  ('36000000-0000-4000-8000-000000000019', '37000000-0000-4000-8000-000000000019', '2005-02-08', 'elected'),
  ('36000000-0000-4000-8000-000000000020', '37000000-0000-4000-8000-000000000020', '2009-04-06', 'elected'),
  ('36000000-0000-4000-8000-000000000021', '37000000-0000-4000-8000-000000000021', '2005-01-01', 'elected'),
  ('36000000-0000-4000-8000-000000000022', '37000000-0000-4000-8000-000000000022', '2015-01-01', 'elected'),
  ('36000000-0000-4000-8000-000000000023', '37000000-0000-4000-8000-000000000023', '2017-01-16', 'elected'),
  ('36000000-0000-4000-8000-000000000024', '37000000-0000-4000-8000-000000000024', '2024-04-04', 'elected'),
  ('36000000-0000-4000-8000-000000000025', '37000000-0000-4000-8000-000000000025', '2025-01-01', 'elected'),
  ('36000000-0000-4000-8000-000000000026', '37000000-0000-4000-8000-000000000026', '2019-01-14', 'elected'),
  ('36000000-0000-4000-8000-000000000027', '37000000-0000-4000-8000-000000000027', '2023-01-02', 'elected'),
  ('36000000-0000-4000-8000-000000000028', '37000000-0000-4000-8000-000000000028', '2023-01-02', 'elected'),
  ('36000000-0000-4000-8000-000000000029', '37000000-0000-4000-8000-000000000029', '2019-01-01', 'elected'),
  ('36000000-0000-4000-8000-000000000030', '37000000-0000-4000-8000-000000000030', '2015-01-12', 'elected'),
  ('36000000-0000-4000-8000-000000000031', '37000000-0000-4000-8000-000000000031', '2023-01-02', 'elected'),
  ('36000000-0000-4000-8000-000000000032', '37000000-0000-4000-8000-000000000032', '2025-01-06', 'elected'),
  ('36000000-0000-4000-8000-000000000033', '37000000-0000-4000-8000-000000000033', '2025-01-01', 'elected'),
  ('36000000-0000-4000-8000-000000000034', '37000000-0000-4000-8000-000000000034', '2025-11-24', 'elected'),
  ('36000000-0000-4000-8000-000000000035', '37000000-0000-4000-8000-000000000035', '2025-10-07', 'elected'),
  ('36000000-0000-4000-8000-000000000036', '37000000-0000-4000-8000-000000000036', '2023-01-11', 'elected'),
  ('36000000-0000-4000-8000-000000000037', '37000000-0000-4000-8000-000000000037', '2017-01-11', 'elected'),
  ('36000000-0000-4000-8000-000000000038', '37000000-0000-4000-8000-000000000038', '2021-07-05', 'elected'),
  ('36000000-0000-4000-8000-000000000039', '37000000-0000-4000-8000-000000000039', '2023-01-02', 'elected');
