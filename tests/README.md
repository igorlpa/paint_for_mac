# tests/ — teste automático

| Arquivo | O que faz |
|---|---|
| `e2e.mjs` | Teste ponta a ponta: abre o `index.html` via `file://` (como o usuário faz) no Google Chrome sem janela, usa o app e confere o resultado pixel a pixel. |

## Como rodar

```sh
node tests/e2e.mjs                   # testa os fontes (index.html)
node tests/e2e.mjs dist/paint.html   # testa o arquivo único gerado pelo build
```

Requisitos: **Node 22+** e **Google Chrome** em `/Applications`. Não há `npm install`: o teste conversa com o Chrome pelo DevTools Protocol usando o `WebSocket` nativo do Node.

Saída:
- uma linha `PASS`/`FAIL` por caso, e no fim o total (ex.: `50/50 passaram`);
- os erros de JavaScript do console da página, se houver;
- o caminho de uma pasta temporária com `screenshot.png` (desenho de exemplo) e `resize-dialog.png` (diálogo Redimensionar), para conferência visual.

O código de saída é `0` se tudo passou e `1` se algo falhou ou houve erro no console.

## Como funciona

1. Inicia o Chrome com `--headless=new --remote-debugging-port=9333` e um perfil temporário.
2. Abre a página e injeta helpers em `window.T`:
   - `T.drag([[x, y], ...], { button, shift })` simula um gesto com `PointerEvent` no overlay, em coordenadas da imagem;
   - `T.px(x, y)` lê a cor de um pixel;
   - `T.handle(dir, dx, dy, { shift })` arrasta uma alça de tamanho da tela (`'e'`, `'s'`, `'se'`) em pixels de tela;
   - `T.val`, `T.unit`, `T.keep` e `T.typeZoom` preenchem campos da interface.
3. Cada `check(nome, expressão, esperado)` avalia uma expressão na página e compara o resultado (JSON) com o esperado.

Os casos rodam **em sequência sobre a mesma página**, e o estado passa de um caso para o outro. Ao inserir um caso no meio, confira o que ele assume sobre a imagem, a ferramenta e o zoom atuais.

## Cobertura atual

Lápis, pincel, borracha, cores 1 e 2, retângulo, elipse, linha a 45°, balde (inclusive sem vazar), conta-gotas, seleção (mover, copiar/colar, excluir), texto, zoom (in, out, digitado, limites, atalhos, pinça), tamanho da tela (pelo menu e pelas alças de arrastar: canto, borda direita, borda inferior, Shift, zoom, mínimo de 1 px), redimensionar (%, px, campo vazio, sem proporção, limite, sem suavização), desfazer/refazer, limite de 30 passos, atalhos de teclado e geração de PNG/JPEG.

**Não cobre** (testar à mão): Safari, diálogos nativos de abrir/salvar, clipboard do sistema (⌘C/⌘V reais), e se ⌘−/⌘+ deixam de dar zoom na página do navegador.

## Dicas ao escrever casos

- Cada expressão roda no escopo global da página: `const` em dois casos diferentes colide. Envolva em `(() => { ...; return valor; })()`.
- Para esperar algo assíncrono, use `(async () => { ... })()`; o teste aguarda Promises.
- Evite `confirm()`/`prompt()`: em headless eles travam. Por exemplo, faça `Paint.set('dirty', false)` antes de `Paint.file.newImage()`.
