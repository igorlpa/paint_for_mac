// Alças para mudar o tamanho da tela arrastando, como no Paint:
// canto inferior direito (largura + altura), meio da borda direita (largura) e meio da
// borda inferior (altura). Durante o arraste só um contorno tracejado é mostrado; ao soltar,
// a tela é cortada/aumentada SEM escalar (mesmo efeito de "Tamanho da tela…"), área nova branca.
// Shift no canto mantém a proporção.
Paint.handles = (function () {
  let preview = null;
  let drag = null; // { dir, startX, startY, w, h, newW, newH }

  function clampSide(v) {
    return Math.min(Paint.file.MAX_SIDE, Math.max(1, Math.round(v)));
  }

  function showPreview(w, h) {
    const z = Paint.state.zoom;
    preview.style.width = w * z + 'px';
    preview.style.height = h * z + 'px';
    preview.hidden = false;
    Paint.emit('canvas-drag', { w, h });
  }

  function onDown(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    Paint.commitTool();
    // A captura mantém o arraste mesmo com o ponteiro fora da alça. Se falhar, o arraste
    // ainda funciona enquanto o ponteiro estiver sobre ela, então não deixa o erro interromper.
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    const { width, height } = Paint.canvas.el;
    drag = {
      dir: e.currentTarget.dataset.dir,
      startX: e.clientX,
      startY: e.clientY,
      w: width,
      h: height,
      newW: width,
      newH: height,
    };
    showPreview(width, height);
  }

  function onMove(e) {
    if (!drag) return;
    const z = Paint.state.zoom;
    const dx = (e.clientX - drag.startX) / z;
    const dy = (e.clientY - drag.startY) / z;
    let w = drag.dir === 's' ? drag.w : clampSide(drag.w + dx);
    let h = drag.dir === 'e' ? drag.h : clampSide(drag.h + dy);
    if (drag.dir === 'se' && e.shiftKey) {
      // Usa o eixo que mais mudou e calcula o outro pela proporção original.
      const scale = Math.abs(w / drag.w - 1) >= Math.abs(h / drag.h - 1) ? w / drag.w : h / drag.h;
      w = clampSide(drag.w * scale);
      h = clampSide(drag.h * scale);
    }
    drag.newW = w;
    drag.newH = h;
    showPreview(w, h);
  }

  function onUp() {
    if (!drag) return;
    const { w, h, newW, newH } = drag;
    drag = null;
    preview.hidden = true;
    Paint.emit('canvas-drag', null);
    if (newW === w && newH === h) return;
    Paint.history.push();
    Paint.canvas.setSize(newW, newH, true);
  }

  function init() {
    preview = document.getElementById('resize-preview');
    document.querySelectorAll('.handle').forEach((handle) => {
      handle.addEventListener('pointerdown', onDown);
      handle.addEventListener('pointermove', onMove);
      handle.addEventListener('pointerup', onUp);
      handle.addEventListener('pointercancel', onUp);
    });
  }

  return { init };
})();
