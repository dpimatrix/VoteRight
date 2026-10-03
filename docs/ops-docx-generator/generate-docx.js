const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, AlignmentType, LevelFormat, convertInchesToTwip,
} = require("docx");
const fs = require("fs");

const PAGE_WIDTH = 12240, PAGE_HEIGHT = 15840; // US Letter, DXA
const MARGIN = 1440; // 1"
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN; // 9360

function h(text, level = HeadingLevel.HEADING_2) {
  return new Paragraph({ text, heading: level, spacing: { before: 240, after: 120 } });
}
function p(runsOrText, opts = {}) {
  const children = typeof runsOrText === "string" ? [new TextRun(runsOrText)] : runsOrText;
  return new Paragraph({ children, spacing: { after: 160 }, ...opts });
}
function b(text) { return new TextRun({ text, bold: true }); }
function code(text) { return new TextRun({ text, font: "Consolas" }); }
function bullet(text) {
  return new Paragraph({ children: [new TextRun(text)], numbering: { reference: "bullets", level: 0 }, spacing: { after: 80 } });
}

function cell(text, { header = false, width, bold = false } = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: header ? { type: ShadingType.CLEAR, fill: "2F5496" } : undefined,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [new Paragraph({
      children: [new TextRun({ text, bold: header || bold, color: header ? "FFFFFF" : undefined, size: header ? 20 : 20 })],
    })],
  });
}

function table(headerCells, rows, widths) {
  const total = widths.reduce((a, x) => a + x, 0);
  const scaled = widths.map((w) => Math.round((w / total) * CONTENT_WIDTH));
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: scaled,
    rows: [
      new TableRow({ children: headerCells.map((t, i) => cell(t, { header: true, width: scaled[i] })) }),
      ...rows.map((r) => new TableRow({ children: r.map((t, i) => cell(t, { width: scaled[i] })) })),
    ],
  });
}

const numbering = {
  config: [{ reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 180 } } } }] }],
};

// ───────────────────────────── Document 1: Operations Calendar ─────────────────────────────

