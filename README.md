# paint_for_mac

Ferramenta simples de edição de imagem, no estilo do Paint do Windows, para o macOS.
Roda no navegador: **sem instalação, sem loja e sem build.**

## Como usar

1. Baixe ou clone esta pasta.
2. Dê **duplo clique em `index.html`**. Ele abre no Safari ou no Chrome.

## Funcionalidades

- **Ferramentas:** seleção, lápis, pincel, borracha, balde de tinta, conta-gotas, texto, linha, retângulo e elipse.
- **Cores:** cor 1 no clique esquerdo e cor 2 no clique direito (ou Ctrl+clique). Inclui a paleta clássica de 28 cores.
- **Desfazer/refazer:** até 30 passos.
- **Área de transferência:** copiar, recortar, colar (inclusive prints do macOS) e excluir.
- **Arquivo:** abrir imagem, salvar em PNG ou JPEG e mudar o tamanho da tela.
- **Exibição:** zoom de 100% a 800%.

## Atalhos

| Ação | Atalho |
|---|---|
| Desfazer / Refazer | ⌘Z / ⇧⌘Z |
| Salvar PNG | ⌘S |
| Abrir | ⌘O |
| Copiar / Recortar / Colar | ⌘C / ⌘X / ⌘V |
| Selecionar tudo | ⌘A |
| Excluir seleção | Delete |
| Confirmar texto/seleção | Esc |
| Trocar cor 1 ↔ cor 2 | X |
| Ferramentas | S seleção, P lápis, B pincel, E borracha, F balde, I conta-gotas, T texto, L linha, R retângulo, O elipse |
| Forma perfeita / linha a 45° | segurar Shift |

## Para desenvolvedores

As decisões de arquitetura, o mapa de arquivos e o guia para adicionar ferramentas estão em [`CLAUDE.md`](CLAUDE.md).
Para o teste automático, rode `node tests/e2e.mjs` (requer Node 22+ e Google Chrome).
