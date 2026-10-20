// Teste E2E: abre index.html via file:// no Chrome headless (DevTools Protocol, sem dependências)
// e exercita as ferramentas conferindo pixels.
// Uso: node tests/e2e.mjs   (requer Node 22+ e Google Chrome em /Applications)
// Gera um screenshot.png numa pasta temporária, cujo caminho é impresso no final.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const page = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'index.html');
const outDir = mkdtempSync(join(tmpdir(), 'paint-e2e-'));
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile = mkdtempSync(join(outDir, 'profile-'));
const chrome = spawn(chromePath, [
  '--headless=new', '--remote-debugging-port=9333', `--user-data-dir=${profile}`,
  '--window-size=1400,900', '--no-first-run', 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets;
for (let i = 0; i < 50; i++) {
  try { targets = await (await fetch('http://127.0.0.1:9333/json')).json(); break; } catch { await sleep(200); }
}
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pending = new Map(); const errors = [];
ws.addEventListener('message', (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push(JSON.stringify(msg.params.args));
  if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') errors.push(msg.params.entry.text);
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expr) => {
  const res = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (res.result.exceptionDetails) throw new Error(res.result.exceptionDetails.exception?.description);
  return res.result.result.value;
};

await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
await send('Page.navigate', { url: 'file://' + encodeURI(page) });
await sleep(1000);

// Helpers injetados: gestos via PointerEvent no overlay e leitura de pixel.
await evaluate(`
  window.T = {
    ev(type, x, y, opts = {}) {
      const o = Paint.canvas.overlay, r = o.getBoundingClientRect(), z = r.width / o.width;
      o.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 1, button: opts.button ?? 0,
        shiftKey: !!opts.shift, clientX: r.left + (x + 0.5) * z, clientY: r.top + (y + 0.5) * z }));
    },
    drag(pts, opts) { const [a, ...rest] = pts; T.ev('pointerdown', a[0], a[1], opts);
      for (const p of rest) T.ev('pointermove', p[0], p[1], opts); const l = pts[pts.length-1]; T.ev('pointerup', l[0], l[1], opts); },
    px(x, y) { const d = Paint.canvas.ctx.getImageData(x, y, 1, 1).data; return Paint.draw.rgbToHex(d[0], d[1], d[2]); },
  };
  true;
`);

const results = [];
const check = async (name, expr, expected) => {
  let got; try { got = await evaluate(expr); } catch (e) { got = 'ERR ' + e.message; }
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ` (got ${JSON.stringify(got)}, expected ${JSON.stringify(expected)})`}`);
};

await check('canvas inicial 800x600 branco', `[Paint.canvas.el.width, Paint.canvas.el.height, T.px(10,10)]`, [800, 600, '#ffffff']);
await check('ferramenta inicial = lápis', `Paint.state.tool`, 'pencil');
await check('undo desabilitado no início', `document.querySelector('[data-action=undo]').disabled`, true);

await check('lápis desenha linha preta', `T.drag([[10,10],[50,10]]); [T.px(10,10), T.px(30,10), T.px(50,10), T.px(30,11)]`, ['#000000','#000000','#000000','#ffffff']);
await check('dirty + título', `[Paint.state.dirty, document.title]`, [true, '• sem-titulo — Paint']);
await check('desfazer apaga linha', `Paint.history.undo(); T.px(30,10)`, '#ffffff');
await check('refazer restaura linha', `Paint.history.redo(); T.px(30,10)`, '#000000');

await check('clique direito usa cor 2', `Paint.set('secondary', '#ff0000'); T.drag([[10,20],[40,20]], {button:2}); T.px(25,20)`, '#ff0000');
await check('borracha pinta com cor 2', `Paint.set('secondary','#ffffff'); Paint.setTool('eraser'); T.drag([[30,10],[30,10]]); T.px(30,10)`, '#ffffff');

await check('pincel 8px', `Paint.setTool('brush'); Paint.set('size', 8); Paint.set('primary','#0000ff'); T.drag([[100,100],[200,100]]); [T.px(150,100), T.px(150,103), T.px(150,110)]`, ['#0000ff','#0000ff','#ffffff']);

await check('retângulo contorno', `Paint.setTool('rect'); Paint.set('size',1); Paint.set('primary','#000000'); T.drag([[300,300],[350,330],[400,350]]); [T.px(300,300), T.px(400,350), T.px(350,325), T.px(350,300)]`, ['#000000','#000000','#ffffff','#000000']);
await check('overlay limpo após forma', `Paint.canvas.octx.getImageData(350,300,1,1).data[3]`, 0);
await check('balde preenche dentro do retângulo', `Paint.setTool('fill'); Paint.set('primary','#00ff00'); T.drag([[350,325]]); [T.px(350,325), T.px(301,301), T.px(399,349), T.px(450,450)]`, ['#00ff00','#00ff00','#00ff00','#ffffff']);
await check('balde não vaza', `T.px(299,325)`, '#ffffff');

await check('elipse preenchida (Shift = círculo)', `Paint.setTool('ellipse'); Paint.set('shapeMode','fill'); Paint.set('primary','#ff00ff'); T.drag([[500,100],[560,130]], {shift:true}); [T.px(530,130), T.px(501,101)]`, ['#ff00ff','#ffffff']);
await check('linha com Shift trava 45°', `Paint.setTool('line'); Paint.set('primary','#000000'); Paint.set('size',1); T.drag([[600,400],[650,447]], {shift:true}); [T.px(625,425), T.px(649,449)]`, ['#000000','#000000']);

await check('conta-gotas pega cor e volta à ferramenta', `Paint.setTool('picker'); T.drag([[350,325]]); [Paint.state.primary, Paint.state.tool]`, ['#00ff00','line']);
await check('conta-gotas clique direito -> cor 2', `Paint.setTool('picker'); T.drag([[150,100]], {button:2}); Paint.state.secondary`, '#0000ff');
await evaluate(`Paint.set('secondary', '#ffffff')`);

await check('seleção + mover', `Paint.setTool('select');
  T.drag([[300,300],[400,350]]);           // seleciona o retângulo verde
  T.drag([[350,325],[350,425]]);           // arrasta 100px para baixo
  Paint.commitTool();
  [T.px(350,325), T.px(350,425), T.px(300,400)]`, ['#ffffff','#00ff00','#000000']);
await check('mover seleção = 1 passo de desfazer', `Paint.history.undo(); [T.px(350,325), T.px(350,425)]`, ['#00ff00','#ffffff']);

await check('copiar/colar interno', `Paint.setTool('select'); T.drag([[300,300],[400,350]]);
  Paint.file.copy(); Paint.commitTool();
  Paint.tools.select.paste((()=>{ const c = Paint.draw.makeCanvas(101,51); c.getContext('2d').drawImage(Paint.canvas.el,300,300,101,51,0,0,101,51); return c; })());
  Paint.commitTool(); [T.px(50,25), T.px(0,0)]`, ['#00ff00','#000000']);
await check('excluir seleção pinta cor 2', `Paint.setTool('select'); T.drag([[0,0],[100,50]]); Paint.tools.select.deleteSelection(); T.px(50,25)`, '#ffffff');

await check('texto vira pixels ao confirmar', `(async () => { Paint.set('primary','#000000'); Paint.setTool('text'); T.drag([[20,500]]);
  await new Promise(r => setTimeout(r, 50));
  const ta = document.querySelector('.text-box'); ta.value = 'MMMM'; ta.dispatchEvent(new Event('input'));
  Paint.setTool('pencil');
  const d = Paint.canvas.ctx.getImageData(20,500,80,24).data; let dark = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i] < 128) dark++;
  return [dark > 50, !!document.querySelector('.text-box')]; })()`, [true, false]);

await check('zoom 400% mapeia coordenadas', `Paint.set('zoom', 4); Paint.setTool('pencil'); Paint.set('primary','#ff0000'); T.drag([[700,550]]); [T.px(700,550), Paint.canvas.el.style.width]`, ['#ff0000','3200px']);
await evaluate(`Paint.set('zoom', 1)`);

await check('tamanho da tela preserva conteúdo', `Paint.history.push(); Paint.canvas.setSize(1000, 700, true); [Paint.canvas.el.width, T.px(700,550), T.px(950,650)]`, [1000,'#ff0000','#ffffff']);
await check('desfazer volta o tamanho', `Paint.history.undo(); [Paint.canvas.el.width, Paint.canvas.el.height]`, [800,600]);

await check('histórico limitado a 30 passos', `for (let i = 0; i < 40; i++) T.drag([[5,590],[6,590]]);
  let n = 0; while (!document.querySelector('[data-action=undo]').disabled) { Paint.history.undo(); n++; } n`, 30);

await check('atalho de tecla troca ferramenta', `document.dispatchEvent(new KeyboardEvent('keydown', {key:'b', bubbles:true})); Paint.state.tool`, 'brush');
await check('atalho X troca cores', `Paint.set('primary','#111111'); Paint.set('secondary','#222222'); document.body.dispatchEvent(new KeyboardEvent('keydown', {key:'x', bubbles:true})); [Paint.state.primary, Paint.state.secondary]`, ['#222222','#111111']);
await check('botão de ferramenta ativo', `document.querySelector('[data-tool=brush]').classList.contains('active')`, true);
await check('PNG gerado', `new Promise(r => Paint.canvas.el.toBlob(b => r(b.type + ':' + (b.size > 100)), 'image/png'))`, 'image/png:true');
await check('JPEG gerado', `new Promise(r => Paint.canvas.el.toBlob(b => r(b.type), 'image/jpeg', 0.92))`, 'image/jpeg');

// Screenshot com um desenho de exemplo para inspeção visual.
await evaluate(`Paint.set('dirty', false); Paint.file.newImage(); true`);
await evaluate(`Paint.set('shapeMode','both'); Paint.set('size',3); Paint.set('primary','#000080'); Paint.set('secondary','#ffff80');
  Paint.setTool('rect'); T.drag([[60,60],[260,200]]);
  Paint.setTool('ellipse'); Paint.set('primary','#800000'); Paint.set('secondary','#80ffff'); T.drag([[320,80],[480,220]]);
  Paint.setTool('brush'); Paint.set('primary','#008000'); Paint.set('size',8); T.drag([[80,320],[160,280],[240,340],[320,290],[420,330]]);
  Paint.setTool('select'); T.drag([[300,60],[500,240]]); Paint.set('secondary','#ffffff'); true`);
await sleep(200);
const shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync(join(outDir, 'screenshot.png'), Buffer.from(shot.result.data, 'base64'));

console.log(results.join('\n'));
console.log(`\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} passaram`);
console.log(errors.length ? 'ERROS NO CONSOLE:\n' + errors.join('\n') : 'Nenhum erro no console.');
console.log('Screenshot: ' + join(outDir, 'screenshot.png'));
ws.close(); chrome.kill();
process.exit(results.every((r) => r.startsWith('PASS')) && !errors.length ? 0 : 1);
