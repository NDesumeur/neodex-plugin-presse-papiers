// node test-main.js : vérifie le volet système avec un faux presse-papiers (texte et images)
const assert = require('assert'), fs = require('fs'), os = require('os'), path = require('path');
let clip = 'déjà là', img = null, priv = false, doc = null; const h = new Map();
const fakeImg = (w, px) => ({ isEmpty: () => false, getSize: () => ({ width: w, height: 10 }), resize: () => fakeImg(8, px), toBitmap: () => Buffer.from([px]), toPNG: () => Buffer.from('png' + px), toDataURL: () => 'data:image/png;base64,' + px });
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pp-'));
const api = { dataDir: dir, electron: { clipboard: { readText: async () => clip, writeText: async t => { clip = t; img = null; }, has: async () => priv,
    availableFormats: () => img ? ['image/png'] : clip ? ['text/plain'] : [], readImage: () => img || { isEmpty: () => true }, writeImage: i => { img = i; clip = ''; } },
    nativeImage: { createFromPath: p => Object.assign(fakeImg(500, 7), { from: p }) } },
  readDoc: () => doc, writeDoc: (n, d) => { doc = JSON.parse(JSON.stringify(d)); }, emit: () => {}, ipcMain: { handle: (n, f) => h.set(n, (...a) => f({}, ...a)) } };
const stop = require('./main.js')(api);
const tick = async (t, n = 1) => { if (t !== undefined) { clip = t; img = null; } await new Promise(r => setTimeout(r, 1050 * n)); };
const texts = () => h.get('clip:list')().items.map(x => x.img ? '[img]' : x.text);
(async () => {
  await tick(); assert.equal(h.get('clip:list')().items.length, 0, 'le contenu du lancement ne compte pas');
  await tick('a'); await tick('b'); await tick('a');
  assert.deepEqual(texts(), ['a', 'b'], 'doublon remonté en tête');
  priv = true; await tick('secret'); priv = false; assert.ok(!texts().includes('secret'), 'mot de passe ignoré');
  h.get('clip:pause')(true); await tick('pendant pause'); h.get('clip:pause')(false);
  assert.ok(!texts().includes('pendant pause'), 'pause respectée');
  // une image seule : gardée une fois (relue toutes les 2 s), avec sa miniature et son fichier
  clip = ''; img = fakeImg(500, 7); await tick(undefined, 3);
  let l = h.get('clip:list')().items; assert.deepEqual(texts(), ['[img]', 'pendant pause', 'a', 'b'].filter(x => x !== 'pendant pause'), 'image ajoutée une fois');
  const im = l[0]; assert.ok(im.w === 500 && im.thumb && fs.existsSync(path.join(dir, 'images', im.id + '.png')), 'image enregistrée');
  const b = l.find(x => x.text === 'b'); h.get('clip:pin')(b.id, true);
  // recopier : remis en tête tout de suite, sans être compté une deuxième fois à la lecture suivante
  assert.equal(await h.get('clip:copy')(b.id), true); assert.equal(clip, 'b'); await tick();
  assert.deepEqual(texts(), ['b', '[img]', 'a'], 'recopié en tête, pas de doublon');
  assert.equal(await h.get('clip:copy')(im.id), true); assert.ok(img && img.from.endsWith(im.id + '.png'), 'image recopiée'); await tick(undefined, 2);
  assert.deepEqual(texts(), ['[img]', 'b', 'a'], 'image recopiée sans doublon');
  h.get('clip:clear')(); assert.deepEqual(texts(), ['b'], 'effacer garde les épinglés');
  assert.ok(!fs.existsSync(path.join(dir, 'images', im.id + '.png')), 'le fichier de l\'image effacée part aussi');
  assert.ok(doc && doc.items.length === 1, 'enregistré sur disque');
  stop(); fs.rmSync(dir, { recursive: true, force: true }); console.log('ok');
})().catch(e => { stop(); console.error(e.message); process.exit(1); });
