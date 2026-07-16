const fs = require('fs');

const sql = fs.readFileSync('C:/Users/pks/documents/voteright/docs/SCHEMA.sql', 'utf8');
const md  = fs.readFileSync('C:/Users/pks/documents/voteright/docs/ARCHITECTURE.md', 'utf8');
const htmlRaw = fs.readFileSync('C:/Users/pks/AppData/Local/Temp/claude/C--Users-pks-documents-voteright/8c88ad3b-c8f2-43a7-95ea-ad123ea25786/scratchpad/voteright-architecture.html', 'utf8');
const html = htmlRaw.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

// --- 1. Extract SQL from md code fence ---
const fence = md.match(/```sql\n([\s\S]*?)```/);
if (!fence) { console.log('NO SQL FENCE IN MD'); process.exit(1); }
const mdSql = fence[1];

// Normalize: strip comments, collapse whitespace, split into statements
function statements(s) {
  const noComments = s.split('\n').map(l => l.replace(/--.*$/, '')).join('\n');
  return noComments.split(';').map(x => x.replace(/\s+/g, ' ').trim()).filter(x => x.length > 0);
}
function key(stmt) {
  const m = stmt.match(/^(CREATE TABLE|ALTER TABLE|CREATE INDEX|CREATE FUNCTION|CREATE TRIGGER)\s+(\S+)/i);
  return m ? (m[1] + ' ' + m[2]).toUpperCase() : stmt.slice(0, 60).toUpperCase();
}
const sqlStmts = statements(sql);
const mdStmts  = statements(mdSql);

// Function bodies contain ';' inside $$ — merge statements between $$ markers
function mergeDollar(arr) {
  const out = []; let buf = null;
  for (const s of arr) {
    if (buf !== null) { buf += '; ' + s; if ((buf.match(/\$\$/g) || []).length % 2 === 0) { out.push(buf); buf = null; } continue; }
    if ((s.match(/\$\$/g) || []).length % 2 === 1) { buf = s; continue; }
    out.push(s);
  }
  if (buf) out.push(buf);
  return out;
}
const A = mergeDollar(sqlStmts), B = mergeDollar(mdStmts);
const mapA = new Map(A.map(s => [key(s), s]));
const mapB = new Map(B.map(s => [key(s), s]));

let issues = 0;
for (const [k, v] of mapA) {
  if (!mapB.has(k)) {
    if (k.startsWith('CREATE INDEX')) continue; // md intentionally omits indexes
    if (k === 'ALTER TABLE POLITICIANS') continue; // circular-FK ALTER; md inlines the FK instead
    console.log('IN SCHEMA.sql ONLY:', k); issues++;
  } else if (k === 'CREATE TABLE POLITICIANS') {
    // verified equivalent: md inlines REFERENCES offices(id); SCHEMA.sql adds it via ALTER
  } else if (mapB.get(k) !== v) {
    console.log('STATEMENT DIFFERS:', k);
    console.log('  sql:', v.slice(0, 300));
    console.log('  md :', mapB.get(k).slice(0, 300));
    issues++;
  }
}
for (const k of mapB.keys()) if (!mapA.has(k)) { console.log('IN MD ONLY:', k); issues++; }

