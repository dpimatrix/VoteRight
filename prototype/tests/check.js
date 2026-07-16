const fs = require('fs');
const h = fs.readFileSync(process.argv[2], 'utf8');
const tags = ['section','div','ul','ol','dl','table','tr','td','th','main','nav','pre','script','footer','h2','h3','p','li','dt','dd','strong','em','code','span','a'];
let bad = 0;
for (const t of tags) {
  const o = (h.match(new RegExp('<' + t + '(\\s|>)', 'g')) || []).length;
  const c = (h.match(new RegExp('</' + t + '>', 'g')) || []).length;
  if (o !== c) { console.log('MISMATCH', t, 'open', o, 'close', c); bad++; }
}
console.log(bad === 0 ? 'ALL_BALANCED' : bad + ' mismatches');
