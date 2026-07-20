#!/usr/bin/env node
// Wayback capture utility (docs/DATA-OPS.md D2). Best-effort, rate-limit-aware:
// asks the Internet Archive to save a URL and prints the archive URL. Used
// sparingly and deliberately — §2.3 surfaces (integrity flags, promise status
// changes) REQUIRE an archived copy before publication; bulk vote ingestion
// does not (the county dataset and LIMS PDFs are the durable source there).
//
// Usage: node db/ingest/wayback.mjs <url>

const target = process.argv[2];
if (!target) {
  console.error("usage: node db/ingest/wayback.mjs <url>");
  process.exit(2);
}
try {
  const res = await fetch(`https://web.archive.org/save/${target}`, {
    method: "GET",
    redirect: "follow",
    signal: AbortSignal.timeout(60000),
    headers: { "User-Agent": "VoteRight-civic-archiver/1.0 (see repo dpimatrix/VoteRight)" },
  });
  // The SPN endpoint redirects to /web/<timestamp>/<url> on success.
  const final = res.url && res.url.includes("/web/") ? res.url : `https://web.archive.org/web/${target}`;
  console.log(final);
  if (!res.ok) process.exitCode = 1;
} catch (e) {
  // Fall back to the timestampless form — resolves to the latest snapshot.
  console.log(`https://web.archive.org/web/${target}`);
  console.error(`save failed (${e.message}); emitted latest-snapshot form`);
  process.exitCode = 1;
}
