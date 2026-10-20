# js/ — lógica do app

JavaScript puro, sem dependências e **sem ES modules**: o app abre via `file://`, onde `import` é bloqueado. Cada arquivo é um `<script>` clássico que publica o que expõe no objeto global **`window.Paint`**. Por isso **a ordem dos `<script>` no `index.html` é a ordem de dependência**: um arquivo só pode usar o que foi carregado antes dele.

## Arquivos (na ordem de carregamento)

| Arquivo | Expõe | O que faz |
|---|---|---|
| `state.js` | `window.Paint` | Cria o namespace e o estado global (`Paint.state`): ferramenta, cores 1 e 2, espessura, modo das formas, fonte, zoom, `dirty`, nome do arquivo. Também tem o sistema de eventos (`on`/`emit`), `set()` (toda mudança de estado passa por ele e emite `'change'`), o registro de ferramentas (`registerTool`, `setTool`, `currentTool`) e `commitTool()`. |
| `draw.js` | `Paint.draw` | Utilitários de desenho: `pixelLine` (linha de Bresenham sem antialias, usada por lápis, borracha e linha), `hexToUint32`, `rgbToHex`, `normRect` e `makeCanvas`. |
| `history.js` | `Paint.history` | Desfazer/refazer com snapshots `ImageData` da imagem inteira (`push`, `undo`, `redo`, `clear`). Limites: 30 passos e 400 MB. Restaura também o tamanho da imagem. Emite `'history'`. |
| `canvas.js` | `Paint.canvas` | Cuida dos dois canvases: `#canvas` (imagem real) e `#overlay` (pré-visualizações). Tem `setSize` (muda o tamanho preservando ou não o conteúdo), `clearOverlay` e o zoom via CSS. Recebe os eventos de ponteiro e os repassa à ferramenta ativa (`onDown`/`onMove`/`onUp`/`onHover`/`onLeave`), convertendo a posição na tela para pixel da imagem. |
| `tools/*.js` | `Paint.tools.<id>` | As ferramentas de desenho. Ver [`tools/README.md`](tools/README.md). |
| `file.js` | `Paint.file` | Novo, abrir (`FileReader` → data: URL), salvar PNG/JPEG ("Salvar como" no Chrome, download no Safari), tamanho da tela (corta ou aumenta sem escalar), limpar, copiar/recortar/colar (clipboard do sistema + cópia interna) e a constante `MAX_SIDE` (5000 px). |
| `resize.js` | `Paint.resize` | Diálogo "Redimensionar": escala a imagem por porcentagem ou pixels, com "Manter proporção". Um campo vazio é calculado pela proporção. Tem a opção de suavização. `scaleImage(w, h, smoothing)` faz a escala. |
| `ui.js` | `Paint.ui` | Liga a interface ao estado: botões `data-action`/`data-tool`, paleta de 28 cores, selects, campo de zoom (−/+, digitado, pinça), atalhos de teclado, barra de status, título da janela e botões desfazer/refazer habilitados ou não. **A UI nunca desenha**; só chama ações e reage a eventos. |
| `main.js` | — | Inicialização, nesta ordem: `ui` → `file` → `resize` → `canvas` (800×600) → histórico → lápis. Também registra o aviso de alterações não salvas ao fechar. **Deve ser sempre o último script.** |

## Eventos (`Paint.on(nome, fn)`)

| Evento | Dados | Emitido por |
|---|---|---|
| `'change'` | `{ key, value }` | `Paint.set()`, em qualquer mudança de `Paint.state` |
| `'history'` | `{ canUndo, canRedo }` | `history.js` |
| `'resize'` | `{ width, height }` | `canvas.setSize()` |
| `'pointer'` | `{ x, y, ... }` ou `null` | `canvas.js`, ao mover o ponteiro sobre a imagem |
| `'selection'` | `{ w, h }` ou `null` | `tools/select.js` |

## Regras ao editar

- Chame `Paint.history.push()` **antes** de alterar pixels de `Paint.canvas.ctx`, uma vez por ação do usuário.
- Mude o estado só com `Paint.set(chave, valor)`. Se atribuir `Paint.state.x = ...` direto, a UI não atualiza.
- Arquivo novo: adicione o `<script>` no `index.html` na posição certa e atualize esta tabela.
- Mais contexto sobre as decisões está em [`../CLAUDE.md`](../CLAUDE.md).
