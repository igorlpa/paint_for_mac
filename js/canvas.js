// Dois canvases empilhados:
//  - #canvas: a imagem real (bitmap). Só é alterado pelas ferramentas ao confirmar uma ação.
//  - #overlay: pré-visualizações (linha/forma em andamento, seleção, cursor da borracha).
// O overlay fica por cima e recebe todos os eventos de ponteiro.
Paint.canvas = (function () {
  const api = {
    el: null,
    ctx: null,
    overlay: null,
    octx: null,
    wrap: null,
    init,
    setSize,
    clearOverlay,
  };

  let activeTool = null;  // ferramenta capturada no pointerdown (pode mudar durante o traço)
  let useSecondary = false;

  function init(width, height) {
    api.el = document.getElementById('canvas');
    api.overlay = document.getElementById('overlay');
    api.wrap = document.getElementById('canvas-wrap');
    // willReadFrequently: o balde, o conta-gotas e o histórico leem pixels com frequência.
    api.ctx = api.el.getContext('2d', { willReadFrequently: true });
    api.octx = api.overlay.getContext('2d');

    setSize(width, height, false);
    bindPointer();

    Paint.on('change', ({ key }) => {
      if (key === 'tool') {
        clearOverlay();
        const tool = Paint.currentTool();
        api.overlay.style.cursor = (tool && tool.cursor) || 'crosshair';
      }
      if (key === 'zoom') applyZoom();
    });
  }

  // Muda o tamanho da imagem. keep=true preserva o conteúdo (área nova fica branca).
  function setSize(width, height, keep = true) {
    const { el, ctx, overlay } = api;
    let old = null;
    if (keep) {
      old = Paint.draw.makeCanvas(el.width, el.height);
      old.getContext('2d').drawImage(el, 0, 0);
    }
    el.width = overlay.width = width;
    el.height = overlay.height = height;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    if (old) ctx.drawImage(old, 0, 0);
    applyZoom();
    Paint.emit('resize', { width, height });
  }

  // Zoom é só CSS: os pixels continuam os mesmos.
  // Ampliado (≥100%): 'pixelated' mostra cada pixel nítido. Reduzido (<100%): suavização
  // normal, senão linhas finas sumiriam ao descartar pixels.
  function applyZoom() {
    const z = Paint.state.zoom;
    for (const c of [api.el, api.overlay]) {
      c.style.width = c.width * z + 'px';
      c.style.height = c.height * z + 'px';
      c.style.imageRendering = z >= 1 ? 'pixelated' : 'auto';
    }
  }

  function clearOverlay() {
    api.octx.clearRect(0, 0, api.overlay.width, api.overlay.height);
  }

  function point(e) {
    const rect = api.overlay.getBoundingClientRect();
    const scale = rect.width / api.overlay.width;
    const secondary = activeTool ? useSecondary : false;
    return {
      x: Math.floor((e.clientX - rect.left) / scale),
      y: Math.floor((e.clientY - rect.top) / scale),
      shift: e.shiftKey,
      secondary,  // true quando o traço começou com clique direito / Ctrl+clique
      color: secondary ? Paint.state.secondary : Paint.state.primary,
      altColor: secondary ? Paint.state.primary : Paint.state.secondary,
    };
  }

  function bindPointer() {
    const { overlay } = api;
    overlay.addEventListener('contextmenu', (e) => e.preventDefault());

    overlay.addEventListener('pointerdown', (e) => {
      if (activeTool || (e.button !== 0 && e.button !== 2)) return;
      e.preventDefault();
      overlay.setPointerCapture(e.pointerId);
      activeTool = Paint.currentTool();
      // Ctrl+clique no Mac equivale ao clique direito (útil no trackpad).
      useSecondary = e.button === 2 || e.ctrlKey;
      if (activeTool.onDown) activeTool.onDown(api.ctx, point(e));
    });

    overlay.addEventListener('pointermove', (e) => {
      const p = point(e);
      Paint.emit('pointer', p);
      if (activeTool) {
        if (activeTool.onMove) activeTool.onMove(api.ctx, p);
      } else {
        const tool = Paint.currentTool();
        if (tool && tool.onHover) tool.onHover(p);
      }
    });

    const end = (e) => {
      if (!activeTool) return;
      const tool = activeTool;
      const p = point(e);
      activeTool = null;
      if (tool.onUp) tool.onUp(api.ctx, p);
    };
    overlay.addEventListener('pointerup', end);
    overlay.addEventListener('pointercancel', end);

    overlay.addEventListener('pointerleave', () => {
      Paint.emit('pointer', null);
      const tool = Paint.currentTool();
      if (!activeTool && tool && tool.onLeave) tool.onLeave();
    });
  }

  return api;
})();
