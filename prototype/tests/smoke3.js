const fs = require('fs');
const els = {};
function el() { return { _h:'', set innerHTML(v){this._h=v;}, get innerHTML(){return this._h;}, textContent:'', scrollTop:0, classList:{toggle(){}}, setAttribute(){}, addEventListener(){} }; }
global.document = { getElementById(id){ return els[id] || (els[id]=el()); } };
global.window = global;
eval(fs.readFileSync('js1.js','utf8') + fs.readFileSync('js2.js','utf8') + fs.readFileSync('js3.js','utf8'));

VR.toggleTopic('housing'); VR.toggleTopic('transit'); VR.toggleTopic('schools');
VR.go('results');
let h = els['app']._h;
if (!h.includes('Mandate commitments for this race')) throw new Error('grid entry button missing on at-large results');
VR.setRace('exec');
if (els['app']._h.includes('Mandate commitments for this race')) throw new Error('grid button leaked into exec race');
VR.setRace('atlarge');

// grid
VR.openGrid();
h = els['app']._h;
for (const need of ['Late-night bus service','Open contracts database','Maya Trent','Jordan Quinn','✓','✗','—','62% yes','71% yes','no legal force','tracked promise automatically']) {
  if (!h.includes(need)) throw new Error('grid missing: ' + need);
}
// cell counts: flex = 4 commit, 1 decline, 2 no_response? (6 cands: trent✓ quintana✗ okafor✓ breuer— raman✓ quinn—) contracts: trent✓ quintana✓ okafor— breuer✓ raman✓ quinn—
const commits = (h.match(/c-commit/g) || []).length, declines = (h.match(/c-decline/g) || []).length, nones = (h.match(/c-none/g) || []).length;
if (commits !== 7 || declines !== 1 || nones !== 4) throw new Error('grid stance counts wrong: ' + commits + '/' + declines + '/' + nones);

// select a no_response cell -> outreach note; a decline cell -> statement + citation
VR.selCell('breuer','flex');
if (!els['app']._h.includes('VoteRight asked all candidates on May 12')) throw new Error('no_response outreach note missing');
VR.selCell('quintana','flex');
h = els['app']._h;
if (!h.includes('corridor study') || !h.includes('archived')) throw new Error('decline cell detail missing statement/citation');

// back from grid -> results
VR.back();
if (!els['app']._h.includes('Your matches')) throw new Error('grid back should land on results');

// detail: two mandates now; full record button for incumbent only
VR.openCand('trent');
h = els['app']._h;
if (!h.includes('searchable public database')) throw new Error('second mandate missing in detail');
if (!h.includes('Full promise record')) throw new Error('full-record button missing');
if (!h.includes('compromised')) throw new Error('compromised pill missing');
VR.go('promises');
h = els['app']._h;
for (const need of ['Pass rent stabilization','Pledged','In progress','Kept','Broken','Compromised','Right of reply','budget emergency','append-only','Resolution 20-114']) {
  if (!h.includes(need)) throw new Error('promises missing: ' + need);
}
VR.back();
if (!els['app']._h.includes('Standing voter mandate')) throw new Error('promises back should land on detail');

// challenger has no full-record button
VR.openCand('raman');
if (els['app']._h.includes('Full promise record')) throw new Error('full-record button leaked to challenger');

// Spanish
VR.setLang('es'); VR.openGrid();
h = els['app']._h;
for (const need of ['Autobús nocturno','Contratos públicos','se comprometió','declinó','sin respuesta']) {
  if (!h.includes(need)) throw new Error('ES grid missing: ' + need);
}
VR.openCand('trent'); VR.go('promises');
h = els['app']._h;
for (const need of ['Prometida','Cumplida','Incumplida','Con concesiones','Derecho de réplica']) {
  if (!h.includes(need)) throw new Error('ES promises missing: ' + need);
}
console.log('GRID_PROMISES_SMOKE_OK');
