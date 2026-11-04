// lancé par le test « local » de NeoDex : copie un texte, vérifie qu'il apparaît, l'épingle, le recopie
const { clipboard } = require('electron');
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
  return 'capture, épingle, recopie et recherche (' + n + ' résultat) ok';
};
