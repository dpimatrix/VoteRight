const fs = require('fs');
const els = {};
function el() { return { _h:'', set innerHTML(v){this._h=v;}, get innerHTML(){return this._h;}, textContent:'', scrollTop:0, classList:{toggle(){}}, setAttribute(){}, addEventListener(){} }; }
global.document = { getElementById(id){ return els[id] || (els[id]=el()); } };
global.window = global;
eval(fs.readFileSync('js1.js','utf8') + fs.readFileSync('js2.js','utf8') + fs.readFileSync('js3.js','utf8'));

// ── dealbreaker marker ──
VR.toggleTopic('housing'); VR.toggleTopic('transit'); VR.toggleTopic('schools');
VR.setW('housing', 1); VR.setW('housing', 1);      // housing weight 3 -> 5
VR.go('results');
let h = els['app']._h;
const breuer = h.slice(h.indexOf('Colin Breuer'), h.indexOf('Jordan Quinn'));
if (!breuer.includes('Conflicts with one of your top priorities')) throw new Error('dealbreaker marker missing on Breuer (housing -2 at weight 5)');
const trent = h.slice(h.indexOf('Maya Trent'), h.indexOf('Priya Raman'));
if (trent.includes('Conflicts with one of your top priorities')) throw new Error('dealbreaker leaked onto Trent');
VR.openCand('breuer');
if (!els['app']._h.includes('Conflicts with one of your top priorities')) throw new Error('dealbreaker missing in detail');
VR.setLang('es'); VR.go('results');
if (!els['app']._h.includes('Choca con una de tus prioridades')) throw new Error('ES dealbreaker missing');
VR.setLang('en');

// ── admin: dispute queue state machine ──
VR.setView('admin');
h = els['view-admin']._h;
for (const need of ['Integrity-flag dispute queue','Rafael Quintana','FY27 levy','Flag opened','Attach evidence','Publish flag — blocked','NOT published OR status','Recently resolved','Colin Breuer','upheld · published','English-only by design']) {
  if (!h.includes(need)) throw new Error('disputes missing: ' + need);
}
VR.admStage(1);
h = els['view-admin']._h;
if (!h.includes('Evidence attached') || !h.includes('Legistar') || !h.includes('Send right of reply')) throw new Error('stage1 wrong');
VR.admStage(2);
if (!els['view-admin']._h.includes('14-day window')) throw new Error('stage2 wrong');
VR.admStage(3);
h = els['view-admin']._h;
if (!h.includes('revenue-neutral reindexing') || !h.includes('Uphold')) throw new Error('stage3 reply missing');
if (!h.includes('Publish flag — blocked')) throw new Error('publish gate should still block before resolution');
VR.admResolve('upheld');
h = els['view-admin']._h;
if (!h.includes('UPHELD — published') || h.includes('Publish flag — blocked')) throw new Error('resolution state wrong');

// ── admin: coding queue ──
VR.admTab('coding');
h = els['view-admin']._h;
for (const need of ['Position-coding queue','1 of 4','Dana Okafor','zero_emissions_schedule','Repeal the cap','Model suggested +1','usable_for_scoring stays FALSE','Confirm coding']) {
  if (!h.includes(need)) throw new Error('coding queue missing: ' + need);
}
VR.admVal('q1', 1);                                   // +1 -> +2
if (!els['view-admin']._h.includes('<span class="vv">+2</span>')) throw new Error('value stepper failed');
VR.admCode('q1', 'confirmed');
h = els['view-admin']._h;
if (!h.includes('2 of 4') || !h.includes('usable_for_scoring = TRUE')) throw new Error('confirm did not update usable count');
VR.admCode('q2', 'rejected');
h = els['view-admin']._h;
if (!h.includes('2 of 4') || !h.includes('rejected — never usable')) throw new Error('reject state wrong');

// voter view unaffected
VR.setView('proto');
if (!els['app']._h.includes('Colin Breuer')) throw new Error('voter view lost after admin');
console.log('ADMIN_SMOKE_OK');
