# Paint para macOS — guia do projeto

Clone simples do Paint do Windows que roda no navegador do Mac. **Não precisa de instalação, build, servidor nem loja de apps.** Para usar, basta dar duplo clique em `index.html` (Safari ou Chrome).

Este arquivo registra **o que foi decidido e por quê**, para que futuras edições não percam contexto. Ao mudar algo importante, atualize as seções relevantes e acrescente uma linha no [Log de decisões](#log-de-decisões).

---

## Como rodar e testar

- **Usar:** duplo clique em `index.html`, ou `open index.html` no terminal.
- **Teste automático:** `node tests/e2e.mjs`. Requer Node 22+ e Google Chrome em `/Applications`. O teste abre a página via `file://` no Chrome headless, desenha com eventos de ponteiro simulados e confere os pixels. Ele imprime PASS/FAIL, os erros de console e o caminho de um screenshot. Sai com código ≠ 0 se algo falhar.
- **Teste manual mínimo após mudanças:** desenhar com cada ferramenta, ⌘Z/⇧⌘Z, salvar PNG, colar um print (⌃⇧⌘4 e depois ⌘V) no Safari **e** no Chrome.

---

## Decisões e por quês

| # | Decisão | Motivo |
|---|---------|--------|
| 1 | **HTML + CSS + JavaScript puro + Canvas 2D**, sem dependências e sem build | O requisito é "fácil de executar, sem loja": abre com duplo clique e é editável em qualquer editor. Um app nativo em Swift sem assinatura esbarra no Gatekeeper; o Electron é pesado. |
| 2 | **Scripts clássicos (`<script src>`), não ES modules** | Navegadores bloqueiam `import`/`type="module"` em páginas `file://` (CORS). Cada arquivo publica o que expõe no namespace global **`window.Paint`**. A **ordem dos `<script>` no `index.html` é a ordem de dependência.** |
| 3 | **Bitmap, não vetores** | Como no Paint: a ação grava pixels e não há objetos editáveis depois. Isso mantém o modelo simples. |
| 4 | **Dois canvases empilhados:** `#canvas` (imagem real) e `#overlay` (pré-visualizações) | Linha, forma, seleção e cursor da borracha são redesenhados a cada movimento sem tocar na imagem. O overlay fica por cima e recebe **todos** os eventos de ponteiro. |
| 5 | **Desfazer/refazer com snapshots `ImageData` da imagem inteira**, limite de **30 passos** e **400 MB** | É a abordagem mais simples e correta para bitmap. O limite de memória protege contra imagens grandes. O tamanho máximo da tela é 5000 px por lado. |
| 6 | **Ferramentas são objetos com interface comum**, registrados com `Paint.registerTool` | Para adicionar uma ferramenta, basta criar um arquivo. Ver "Como adicionar uma ferramenta". |
| 7 | **Pointer Events** + `setPointerCapture` | Um único caminho para mouse, trackpad e caneta. O traço continua mesmo se o ponteiro sair do canvas. |
| 8 | **Sem antialias onde importa:** lápis, borracha e linha usam Bresenham (`Paint.draw.pixelLine`); o retângulo usa `fillRect` | Visual igual ao do Paint e bordas nítidas que o balde preenche sem deixar halo. O antialias do `stroke()` deixava cantos cinza (detectado no teste). |
| 9 | **Pincel e elipse usam o path do canvas (com antialias)** | Ficam mais bonitos, e implementar círculo/elipse por pixel não compensava na v1. Efeito colateral: o balde pode deixar contorno ao preencher perto deles. |
| 10 | **Balde: flood fill scanline com tolerância 0** | Comportamento do Paint e algoritmo rápido em `Uint32Array`. Assume CPU little-endian (todos os Macs atuais). |
| 11 | **Imagens lidas com `FileReader` → data: URL** | Assim o canvas não fica "contaminado" (tainted) e `getImageData` continua funcionando em `file://`. |
| 12 | **Salvar:** no Chrome usa `showSaveFilePicker` (janela "Salvar como"); no Safari/Firefox faz download | O Safari não tem File System Access API e o arquivo vai para Downloads. |
| 13 | **Copiar/colar:** grava no clipboard do sistema (`ClipboardItem` com Promise) **e** numa cópia interna | Se a API do sistema falhar ou não tiver permissão, colar dentro do app continua funcionando. |
| 14 | **⌘V:** espera o evento `paste`; se ele não vier (Safari sem elemento editável focado), usa `navigator.clipboard.read()` | O Chrome dispara `paste` no documento e o Safari nem sempre. Nesse caso o Safari mostra um botão "Colar" de confirmação, o que é esperado. |
| 15 | **Sem atalho ⌘N para "Novo"** | O Chrome não permite interceptar ⌘N (abre nova janela). Use o botão "Novo". |
| 16 | **Cores como no Paint:** cor 1 = clique esquerdo; cor 2 = clique direito **ou Ctrl+clique** | A borracha e o buraco deixado ao mover/excluir uma seleção usam a cor 2. Ctrl+clique ajuda quem usa trackpad. |
| 17 | **Modos de forma:** `outline` (contorno na cor do clique), `fill` (preenchido na cor do clique), `both` (contorno na cor do clique + preenchimento na outra cor) | Aproxima o Paint e fica previsível. |
| 18 | **Texto:** uma `<textarea>` sobre o canvas; vira pixels ao confirmar (clicar no canvas, Esc, trocar de ferramenta, salvar, desfazer) | Edição nativa (cursor, acentos, colar texto) sem implementar um editor. Depois de confirmado, o texto não é mais editável, como no Paint. |
| 19 | **Seleção "levanta" os pixels só ao começar a arrastar** | Selecionar só para copiar não altera a imagem. O snapshot é tirado ao levantar, então mover + soltar = um passo de desfazer. |
| 20 | **Colar aumenta a tela** se a imagem colada for maior | O Paint pergunta antes; aqui é automático por simplicidade. |
| 21 | **Interface em português; código e identificadores em inglês; comentários em português** | Pedido do usuário (interface) e convenção de código. |
| 22 | **Zoom só via CSS** (`image-rendering: pixelated`), com níveis de 100% a 800% | Os pixels reais não mudam. As coordenadas são convertidas em `canvas.js` → `point()`. |
| 23 | **Teste E2E sem dependências** (`tests/e2e.mjs`, CDP via `WebSocket` nativo do Node) | Mantém o projeto sem `npm install`. O teste é só para desenvolvimento. |

---

## Mapa de arquivos (na ordem de carregamento)

```
index.html            Layout, botões (data-action / data-tool) e a ORDEM dos scripts
css/style.css         Visual; variáveis CSS e modo escuro via prefers-color-scheme
js/state.js           window.Paint: estado, eventos (on/emit), set(), registerTool, setTool, commitTool
js/draw.js            Paint.draw: pixelLine (Bresenham), hexToUint32, rgbToHex, normRect, makeCanvas
js/history.js         Paint.history: push / undo / redo / clear
js/canvas.js          Paint.canvas: el/ctx, overlay/octx, wrap, setSize, clearOverlay; eventos de ponteiro; zoom
js/tools/select.js    Seleção + API: getSelectionCanvas, deleteSelection, selectAll, paste
js/tools/pencil.js    Lápis 1px
js/tools/brush.js     Pincel (espessura, antialias)
js/tools/eraser.js    Borracha (pinta com a cor 2; preview quadrado no overlay)
js/tools/fill.js      Balde (scanline)
js/tools/picker.js    Conta-gotas (volta à ferramenta anterior)
js/tools/text.js      Texto via textarea
js/tools/line.js      Linha (Bresenham; Shift = 45°)
js/tools/shapes.js    Retângulo e elipse (Shift = quadrado/círculo)
js/file.js            Paint.file: novo, abrir, salvar, tamanho da tela, limpar, copiar/recortar/colar
js/ui.js              Paint.ui: botões, paleta, selects, atalhos de teclado, barra de status, título
js/main.js            Inicialização (sempre o último)
tests/e2e.mjs         Teste automático no Chrome headless
```

### Fluxo de dados
- **A UI nunca desenha.** Ela chama `Paint.set(key, value)`, `Paint.setTool(id)` ou ações (`Paint.file.*`, `Paint.history.*`) e reage ao evento `'change'`.
- **Eventos emitidos:**
  - `'change'` `{key, value}`: qualquer campo de `Paint.state`.
  - `'history'` `{canUndo, canRedo}`.
  - `'resize'` `{width, height}`.
  - `'pointer'` `{x, y, ...}` ou `null`.
  - `'selection'` `{w, h}` ou `null`.
- **Ponteiro** (`canvas.js`): no `pointerdown` a ferramenta ativa é capturada e recebe `onDown`/`onMove`/`onUp` até soltar. Sem botão pressionado, recebe `onHover`/`onLeave`.

---

## Como adicionar uma ferramenta

1. Crie `js/tools/minha.js`:
   ```js
   Paint.registerTool({
     id: 'minha',
     cursor: 'crosshair',
     onDown(ctx, p) { Paint.history.push(); /* desenhar em ctx */ },
     onMove(ctx, p) { /* ... */ },
     onUp(ctx, p) { /* ... */ },
     // opcionais: onHover(p), onLeave(), commit()
   });
   ```
   - `p` = `{ x, y, shift, secondary, color, altColor }`. `color` já é a cor certa para o botão usado (cor 1 ou cor 2).
   - Para pré-visualizar, desenhe em `Paint.canvas.octx` e limpe com `Paint.canvas.clearOverlay()`.
   - Se a ferramenta tem estado "aberto" (algo ainda não gravado no canvas), implemente `commit()`. Ele é chamado ao trocar de ferramenta, salvar, desfazer etc.
2. Adicione `<script src="js/tools/minha.js">` no `index.html`, **depois de `canvas.js` e antes de `file.js`**.
3. Adicione um botão `<button class="tool" data-tool="minha" title="Nome (tecla)">ícone</button>` na barra `.tools`.
4. (Opcional) Registre a tecla de atalho em `TOOL_KEYS` em `js/ui.js`.
5. Adicione um caso em `tests/e2e.mjs`.

---

## Convenções

- **Sempre chame `Paint.history.push()` imediatamente ANTES de alterar pixels de `Paint.canvas.ctx`**, uma vez por operação do usuário. Ferramentas de arrastar fazem isso no `onDown`; linha e formas fazem no `onUp`.
- Toda mudança de estado passa por `Paint.set()`. Não atribua `Paint.state.x = ...` direto, senão a UI não atualiza.
- Sem dependências externas, CDN ou `fetch` (que é bloqueado em `file://`).
- Nenhum `import`/`export`: tudo em `window.Paint`, e cada arquivo é uma IIFE quando precisa de estado privado.
- Textos visíveis em português, código em inglês, comentários em português explicando o *porquê*.
- Atalhos de teclado são ignorados quando o foco está em `textarea`, `input` ou `select`. Os selects fazem `blur()` após a mudança justamente para devolver o foco.

---

## Armadilhas conhecidas

- **`file://`** bloqueia ES modules, `fetch` e workers de arquivo. Não introduza nenhum deles sem mudar a estratégia de distribuição (decisão 2).
- **Canvas contaminado:** carregar imagem por URL de outra origem faz o `getImageData` lançar erro. Use sempre `FileReader` → data: URL (decisão 11).
- **Antialias** quebra o balde com tolerância 0. Prefira desenho por pixel (`pixelLine`/`fillRect`) em ferramentas novas que criam contornos.
- **Mudar `canvas.width`/`height` apaga a imagem e reseta o contexto.** Use `Paint.canvas.setSize(w, h, keep)`.
- **Memória:** cada passo de desfazer guarda `largura × altura × 4` bytes.
- **Atalhos reservados pelo navegador:** ⌘N, ⌘T, ⌘W e ⌘Q não podem ser interceptados.
- **Safari e área de transferência:** escrever no clipboard só funciona dentro de um gesto do usuário. Por isso o `ClipboardItem` recebe uma Promise.

---

## Próximos passos (backlog)

- Polígono, curva, retângulo arredondado.
- Girar/espelhar imagem e seleção; redimensionar (escalar) a imagem, não só a tela.
- Balde com tolerância ajustável.
- Seleção de forma livre e seleção transparente (ignorar a cor 2 ao mover).
- Arrastar as bordas da tela para redimensionar.
- Abrir arquivo arrastando para a janela (drag-and-drop).
- Empacotar como app `.app` com Tauri (opcional, mantendo o mesmo código web).

---

## Log de decisões

Formato: `AAAA-MM-DD — decisão — motivo`.

- 2026-10-20 — App web (HTML/JS/Canvas) em vez de Swift nativo — rodar sem loja, sem assinatura e sem instalação.
- 2026-10-20 — Scripts clássicos + `window.Paint` — ES modules não funcionam em `file://`.
- 2026-10-20 — Linha (Bresenham) e retângulo (`fillRect`) sem antialias — o `stroke()` deixava cantos cinza e halos no balde.
- 2026-10-20 — Teste E2E com Chrome headless via CDP, sem dependências npm.
