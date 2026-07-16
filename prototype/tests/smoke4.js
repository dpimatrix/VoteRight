const fs = require('fs');
const els = {};
function el() { return { _h:'', set innerHTML(v){this._h=v;}, get innerHTML(){return this._h;}, textContent:'', scrollTop:0, classList:{toggle(){}}, setAttribute(){}, addEventListener(){} }; }
global.document = { getElementById(id){ return els[id] || (els[id]=el()); } };
global.window = global;
eval(fs.readFileSync('js1.js','utf8') + fs.readFileSync('js2.js','utf8') + fs.readFileSync('js3.js','utf8'));

VR.toggleTopic('housing'); VR.toggleTopic('transit'); VR.toggleTopic('schools');
VR.openCand('trent');
let h = els['app']._h;
for (const need of ['Local commentary','Elena Marsh','The Glenmont Ledger','rent-cap fight','budget realism','not verified by VoteRight','Included by rule','no campaign ties','never picked by VoteRight staff','never pushed or featured']) {
  if (!h.includes(need)) throw new Error('commentary(trent) missing: ' + need);
}
VR.openCand('quintana');
if (!els['app']._h.includes('transit record is stronger')) throw new Error('commentary(quintana) missing');
VR.openCand('raman');
if (els['app']._h.includes('Local commentary')) throw new Error('commentary leaked to candidate with none');
VR.setLang('es'); VR.openCand('trent');
h = els['app']._h;
for (const need of ['Análisis local','no verificado por VoteRight','Incluida por regla','sin vínculos de campaña','nunca por selección del equipo']) {
  if (!h.includes(need)) throw new Error('ES commentary missing: ' + need);
}
console.log('COMMENTARY_SMOKE_OK');
