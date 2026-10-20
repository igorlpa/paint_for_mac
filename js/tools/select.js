// Seleção retangular.
// Fluxo: arrastar cria a seleção (só marca a área). Ao arrastar de dentro dela pela primeira
// vez, os pixels são "levantados" para um canvas flutuante (sel.float) e o buraco é pintado
// com a cor 2. O flutuante é desenhado no overlay e só volta ao canvas no commit().
// O snapshot do histórico é tirado ao levantar, então mover + soltar = um único passo de desfazer.
(function () {
  let sel = null;   // { x, y, w, h, float: HTMLCanvasElement|null }
  let mode = null;  // 'create' | 'move'
  let start = null;
  let offset = null;

  const C = () => Paint.canvas;

  const inside = (p) =>
    sel && p.x >= sel.x && p.x < sel.x + sel.w && p.y >= sel.y && p.y < sel.y + sel.h;

  function clamp(p) {
    const { width, height } = C().el;
    return {
      x: Math.min(Math.max(p.x, 0), width - 1),
      y: Math.min(Math.max(p.y, 0), height - 1),
    };
  }

  function render() {
    const o = C().octx;
    C().clearOverlay();
    Paint.emit('selection', sel && { w: sel.w, h: sel.h });
    if (!sel) return;
    if (sel.float) o.drawImage(sel.float, sel.x, sel.y);
    // Borda tracejada preto + branco para aparecer em qualquer fundo.
    o.save();
    o.lineWidth = 1;
    o.setLineDash([4, 4]);
    o.strokeStyle = '#000000';
    o.strokeRect(sel.x + 0.5, sel.y + 0.5, sel.w - 1, sel.h - 1);
    o.lineDashOffset = 4;
    o.strokeStyle = '#ffffff';
    o.strokeRect(sel.x + 0.5, sel.y + 0.5, sel.w - 1, sel.h - 1);
    o.restore();
  }

  function copyRegion() {
    const c = Paint.draw.makeCanvas(sel.w, sel.h);
    c.getContext('2d').drawImage(C().el, sel.x, sel.y, sel.w, sel.h, 0, 0, sel.w, sel.h);
    return c;
  }

  function lift() {
    const { ctx } = C();
    Paint.history.push();
    sel.float = copyRegion();
    ctx.fillStyle = Paint.state.secondary;
    ctx.fillRect(sel.x, sel.y, sel.w, sel.h);
  }

  const tool = {
    id: 'select',
    cursor: 'crosshair',

    onDown(ctx, p) {
      if (inside(p)) {
        mode = 'move';
        offset = { x: p.x - sel.x, y: p.y - sel.y };
        if (!sel.float) lift();
        return;
      }
      tool.commit();
      mode = 'create';
      start = clamp(p);
      sel = { x: start.x, y: start.y, w: 1, h: 1, float: null };
      render();
    },

    onMove(ctx, p) {
      if (mode === 'create') {
        const q = clamp(p);
        Object.assign(sel, Paint.draw.normRect(start.x, start.y, q.x, q.y));
        render();
      } else if (mode === 'move') {
        sel.x = p.x - offset.x;
        sel.y = p.y - offset.y;
        render();
      }
    },

    onUp() {
      // Um clique simples (sem arrastar) só desfaz a seleção.
      if (mode === 'create' && sel.w < 2 && sel.h < 2) {
        sel = null;
        render();
      }
      mode = null;
    },

    onHover(p) {
      C().overlay.style.cursor = inside(p) ? 'move' : 'crosshair';
    },

    commit() {
      if (sel && sel.float) C().ctx.drawImage(sel.float, sel.x, sel.y);
      sel = null;
      mode = null;
      render();
    },

    // --- API usada por file.js e ui.js (copiar, recortar, colar, excluir, selecionar tudo) ---

    getSelectionCanvas() {
      if (!sel) return null;
      return sel.float || copyRegion();
    },

    deleteSelection() {
      if (!sel) return;
      if (!sel.float) {
        Paint.history.push();
        const { ctx } = C();
        ctx.fillStyle = Paint.state.secondary;
        ctx.fillRect(sel.x, sel.y, sel.w, sel.h);
      }
      // Se estava flutuando, o buraco já foi pintado em lift(); basta descartar.
      sel = null;
      render();
    },

    selectAll() {
      Paint.setTool('select');
      tool.commit();
      const { width, height } = C().el;
      sel = { x: 0, y: 0, w: width, h: height, float: null };
      render();
    },

    // Cola uma imagem/canvas como seleção flutuante no canto superior esquerdo.
    // Aumenta a tela se a imagem colada for maior (o Paint pergunta; aqui aumentamos direto).
    paste(source) {
      Paint.setTool('select');
      tool.commit();
      const w = source.naturalWidth || source.width;
      const h = source.naturalHeight || source.height;
      Paint.history.push();
      const { el } = C();
      if (w > el.width || h > el.height) {
        C().setSize(Math.max(w, el.width), Math.max(h, el.height), true);
      }
      const float = Paint.draw.makeCanvas(w, h);
      float.getContext('2d').drawImage(source, 0, 0);
      sel = { x: 0, y: 0, w, h, float };
      render();
    },
  };

  Paint.registerTool(tool);
})();
