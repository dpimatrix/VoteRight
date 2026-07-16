const fs = require('fs');
const els = {};
function el() { return { _h:'', set innerHTML(v){this._h=v;}, get innerHTML(){return this._h;}, textContent:'', scrollTop:0, classList:{toggle(){}}, setAttribute(){}, addEventListener(){} }; }
global.document = { getElementById(id){ return els[id] || (els[id]=el()); } };
global.window = global;
eval(fs.readFileSync('js1.js','utf8') + fs.readFileSync('js2.js','utf8') + fs.readFileSync('js3.js','utf8'));

// welcome -> ballot
VR.go('ballot');
let h = els['app']._h;
for (const need of ['U.S. Senate','County Executive','Sheriff','Register of Wills','Circuit Court Judges','Board of Education','Not yet tracked','Match available','District 20','District 5','⚖']) {
  if (!h.includes(need)) throw new Error('ballot(ss) missing: ' + need);
}
if (h.includes('Mayor')) throw new Error('municipal group leaked into unincorporated address');

// switch to Rockville: municipal appears, districts change
VR.setAddr('rock');
h = els['app']._h;
for (const need of ['Mayor','City Council (6 at-large seats)','City of Rockville','District 17','District 3']) {
  if (!h.includes(need)) throw new Error('ballot(rock) missing: ' + need);
}

// pickRace with no priorities -> priorities screen
VR.pickRace('exec');
if (!els['app']._h.includes('What matters to you')) throw new Error('pickRace should route to priorities when none set');

// set 3 priorities, go back to ballot, pickRace -> results directly
VR.toggleTopic('housing'); VR.toggleTopic('transit'); VR.toggleTopic('schools');
VR.go('ballot'); VR.pickRace('atlarge');
h = els['app']._h;
if (!h.includes('Maya Trent')) throw new Error('pickRace with priorities should land on results');

// back chain: results -> prio -> ballot -> welcome
VR.back(); if (!els['app']._h.includes('What matters')) throw new Error('back1');
VR.back(); if (!els['app']._h.includes('U.S. Senate')) throw new Error('back2');
VR.back(); if (!els['app']._h.includes('Get started')) throw new Error('back3');

// Spanish ballot
VR.setLang('es'); VR.go('ballot');
h = els['app']._h;
for (const need of ['Cada cargo que elige tu dirección','Alguacil','Jueces del Tribunal de Circuito','Aún sin seguimiento','Coincidencia disponible','Junta de Educación']) {
  if (!h.includes(need)) throw new Error('ES ballot missing: ' + need);
}
console.log('BALLOT_SMOKE_OK');
