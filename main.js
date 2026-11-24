// Presse-papiers, volet système : lit le presse-papiers de Windows chaque seconde (même NeoDex en arrière-plan)
// et garde l'historique du texte et des images copiés dans le dossier du plugin. Les épinglés ne partent jamais tout seuls.
// Ce qu'un gestionnaire de mots de passe marque « à ne pas garder » (le signal standard de Windows) n'est jamais enregistré.
// Ctrl+Alt+H : une petite liste s'ouvre près de la souris, au-dessus de l'appli où tu es ; Entrée colle dans cette appli.
const fs = require('fs'), path = require('path');
const MAX = 200, MAXLEN = 20000, MAXIMG = 40, IMGBYTES = 15e6;
const PRIVATE = ['ExcludeClipboardContentFromMonitorProcessing', 'CanIncludeInClipboardHistory', 'Clipboard Viewer Ignore']
  .map(f => 'electron application/osclipboard;format="' + f + '"');

module.exports = api => {
  const { clipboard } = api.electron;
  let h = api.readDoc('history'); if (!h || !Array.isArray(h.items)) h = { items: [], paused: false };
  const imgDir = path.join(api.dataDir || '.', 'images'), imgFile = id => path.join(imgDir, id + '.png');
  let last = null, lastImg = null, tick = 0;
  const save = () => { api.writeDoc('history', h); api.emit('clip:changed', null); };
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const isPrivate = async () => { for (const f of PRIVATE) try { if (await clipboard.has(f)) return true; } catch {} return false; };
  const dropFile = it => { if (it.img) try { fs.unlinkSync(imgFile(it.id)); } catch {} };
  // une image : sa taille et une miniature 8 px suffisent à la reconnaître sans tout comparer
  const imgSig = img => { const s = img.getSize(); return s.width + 'x' + s.height + ':' + Buffer.from(img.resize({ width: 8, height: 8 }).toBitmap()).toString('base64'); };
  function bump(i, make) {  // déjà là : remonte en tête ; sinon : ajouté
    const it = i >= 0 ? h.items.splice(i, 1)[0] : make(); it.at = Date.now(); h.items.unshift(it); trim(); save();
  }
  async function poll() {
    let t; try { t = await clipboard.readText(); } catch { return; }
    if (last === null) { last = t; if (!t) try { const im = clipboard.readImage(); lastImg = im.isEmpty() ? '' : imgSig(im); } catch {} return; }  // ce qui était déjà copié au lancement n'est pas une nouvelle copie
    if (t !== last) { last = t; lastImg = null;
      if (h.paused || !t || !t.trim() || await isPrivate()) return;
      const text = t.slice(0, MAXLEN);
      return bump(h.items.findIndex(x => x.text === text && !x.img), () => ({ id: newId(), text, pinned: false }));
    }
    // une image seule (sans texte : Word met aussi une image de son texte, elle ne compte pas)
    // shortcut: l'image est relue toutes les 2 s tant qu'elle reste copiée (Electron ne dit pas quand le presse-papiers change), à remplacer par l'événement de Windows si NeoDex le donne un jour
    if (t || ++tick % 2 || !clipboard.availableFormats().some(f => /^image\//.test(f))) return;
    let im; try { im = clipboard.readImage(); } catch { return; }
    if (im.isEmpty()) return;
    const sig = imgSig(im); if (sig === lastImg) return; lastImg = sig;
    if (h.paused || await isPrivate()) return;
    const png = im.toPNG(); if (png.length > IMGBYTES) return;
    const s = im.getSize();
    bump(h.items.findIndex(x => x.img && x.sig === sig), () => {
      const id = newId(); fs.mkdirSync(imgDir, { recursive: true }); fs.writeFileSync(imgFile(id), png);
      const th = s.width > 360 ? im.resize({ width: 360 }) : im;
      return { id, img: true, sig, w: s.width, h: s.height, text: '', thumb: th.toDataURL(), pinned: false };
    });
  }
  function trim() {  // au-delà de MAX textes ou MAXIMG images : les plus anciens non épinglés partent
    let nt = h.items.filter(x => !x.img).length, ni = h.items.length - nt;
    for (let k = h.items.length - 1; k >= 0; k--) { const x = h.items[k]; if (x.pinned) continue;
      if (x.img ? ni > MAXIMG : nt > MAX) { h.items.splice(k, 1); dropFile(x); x.img ? ni-- : nt--; } }
  }
  async function put(it) {  // le remet dans le presse-papiers (le texte toujours sans mise en forme)
    if (it.img) clipboard.writeImage(api.electron.nativeImage.createFromPath(imgFile(it.id))); else await clipboard.writeText(it.text);
    last = it.img ? '' : it.text; if (it.img) lastImg = it.sig;
    bump(h.items.indexOf(it), () => it);
  }
  const timer = setInterval(poll, 1000); poll();
  const on = (name, fn) => api.ipcMain.handle(name, fn);
  const find = id => h.items.find(x => x.id === id);
  on('clip:list', () => h);
  on('clip:copy', async (_, id) => { const it = find(id); if (!it) return false; await put(it); return true; });
  on('clip:pin', (_, id, pin) => { const it = find(id); if (it) { it.pinned = !!pin; save(); } return !!it; });
  on('clip:remove', (_, id) => { const it = find(id); if (it) dropFile(it); h.items = h.items.filter(x => x.id !== id); save(); return true; });
  on('clip:clear', () => { h.items.filter(x => !x.pinned).forEach(dropFile); h.items = h.items.filter(x => x.pinned); save(); return true; });
  on('clip:pause', (_, p) => { h.paused = !!p; save(); return h.paused; });

  // --- la petite liste au-dessus de l'appli active ---
  let pop = null, keys = null;
  // le Ctrl+V vers l'appli revenue devant : un PowerShell lancé dès l'ouverture de la liste (il met une demi-seconde à démarrer), qui attend le signal
  function keysReady() {
    if (api.pasteKeys) return { go: api.pasteKeys, stop() {} };  // le test : rien n'est tapé pour de vrai
    const cp = require('child_process');
    if (process.platform !== 'win32') return { go: () => cp.execFile('xdotool', ['key', '--clearmodifiers', 'ctrl+v'], () => {}), stop() {} };
    const ps = cp.spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command',
      "Add-Type -AssemblyName System.Windows.Forms; if ([Console]::In.ReadLine() -eq 'v') { [System.Windows.Forms.SendKeys]::SendWait('^v') }"], { windowsHide: true, stdio: ['pipe', 'ignore', 'ignore'] });
    ps.on('error', () => {});
    return { go: () => ps.stdin.end('v\n'), stop: () => { try { ps.kill(); } catch {} } };
  }
  function close(pasteIt) {
    if (!pop || pop.isDestroyed()) return;
    const k = keys; keys = null; pop.hide();
    if (pasteIt) put(pasteIt).then(() => setTimeout(() => k?.go(), 120), () => k?.stop()); else k?.stop();
  }
  function popup(en) {
    const E = api.electron;
    if (!pop || pop.isDestroyed()) {
      pop = new E.BrowserWindow({ width: 460, height: 540, show: false, frame: false, resizable: false, alwaysOnTop: true, skipTaskbar: true, backgroundColor: '#120a26', title: 'Presse-papiers',
        webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, javascript: true, spellcheck: false } });
      pop.setAlwaysOnTop(true, 'pop-up-menu'); pop.setMenu(null);
      pop.on('blur', () => close());
      pop.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
      pop.webContents.on('will-navigate', e => e.preventDefault());
      // la liste répond par son titre : « pick:<id> », « tab », « esc »
      pop.on('page-title-updated', (e, t) => { e.preventDefault();
        const m = /^(pick|tab|esc|pin):?(.*)$/.exec(t); if (!m) return;
        if (m[1] === 'pick') close(find(m[2]));
        else if (m[1] === 'tab') { close(); const w = api.getWin?.(); if (w) { if (w.isMinimized()) w.restore(); w.show(); w.focus(); } api.emit('clip:tab', null); }
        else if (m[1] === 'esc') close();
      });
      pop.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(POPUP));
    }
    keys?.stop(); keys = keysReady();
    const items = h.items.slice().sort((a, b) => b.pinned - a.pinned).slice(0, 60).map(x => ({ id: x.id, text: x.text.slice(0, 600), img: !!x.img, thumb: x.thumb || '', w: x.w, h: x.h, pinned: !!x.pinned }));
    const w = 460, hh = Math.max(220, Math.min(540, 104 + items.reduce((n, x) => n + (x.img ? 80 : 44), 0)));  // à la taille de la liste
    pop.setResizable(true); pop.setSize(w, hh); pop.setResizable(false);  // Windows ignore la taille d'une fenêtre non redimensionnable
    const pt = E.screen.getCursorScreenPoint(), wa = E.screen.getDisplayNearestPoint(pt).workArea;
    pop.setPosition(Math.round(Math.min(Math.max(pt.x - 30, wa.x), wa.x + wa.width - w)), Math.round(Math.min(Math.max(pt.y - 20, wa.y), wa.y + wa.height - hh)));
    const show = () => { pop.webContents.executeJavaScript('window.fill(' + JSON.stringify({ items, en }) + ')').catch(() => {}); pop.show(); pop.focus(); pop.moveTop(); };
    pop.webContents.isLoading() ? pop.webContents.once('did-finish-load', show) : show();
    return true;
  }
  on('clip:popup', (_, en) => popup(!!en));
  on('clip:popupState', () => !!pop && !pop.isDestroyed() && pop.isVisible());
  return () => { clearInterval(timer); keys?.stop(); if (pop && !pop.isDestroyed()) pop.destroy(); };
};
module.exports.MAX = MAX;

