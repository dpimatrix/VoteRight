# Politician portrait attribution

Official portraits of current officeholders, re-hosted locally so visitors'
browsers never fetch from third-party hosts (see the /privacy notice). Policy:
**officeholders = official government portraits; challengers = monogram until
they provide a photo through the candidate questionnaire (DATA-OPS D4).**

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
