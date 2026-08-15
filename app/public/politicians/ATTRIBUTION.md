# Politician portrait attribution

Official portraits of current officeholders, re-hosted locally so visitors'
browsers never fetch from third-party hosts (see the /privacy notice). Policy:
**officeholders = official government portraits; challengers = monogram until
they provide a photo through the candidate questionnaire (DATA-OPS D4).**
One documented exception below (Mayor Ashman) where the official government
source was unreachable -- see that section for the full disclosure.

All eleven files below were retrieved 2026-07-19 from the Montgomery County
Council's official roster page:
https://www.montgomerycountymd.gov/government/legislative-branch/county-council/councilmembers
(asset host: assets.montgomerycountymd.gov). Mapping is by source filename;
note the county page's own alt text mislabels Stewart's portrait — filenames
and visual verification govern.

| File | Person | Source file |
|---|---|---|
| glass.png | Evan Glass | glass230x230profilepic_fw.png |
| jawando.png | Will Jawando | jawando230x230profilepic_fw.png |
| sayles.png | Laurie-Anne Sayles | Saylesprofilepic_fw.png |
| evans.png | Shebra Evans | 2026-03/evans230x230profilepic_fw.png |
| friedson.png | Andrew Friedson | Friedson230x230_fw.png |
| balcombe.png | Marilyn Balcombe | 2025-11/balcombeprofilepic_fw.png |
| katz.png | Sidney Katz | katx230x230profilepicupdate1_fw.png |
| stewart.png | Kate Stewart | Stewartprofilepic_fw.png |
| mink.png | Kristin Mink | minkprofilepic_fw.png |
| fani-gonzalez.png | Natali Fani-González | Fani-Gonzalezprofilepic_fw.png |
| luedtke.png | Dawn Luedtke | Luedtkeprofilepic_fw.png |

TODO: Marc Elrich — official Executive portrait not exposed on the exec
landing page at retrieval time; monogram until sourced. Refresh portraits at
each roster change (the monthly roster-diff cadence in DATA-OPS.md).

## Clerk of the Circuit Court + Board of Education District 2 (hand-curated, 2026-08-14)

`bushell.webp` — Karen A. Bushell, Clerk of the Circuit Court — official
portrait from Montgomery County's own asset host
(assets.montgomerycountymd.gov/files/kb24.jpg), the same host the County
Council portraits above already use.

`zimmerman.webp` — Natalie Zimmerman, Board of Education District 2 —
official portrait from Montgomery County Public Schools' own site
(montgomeryschoolsmd.org/siteassets/district/boe/members/2024-2025/natalie-zimmerman-20241122.jpg).

Both close real data gaps flagged the same day (these two offices had no
politicians/office_terms row at all, not a lookup failure) — migration 083.

## Mayor Jud Ashman — POLICY EXCEPTION (hand-curated, 2026-08-14)

