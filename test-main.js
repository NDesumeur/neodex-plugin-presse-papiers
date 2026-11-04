// node test-main.js : vérifie le volet système avec un faux presse-papiers
const assert = require('assert');
let clip = 'déjà là', priv = false, doc = null; const h = new Map();
const api = { electron: { clipboard: { readText: async () => clip, writeText: async t => { clip = t; }, has: async () => priv } },
  readDoc: () => doc, writeDoc: (n, d) => { doc = JSON.parse(JSON.stringify(d)); }, emit: () => {}, ipcMain: { handle: (n, f) => h.set(n, (...a) => f({}, ...a)) } };
const stop = require('./main.js')(api);
const tick = async t => { if (t !== undefined) clip = t; await new Promise(r => setTimeout(r, 1100)); };
(async () => {
  await tick(); assert.equal(h.get('clip:list')().items.length, 0, 'le contenu du lancement ne compte pas');
  await tick('a'); await tick('b'); await tick('a');
  let l = h.get('clip:list')(); assert.deepEqual(l.items.map(x => x.text), ['a', 'b'], 'doublon remonté en tête');
  priv = true; await tick('secret'); priv = false; assert.ok(!h.get('clip:list')().items.some(x => x.text === 'secret'), 'mot de passe ignoré');
  h.get('clip:pause')(true); await tick('pendant pause'); h.get('clip:pause')(false);
  assert.ok(!h.get('clip:list')().items.some(x => x.text === 'pendant pause'), 'pause respectée');
  const b = h.get('clip:list')().items.find(x => x.text === 'b'); h.get('clip:pin')(b.id, true);
  h.get('clip:clear')(); assert.deepEqual(h.get('clip:list')().items.map(x => x.text), ['b'], 'effacer garde les épinglés');
  assert.equal(await h.get('clip:copy')(b.id), true); assert.equal(clip, 'b');
  assert.ok(doc && doc.items.length === 1, 'enregistré sur disque');
  stop(); console.log('ok');
})().catch(e => { stop(); console.error(e.message); process.exit(1); });
