#!/usr/bin/env node
// Production smoke test: read-only checks against the PUBLIC site, no
// credentials, no writes, ~40 requests. Exists because bugs here were being
// found by the owner on a phone -- there was no CI and no test that looked
// at deployed behavior. Each check below is a bug class that has actually
// happened, not a hypothetical:
//
//   - races open on a screen with no portraits (alphabetical race order,
//     2026-09-21)
//   - federal/state offices silently missing from ballots (2026-08-12)
//   - officeholder portraits that should serve but don't
//   - the site / API simply being down or returning 500s
//
// Runs anywhere Node 18+ runs. Scheduled daily from GitHub Actions
// (.github/workflows/prod-smoke.yml) -- deliberately OFF the VPS, so it can
// also notice the VPS itself being down, which a VPS-side timer never could
// -- and worth running by hand right after every deploy:
//
//   node db/smoke/prod-smoke.mjs
//   SMOKE_BASE_URL=http://localhost:3000 node db/smoke/prod-smoke.mjs
//
// Exit code 1 if any check FAILS. WARN results (advisory checks) print but
// never fail the run.
import { appendFileSync } from "node:fs";

const BASE = (process.env.SMOKE_BASE_URL ?? "https://voteright.dpimatrix.com").replace(/\/$/, "");
const TIMEOUT_MS = 25_000;

const results = [];

async function get(path, { json = false, absolute = false } = {}) {
  const url = absolute ? path : `${BASE}${path}`;
  let lastErr;
  // One retry, network-level failures only (a dropped connection / timeout
  // shouldn't page anyone); an HTTP error status is a real answer, not retried.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { "user-agent": "voteright-smoke/1", accept: json ? "application/json" : "*/*" },
      });
      const buf = Buffer.from(await res.arrayBuffer());
      return {
        status: res.status,
        type: res.headers.get("content-type") ?? "",
        bytes: buf.length,
        body: json ? JSON.parse(buf.toString("utf8")) : buf,
      };
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`request failed (${url}): ${lastErr?.message ?? lastErr}`);
}