`ashman.webp` is **campaign material, not an official government portrait**
— the one deliberate exception to this file's own stated policy above.
Gaithersburg's own site (gaithersburgmd.gov) blocks automated access
outright (Akamai 403, confirmed from two separate networks the same day
congress.gov's image host hit the identical wall) and no Wikimedia Commons
photo of him exists. Owner-approved 2026-08-14 to use his campaign site's
own published headshot instead of leaving the sitting Mayor on a monogram:
https://www.votejud.com/wp-content/uploads/2025/07/2025-Headshot-800x800-1.jpg
(explicitly labeled "headshot" on the source page; visually verified as a
real, current, professional portrait of him before use). Revisit if
Gaithersburg's own site ever becomes reachable, or a Commons photo surfaces.

## President & Vice President (hand-curated, 2026-08-14)

`trump.webp` / `vance.webp` — official White House-series portraits (January
2025, photographer Daniel Torok), re-hosted from Wikimedia Commons:
[File:January 2025 Official Presidential Portrait of Donald J. Trump.jpg](https://commons.wikimedia.org/wiki/File:January_2025_Official_Presidential_Portrait_of_Donald_J._Trump.jpg),
[File:January 2025 Official Vice Presidential Portrait of JD Vance.jpg](https://commons.wikimedia.org/wiki/File:January_2025_Official_Vice_Presidential_Portrait_of_JD_Vance.jpg)
— public-domain U.S. government works, same category as every other
official portrait here. Migration 061 (2026-08-11) set their politicians
rows but never `photo_url`; migration 079 closes that gap. Applied
directly to those two known politician IDs, not by name-matching.

## U.S. Congress (automated, 2026-08-14 — source switched same day)

Members of Congress get their portrait automatically, not hand-curated like
the table above: `db/ingest/congress.mjs` downloads each current member's
photo via Wikidata. ORIGINALLY tried Congress.gov's own member-list API
response (`depiction.imageUrl`) — reverted after confirming live that
congress.gov's static image host 403s any plain HTTP client (curl, Node's
fetch) from both the VPS and an unrelated network; a TLS/bot-fingerprint
block, not fixable with a realistic User-Agent header.

Replacement: Wikidata property P1157 ("US Congress Bio ID") maps a
bioguideId straight to a Wikidata item; that item's P18 ("image") claim
points to an official portrait on Wikimedia Commons (same source category
as the hand-picked photos above — most are literally the same government
portrait, just already re-hosted on Commons). Both the SPARQL query service
and Commons' own image host serve plain HTTP clients fine. Coverage isn't
100% — a small fraction of members have no Wikidata photo at all — those
fall back to the monogram, same as everyone else without a photo.

Saved as `.webp`, not whatever format Commons happens to serve (usually
JPEG/PNG) — smaller for the same visual quality at this tiny 200px size,
and every browser this app targets renders it fine in a plain `<img>`, so
there's no reason to keep the original. Converted via `sharp`, already an
existing dependency (Next.js's own built-in image optimizer uses it), so
no new install needed.

Filenames are `{bioguideId}.webp` (lowercased), e.g. `r000606.webp` for
Jamie Raskin — the same bioguide_id already used as the ingester's
identity anchor. Re-run the ingester to pick up new/changed members'
photos; idempotent by design (skips any file already on disk, so a re-run
only does network work for members it hasn't photographed yet).

## Statewide officials (automated, 2026-08-14, generalized same day)

`db/ingest/statewide-official-photos.mjs` — same Wikidata technique as
Congress above, adapted for offices with no clean external ID like
bioguide_id: matches by full_name AND cross-checks the person's actual
Wikidata "position held" against the exact office+state ("Attorney
General of Maryland", not just any office containing the word
"Attorney") before trusting the match — verified live against Wes
Moore/Governor of Maryland and Anthony G. Brown/Attorney General of
Maryland before building this. Same P18 → Commons → re-hosted-webp
pipeline as Congress. Idempotent (skips anyone who already has a
photo_url) and small enough in scale that this runs sequential
per-person queries with a real delay + proper User-Agent rather than
needing Congress's batched-VALUES-clause approach.

Started as a Governor/Lt. Governor-only script (95 people), generalized
the same day into a TIERS list covering any single-seat, one-per-state
office that fits the same "{title} of {state}" position shape —
currently Governor, Lieutenant Governor, Attorney General, Secretary of
State, Treasurer, Controller, and Auditor. Real naming quirk handled
along the way: this project normalizes "Comptroller"/"Controller"
(genuinely different real per-state terminology) into one generic DB
title, but Wikidata uses each state's own term — that tier tries both
labels in order rather than assuming one.

Filenames are `{stateSlug}-{tier}.webp` (e.g. `md-gov.webp` for Wes
Moore, `md-ag.webp` for Anthony G. Brown) — state+office, not a
name-derived slug, since it's guaranteed unique per state and reads
clearly on its own. Coverage isn't 100% — same never-guess fallback to
the monogram as everywhere else. Multi-seat bodies (e.g. Public Service
Commissions) and differently-shaped tiers (district-based, judicial)
aren't in TIERS yet — they need their own naming/shape verification
before joining this list.

### Flagged/human-verified candidates (added 2026-08-15)

A retry of the automated pass above landed at 93/241 for this tier
(well below Congress/Governor's coverage) with the failure count
essentially unmoved from the day before despite the wait — a live
investigation of two named cases (Derek Brown/Attorney General of
Utah, Allison Ball/State Auditor of Kentucky) confirmed this isn't
rate-limiting: Wikidata's position-held data for this tier is
genuinely thinner than for governors. Derek Brown's only recorded
Wikidata position is a past state-house seat, not the AG office he
actually holds now; Allison Ball has a Wikidata photo but zero
position-held statements at all. The strict cross-check (§ above) is
working exactly as designed in both cases — it just can't verify
what Wikidata doesn't record.

`db/ingest/statewide-official-photos-flagged.mjs` re-runs the lookup
for anyone still missing a photo WITHOUT the position requirement —
name match + "instance of: human" (a cheap guard against a same-named
non-person item) + any photo. It never writes anything; it only
prints candidates (politician_id, Wikidata item link, photo URL) for
a human to open and visually confirm. Names matching more than one
distinct Wikidata person are flagged ambiguous and skipped outright —
verified live against "John Smith" (5 distinct real people) before
trusting this path; picking one arbitrarily would be exactly the kind
of guess this project doesn't make.

`db/ingest/apply-flagged-photo.mjs <politician_id> [...]` applies a
photo only for ids explicitly passed on the command line — re-checks
the same lookup fresh (not a URL pasted from the scan output) so
what's applied matches Wikidata at apply time, then the same
download → webp → DB-write pipeline as the main script. A human
confirming by eye before this runs is the entire safety model here,
same principle as the Ashman campaign-photo exception above, just
without needing a hand-curated ATTRIBUTION.md entry per person since
the source (Wikidata/Commons) is the same as every other automated
entry in this section.
