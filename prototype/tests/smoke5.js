const fs = require('fs');
const els = {};
function el() { return { _h:'', set innerHTML(v){this._h=v;}, get innerHTML(){return this._h;}, textContent:'', scrollTop:0, classList:{toggle(){}}, setAttribute(){}, addEventListener(){} }; }
global.document = { getElementById(id){ return els[id] || (els[id]=el()); } };
global.window = global;
eval(fs.readFileSync('js1.js','utf8') + fs.readFileSync('js2.js','utf8') + fs.readFileSync('js3.js','utf8'));

// entry from welcome
let h = els['app']._h;
if (!h.includes('See a live debate')) throw new Error('welcome entry missing');
VR.openThread('welcome');
h = els['app']._h;
for (const need of ['duplexes and triplexes','Amended','412 seconds','Close debate early','41 of 78','52.6% / 66.7%','people made this point','Marcus J.','Planning Board corridor study','Ted W.','AI-generated — not a person','never second, vote, or call the question','Agree','private and deleted after the debate closes','Add your argument','your name appears on this argument']) {
  if (!h.includes(need)) throw new Error('thread missing: ' + need);
}
// audio member expand
VR.toggleCluster('f1');
if (!els['app']._h.includes('Audio argument')) throw new Error('audio member not shown on expand');
// amendment history
VR.toggleOrig();
if (!els['app']._h.includes('quarter-mile') || !els['app']._h.includes('preserved, never overwritten')) throw new Error('original text toggle failed');
VR.toggleOrig();
// CTQ vote: 42/78 = 53.8%, private note
VR.ctqVote();
h = els['app']._h;
if (!h.includes('42 of 78') || !h.includes('53.8%') || !h.includes('deleted when the thread closes')) throw new Error('CTQ vote state wrong');
if (h.includes('>Call the question<')) throw new Error('CTQ button should disappear after voting');
// agreement vote toggle
VR.agr('f1','agree');
if (!els['app']._h.includes('aria-pressed="true"')) throw new Error('agreement vote not reflected');
// camps view + bridging
VR.setDv('camps');
h = els['app']._h;
for (const need of ['1,240 agreement votes','Build near transit','Infrastructure first','61 members','34 members','Bridging point','school-capacity review']) {
  if (!h.includes(need)) throw new Error('camps missing: ' + need);
}
VR.setDv('clusters');
// claim-detection flow
VR.tryPost();
h = els['app']._h;
if (!h.includes('reads like a factual claim') || !h.includes('$12M')) throw new Error('claim prompt missing');
VR.claimAnswer('src');
h = els['app']._h;
if (!h.includes('Posted with source') || !h.includes('County fiscal report')) throw new Error('add-source outcome missing');
// commentary rail + blackout
if (!h.includes('school capacity math') || !h.includes('never pushed or featured')) throw new Error('thread commentary missing');
// back to welcome
VR.back();
if (!els['app']._h.includes('Get started')) throw new Error('thread back(welcome) failed');
// entry from grid, back to grid
VR.toggleTopic('housing'); VR.toggleTopic('transit'); VR.toggleTopic('schools');
VR.openGrid(); VR.openThread('mandates'); VR.back();
if (!els['app']._h.includes('Late-night bus service')) throw new Error('thread back(mandates) failed');
// Spanish
VR.setLang('es'); VR.openThread('welcome');
h = els['app']._h;
for (const need of ['dúplex y tríplex','Enmendada','Registrado — privado','personas plantearon este punto','Generado por IA','Publicado con fuente']) {
  if (!h.includes(need)) throw new Error('ES thread missing: ' + need);
}
VR.setDv('camps');
if (!els['app']._h.includes('Punto puente')) throw new Error('ES bridging missing');
console.log('THREAD_SMOKE_OK');
