// Texto: clique abre uma <textarea> sobre o canvas; o texto só vira pixels ao confirmar
// (clicar de novo no canvas, Esc, trocar de ferramenta, salvar ou desfazer).
(function () {
  const FONT = 'Arial, Helvetica, sans-serif';
  const lineHeight = (fontSize) => Math.round(fontSize * 1.2);

  let box = null; // { x, y, el }

  function autosize() {
    const el = box.el;
    el.style.width = '0';
    el.style.height = '0';
    el.style.width = el.scrollWidth + Paint.state.fontSize * Paint.state.zoom + 'px';
    el.style.height = el.scrollHeight + 'px';
  }

  // Posição e fonte da textarea acompanham zoom, tamanho de fonte e cor 1.
  function style() {
    if (!box) return;
    const z = Paint.state.zoom;
    const fs = Paint.state.fontSize;
    const s = box.el.style;
    s.left = box.x * z - 1 + 'px'; // -1 compensa a borda tracejada
    s.top = box.y * z - 1 + 'px';
    s.font = `${fs * z}px ${FONT}`;
    s.lineHeight = lineHeight(fs) * z + 'px';
    s.color = Paint.state.primary;
    autosize();
  }

  function open(p) {
    const el = document.createElement('textarea');
    el.className = 'text-box';
    el.wrap = 'off';
    el.spellcheck = false;
    el.addEventListener('input', autosize);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        tool.commit();
      }
    });
    box = { x: p.x, y: p.y, el };
    Paint.canvas.wrap.appendChild(el);
    style();
    setTimeout(() => el.focus());
  }

  const tool = {
    id: 'text',
    cursor: 'text',

    onDown(ctx, p) {
      if (box) tool.commit();
      else open(p);
    },

    commit() {
      if (!box) return;
      const { x, y, el } = box;
      box = null;
      el.remove();
      const text = el.value;
      if (!text.trim()) return;

      const { ctx } = Paint.canvas;
      const fs = Paint.state.fontSize;
      const lh = lineHeight(fs);
      Paint.history.push();
      ctx.font = `${fs}px ${FONT}`;
      ctx.fillStyle = Paint.state.primary;
      ctx.textBaseline = 'top';
      // A textarea centraliza o texto na altura da linha; replica esse espaço extra.
      const pad = (lh - fs) / 2;
      text.split('\n').forEach((line, i) => ctx.fillText(line, x, y + pad + i * lh));
    },
  };

  Paint.on('change', ({ key }) => {
    if (key === 'primary' || key === 'fontSize' || key === 'zoom') style();
  });

  Paint.registerTool(tool);
})();
