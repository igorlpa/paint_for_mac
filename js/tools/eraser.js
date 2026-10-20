// Borracha: como no Paint, "apaga" pintando com a cor 2 (secundária).
// Mostra um quadrado no overlay indicando a área que será apagada.
(function () {
  let last = null;

  const eraserSize = () => Math.max(4, Paint.state.size * 2);

  function preview(p) {
    const { octx } = Paint.canvas;
    const s = eraserSize();
    const off = Math.floor(s / 2);
    Paint.canvas.clearOverlay();
    octx.strokeStyle = '#000000';
    octx.lineWidth = 1;
    octx.strokeRect(p.x - off + 0.5, p.y - off + 0.5, s - 1, s - 1);
  }

  Paint.registerTool({
    id: 'eraser',
    cursor: 'none',

    onDown(ctx, p) {
      Paint.history.push();
      last = p;
      Paint.draw.pixelLine(ctx, p.x, p.y, p.x, p.y, eraserSize(), Paint.state.secondary);
      preview(p);
    },

    onMove(ctx, p) {
      Paint.draw.pixelLine(ctx, last.x, last.y, p.x, p.y, eraserSize(), Paint.state.secondary);
      last = p;
      preview(p);
    },

    onUp() {
      last = null;
    },

    onHover: preview,

    onLeave() {
      Paint.canvas.clearOverlay();
    },
  });
})();
