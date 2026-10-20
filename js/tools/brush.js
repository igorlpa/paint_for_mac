// Pincel: traço arredondado com a espessura escolhida.
(function () {
  let last = null;

  Paint.registerTool({
    id: 'brush',
    cursor: 'crosshair',

    onDown(ctx, p) {
      Paint.history.push();
      last = p;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x + 0.5, p.y + 0.5, Paint.state.size / 2, 0, Math.PI * 2);
      ctx.fill();
    },

    // Liga o ponto anterior ao atual para o traço não ficar "pontilhado" em movimentos rápidos.
    onMove(ctx, p) {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = Paint.state.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(last.x + 0.5, last.y + 0.5);
      ctx.lineTo(p.x + 0.5, p.y + 0.5);
      ctx.stroke();
      last = p;
    },

    onUp() {
      last = null;
    },
  });
})();
