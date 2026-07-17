# VoteRight prototype

Single-file, self-contained HTML prototype of the voter-facing app (design system +
all screens: your ballot, priorities, matches, scorecard, mandate-commitment grid,
promise records, local commentary, debate thread). Bilingual EN/ES, light/dark.

- **Published artifact:** https://claude.ai/code/artifact/e4e952b7-e558-405a-a747-c63c4cef26eb
- **Architecture doc artifact** (source: `docs/ARCHITECTURE.artifact.html`):
  https://claude.ai/code/artifact/9a7ee172-7976-4ba1-b5b3-badeb91f2fd0

All candidates, commentators, and sources in the prototype are **fictional by design**
(ARCHITECTURE.md §2.3) — county structure, bill numbers, and legal thresholds are real.

## Build

`voteright-prototype.html` is the concatenation of the four part files (edit parts,
then rebuild):

```sh
cd prototype
cat parts/proto-a.html parts/proto-b.html parts/proto-d.html parts/proto-c.html > voteright-prototype.html
```

Part order matters: `a` (CSS + shell markup), `b` (i18n + data), `d` (design-system
tab fill), `c` (renderers + wiring; runs last).

## Tests

From `prototype/`, extract the script blocks and run the suites (Node, no deps):

```sh
awk '/<script>/{n++; f="js"n".js"; next} /<\/script>/{f=""} f{print > f}' voteright-prototype.html
node tests/check.js voteright-prototype.html   # HTML tag balance
node tests/i18ncheck.js                        # EN/ES key parity, key usage, schema-default anchors
node tests/smoke.js                            # scorecard flow
node tests/smoke2.js                           # your-ballot
node tests/smoke3.js                           # mandate grid + promise records
node tests/smoke4.js                           # commentary rail
node tests/smoke5.js                           # debate thread
node tests/smoke6.js                           # admin console + dealbreaker marker
```

`tests/consistency.js` is the three-way doc check (SCHEMA.sql ↔ ARCHITECTURE.md ↔
`docs/ARCHITECTURE.artifact.html`); it contains absolute paths for the artifact-HTML
copy in the original session scratchpad — point it at `docs/ARCHITECTURE.artifact.html`
if running from a fresh checkout. The smoke scripts expect `js1.js`–`js3.js` in the
current directory (produced by the `awk` line above).
