# docs/ — imagens da documentação

| Arquivo | O que é |
|---|---|
| `screenshot.png` | Print do app exibido no [`README.md`](../README.md) da raiz. Mostra a interface no modo claro, com um desenho de exemplo feito pelas próprias ferramentas: balde no céu, retângulos, elipses, linhas do telhado preenchidas com o balde, pincel na grama e texto. Também aparecem as alças de tamanho da tela. |

## Como o print foi gerado

O print foi gerado com o Google Chrome headless, via DevTools Protocol, como em `tests/e2e.mjs`:

- janela de 1400 × 820 com `deviceScaleFactor: 2`, o que dá uma imagem nítida em telas Retina (2800 × 1640 px);
- `prefers-color-scheme: light`;
- o desenho é feito simulando gestos de ponteiro nas ferramentas, sem editar pixels diretamente.

Atualize o print quando a interface mudar de forma visível, como botões novos, layout ou cores.