function expect(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function check(name, fn, { advisory = false } = {}) {
  try {
    const detail = await fn();
    results.push({ name, level: "PASS", detail: detail ?? "" });
  } catch (e) {
    results.push({ name, level: advisory ? "WARN" : "FAIL", detail: e.message });
  }
}

// ── Checks ──────────────────────────────────────────────────────────────

await check("site responds", async () => {
  const r = await get("/");
  expect(r.status === 200, `GET / returned ${r.status}`);
  expect(r.type.includes("text/html"), `GET / content-type was ${r.type}`);
});

await check("races load, and the first one is a prominent race", async () => {
  const r = await get("/api/races", { json: true });
  expect(r.status === 200, `/api/races returned ${r.status}`);
  const races = r.body.races;
  expect(Array.isArray(races) && races.length >= 10, `expected >= 10 races, got ${races?.length}`);
  // Every client opens on races[0]. It was alphabetical once, which opened
  // on Board of Education (all newcomers, no portraits). The first race
  // should be an executive or legislative office.
  const prominent = /(executive|governor|president|mayor|council|senat|house|representative|assembl|delegate)/i;
  expect(prominent.test(races[0].title), `first race is "${races[0].title}", expected an executive/legislative office`);
  return `${races.length} races, first: ${races[0].title}`;
});

await check("topics load", async () => {
  const r = await get("/api/topics", { json: true });
  expect(r.status === 200, `/api/topics returned ${r.status}`);
  expect(r.body.topics?.length >= 1, "no topics returned");
  return `${r.body.topics.length} topic/axis rows`;
});

// Officeholders that must always have a portrait that actually serves. These
// are the seeded Montgomery County councilmembers (stable ids); checking the
// name too means a wrong-person / re-keyed row fails as loudly as a missing
// photo.
const COUNCIL = {
  1002: "Evan Glass",
  1003: "Will Jawando",
  1004: "Laurie-Anne Sayles",
  1005: "Shebra Evans",
  1011: "Andrew Friedson",
  1012: "Marilyn Balcombe",
  1013: "Sidney Katz",
  1014: "Kate Stewart",
  1015: "Kristin Mink",
  1016: "Natali Fani-González",
  1017: "Dawn Luedtke",
};
for (const [n, expectedName] of Object.entries(COUNCIL)) {
  await check(`portrait serves: ${expectedName}`, async () => {
    const id = `00000000-0000-4000-8000-00000000${n}`;
    const p = await get(`/api/candidates/${id}`, { json: true });
    expect(p.status === 200, `/api/candidates returned ${p.status}`);
    expect(p.body.profile?.fullName === expectedName, `name is "${p.body.profile?.fullName}"`);
    const photo = p.body.profile?.photoUrl;
    expect(photo, "photoUrl is empty");
    const img = await get(photo);
    expect(img.status === 200, `${photo} returned ${img.status}`);
    expect(img.type.startsWith("image/"), `${photo} content-type was ${img.type}`);
    expect(img.bytes > 5000, `${photo} is only ${img.bytes} bytes`);
    return photo;
  });
}

// Ballots for other jurisdictions are readable with no session
// (?visit= is display-only). Federal + state offices went missing from
// real ballots once without any test noticing (2026-08-12).
for (const [name, ocd] of [
  ["Maryland", "ocd-division/country:us/state:md"],
  ["Virginia", "ocd-division/country:us/state:va"],
]) {
  await check(`ballot includes federal + state offices: ${name}`, async () => {
    const r = await get(`/api/ballot?visit=${encodeURIComponent(ocd)}`, { json: true });
    expect(r.status === 200, `/api/ballot returned ${r.status}`);
    const titles = (r.body.offices ?? []).map((o) => o.title);
    expect(titles.length >= 50, `only ${titles.length} offices`);
    expect(titles.some((t) => /^U\.S\. Senator/.test(t)), "no U.S. Senator");
    expect(titles.some((t) => /^U\.S\. Representative/.test(t)), "no U.S. Representative");
    expect(titles.some((t) => /^Governor/.test(t)), "no Governor");
    return `${titles.length} offices`;
  });
}

await check("deepest-coverage pilot region: Montgomery County ballot", async () => {
  const ocd = "ocd-division/country:us/state:md/county:montgomery";
  const r = await get(`/api/ballot?visit=${encodeURIComponent(ocd)}`, { json: true });
  expect(r.status === 200, `/api/ballot returned ${r.status}`);
  const titles = (r.body.offices ?? []).map((o) => o.title);
  expect(titles.includes("County Executive"), "no County Executive");
  expect(titles.some((t) => /^County Council/.test(t)), "no County Council seats");
  return `${titles.length} offices`;
});

// ADVISORY (never fails the run): the daily tamper-evidence checkpoint is
// committed and pushed by a cron on the VPS. Found 2026-09-19: the push
// step fails (expired GitHub token) and nothing noticed -- and as of
// 2026-09-21 origin/main has never received a single checkpoint file, so the
// tamper-evidence has never been externally verifiable. Reported as WARN
// because that credential is the owner's to refresh; flip to a hard failure
// by removing `advisory` once it's healthy.
await check(
  "daily audit checkpoint reached the public repo recently",
  async () => {
    const headers = { "user-agent": "voteright-smoke/1", accept: "application/vnd.github+json" };
    if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const res = await fetch(
      "https://api.github.com/repos/dpimatrix/VoteRight/commits?path=docs/audit-checkpoints&per_page=1",
      { signal: AbortSignal.timeout(TIMEOUT_MS), headers },
    );
    expect(res.status === 200, `GitHub API returned ${res.status}`);
    const [latest] = await res.json();
    expect(latest, "NO checkpoint has ever reached the public repo (docs/audit-checkpoints does not exist on GitHub) -- the VPS commits them daily but the push step fails");
    const ageDays = (Date.now() - new Date(latest.commit.committer.date).getTime()) / 86_400_000;
    expect(ageDays <= 3, `newest checkpoint on GitHub is ${ageDays.toFixed(1)} days old (${latest.commit.committer.date.slice(0, 10)})`);
    return `${ageDays.toFixed(1)} days old`;
  },
  { advisory: true },
);

// ── Report ──────────────────────────────────────────────────────────────

const icon = { PASS: "PASS", FAIL: "FAIL", WARN: "WARN" };
const lines = results.map((r) => `${icon[r.level]}  ${r.name}${r.detail ? `  --  ${r.detail}` : ""}`);
const failed = results.filter((r) => r.level === "FAIL");
const warned = results.filter((r) => r.level === "WARN");
console.log(`Smoke test against ${BASE}\n`);
console.log(lines.join("\n"));
console.log(`\n${results.length - failed.length - warned.length} passed, ${failed.length} failed, ${warned.length} warnings`);

if (process.env.GITHUB_STEP_SUMMARY) {
  const md = [
    `### Production smoke test -- ${failed.length ? "FAILED" : "passed"}`,
    `\`${BASE}\` -- ${results.length - failed.length - warned.length} passed, ${failed.length} failed, ${warned.length} warnings\n`,
    "| | Check | Detail |",
    "|---|---|---|",
    ...results.map((r) => `| ${r.level === "PASS" ? "✅" : r.level === "WARN" ? "⚠️" : "❌"} | ${r.name} | ${r.detail.replace(/\|/g, "\\|")} |`),
  ].join("\n");
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + "\n");
}

process.exit(failed.length ? 1 : 0);
