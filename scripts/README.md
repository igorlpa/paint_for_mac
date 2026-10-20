# scripts/ — scripts de desenvolvimento

| Arquivo | O que faz |
|---|---|
| `build.mjs` | Gera **`dist/paint.html`**: o app inteiro num único arquivo, para compartilhar. Lê o `index.html` e embute o `css/style.css` e todos os `<script src>` na mesma ordem. |

## Uso

```sh
node scripts/build.mjs           # gera/atualiza dist/paint.html
node scripts/build.mjs --check   # só verifica se dist/paint.html está atualizado (sai com 1 se não estiver)
```

Requer apenas Node (sem `npm install`).

## Como funciona

- Troca `<link rel="stylesheet" href="...">` por `<style>` com o conteúdo do CSS.
- Troca cada `<script src="..."></script>` por `<script>` com o conteúdo do JS, precedido de um comentário `// --- js/arquivo.js ---` para facilitar a leitura.
- Escapa `</script` dentro do JS, que fecharia a tag antes da hora.
- Usa funções de substituição (e não strings) no `.replace`, porque o código contém `$`, que seria interpretado como padrão especial.
- Falha se sobrar alguma referência externa (`<script src>`/`<link>`) não reconhecida.
- **É determinístico,** sem data/hora no resultado: o `dist/paint.html` só muda no git quando o código muda.

Arquivo novo em `js/` ou `css/`: basta referenciá-lo no `index.html`. O build segue o HTML e não precisa de alteração.
