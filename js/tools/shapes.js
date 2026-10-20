// Retângulo e elipse. Shift = quadrado/círculo.
// Modos (Paint.state.shapeMode):
//   outline -> contorno na cor do clique
//   fill    -> preenchido na cor do clique, sem contorno
//   both    -> contorno na cor do clique + preenchimento na outra cor
(function () {
  function constrain(start, p) {
    if (!p.shift) return p;
    const dx = p.x - start.x;
    const dy = p.y - start.y;
    const d = Math.max(Math.abs(dx), Math.abs(dy));
    return { x: start.x + Math.sign(dx || 1) * d, y: start.y + Math.sign(dy || 1) * d };
  }

  // Retângulo com fillRect: bordas nítidas, sem antialias (como no Paint e bom para o balde).
  function drawRect(c, r, mode, color, altColor) {
    if (mode === 'fill') {
      c.fillStyle = color;
      c.fillRect(r.x, r.y, r.w, r.h);
      return;
    }
    if (mode === 'both') {
      c.fillStyle = altColor;
      c.fillRect(r.x, r.y, r.w, r.h);
    }
    const t = Math.min(Paint.state.size, r.w, r.h);
    c.fillStyle = color;
    c.fillRect(r.x, r.y, r.w, t);
    c.fillRect(r.x, r.y + r.h - t, r.w, t);
    c.fillRect(r.x, r.y, t, r.h);
    c.fillRect(r.x + r.w - t, r.y, t, r.h);
  }

  function drawShape(c, kind, a, b, color, altColor) {
    const r = Paint.draw.normRect(a.x, a.y, b.x, b.y);
    const mode = Paint.state.shapeMode;
    if (kind === 'rect') {
      drawRect(c, r, mode, color, altColor);
      return;
    }

    // Elipse usa o path do canvas (com antialias). O contorno é recuado meia espessura
    // para a forma caber exatamente no retângulo arrastado.
    const s = mode === 'fill' ? 0 : Paint.state.size;
    const w = Math.max(0, r.w - s);
    const h = Math.max(0, r.h - s);
    c.beginPath();
    c.ellipse(r.x + r.w / 2, r.y + r.h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);

    if (mode === 'fill') {
      c.fillStyle = color;
      c.fill();
      return;
    }
    if (mode === 'both') {
      c.fillStyle = altColor;
      c.fill();
    }
    c.strokeStyle = color;
    c.lineWidth = s;
    c.stroke();
  }

  function makeShapeTool(id) {
    let start = null;
    return {
      id,
      cursor: 'crosshair',

      onDown(ctx, p) {
        start = p;
      },

      onMove(ctx, p) {
        Paint.canvas.clearOverlay();
        drawShape(Paint.canvas.octx, id, start, constrain(start, p), p.color, p.altColor);
      },

      onUp(ctx, p) {
        Paint.canvas.clearOverlay();
        Paint.history.push();
        drawShape(ctx, id, start, constrain(start, p), p.color, p.altColor);
        start = null;
      },
    };
  }

  Paint.registerTool(makeShapeTool('rect'));
  Paint.registerTool(makeShapeTool('ellipse'));
})();
