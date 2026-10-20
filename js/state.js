// Namespace global único do app.
// Usamos scripts clássicos (não ES modules) porque navegadores bloqueiam `import`
// em páginas abertas via file:// — e o app precisa abrir com duplo clique.
window.Paint = (function () {
  const listeners = {};

  const state = {
    tool: null,            // id da ferramenta ativa (ver Paint.tools)
    previousTool: null,    // usado pelo conta-gotas para voltar à ferramenta anterior
    primary: '#000000',    // cor 1: clique esquerdo
    secondary: '#ffffff',  // cor 2: clique direito, borracha, fundo de recortes
    size: 3,               // espessura em px (pincel, linha, formas)
    shapeMode: 'outline',  // 'outline' | 'fill' | 'both'
    fontSize: 16,
    zoom: 1,
    dirty: false,          // há alterações não salvas?
    fileName: 'sem-titulo',
  };

  const tools = {};

  return {
    state,
    tools,

    on(evt, fn) {
      (listeners[evt] ||= []).push(fn);
    },

    emit(evt, data) {
      (listeners[evt] || []).forEach((fn) => fn(data));
    },

    // Toda mudança de estado passa por aqui para que a UI possa reagir ao evento 'change'.
    set(key, value) {
      if (state[key] === value) return;
      state[key] = value;
      this.emit('change', { key, value });
    },

    registerTool(tool) {
      tools[tool.id] = tool;
    },

    currentTool() {
      return tools[state.tool];
    },

    setTool(id) {
      if (!tools[id]) return;
      this.commitTool();
      if (id !== state.tool) state.previousTool = state.tool;
      this.set('tool', id);
    },

    // Finaliza operações "abertas" da ferramenta atual (seleção flutuante, caixa de texto).
    commitTool() {
      const tool = this.currentTool();
      if (tool && tool.commit) tool.commit();
    },
  };
})();
