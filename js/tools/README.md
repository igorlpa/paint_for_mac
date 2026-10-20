# js/tools/ — ferramentas de desenho

Cada arquivo registra uma ferramenta (o `shapes.js` registra duas) com `Paint.registerTool({...})`. O `canvas.js` entrega os eventos de ponteiro à ferramenta ativa.

## Interface de uma ferramenta

```js
Paint.registerTool({
  id: 'minha',            // usado em data-tool="minha" no index.html e em Paint.setTool('minha')
  cursor: 'crosshair',    // cursor CSS sobre a imagem
  onDown(ctx, p) {},      // botão pressionado
  onMove(ctx, p) {},      // arrastando (só enquanto o botão está pressionado)
  onUp(ctx, p) {},        // botão solto
  onHover(p) {},          // opcional: movendo sem botão pressionado
  onLeave() {},           // opcional: ponteiro saiu da imagem
  commit() {},            // opcional: grava algo "pendente" (seleção, texto) no canvas
});
```

- **`ctx`** é o contexto 2D da imagem real. Para pré-visualizar, use `Paint.canvas.octx` (overlay) e limpe com `Paint.canvas.clearOverlay()`.
- **`p`** = `{ x, y, shift, secondary, color, altColor }`. `x`/`y` já estão em pixels da imagem, com o zoom descontado. `color` já é a cor certa para o botão usado (cor 1 no clique esquerdo; cor 2 no clique direito ou Ctrl+clique), e `altColor` é a outra.
- **`commit()`** é chamado ao trocar de ferramenta, salvar, desfazer, redimensionar, apertar Esc ou clicar fora da imagem.

## Arquivos

| Arquivo | Ferramenta (tecla) | Como funciona |
|---|---|---|
| `select.js` | Seleção (S) | Arrastar marca uma área. Arrastar de dentro dela "levanta" os pixels para um canvas flutuante (é aí que o snapshot do desfazer é tirado) e pinta o buraco com a cor 2. O flutuante é desenhado no overlay e volta à imagem no `commit()`. Também expõe a API usada por `file.js`/`ui.js`: `getSelectionCanvas`, `deleteSelection`, `selectAll`, `paste`. **É carregado primeiro** porque outras partes dependem dessa API. |
| `pencil.js` | Lápis (P) | Traço de 1 px sem antialias (`Paint.draw.pixelLine`), ligando o ponto anterior ao atual. |
| `brush.js` | Pincel (B) | Traço arredondado com a espessura escolhida (`stroke` do canvas, com antialias). |
| `eraser.js` | Borracha (E) | Pinta com a **cor 2**, como no Paint, em quadrado de `max(4, espessura × 2)` px. Mostra o quadrado no overlay. |
| `fill.js` | Balde (F) | Flood fill por linhas (scanline) em `Uint32Array`, com tolerância 0: preenche só pixels exatamente da mesma cor. |
| `picker.js` | Conta-gotas (I) | Lê a cor do pixel. Clique esquerdo define a cor 1 e o direito a cor 2. Depois volta para a ferramenta anterior. |
| `text.js` | Texto (T) | Abre uma `<textarea>` sobre a imagem, que acompanha zoom, fonte e cor 1. No `commit()` o texto vira pixels (`fillText`) e deixa de ser editável. |
| `line.js` | Linha (L) | Pré-visualiza no overlay e grava ao soltar. Bresenham com espessura, sem antialias. Shift trava em múltiplos de 45°. |
| `shapes.js` | Retângulo (R), Elipse (O) | Registra `rect` e `ellipse`. Shift = quadrado/círculo. Modos: contorno, preenchido ou contorno + preenchimento com a outra cor. O retângulo usa `fillRect` (nítido); a elipse usa path com antialias. |

## Adicionar uma ferramenta

1. Crie o arquivo aqui seguindo a interface acima. Chame `Paint.history.push()` antes de alterar `ctx`.
2. Adicione `<script src="js/tools/arquivo.js">` no `index.html`, depois de `canvas.js` e antes de `file.js`.
3. Adicione o botão `data-tool` no `index.html` e, se quiser, a tecla em `TOOL_KEYS` no `js/ui.js`.
4. Adicione um caso em `tests/e2e.mjs` e uma linha na tabela acima.

Prefira desenho por pixel (`pixelLine`, `fillRect`) em contornos: o antialias cria pixels intermediários que o balde não preenche.
