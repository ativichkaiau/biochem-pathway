// No package installation needed: node scripts/check-study-data.cjs
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const context = vm.createContext({});
context.window = context;
for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
for (const match of html.matchAll(/<script src="([^"]+)"/g)) {
  const file = path.join(root, match[1]);
  assert.ok(fs.existsSync(file), `Missing script: ${match[1]}`);
  new vm.Script(fs.readFileSync(file, 'utf8'));
  if (!match[1].endsWith('/i18n.js')) vm.runInContext(fs.readFileSync(file, 'utf8'), context);
}
function data(name, array = false) {
  const pattern = array ? `const ${name} = (\\[[\\s\\S]*?\\n\\]);` : `const ${name} = (\\{[\\s\\S]*?\\n\\});`;
  const found = html.match(new RegExp(pattern));
  assert.ok(found, `Cannot locate ${name}`);
  return vm.runInContext(`(${found[1]})`, context);
}
const M = data('M'), E = data('E', true), P = data('P', true), pathways = data('PATHWAY_INFO'), cells = data('CELL_TYPES', true);
const study = context.BIOCHEM_STUDY_TH;
function sameKeys(actual, expected, label) { assert.deepEqual(Object.keys(actual).sort(), [...expected].sort(), label); }
sameKeys(study.metabolites, Object.keys(M), 'Metabolite translation coverage');
sameKeys(study.perturbations, P.map(p => p.id), 'Perturbation translation coverage');
sameKeys(study.pathways, Object.keys(pathways), 'Pathway translation coverage');
sameKeys(study.cells, cells.map(c => c.id), 'Cell translation coverage');
sameKeys(study.coenzymes, context.BIOCHEM_COENZYMES.map(c => c.id), 'Coenzyme translation coverage');
for (const c of context.BIOCHEM_COENZYMES) {
  for (const enzyme of c.enzymes) assert.ok(E.some(edge => edge.e === enzyme), `${c.id}: unknown enzyme ${enzyme}`);
  assert.ok(c.enzymes.length && c.source.startsWith('https://'), c.id);
  for (const key of ['role','clinical','vitamin']) assert.ok(study.coenzymes[c.id][key], `${c.id}: missing ${key}`);
}
const files = fs.readdirSync(path.join(root, 'cases')).filter(f => f.endsWith('.json'));
sameKeys(context.BIOCHEM_CASES_TH, files.map(f => f.slice(0,-5)), 'Case translation coverage');
const thai = value => typeof value === 'string' && /[\u0E00-\u0E7F]/.test(value);
for (const file of files) {
  const en = JSON.parse(fs.readFileSync(path.join(root,'cases',file), 'utf8'));
  const th = context.BIOCHEM_CASES_TH[file.slice(0,-5)];
  assert.equal(en.id, th.id, file);
  for (const key of ['title','blurb','opening','history','exam']) assert.ok(thai(th[key]), `${file}: ${key}`);
  assert.ok(thai(th.patient.complaint), `${file}: complaint`);
  assert.equal(en.mcqs.length, th.mcqs.length, file);
  for (const [i,q] of en.mcqs.entries()) {
    assert.ok(q.explanation || q.expl, `${file}: missing English explanation ${i}`);
    assert.ok(thai(th.mcqs[i].stem) && thai(th.mcqs[i].explanation), `${file}: question ${i}`);
    assert.equal(q.choices.length, th.mcqs[i].choices.length, `${file}: choices ${i}`);
    assert.ok(q.correct >= 0 && q.correct < q.choices.length, `${file}: correct index ${i}`);
    assert.ok(th.mcqs[i].choices.every(x => typeof x === 'string' && x.trim()), `${file}: empty choice ${i}`);
    assert.equal(th.mcqs[i].correct, undefined, 'Thai display data must not own answer keys');
  }
  for (const key of ['diagnosis','cause','mechanism']) assert.ok(thai(th.explain.prompts[key]), `${file}: prompt ${key}`);
  for (const key of ['prompt','correctMsg','wrongMsg','revealMsg']) assert.ok(thai(th.pinpoint[key]), `${file}: pinpoint ${key}`);
  const target = en.pinpoint.target;
  assert.ok(target.type === 'node' ? M[target.name] : E.some(e => `${e.e}:${e.from}->${e.to}` === target.edgeId), `${file}: broken target`);
  for (const key of ['diagnosis','cause']) assert.ok(th.grade[key]?.some(thai), `${file}: Thai ${key} aliases`);
  if (en.explain.rubric.mechanism.accepts) assert.ok(th.grade.mechanism?.some(thai), `${file}: mechanism aliases`);
  else for (const term of en.explain.rubric.mechanism.mustMention) assert.ok(th.grade.terms[term]?.some(thai), `${file}: term ${term}`);
}
console.log(`PASS syntax, ${Object.keys(M).length} metabolite explanations, ${P.length} conditions, ${Object.keys(pathways).length} pathways, ${cells.length} cells, ${context.BIOCHEM_COENZYMES.length} coenzymes and ${files.length} complete Thai cases`);
