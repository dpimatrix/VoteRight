const fs = require('fs');
global.document = { getElementById: () => ({ set innerHTML(v) {}, textContent: '', classList: { toggle() {} }, setAttribute() {}, addEventListener() {} }) };
global.window = global;
const js1 = fs.readFileSync('js1.js', 'utf8');
eval(js1 + '\n;globalThis.__D = { I18N, TOPICS, CANDS, MANDATES, DEBATE, SEATS, STACKS, COMMENTATORS, COMMENTARY, SRC_LABEL };');
const { I18N, TOPICS, CANDS, MANDATES, DEBATE, SEATS, STACKS, COMMENTATORS, COMMENTARY, SRC_LABEL } = globalThis.__D;

let issues = 0;

// 1. EN/ES key parity
const en = Object.keys(I18N.en), es = Object.keys(I18N.es);
for (const k of en) if (!es.includes(k)) { console.log('MISSING IN ES:', k); issues++; }
for (const k of es) if (!en.includes(k)) { console.log('MISSING IN EN:', k); issues++; }

// 2. every t('key') used in the app scripts exists
const code = fs.readFileSync('js3.js', 'utf8') + fs.readFileSync('js2.js', 'utf8');
const used = new Set([...code.matchAll(/t\('([a-z0-9_]+)'\)/g)].map(m => m[1]));
for (const k of used) if (!(k in I18N.en)) { console.log('USED BUT UNDEFINED KEY:', k); issues++; }

// 3. bilingual data fields: every *_en has *_es (DEBATE, MANDATES, SEATS, COMMENTATORS, COMMENTARY, TOPICS)
function pairCheck(obj, path) {
  if (Array.isArray(obj)) { obj.forEach((v, i) => pairCheck(v, path + '[' + i + ']')); return; }
  if (obj && typeof obj === 'object') {
    for (const k of Object.keys(obj)) {
      if (k.endsWith('_en') && !(k.slice(0, -3) + '_es' in obj)) { console.log('MISSING _es PAIR:', path + '.' + k); issues++; }
      if (k === 'en' && !('es' in obj)) { console.log('MISSING es PAIR:', path); issues++; }
      pairCheck(obj[k], path + '.' + k);
    }
  }
}
[['DEBATE', DEBATE], ['MANDATES', MANDATES], ['SEATS', SEATS], ['COMMENTATORS', COMMENTATORS], ['COMMENTARY', COMMENTARY], ['TOPICS', TOPICS]].forEach(([n, o]) => pairCheck(o, n));

// 4. semantic anchors: prototype numbers must match doc-claimed schema defaults
const md = fs.readFileSync('C:/Users/pks/documents/voteright/docs/ARCHITECTURE.md', 'utf8');
const anchors = [
  ['66.7', 'CTQ threshold matches close_early_threshold_pct default'],
  ['3+ agreement votes', 'eligibility floor matches call_the_question_min_agreement_votes default 3'],
];
for (const [term, why] of anchors) {
  if (!code.includes(term) && !js1.includes(term)) { console.log('PROTOTYPE MISSING ANCHOR:', term, '(' + why + ')'); issues++; }
}
if (!md.includes('66.7')) { console.log('DOC MISSING 66.7 default'); issues++; }
if (!md.includes('DEFAULT 3')) { console.log('DOC MISSING min agreement votes default 3'); issues++; }
// claim-prompt responses map to argument_claim_flags enum
for (const resp of ['added_citation', 'marked_as_opinion', 'dismissed']) {
  if (!md.includes(resp)) { console.log('DOC MISSING claim response enum value:', resp); issues++; }
}

console.log(issues === 0 ? 'I18N_AND_ANCHORS_OK' : issues + ' issue(s)');
