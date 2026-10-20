// Build: gera dist/paint.html — o app inteiro num único arquivo compartilhável.
// Embute o CSS (<link>) e todos os <script src> do index.html, na mesma ordem.
// Uso:
//   node scripts/build.mjs           gera/atualiza dist/paint.html
//   node scripts/build.mjs --check   só verifica se dist/paint.html está atualizado (sai com 1 se não)
// O resultado é determinístico (sem data/hora): só muda quando o código-fonte muda.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = join(root, 'dist', 'paint.html');
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const HEADER = '<!-- ARQUIVO GERADO por scripts/build.mjs a partir de index.html, css/ e js/. Não edite: altere os fontes e rode o build. -->\n';

function build() {
  let html = read('index.html');
  const used = [];

  // Funções de substituição (e não strings) porque o código contém "$", que .replace interpretaria.
  html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, href) => {
    used.push(href);
    return `<style>\n${read(href).trimEnd()}\n</style>`;
  });

  html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => {
    used.push(src);
    // "</script" dentro do JS fecharia a tag antes da hora.
    const code = read(src).trimEnd().replace(/<\/script/gi, '<\\/script');
    return `<script>\n// --- ${src} ---\n${code}\n</script>`;
  });

  if (/<script src=|<link rel="stylesheet"/.test(html)) {
    throw new Error('Sobrou referência externa no HTML; o build não reconheceu algum <script>/<link>.');
  }

  return { html: html.replace('<!doctype html>\n', '<!doctype html>\n' + HEADER), used };
}

const { html, used } = build();

if (process.argv.includes('--check')) {
  const current = existsSync(outFile) ? readFileSync(outFile, 'utf8') : '';
  if (current !== html) {
    console.error('dist/paint.html está DESATUALIZADO. Rode: node scripts/build.mjs');
    process.exit(1);
  }
  console.log('dist/paint.html está atualizado.');
} else {
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, html);
  console.log(`dist/paint.html gerado (${(Buffer.byteLength(html) / 1024).toFixed(1)} KB, ${used.length} arquivos embutidos).`);
}