const calSections = [
  {
    title: "Continuous / every 15 minutes",
    note: "Nothing for a human to do here day-to-day — just know it exists so a thread that closes “on time” isn't mistaken for a manual action.",
    widths: [50, 15, 35],
    headers: ["What", "Automated?", "Mechanism"],
    rows: [
      ["Debate thread lifecycle sweep (close expired threads past closes_at; notify newly call-the-question-eligible threads)", "Automated", "close-and-notify-threads.timer (systemd --user, every 15 min)"],
    ],
  },
  {
    title: "Daily",
    widths: [50, 15, 35],
    headers: ["What", "Automated?", "Mechanism"],
    rows: [
      ["Database backup (grandfather-father-son retention, self-pruning)", "Automated", "backup-db.timer, 03:00 ET"],
      ["Debate-media backup (every 6 hours, so technically 4×/day)", "Automated", "backup-media.timer, 00/06/12/18:00"],
      ["Coverage-alert watchdog (emails admins when a Pending seat flips to Tracked)", "Automated", "notify-coverage-changes.timer, 04:00"],
      ["Audit-checkpoint commit + push (signed_actions chain head → docs/audit-checkpoints/)", "Automated", "checkpoint-and-publish.sh via crontab, 06:00 UTC"],
      ["Production smoke test against the live site", "Automated", ".github/workflows/prod-smoke.yml, 08:17 ET"],
      ["Off-VPS backup pull (copies the VPS's own backups to this Windows machine — the one layer that survives total VPS/disk loss)", "Manual — Owner (not yet automated; script exists but is NOT currently registered in Task Scheduler, confirmed live)", "Run windows-pull-backups.ps1 yourself, or finish the one-time Task Scheduler setup in that script's own header"],
      ["Argument moderation queue (/admin/moderation) — content sits unpublished until reviewed; the one queue with a real-time user-facing cost to leaving it unattended", "Manual — Owner", "Clear anything pending; also glance at reported threads on the same screen"],
      ["Glance at /admin dashboard's Data freshness panel", "Manual — Owner", "Catches a silently-broken automated job same-day instead of same-month"],
    ],
  },
  {
    title: "Weekly",
    widths: [50, 15, 35],
    headers: ["What", "Automated?", "Mechanism"],
    rows: [
      ["Nationwide vote + candidate-filing ingestion (Congress House+Senate votes, MD+VA state legislature votes, MD general candidates, VA federal candidates)", "Automated", "nationwide-ingest-and-log.timer, Saturdays 10:00"],
      ["Montgomery-area ingestion (council votes, migrations auto-applied, council-sponsorships ×5: Montgomery/PG/Fairfax/Arlington/DC)", "Automated", "db/ingest-and-log.sh via crontab, Wednesdays 11:00 UTC"],
      ["Vote → position coding (/admin/positions) — turning the week's freshly-ingested roll calls into scored, cited positions", "Manual — Owner", "Deliberate, judgment-by-judgment human work (never batch-inferred) — budget real time weekly, right after Saturday's ingest run lands"],
      ["Position-coding confirmation queue (/admin/coding) — confirming/rejecting model-suggested codings", "Manual — Owner", ""],
      ["Priority topics & axes review queue (/admin/priority-axes) — anything draft/in-review", "Manual — Owner", ""],
      ["Race coverage (/admin/race-coverage) — re-check the gap list now that the week's ingest ran; triage by the “residents waiting” count, not the raw total", "Manual — Owner", ""],
      ["Referenda & mandates pipeline (/admin/mandates) — anything newly “ready to schedule” or needing certification", "Manual — Owner", ""],
      ["Integrity disputes (/admin/disputes) — open disputes, 14-day reply-window tracking", "Manual — Owner", ""],
      ["Anomaly review (/admin/anomalies) — Sybil/coordinated-manipulation flags", "Manual — Owner", ""],
      ["Outside money & endorsements (/admin/transparency) — curate anything newly filed/announced", "Manual — Owner", ""],
      ["Privacy requests (/admin/privacy) — confirm nothing is approaching its 45-day (or 60-day appeal) statutory deadline", "Manual — Owner", "Check more often than weekly once any single request is within ~10 days of deadline"],
    ],
  },
  {
    title: "Monthly",
    widths: [50, 15, 35],
    headers: ["What", "Automated?", "Mechanism"],
    rows: [
      ["Roster refresh (Congress.gov + OpenStates — retires departed officeholders, adds new ones)", "Automated", "roster-refresh.timer, 1st of month, 03:00"],
      ["Review ingestion_runs for silent failures beyond what the daily freshness glance already catches", "Manual — Owner", "Per docs/DATA-OPS.md §7"],
      ["Jurisdiction demand (/admin/jurisdiction-demand) — even below the 12-signal auto-alert threshold, worth a look; use “Research this jurisdiction” on anything close", "Manual — Owner", ""],
      ["Accountability campaigns (/admin/accountability) — curation pass", "Manual — Owner", ""],
      ["Membership subscriptions (/admin/subscriptions) — mostly self-service via Stripe; scan for anomalies", "Manual — Owner", ""],
      ["Payment verification (/admin/payments) — reconcile any mailed checks received", "Manual — Owner", "More often if check volume picks up"],
    ],
  },
  {
    title: "Quarterly / periodic (not calendar-driven)",
    widths: [50, 15, 35],
    headers: ["What", "Automated?", "Mechanism"],
    rows: [
      ["Bias-audit sampling + acceptance gates", "Manual — Owner", "Per docs/SCORING.md"],
      ["Post-launch legal-cadence items", "Manual — Owner", "Per docs/COUNSEL-REVIEW.md's own table"],
      ["Admin accounts audit (/admin/admin-accounts) — confirm every granted screen still makes sense, especially if more than one admin ever exists", "Manual — Owner", "Cheap insurance even solo; the real payoff is once a second person has an account"],
      ["Coverage-expansion checklist — re-run every time a new jurisdiction tier is added, not on a calendar", "Manual — Owner", "docs/DATA-OPS.md §8's own table — roster existing ≠ evidence pipeline existing"],
    ],
  },
];

