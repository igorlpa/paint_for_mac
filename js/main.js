// Inicialização. Deve ser o último <script> do index.html.
// A UI é iniciada antes do canvas para já receber os eventos 'resize' e 'history'.
Paint.ui.init();
Paint.file.init();
Paint.resize.init();
Paint.canvas.init(800, 600);
Paint.handles.init();
Paint.history.clear();
Paint.setTool('pencil');

window.addEventListener('beforeunload', (e) => {
  if (!Paint.state.dirty) return;
  e.preventDefault();
  e.returnValue = '';
});
