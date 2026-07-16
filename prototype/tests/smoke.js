const fs = require('fs');
const els = {};
function el() { return {
  _h: '', set innerHTML(v) { this._h = v; }, get innerHTML() { return this._h; },
  textContent: '', scrollTop: 0,
  classList: { toggle() {}, },
  setAttribute() {}, addEventListener() {}
}; }
global.document = { getElementById(id) { return els[id] || (els[id] = el()); } };
global.window = global;

eval(fs.readFileSync('js1.js','utf8') + fs.readFileSync('js2.js','utf8') + fs.readFileSync('js3.js','utf8'));



VR.go('prio');
VR.toggleTopic('housing'); VR.toggleTopic('transit'); VR.toggleTopic('schools'); VR.toggleTopic('budget');
VR.setStance('budget', -1); VR.setW('housing', 1); VR.setW('housing', 1);
VR.go('results');
let html = els['app']._h;
if (!html.includes('Maya Trent') || !html.includes('Jordan Quinn')) throw new Error('results missing candidates');
if (!html.includes('Not enough information')) throw new Error('insufficient-data band missing for Quinn');
const order = ['Maya Trent','Priya Raman','Dana Okafor','Rafael Quintana','Colin Breuer','Jordan Quinn']
  .map(n => html.indexOf(n));
console.log('result order indexes ascending:', order.every((v,i,a) => i === 0 || v > a[i-1]) ? 'sorted-check-see-below' : 'custom order');
console.log('Quinn last:', html.indexOf('Jordan Quinn') > Math.max(html.indexOf('Colin Breuer'), html.indexOf('Maya Trent')));
VR.openCand('trent');
html = els['app']._h;
for (const need of ['Bill 15-23','archived','Aligns strongly','Promise record','Standing voter mandate','Committed','kept','broken']) {
  if (!html.includes(need)) throw new Error('detail missing: ' + need);
}
VR.openCand('quinn');
html = els['app']._h;
if (!html.includes('No public position found')) throw new Error('silence row missing');
VR.setRace('exec'); VR.go('results');
if (!els['app']._h.includes('Elena V')) throw new Error('exec race missing');
VR.openCand('vasquez');
if (!els['app']._h.includes('No standing voter mandates')) throw new Error('exec no-mandate note missing');
VR.setLang('es');
html = els['app']._h;
for (const need of ['Coincidencia','prioridades','Historial de promesas','No oficial']) {
  if (!html.includes(need)) throw new Error('ES missing: ' + need);
}
VR.back(); VR.back(); VR.back();
console.log('SMOKE_OK');
