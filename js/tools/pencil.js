// Lápis: traço de 1px sem antialias.
(function () {
  let last = null;

  Paint.registerTool({
    id: 'pencil',
    cursor: 'crosshair',

    onDown(ctx, p) {
      Paint.history.push();
      last = p;
      Paint.draw.pixelLine(ctx, p.x, p.y, p.x, p.y, 1, p.color);
    },

    onMove(ctx, p) {
      Paint.draw.pixelLine(ctx, last.x, last.y, p.x, p.y, 1, p.color);
      last = p;
    },

    onUp() {
      last = null;
    },
  });
})();
