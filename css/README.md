# css/ — aparência

| Arquivo | O que faz |
|---|---|
| `style.css` | Todo o visual do app, em um único arquivo e sem frameworks. |

## Organização do `style.css`

1. **Variáveis de cor em `:root`**, como `--bg`, `--panel`, `--border`, `--text`, `--accent` e `--workspace`. O bloco `@media (prefers-color-scheme: dark)` redefine essas variáveis, e o app segue o modo claro/escuro do macOS automaticamente. Para mudar cores, altere as variáveis, não as regras.
2. **Layout da página:** `body` em coluna flex com barra superior (`.menubar`), barra de ferramentas (`.toolbar`), área de trabalho rolável (`.workspace`) e barra de status (`.statusbar`).
3. **Controles:** botões, selects, `input[type=number]`, ferramenta ativa (`.tool.active`), seletores de cor, paleta (`.palette`, grade 14 × 2) e controle de zoom (`.zoom`, `#zoom`).
4. **Canvas:** `.canvas-wrap` (contêiner relativo) com `#canvas` e `#overlay` empilhados. O `image-rendering` **não** fica aqui: o `js/canvas.js` define por zoom (`pixelated` a partir de 100%, suavizado abaixo disso).
5. **Alças de tamanho da tela** (`.handle-e`, `.handle-s`, `.handle-se`): quadradinhos de 8 px fora da borda da imagem. O `::before` aumenta a área clicável. `#resize-preview` é o contorno tracejado mostrado durante o arraste.
6. **Caixa de texto** (`.text-box`): a `<textarea>` transparente da ferramenta Texto. Posição e fonte são definidas pelo JS.
7. **Diálogos** (`dialog`): janela "Redimensionar". O sufixo `%`/`px` dos campos vem de `#resize-dialog[data-unit=...] .unit-label::after`.

## Observações

- A imagem em si sempre mostra as cores reais. O modo escuro afeta só a interface.
- `user-select: none` no `body` evita selecionar texto da interface ao arrastar. A `.text-box` reativa a seleção.
