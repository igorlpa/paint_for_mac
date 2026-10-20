// Conta-gotas: clique esquerdo define a cor 1, direito a cor 2.
// Depois volta para a ferramenta anterior (comportamento do Paint).
Paint.registerTool({
  id: 'picker',
  cursor: 'copy',

  onDown(ctx, p) {
    const { width, height } = ctx.canvas;
    if (p.x < 0 || p.y < 0 || p.x >= width || p.y >= height) return;
    const [r, g, b] = ctx.getImageData(p.x, p.y, 1, 1).data;
    const hex = Paint.draw.rgbToHex(r, g, b);
    Paint.set(p.secondary ? 'secondary' : 'primary', hex);
    Paint.setTool(Paint.state.previousTool || 'pencil');
  },
});