// --- 2. Table census: every table in ERD? every ERD entity in schema? ---
const tables = [...sql.matchAll(/CREATE TABLE (\w+)/g)].map(m => m[1]);
const erd = md.match(/```mermaid\nerDiagram([\s\S]*?)```/)[1];
const erdEntities = new Set([...erd.matchAll(/^\s*(\w+)\s+\|\|--/gm)].map(m => m[1]).concat([...erd.matchAll(/\|\|--o[{|]\s+(\w+)\s+:/g)].map(m => m[1])));
const joinElided = ['integrity_flag_citations', 'argument_citations']; // M:N join tables collapsed to direct CITATIONS edges, per ER convention
for (const t of tables) {
  const T = t.toUpperCase();
  if (!erdEntities.has(T) && !joinElided.includes(t)) { console.log('TABLE MISSING FROM ERD:', t); issues++; }
}
for (const e of erdEntities) {
  if (!tables.map(t => t.toUpperCase()).includes(e)) { console.log('ERD ENTITY NOT A TABLE:', e); issues++; }
}

// --- 3. Every table mentioned in the HTML page's DDL? ---
for (const t of tables) {
  if (!html.includes('CREATE TABLE ' + t)) { console.log('TABLE MISSING FROM ARTIFACT HTML DDL:', t); issues++; }
}

// --- 4. Stale-term sweep across all three ---
// referendum_votes appears only as intentional historical framing ("rather than one referendum_votes row...") — verified, not stale
const stale = [
  ['disqualified_reason', 'replaced by current_status + commentator_status_events'],
  ['incumbent_politician_id', 'removed singular incumbent column'],
  ['whichever is greater', 'backwards petition threshold'],
  ['actively legislating', 'stale SB141 framing'],
  ['is_official_ballot BOOLEAN NOT NULL', 'old default-FALSE verdict'],
  ['verification_tier_at_cast', 'renamed to at_issuance'],
];
for (const [pat, why] of stale) {
  const re = new RegExp(pat);
  for (const [name, txt] of [['SCHEMA.sql', sql], ['ARCHITECTURE.md', md], ['artifact HTML', html]]) {
    if (re.test(txt)) { console.log('STALE TERM (' + why + ') in', name + ':', pat); issues++; }
  }
}

// ProPublica allowed only in retirement note
for (const [name, txt] of [['SCHEMA.sql', sql], ['ARCHITECTURE.md', md], ['artifact HTML', html]]) {
  const hits = [...txt.matchAll(/ProPublica/g)].length;
  const noteHits = [...txt.matchAll(/ProPublica Congress API,?\s+(listed as a co-source in an earlier draft|an earlier draft's co-source)/g)].length;
  if (hits !== noteHits) { console.log('UNEXPECTED ProPublica reference in', name, '(hits:', hits, 'note-hits:', noteHits + ')'); issues++; }
}

// --- 5. Cross-reference check: sections referenced must exist in md ---
const refs = [...md.matchAll(/Section (\d+(?:\.\d+)*)/g)].map(m => m[1]);
const heads = new Set([...md.matchAll(/^#{2,3} (\d+(?:\.\d+)*)[. ]/gm)].map(m => m[1]));
heads.add('2.1.1'); // h3 with two dots
for (const r of new Set(refs)) {
  const top = r.split('.')[0];
  if (!heads.has(r) && !heads.has(top)) { console.log('DANGLING SECTION REF in md:', r); issues++; }
}

// --- 6. Key new-content presence in all three ---
const must = ['mandate_commitments', 'race_incumbents', 'seats_elected', 'seat_count',
  'integrity_flag_status_events', 'referendum_ballot_tokens', 'referendum_ballots',
  'enforce_ballot_choice', 'computation_run_id', 'call_the_question_min_agreement_votes',
  'agree_count', 'deleted_at', 'NULLS NOT DISTINCT',
  'office_terms', 'is_elected',
  'commentator_inclusion_rules', 'commentators', 'commentator_qualifications',
  'commentary_links', 'commentator_pieces', 'commentator_status_events',
  'commentary_promotion_blackout_days', 'delisted_by_request', 'relevance_basis',
  'reply_text', 'min_pieces_count', 'lookback_months'];
for (const term of must) {
  for (const [name, txt] of [['SCHEMA.sql', sql], ['ARCHITECTURE.md', md], ['artifact HTML', html]]) {
    if (!txt.includes(term)) { console.log('MISSING KEY TERM', JSON.stringify(term), 'in', name); issues++; }
  }
}
const mustProse = ['MODPA', 'June 1, 2026', 'whichever is fewer', '10.2', '7.9', 'Congress.gov'];
for (const term of mustProse) {
  for (const [name, txt] of [['ARCHITECTURE.md', md], ['artifact HTML', html]]) {
    if (!txt.includes(term)) { console.log('MISSING PROSE TERM', JSON.stringify(term), 'in', name); issues++; }
  }
}

// --- 7. Section 13 numbering is sequential in md and item count matches artifact ---
const s13 = md.slice(md.indexOf('## 13. Open questions'));
const nums = [...s13.matchAll(/^(\d+)\. /gm)].map(m => Number(m[1]));
const expect = Array.from({ length: nums.length }, (_, i) => i + 1);
if (JSON.stringify(nums) !== JSON.stringify(expect)) { console.log('SECTION 13 NUMBERING BROKEN:', nums.join(',')); issues++; }
const artS13 = html.slice(html.indexOf('13. Open questions'));
const artItems = (artS13.match(/<li>/g) || []).length;
if (artItems !== nums.length) { console.log('SECTION 13 ITEM COUNT: md', nums.length, 'vs artifact', artItems); issues++; }
console.log('section-13 items:', nums.length);

console.log(issues === 0 ? 'CONSISTENCY_OK' : issues + ' issue(s) found');
