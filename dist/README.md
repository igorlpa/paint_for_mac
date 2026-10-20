# dist/ — versão para compartilhar

| Arquivo | O que é |
|---|---|
| `paint.html` | **O app inteiro num único arquivo** (cerca de 60 KB), com HTML, CSS e JavaScript embutidos. Basta enviar este arquivo (AirDrop, e-mail, pendrive…): quem recebe dá duplo clique e o Paint abre no navegador, sem instalar nada e sem precisar das outras pastas. |

## Importante

- **Gerado automaticamente:** não edite este arquivo. Altere os fontes (`index.html`, `css/`, `js/`) e rode `node scripts/build.mjs`.
- **Fica no git de propósito,** para que sempre exista uma versão pronta para compartilhar.
- **É atualizado antes de cada commit** que muda o app, depois de validado pelos testes (ver o fluxo no [`CLAUDE.md`](../CLAUDE.md)).
- O teste automático também roda sobre ele: `node tests/e2e.mjs dist/paint.html`.
