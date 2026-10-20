// Desfazer/refazer com snapshots ImageData do canvas inteiro.
// Regra: chame Paint.history.push() ANTES de alterar pixels do canvas principal.
Paint.history = (function () {
  const MAX_STEPS = 30;
  const MAX_BYTES = 400 * 1024 * 1024; // evita estourar memória com imagens grandes

  let undoStack = [];
  let redoStack = [];

  function snapshot() {
    const { el, ctx } = Paint.canvas;
    return ctx.getImageData(0, 0, el.width, el.height);
  }

  function restore(img) {
    const { el, ctx } = Paint.canvas;
    if (img.width !== el.width || img.height !== el.height) {
      Paint.canvas.setSize(img.width, img.height, false);
    }
    ctx.putImageData(img, 0, 0);
  }

  function trim() {
    const bytes = () => undoStack.reduce((sum, img) => sum + img.data.length, 0);
    while (undoStack.length > MAX_STEPS) undoStack.shift();
    while (undoStack.length > 1 && bytes() > MAX_BYTES) undoStack.shift();
  }

  function changed() {
    Paint.emit('history', { canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 });
  }

  return {
    push() {
      undoStack.push(snapshot());
      trim();
      redoStack = [];
      Paint.set('dirty', true);
      changed();
    },

    undo() {
      // Finaliza seleção/texto antes: o snapshot do início dessa operação já está na pilha.
      Paint.commitTool();
      if (!undoStack.length) return;
      redoStack.push(snapshot());
      restore(undoStack.pop());
      Paint.set('dirty', true);
      changed();
    },

    redo() {
      Paint.commitTool();
      if (!redoStack.length) return;
      undoStack.push(snapshot());
      restore(redoStack.pop());
      Paint.set('dirty', true);
      changed();
    },

    clear() {
      undoStack = [];
      redoStack = [];
      changed();
    },
  };
})();
