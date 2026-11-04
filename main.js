// Presse-papiers, volet système : lit le presse-papiers de Windows chaque seconde (même NeoDex en arrière-plan)
// et garde l'historique du texte copié dans le dossier du plugin. Les épinglés ne partent jamais tout seuls.
// Ce qu'un gestionnaire de mots de passe marque « à ne pas garder » (le signal standard de Windows) n'est jamais enregistré.
const MAX = 200, MAXLEN = 20000;
const PRIVATE = ['ExcludeClipboardContentFromMonitorProcessing', 'CanIncludeInClipboardHistory', 'Clipboard Viewer Ignore']
  .map(f => 'electron application/osclipboard;format="' + f + '"');

module.exports = api => {
  const { clipboard } = api.electron;
  let h = api.readDoc('history'); if (!h || !Array.isArray(h.items)) h = { items: [], paused: false };
  let last = null;
  const save = () => { api.writeDoc('history', h); api.emit('clip:changed', null); };
  const isPrivate = async () => { for (const f of PRIVATE) try { if (await clipboard.has(f)) return true; } catch {} return false; };
  async function poll() {
    let t; try { t = await clipboard.readText(); } catch { return; }
    if (last === null) { last = t; return; }  // ce qui était déjà copié au lancement n'est pas une nouvelle copie
    if (t === last) return; last = t;
    if (h.paused || !t || !t.trim() || await isPrivate()) return;
    const i = h.items.findIndex(x => x.text === t.slice(0, MAXLEN));
    const it = i >= 0 ? h.items.splice(i, 1)[0] : { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), text: t.slice(0, MAXLEN), pinned: false };
    it.at = Date.now(); h.items.unshift(it);
    trim(); save();
  }
  function trim() {  // au-delà de MAX : les plus anciens non épinglés partent
    for (let k = h.items.length - 1, n = h.items.length; k >= 0 && n > MAX; k--) if (!h.items[k].pinned) { h.items.splice(k, 1); n--; }
  }
  const timer = setInterval(poll, 1000); poll();
  const on = (name, fn) => api.ipcMain.handle(name, fn);
  on('clip:list', () => h);
  on('clip:copy', async (_, id) => { const it = h.items.find(x => x.id === id); if (!it) return false; await clipboard.writeText(it.text); return true; });  // il remonte en tête à la lecture suivante
  on('clip:pin', (_, id, pin) => { const it = h.items.find(x => x.id === id); if (it) { it.pinned = !!pin; save(); } return !!it; });
  on('clip:remove', (_, id) => { h.items = h.items.filter(x => x.id !== id); save(); return true; });
  on('clip:clear', () => { h.items = h.items.filter(x => x.pinned); save(); return true; });
  on('clip:pause', (_, p) => { h.paused = !!p; save(); return h.paused; });
  return () => clearInterval(timer);
};
module.exports.MAX = MAX;