const adhocRows = [
  ["Any git push to main", "Typecheck + test", "Automated (ci.yml)"],
  ["A code/content change ships", "git pull + build + migrate + restart (web); eas update (mobile, only if mobile-facing code changed)", "Manual — Owner, self-serve per docs/DEPLOY.md"],
  ["A new county/jurisdiction needs onboarding", "Research real office structure + officeholders (citable sources only), write a migration, verify live, deploy", "Manual — Owner (or delegated research, same citation bar either way)"],
  ["A resident disputes a claim", "Work the dispute through its reply-window timeline", "Manual — Owner, /admin/disputes"],
  ["A privacy request arrives", "Work it within the MODPA statutory clock", "Manual — Owner, /admin/privacy"],
  ["A new admin needs access", "Create the account, grant exactly the screens needed", "Manual — Owner, /admin/admin-accounts"],
];

const calChildren = [
  new Paragraph({ text: "VoteRight — Operations Calendar", heading: HeadingLevel.TITLE }),
  p([new TextRun({ text: "Status: v1.0 · 2026-10-03", italics: true })]),
  p("This is the one place that answers “what needs to happen, and how often, to keep VoteRight running and trustworthy.” Everything below was verified directly against what's actually running (db/*.timer / *.service, the real crontab entries documented in each script's own header, .github/workflows/) rather than written from memory — if something here and the script it describes ever disagree, the script is right and this doc is stale."),
  p("Every row is marked Automated (already running on its own; a human only needs to glance at the result) or Manual (a human has to actually do something). Today, every Manual row's role is Owner — there is one admin account (owner) with all 15 screens granted. The grouping below mirrors the 4 sections the /admin dashboard is already organized into (Civic content & coverage / Trust & safety / Money & compliance / Admin), so if this ever splits across more than one person, those are the natural seams — see “Dividing this across more than one person,” at the bottom."),
  p("The single tool that ties the automated half together: the /admin dashboard's own “Data freshness” panel (ingestionFreshness() in app/src/lib/queries.ts) already watches every automated job's last-run status and flags anything silently stale. Checking that panel is itself one of the recurring tasks below — it's the fastest way to confirm the whole automated layer is actually healthy without re-deriving this document from scratch each time."),
];

for (const s of calSections) {
  calChildren.push(h(s.title));
  if (s.note) calChildren.push(p([new TextRun({ text: s.note, italics: true })]));
  calChildren.push(table(s.headers, s.rows, s.widths));
}

calChildren.push(h("Ad-hoc / event-triggered (happens when something happens, not on a schedule)"));
calChildren.push(table(["Trigger", "What happens", "Role"], adhocRows, [30, 40, 30]));

calChildren.push(h("Dividing this across more than one person"));
calChildren.push(p("Everything “Manual — Owner” above is already gated by the same per-screen permission model (admin_screen_access / SCREEN_KEYS in app/src/lib/adminAuth.ts) the dashboard's own 4 groups are built from. If this ever needs more than one person, that's the natural split, already built and ready to grant selectively:"));
calChildren.push(bullet("Civic content & coverage — priority axes, position coding, vote→position coding, mandates, accountability, race coverage, jurisdiction demand"));
calChildren.push(bullet("Trust & safety — disputes, moderation, anomalies"));
calChildren.push(bullet("Money & compliance — payments, subscriptions, transparency, privacy"));
calChildren.push(bullet("Admin — admin accounts"));
calChildren.push(p("No code change needed to make that split real — just grant a new admin account the screens for one group instead of all 15."));

const calDoc = new Document({
  numbering,
  sections: [{
    properties: { page: { size: { width: PAGE_WIDTH, height: PAGE_HEIGHT }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } },
    children: calChildren,
  }],
});

// ───────────────────────────── Document 2: Ops Tracking ─────────────────────────────

