// Presse-papiers : l'historique de ce que tu copies (texte), avec recherche et éléments épinglés.
// La lecture du presse-papiers se fait dans le volet système (main.js) ; ici, la liste. Ctrl+Alt+H l'ouvre de n'importe où.
const CSS = `
.cpWrap{max-width:900px;margin:0 auto;padding:22px;display:flex;flex-direction:column;gap:14px;box-sizing:border-box}
.cpBar{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.cpBar input[type=search]{flex:1;min-width:200px;font:15px var(--body,monospace);color:#fff;background:#0d0820;border:2px solid var(--line2,#3a2a6e);padding:10px 12px}
.cpBar label{display:flex;align-items:center;gap:8px;font:9px var(--title);letter-spacing:1px;color:var(--lilac,#c9bde6);cursor:var(--cp,pointer)}
.cpBar label input{accent-color:var(--magenta);width:16px;height:16px}
.cpList{display:flex;flex-direction:column;gap:8px}
.cpItem{display:flex;gap:12px;align-items:flex-start;padding:12px 14px;cursor:var(--cp,pointer);background:color-mix(in srgb,var(--line2,#3a2a6e) 45%,#000);box-shadow:inset 0 0 0 2px var(--line2,#3a2a6e)}
.cpItem:hover{box-shadow:inset 0 0 0 2px var(--magenta,#e01ec8)}
.cpItem.pin{box-shadow:inset 0 0 0 2px var(--yellow,#ffd84a)}
.cpItem pre{flex:1;min-width:0;margin:0;font:13px Consolas,'Cascadia Mono',monospace;color:#fff;white-space:pre-wrap;word-break:break-word;max-height:7.5em;overflow:hidden}
.cpItem .cpSide{display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex:none}
.cpItem small{font-size:11px;color:var(--muted,#9a8cc0);white-space:nowrap}
.cpItem .cpBtns{display:flex;gap:6px}
.cpItem button{padding:6px 9px;font-size:9px}
.cpEmpty{opacity:.7;text-align:center;padding:40px 0}
.cpHead{font:9px var(--title);letter-spacing:2px;color:var(--lilac,#c9bde6);margin-top:6px}`;

export default async function (ctx) {
  const view = ctx.view, el = ctx.el, host = ctx.host, ID = ctx.id;
  if (!host) { view.textContent = "Ce plugin doit être approuvé par NeoDex pour s'ouvrir."; return; }
  host.addStyle(CSS);
  const main = (name, ...a) => ctx.neo.pluginMain(ID, name, ...a);
  const wrap = el('div', 'cpWrap'), bar = el('div', 'cpBar'), q = el('input'), pause = el('label'), pauseCb = el('input'), clear = el('button', 'btn px', 'TOUT EFFACER'), list = el('div', 'cpList'), info = el('div', 'hint');
  q.type = 'search'; q.placeholder = 'Chercher dans ce que tu as copié…';
  pauseCb.type = 'checkbox'; pause.append(pauseCb, el('span', '', 'PAUSE'));
  pause.title = 'En pause, rien de ce que tu copies n\'est enregistré';
  clear.title = 'Efface tout l\'historique, sauf les épinglés';
  bar.append(q, pause, clear);
  wrap.append(el('div', 'agHead', ''), bar, info, list);
  wrap.firstChild.append(el('span', 'label', 'Presse-papiers'), el('span', 'hint', 'Ctrl+Alt+H l\'ouvre de n\'importe où · un clic recopie'));
  view.replaceChildren(wrap);

  let h = { items: [], paused: false }, err = '';
  const ago = t => { const s = Math.round((Date.now() - t) / 1000); return s < 60 ? 'à l\'instant' : s < 3600 ? 'il y a ' + Math.round(s / 60) + ' min' : s < 86400 ? 'il y a ' + Math.round(s / 3600) + ' h' : new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }); };
  function render() {
    const needle = q.value.trim().toLowerCase();
    const items = h.items.filter(x => !needle || x.text.toLowerCase().includes(needle));
    const pinned = items.filter(x => x.pinned), rest = items.filter(x => !x.pinned);
    pauseCb.checked = !!h.paused;
    info.textContent = err || (h.paused ? 'En pause : ce que tu copies n\'est pas enregistré.' : h.items.length + ' élément' + (h.items.length > 1 ? 's' : '') + ' · les 200 derniers sont gardés, les épinglés toujours · les mots de passe des gestionnaires ne sont jamais gardés');
    const card = x => {
      const c = el('div', 'cpItem' + (x.pinned ? ' pin' : '')), side = el('div', 'cpSide'), btns = el('div', 'cpBtns');
      const pre = el('pre'); pre.textContent = x.text.length > 1200 ? x.text.slice(0, 1200) + '…' : x.text;
      const pin = el('button', 'btn px', x.pinned ? 'DÉSÉPINGLER' : 'ÉPINGLER'), del = el('button', 'btn px', '✕');
      pin.onclick = e => { e.stopPropagation(); main('clip:pin', x.id, !x.pinned).then(load); };
      del.onclick = e => { e.stopPropagation(); main('clip:remove', x.id).then(load); };
      c.onclick = () => main('clip:copy', x.id).then(() => host.toast('Copié'), e => host.toast('Copie impossible : ' + e.message, true));
      c.title = 'Clique pour le recopier';
      btns.append(pin, del); side.append(el('small', '', ago(x.at)), btns); c.append(pre, side); return c;
    };
    const out = [];
    if (pinned.length) out.push(el('div', 'cpHead', 'ÉPINGLÉS'), ...pinned.map(card));
    if (rest.length) out.push(el('div', 'cpHead', pinned.length ? 'RÉCENTS' : ''), ...rest.map(card));
    if (!items.length) out.push(el('div', 'cpEmpty', needle ? 'Rien ne correspond.' : 'Copie un texte n\'importe où : il apparaît ici.'));
    list.replaceChildren(...out);
  }
  async function load() {
    try { h = await main('clip:list') || h; err = ''; }
    catch (e) { err = /PERMISSION|volet|rien à/.test(e.message) ? 'Le volet système de Presse-papiers n\'est pas lancé : accorde-lui « volet système » dans Autorisations.' : 'Lecture impossible : ' + e.message; }
    render();
  }
  q.oninput = render;
  pauseCb.onchange = () => main('clip:pause', pauseCb.checked).then(load);
  clear.onclick = async () => { if (await host.confirm('Effacer tout l\'historique (les épinglés restent) ?', { ok: 'Effacer', danger: true })) main('clip:clear').then(load); };
  ctx.neo.onPluginMain(e => { if (e.id === ID && e.name === 'clip:changed') load(); });
  ctx.commands.on('open', () => { q.value = ''; render(); q.focus(); });
  ctx.onOpen(() => { load(); setTimeout(() => q.focus(), 50); });
  load();
}
