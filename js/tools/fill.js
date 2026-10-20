// Balde de tinta: flood fill por linhas (scanline) com tolerância zero, como no Paint.
// Só pixels com exatamente a mesma cor do clicado são preenchidos — bordas com antialias
// (pincel, formas) podem deixar um contorno sem preencher.
Paint.registerTool({
  id: 'fill',
  cursor: 'crosshair',

  onDown(ctx, p) {
    const { width: w, height: h } = ctx.canvas;
    if (p.x < 0 || p.y < 0 || p.x >= w || p.y >= h) return;

    const img = ctx.getImageData(0, 0, w, h);
    const data = new Uint32Array(img.data.buffer);
    const target = data[p.y * w + p.x];
    const replacement = Paint.draw.hexToUint32(p.color);
    if (target === replacement) return;

    Paint.history.push();

    const stack = [[p.x, p.y]];
    while (stack.length) {
      let [x, y] = stack.pop();
      while (x >= 0 && data[y * w + x] === target) x--;
      x++;
      let spanUp = false;
      let spanDown = false;
      while (x < w && data[y * w + x] === target) {
        data[y * w + x] = replacement;
        if (y > 0) {
          const match = data[(y - 1) * w + x] === target;
          if (match && !spanUp) stack.push([x, y - 1]);
          spanUp = match;
        }
        if (y < h - 1) {
          const match = data[(y + 1) * w + x] === target;
          if (match && !spanDown) stack.push([x, y + 1]);
          spanDown = match;
        }
        x++;
      }
    }

    ctx.putImageData(img, 0, 0);
  },
});
