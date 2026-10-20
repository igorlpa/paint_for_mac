// Funções utilitárias de desenho compartilhadas pelas ferramentas.
Paint.draw = {
  // Linha de Bresenham: pinta um quadrado size×size em cada pixel do caminho.
  // Não tem antialias, então o resultado é "pixelado" como no Paint (lápis, borracha).
  pixelLine(ctx, x0, y0, x1, y1, size, color) {
    ctx.fillStyle = color;
    const off = Math.floor(size / 2);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      ctx.fillRect(x0 - off, y0 - off, size, size);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  },

  // '#rrggbb' -> inteiro no formato do Uint32Array de ImageData (little-endian: ABGR).
  hexToUint32(hex) {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
  },

  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
  },

  // Retângulo normalizado entre dois pontos, incluindo ambos os pixels das pontas.
  normRect(x0, y0, x1, y1) {
    return {
      x: Math.min(x0, x1),
      y: Math.min(y0, y1),
      w: Math.abs(x1 - x0) + 1,
      h: Math.abs(y1 - y0) + 1,
    };
  },

  makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  },
};
