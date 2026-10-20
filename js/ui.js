// Liga a interface (botões, paleta, selects, atalhos, barra de status) ao estado.
// A UI nunca desenha: ela chama Paint.set / Paint.setTool / ações e reage ao evento 'change'.
Paint.ui = (function () {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // Paleta clássica de 28 cores do Paint (2 linhas × 14).
  const PALETTE = [
    '#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080',
    '#800080', '#808040', '#004040', '#0080ff', '#004080', '#8000ff', '#804000',
    '#ffffff', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff',
    '#ff00ff', '#ffff80', '#00ff80', '#80ffff', '#8080ff', '#ff0080', '#ff8040',
  ];

  // Atalhos de uma tecla para ferramentas (sem ⌘).
  const TOOL_KEYS = {
    s: 'select', p: 'pencil', b: 'brush', e: 'eraser', f: 'fill',
    i: 'picker', t: 'text', l: 'line', r: 'rect', o: 'ellipse',
  };

  const actions = {
    'new': () => Paint.file.newImage(),
    'open': () => Paint.file.open(),
    'save-png': () => Paint.file.save('image/png'),
    'save-jpeg': () => Paint.file.save('image/jpeg'),
    'undo': () => Paint.history.undo(),
    'redo': () => Paint.history.redo(),
    'cut': () => Paint.file.cut(),
    'copy': () => Paint.file.copy(),
    'paste': () => Paint.file.pasteFromClipboard(),
    'delete': () => Paint.tools.select.deleteSelection(),
    'select-all': () => Paint.tools.select.selectAll(),
    'scale': () => Paint.resize.open(),
    'resize': () => Paint.file.promptResize(),
    'clear': () => Paint.file.clear(),
    'swap-colors': () => {
      const { primary, secondary } = Paint.state;
      Paint.set('primary', secondary);
      Paint.set('secondary', primary);
    },
  };

  function bindButtons() {
    $$('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => actions[btn.dataset.action]());
    });
    $$('[data-tool]').forEach((btn) => {
      btn.addEventListener('click', () => Paint.setTool(btn.dataset.tool));
    });
  }

  function buildPalette() {
    const palette = $('#palette');
    for (const color of PALETTE) {
      const btn = document.createElement('button');
      btn.style.background = color;
      btn.title = `${color} — clique: cor 1, clique direito: cor 2`;
      btn.addEventListener('click', () => Paint.set('primary', color));
      btn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        Paint.set('secondary', color);
      });
      palette.appendChild(btn);
    }
  }

  // Selects e seletores de cor -> estado. blur() devolve o foco ao documento,
  // senão as teclas de atalho mudariam a opção do select.
  function bindInputs() {
    const bind = (id, key, parse = (v) => v) => {
      const el = $(id);
      el.addEventListener('input', () => Paint.set(key, parse(el.value)));
      el.addEventListener('change', () => el.blur());
    };
    bind('#size', 'size', Number);
    bind('#shape-mode', 'shapeMode');
    bind('#font-size', 'fontSize', Number);
    bind('#zoom', 'zoom', Number);
    bind('#primary', 'primary');
    bind('#secondary', 'secondary');
  }

  function bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.target instanceof Element && e.target.matches('textarea, input, select')) return;
      if (document.querySelector('dialog[open]')) return; // diálogo modal cuida do próprio teclado
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (mod) {
        if (key === 'v') {
          Paint.file.onPasteShortcut(); // sem preventDefault: o evento 'paste' precisa acontecer
          return;
        }
        const map = {
          z: e.shiftKey ? 'redo' : 'undo',
          y: 'redo',
          s: 'save-png',
          o: 'open',
          c: 'copy',
          x: 'cut',
          a: 'select-all',
        };
        if (map[key]) {
          e.preventDefault();
          actions[map[key]]();
        }
        return;
      }

      if (key === 'delete' || key === 'backspace') {
        e.preventDefault();
        actions.delete();
      } else if (key === 'escape') {
        Paint.commitTool();
      } else if (key === 'x') {
        actions['swap-colors']();
      } else if (TOOL_KEYS[key]) {
        Paint.setTool(TOOL_KEYS[key]);
      }
    });
  }

  function updateTitle() {
    const { dirty, fileName } = Paint.state;
    document.title = `${dirty ? '• ' : ''}${fileName} — Paint`;
  }

  function onChange({ key, value }) {
    switch (key) {
      case 'tool':
        $$('[data-tool]').forEach((btn) => btn.classList.toggle('active', btn.dataset.tool === value));
        break;
      case 'primary':
      case 'secondary':
        $('#' + key).value = value;
        break;
      case 'size':
      case 'zoom':
        $('#' + key).value = String(value);
        break;
      case 'shapeMode':
        $('#shape-mode').value = value;
        break;
      case 'fontSize':
        $('#font-size').value = String(value);
        break;
      case 'dirty':
      case 'fileName':
        updateTitle();
        break;
    }
  }

  function bindStatus() {
    const pos = $('#status-pos');
    const size = $('#status-size');
    const selection = $('#status-sel');
    Paint.on('pointer', (p) => {
      pos.textContent = p ? `${p.x}, ${p.y} px` : '';
    });
    Paint.on('resize', ({ width, height }) => {
      size.textContent = `${width} × ${height} px`;
    });
    Paint.on('selection', (s) => {
      selection.textContent = s ? `Seleção: ${s.w} × ${s.h} px` : '';
    });
    Paint.on('history', ({ canUndo, canRedo }) => {
      $('[data-action="undo"]').disabled = !canUndo;
      $('[data-action="redo"]').disabled = !canRedo;
    });
  }

  function init() {
    bindButtons();
    buildPalette();
    bindInputs();
    bindKeyboard();
    bindStatus();
    Paint.on('change', onChange);
    for (const [key, value] of Object.entries(Paint.state)) onChange({ key, value });

    // Clicar na área cinza fora da imagem finaliza seleção/texto, como no Paint.
    $('.workspace').addEventListener('pointerdown', (e) => {
      if (e.target.classList.contains('workspace')) Paint.commitTool();
    });
  }

  return { init };
})();
