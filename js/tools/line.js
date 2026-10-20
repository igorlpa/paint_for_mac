// Linha reta: pré-visualiza no overlay e grava no canvas ao soltar. Shift trava em 45°.
// Espessura = quadrado de size×size carimbado ao longo da linha.
(function () {
  let start = null;

  function endPoint(p) {
    if (!p.shift) return p;
    const dx = p.x - start.x;
    const dy = p.y - start.y;
    const step = Math.PI / 4;
    const angle = Math.round(Math.atan2(dy, dx) / step) * step;
    const len = Math.hypot(dx, dy);
    return {
      x: Math.round(start.x + Math.cos(angle) * len),
      y: Math.round(start.y + Math.sin(angle) * len),
    };
  }

  // Bresenham (sem antialias) como no Paint: linhas nítidas que o balde preenche sem halo.
  function stroke(c, a, b, color) {
    Paint.draw.pixelLine(c, a.x, a.y, b.x, b.y, Paint.state.size, color);
  }

  Paint.registerTool({
    id: 'line',
    cursor: 'crosshair',

    onDown(ctx, p) {
      start = p;
    },

    onMove(ctx, p) {
      Paint.canvas.clearOverlay();
      stroke(Paint.canvas.octx, start, endPoint(p), p.color);
    },

    onUp(ctx, p) {
      Paint.canvas.clearOverlay();
      Paint.history.push();
      stroke(ctx, start, endPoint(p), p.color);
      start = null;
    },
  });
})();
