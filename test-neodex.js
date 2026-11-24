// lancé par le test « local » de NeoDex : copie un texte, vérifie qu'il apparaît, l'épingle, le recopie
const { clipboard, BrowserWindow } = require('electron');
module.exports = async ({ pj, sleep }) => {
  const mark = 'neodex-test-' + Date.now();
  await clipboard.writeText(mark); await sleep(2500);
  const shown = await pj(`[...document.querySelectorAll('.cpItem pre')].some(p => p.textContent === ${JSON.stringify(mark)})`);
  if (!shown) throw new Error('le texte copié n\'apparaît pas');
  await clipboard.writeText('autre chose'); await sleep(2000);
  await pj(`[...document.querySelectorAll('.cpItem')].find(c => c.querySelector('pre').textContent === ${JSON.stringify(mark)}).querySelector('button').click()`); await sleep(800);
  if (!await pj(`document.querySelector('.cpItem.pin pre')?.textContent === ${JSON.stringify(mark)}`)) throw new Error('épingler ne marche pas');
  await pj(`document.querySelector('.cpItem.pin').click()`); await sleep(800);
  if (await clipboard.readText() !== mark) throw new Error('le clic ne recopie pas');
  await pj(`(document.querySelector('input[type=search]').value = 'autre', document.querySelector('input[type=search]').dispatchEvent(new Event('input')))`);
  const n = await pj(`document.querySelectorAll('.cpItem').length`);
  const over = await pj(`[...document.querySelectorAll('.cpWrap *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).length`);
  if (over) throw new Error(over + ' élément(s) débordent à droite');
  // Ctrl+Alt+H : la petite liste au-dessus de l'appli active (ouverte ici directement : le raccourci global est coupé pendant les tests)
  await pj(`window.neo.pluginMain('neodex.pressepapiers', 'clip:popup', false)`); await sleep(900);
  const pop = BrowserWindow.getAllWindows().find(w => w.getTitle() === 'Presse-papiers' && w.isVisible());
  if (!pop) throw new Error('la petite liste ne s’ouvre pas');
  const sz = pop.getSize();
  if (sz[1] >= 540) throw new Error('la petite liste ne prend pas la taille de son contenu');
  const rows = await pop.webContents.executeJavaScript(`[...document.querySelectorAll('li span')].map(s => s.textContent)`);
  if (!await pop.webContents.executeJavaScript(`document.querySelector('li')?.classList.contains('on') && document.activeElement.id === 'q'`)) throw new Error('petite liste : le premier élément doit être choisi et la recherche prête');
  if (!rows.includes(mark) || !rows.includes('autre chose')) throw new Error('petite liste : ' + JSON.stringify(rows.slice(0, 4)));
  const shot = (await pop.webContents.capturePage()).toJPEG(85); require('fs').writeFileSync(require('path').join(require('os').tmpdir(), 'neotests', 'pp-popup.jpg'), shot);
  pop.webContents.sendInputEvent({ type: 'char', keyCode: 'a' }); await sleep(150);
  pop.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' }); await sleep(400);
  if (pop.isVisible()) throw new Error('Échap ne ferme pas la petite liste');
  // le profil de test reste propre : les textes du test partent
  await pj(`(async () => { const P = 'neodex.pressepapiers', l = await window.neo.pluginMain(P, 'clip:list'); for (const x of l.items) if (/^neodex-test-|^autre chose$/.test(x.text)) await window.neo.pluginMain(P, 'clip:remove', x.id); })()`);
  return 'capture, épingle, recopie et recherche (' + n + ' résultat) ok · petite liste (' + rows.length + ' éléments) ouverte et fermée, ' + sz[1] + ' px de haut';
};
