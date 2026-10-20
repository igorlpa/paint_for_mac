// Operações de imagem e arquivo: novo, abrir, salvar, tamanho da tela, limpar
// e área de transferência (copiar, recortar, colar).
Paint.file = (function () {
  const DEFAULT_SIZE = { width: 800, height: 600 };
  const MAX_SIDE = 5000; // cada passo de desfazer guarda a imagem inteira em memória

  // Cópia interna: garante copiar/colar dentro do app mesmo se a API do sistema falhar.
  let internalClipboard = null;
  let pastePending = false;

  // Imagens são lidas como data: URL (FileReader). Assim o canvas não fica "contaminado"
  // (tainted) e getImageData continua funcionando — inclusive em páginas file://.
  function readImage(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function confirmDiscard() {
    return !Paint.state.dirty || confirm('Há alterações não salvas. Deseja descartá-las?');
  }

  function newImage() {
    if (!confirmDiscard()) return;
    Paint.commitTool();
    Paint.canvas.setSize(DEFAULT_SIZE.width, DEFAULT_SIZE.height, false);
    Paint.history.clear();
    Paint.set('dirty', false);
    Paint.set('fileName', 'sem-titulo');
  }

  function open() {
    if (!confirmDiscard()) return;
    const input = document.getElementById('file-input');
    input.value = '';
    input.click();
  }

  async function onFileChosen(file) {
    try {
      const img = await readImage(file);
      Paint.commitTool();
      Paint.canvas.setSize(img.naturalWidth, img.naturalHeight, false);
      Paint.canvas.ctx.drawImage(img, 0, 0);
      Paint.history.clear();
      Paint.set('dirty', false);
      Paint.set('fileName', file.name.replace(/\.[^.]+$/, ''));
    } catch {
      alert('Não foi possível abrir esta imagem.');
    }
  }

  function download(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // Chrome/Edge: usa a janela "Salvar como" do sistema (File System Access API).
  // Safari/Firefox: baixa o arquivo (normalmente vai para a pasta Downloads).
  async function save(type = 'image/png') {
    Paint.commitTool();
    const ext = type === 'image/jpeg' ? 'jpg' : 'png';
    const filename = `${Paint.state.fileName}.${ext}`;
    const blob = await new Promise((resolve) => Paint.canvas.el.toBlob(resolve, type, 0.92));
    if (!blob) {
      alert('Não foi possível gerar a imagem.');
      return;
    }

    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: ext.toUpperCase(), accept: { [type]: ['.' + ext] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        Paint.set('fileName', handle.name.replace(/\.[^.]+$/, ''));
        Paint.set('dirty', false);
        return;
      } catch (err) {
        if (err.name === 'AbortError') return; // usuário cancelou
        // Qualquer outro erro: cai no download comum abaixo.
      }
    }

    download(blob, filename);
    Paint.set('dirty', false);
  }

  function promptResize() {
    Paint.commitTool();
    const { width, height } = Paint.canvas.el;
    const answer = prompt('Novo tamanho da tela (largura x altura, em pixels):', `${width}x${height}`);
    if (!answer) return;
    const m = answer.match(/^\s*(\d+)\s*[x×,]\s*(\d+)\s*$/i);
    if (!m) {
      alert('Formato inválido. Use, por exemplo, 800x600.');
      return;
    }
    const w = Number(m[1]);
    const h = Number(m[2]);
    if (w < 1 || h < 1 || w > MAX_SIDE || h > MAX_SIDE) {
      alert(`Use valores entre 1 e ${MAX_SIDE}.`);
      return;
    }
    Paint.history.push();
    Paint.canvas.setSize(w, h, true);
  }

  function clear() {
    Paint.commitTool();
    const { el, ctx } = Paint.canvas;
    Paint.history.push();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, el.width, el.height);
  }

  // --- Área de transferência ---

  function copy() {
    const selection = Paint.tools.select.getSelectionCanvas();
    if (!selection) return false;
    internalClipboard = Paint.draw.makeCanvas(selection.width, selection.height);
    internalClipboard.getContext('2d').drawImage(selection, 0, 0);

    if (navigator.clipboard && window.ClipboardItem) {
      // Passar uma Promise (e não o Blob pronto) é o que o Safari exige para manter o gesto do usuário.
      const blob = new Promise((resolve) => selection.toBlob(resolve, 'image/png'));
      navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).catch(() => {});
    }
    return true;
  }

  function cut() {
    if (copy()) Paint.tools.select.deleteSelection();
  }

  async function pasteBlob(blob) {
    try {
      Paint.tools.select.paste(await readImage(blob));
    } catch {
      pasteInternal();
    }
  }

  function pasteInternal() {
    if (internalClipboard) Paint.tools.select.paste(internalClipboard);
  }

  // Lê a área de transferência do sistema pela API assíncrona (botão "Colar" e fallback do ⌘V).
  // O Safari mostra um pequeno botão "Colar" para o usuário confirmar.
  async function pasteFromClipboard() {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const type = item.types.find((t) => t.startsWith('image/'));
          if (type) {
            await pasteBlob(await item.getType(type));
            return;
          }
        }
      }
    } catch {
      // Sem permissão ou sem suporte: usa a cópia interna.
    }
    pasteInternal();
  }

  // ⌘V: o Chrome dispara o evento 'paste' no documento; o Safari pode não disparar quando
  // nada editável está focado. Se o evento não vier, recorre à API assíncrona.
  function onPasteShortcut() {
    pastePending = true;
    setTimeout(() => {
      if (!pastePending) return;
      pastePending = false;
      pasteFromClipboard();
    }, 0);
  }

  function init() {
    document.getElementById('file-input').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) onFileChosen(file);
    });

    document.addEventListener('paste', (e) => {
      if (e.target instanceof Element && e.target.matches('textarea, input')) return;
      pastePending = false;
      e.preventDefault();
      const items = Array.from((e.clipboardData && e.clipboardData.items) || []);
      const item = items.find((i) => i.type.startsWith('image/'));
      if (item) pasteBlob(item.getAsFile());
      else pasteInternal();
    });
  }

  return {
    init,
    newImage,
    open,
    save,
    promptResize,
    clear,
    copy,
    cut,
    pasteFromClipboard,
    onPasteShortcut,
  };
})();
