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

## U.S. Congress (automated, 2026-08-14)

Members of Congress get their portrait automatically, not hand-curated like
the table above: `db/ingest/congress.mjs` downloads each current member's
official photo from Congress.gov's own member-list API response
(`depiction.imageUrl`, e.g. `https://www.congress.gov/img/member/{id}_200.jpg`
— an official government portrait, same source category as the hand-picked
ones above, just fetched programmatically instead of by hand since there are
531 of them). Filenames are `{bioguideId}.{ext}` (lowercased), e.g.
`r000606.jpg` for Jamie Raskin — the same bioguide_id already used as the
ingester's identity anchor. Re-run the ingester to pick up new/changed
members' photos; idempotent by design (skips any file already on disk).