// la petite liste : chercher en tapant, ↑ ↓ pour choisir, Entrée (ou un clic) colle, 1 à 9 collent directement, Échap ferme
const POPUP = `<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'">
<title>Presse-papiers</title><style>
*{box-sizing:border-box}html,body{margin:0;height:100%;background:#120a26;color:#fff;font:15px 'Segoe UI',system-ui,sans-serif;overflow:hidden}
body{display:flex;flex-direction:column;border:2px solid #e01ec8}
input{margin:10px;padding:9px 11px;font:15px inherit;font-family:inherit;color:#fff;background:#0b0618;border:2px solid #3a2a6e;outline:none}input:focus{border-color:#e01ec8}
ul{list-style:none;margin:0;padding:0 6px 6px;flex:1;overflow-y:auto}
li{display:flex;gap:10px;align-items:center;padding:8px 10px;cursor:pointer;border:2px solid transparent;margin-bottom:3px;background:#1c1238}
li.on{border-color:#e01ec8;background:#2a1850}li.pin{border-left:4px solid #ffd84a}
li b{flex:none;width:18px;color:#9a8cc0;font-weight:normal;font-size:13px;text-align:center}
li span{flex:1;min-width:0;white-space:pre;overflow:hidden;text-overflow:ellipsis;font-family:Consolas,'Cascadia Mono',monospace;font-size:14px}
li img{max-height:56px;max-width:180px;image-rendering:auto;border:1px solid #3a2a6e}li small{color:#9a8cc0;font-size:12px}
footer{display:flex;justify-content:space-between;gap:8px;padding:7px 12px;font-size:12px;color:#9a8cc0;border-top:1px solid #3a2a6e}
footer a{color:#c9bde6;cursor:pointer;text-decoration:underline}.empty{padding:30px;text-align:center;color:#9a8cc0}
</style><input id=q placeholder="Chercher…" autocomplete=off spellcheck=false><ul id=l></ul>
<footer><span id=hint>Entrée colle · 1–9 directement · Échap ferme</span><a id=tab>TOUT L'HISTORIQUE</a></footer>
<script>
let all = [], sel = 0, shown = [], T = {}, moved = false;  // moved : la souris a vraiment bougé (à l'ouverture, elle est déjà sur la liste)
addEventListener('mousemove', e => { if (e.movementX || e.movementY) moved = true; }, true);
const q = document.getElementById('q'), l = document.getElementById('l'), say = t => { document.title = t; setTimeout(() => document.title = 'Presse-papiers', 50); };
const tr = s => T[s] || s;
window.fill = d => { all = d.items; T = d.en ? { 'Chercher…': 'Search…', 'Entrée colle · 1–9 directement · Échap ferme': 'Enter pastes · 1–9 directly · Esc closes', "TOUT L'HISTORIQUE": 'FULL HISTORY', 'Rien ne correspond.': 'Nothing matches.', 'Rien de copié pour l’instant.': 'Nothing copied yet.' } : {};
  q.placeholder = tr('Chercher…'); document.getElementById('hint').textContent = tr('Entrée colle · 1–9 directement · Échap ferme'); document.getElementById('tab').textContent = tr("TOUT L'HISTORIQUE");
  q.value = ''; sel = 0; moved = false; draw(); q.focus(); };
function draw() {
  const n = q.value.trim().toLowerCase(); shown = all.filter(x => !n || (x.img ? 'image'.includes(n) : x.text.toLowerCase().includes(n)));
  sel = Math.max(0, Math.min(sel, shown.length - 1));
  l.replaceChildren(...shown.map((x, i) => { const li = document.createElement('li'), b = document.createElement('b'); li.className = (i === sel ? 'on' : '') + (x.pinned ? ' pin' : '');
    b.textContent = i < 9 ? i + 1 : ''; li.append(b);
    if (x.img) { const im = document.createElement('img'), s = document.createElement('small'); im.src = x.thumb; s.textContent = x.w + ' × ' + x.h; li.append(im, s); }
    else { const s = document.createElement('span'); s.textContent = x.text.replace(/\\s+/g, ' ').trim(); s.title = x.text; li.append(s); }
    li.onclick = () => say('pick:' + x.id); li.onmousemove = e => { if (moved && sel !== i) { sel = i; mark(); } }; return li; }));
  if (!shown.length) { const e = document.createElement('div'); e.className = 'empty'; e.textContent = tr(all.length ? 'Rien ne correspond.' : 'Rien de copié pour l’instant.'); l.append(e); }
}
const mark = () => [...l.children].forEach((li, i) => li.classList.toggle('on', i === sel));
q.oninput = () => { sel = 0; draw(); };
document.getElementById('tab').onclick = () => say('tab');
addEventListener('keydown', e => {
  if (e.key === 'Escape') return say('esc');
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + shown.length) % Math.max(1, shown.length); mark(); l.children[sel]?.scrollIntoView({ block: 'nearest' }); return; }
  if (e.key === 'Enter' && shown[sel]) { e.preventDefault(); return say('pick:' + shown[sel].id); }
  if (/^[1-9]$/.test(e.key) && !q.value && shown[+e.key - 1]) { e.preventDefault(); say('pick:' + shown[+e.key - 1].id); }
});
</script>`;