const trackSections = [
  {
    title: "Daily",
    rows: [
      ["Clear moderation queue (/admin/moderation)", "daily", "unknown (not tracked before 2026-10-03)", "baseline"],
      ["Glance at Data freshness panel (/admin)", "daily", "2026-10-03 (done repeatedly this session while debugging)", "current"],
    ],
  },
  {
    title: "Weekly",
    rows: [
      ["Vote → position coding (/admin/positions)", "weekly", "unknown", "baseline"],
      ["Position-coding confirmations (/admin/coding)", "weekly", "unknown", "baseline"],
      ["Priority axes review queue (/admin/priority-axes)", "weekly", "2026-10-03, confirmed live — dashboard card reads “0 pending”", "current"],
      ["Race coverage (/admin/race-coverage)", "weekly", "2026-10-01/02 (deep investigation + md-general-candidates.mjs fix, not just a routine glance)", "current"],
      ["Mandates pipeline (/admin/mandates)", "weekly", "unknown", "baseline"],
      ["Integrity disputes (/admin/disputes)", "weekly", "unknown", "baseline"],
      ["Anomaly review (/admin/anomalies)", "weekly", "unknown", "baseline"],
      ["Outside money & endorsements (/admin/transparency)", "weekly", "unknown", "baseline"],
      ["Privacy requests deadline check (/admin/privacy)", "weekly", "unknown", "baseline"],
    ],
  },
  {
    title: "Monthly",
    rows: [
      ["Jurisdiction demand review (/admin/jurisdiction-demand)", "monthly", "2026-10-03 (3 real counties built out + queue cleared)", "current"],
      ["Review ingestion_runs for silent failures", "monthly", "unknown", "baseline"],
      ["Accountability campaigns (/admin/accountability)", "monthly", "unknown", "baseline"],
      ["Membership subscriptions (/admin/subscriptions)", "monthly", "unknown", "baseline"],
      ["Payment verification / check reconciliation (/admin/payments)", "monthly", "unknown", "baseline"],
    ],
  },
  {
    title: "Quarterly / periodic",
    rows: [
      ["Admin accounts audit (/admin/admin-accounts)", "quarterly", "2026-10-02 (confirmed all 15 screens correctly granted to owner)", "current"],
      ["Bias-audit sampling (SCORING.md)", "quarterly", "unknown", "baseline"],
      ["Coverage-expansion checklist (DATA-OPS.md §8)", "on new jurisdiction", "2026-10-02/03 (ran informally while building Santa Clara/Beaver/Armstrong — not a formal pass against the full table)", "current-ish"],
    ],
  },
];

const trackChildren = [
  new Paragraph({ text: "VoteRight — Operations Tracking", heading: HeadingLevel.TITLE }),
  p("Tracking ledger for docs/OPERATIONS-CALENDAR.md (commit 9a36eb3). How this works: the owner tells Claude (in any future conversation, for any reason) when they've done one of these; the date gets updated. At the start of any VoteRight conversation, this gets checked against today's date and anything overdue is proactively flagged — not waiting to be asked. This is NOT a standing alarm (nothing runs between conversations) — it only fires the next time there's an actual conversation."),
  p([new TextRun({ text: "Baseline established 2026-10-03. Most rows have no real history yet — this is the first time this has been tracked, not evidence nothing happened before.", italics: true })]),
];

for (const s of trackSections) {
  trackChildren.push(h(s.title));
  trackChildren.push(table(["Task", "Cadence", "Last done", "Status"], s.rows, [35, 15, 35, 15]));
}

trackChildren.push(h("Off-VPS backup pull (flagged gap, not yet automated)"));
trackChildren.push(p("Confirmed live 2026-10-03: windows-pull-backups.ps1 exists but is NOT registered in this machine's Task Scheduler. Either run it manually on a cadence until automated, or finish the one-time Task Scheduler setup in that script's own header. Not tracked as a dated row above since it's currently a gap, not a recurring habit yet."));

const trackDoc = new Document({
  numbering,
  sections: [{
    properties: { page: { size: { width: PAGE_WIDTH, height: PAGE_HEIGHT }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } },
    children: trackChildren,
  }],
});

// Absolute, not relative to this script -- this folder lives in the
// tracked repo (moved here from Adminstration/scripts/ 2026-10-03, see
// that commit: Adminstration/ is gitignored, a public repo must never
// get any of the real org documents sitting alongside where the old
// copy lived), but the OUTPUT is personal/local and must always land in
// that same fixed, gitignored folder regardless of where this script
// itself is checked out. Not meant to be portable/run in CI -- a local,
// personal tool, same posture docs/DEPLOY.md already uses for anything
// VPS-specific.
const OUTPUT_DIR = "C:\\Users\\pks\\Documents\\Voteright\\Adminstration";

(async () => {
  fs.writeFileSync(`${OUTPUT_DIR}\\Operations Calendar.docx`, await Packer.toBuffer(calDoc));
  fs.writeFileSync(`${OUTPUT_DIR}\\Ops Tracking.docx`, await Packer.toBuffer(trackDoc));
  console.log("done");
})();
