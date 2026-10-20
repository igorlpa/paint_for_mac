// Redimensionar (escalar) a imagem inteira, como o "Redimensionar" do Paint.
// Diferente de "Tamanho da tela" (file.js), que corta/estende sem escalar.
// - Unidade: porcentagem ou pixels (trocar a unidade converte os valores digitados).
// - "Manter proporção": ao digitar uma dimensão, a outra é preenchida na hora.
// - Campo vazio: é calculado pela proporção da imagem atual (mesmo sem "Manter proporção").
Paint.resize = (function () {
  const $ = (sel) => document.querySelector(sel);
  let dialog, form, wIn, hIn, keep, smooth, result, okBtn;
  let base = { w: 1, h: 1 }; // tamanho da imagem quando o diálogo abriu

  const unit = () => form.elements.unit.value; // 'percent' | 'pixels'
  const num = (input) => {
    const v = parseFloat(input.value);
    return v > 0 ? v : null;
  };
  const round1 = (v) => Math.round(v * 10) / 10;

  // Converte o que foi digitado em pixels finais, completando o campo vazio pela proporção.
  function target() {
    const w = num(wIn);
    const h = num(hIn);
    if (w === null && h === null) return null;
    const percent = unit() === 'percent';
    let pw = w === null ? null : percent ? (base.w * w) / 100 : w;
    let ph = h === null ? null : percent ? (base.h * h) / 100 : h;
    if (pw === null) pw = (ph * base.w) / base.h;
    if (ph === null) ph = (pw * base.h) / base.w;
    return { w: Math.max(1, Math.round(pw)), h: Math.max(1, Math.round(ph)) };
  }

  function showResult() {
    const t = target();
    const max = Paint.file.MAX_SIDE;
    let text = 'Informe ao menos uma dimensão.';
    let ok = false;
    if (t && (t.w > max || t.h > max)) {
      text = `Resultado: ${t.w} × ${t.h} px — máximo de ${max} px por lado.`;
    } else if (t) {
      text = `Resultado: ${t.w} × ${t.h} px`;
      ok = true;
    }
    result.textContent = text;
    okBtn.disabled = !ok;
  }

  // Com "Manter proporção", preenche o outro campo a partir do que foi editado.
  function sync(changed) {
    if (keep.checked) {
      const other = changed === wIn ? hIn : wIn;
      const v = num(changed);
      if (v === null) {
        other.value = '';
      } else if (unit() === 'percent') {
        other.value = v;
      } else {
        const ratio = changed === wIn ? base.h / base.w : base.w / base.h;
        other.value = Math.max(1, Math.round(v * ratio));
      }
    }
    showResult();
  }

  function onUnitChange() {
    const toPercent = unit() === 'percent';
    for (const [input, size] of [[wIn, base.w], [hIn, base.h]]) {
      const v = num(input);
      if (v === null) continue;
      input.value = toPercent ? round1((v / size) * 100) : Math.round((size * v) / 100);
    }
    $('#resize-dialog').dataset.unit = unit();
    showResult();
  }

  function open() {
    Paint.commitTool();
    const { width, height } = Paint.canvas.el;
    base = { w: width, h: height };
    form.elements.unit.value = 'percent';
    dialog.dataset.unit = 'percent';
    wIn.value = 100;
    hIn.value = 100;
    keep.checked = true;
    $('#resize-current').textContent = `${width} × ${height} px`;
    showResult();
    dialog.showModal();
    wIn.select();
  }

  // Escala a imagem para w×h. Suavização: melhor para fotos; desligada = pixels nítidos (pixel art).
  function scaleImage(w, h, smoothing) {
    const { el } = Paint.canvas;
    if (w === el.width && h === el.height) return;
    Paint.history.push();
    const old = Paint.draw.makeCanvas(el.width, el.height);
    old.getContext('2d').drawImage(el, 0, 0);
    Paint.canvas.setSize(w, h, false);
    const { ctx } = Paint.canvas;
    ctx.imageSmoothingEnabled = smoothing;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(old, 0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
  }

  function init() {
    dialog = $('#resize-dialog');
    form = $('#resize-form');
    wIn = $('#resize-w');
    hIn = $('#resize-h');
    keep = $('#resize-keep');
    smooth = $('#resize-smooth');
    result = $('#resize-result');
    okBtn = $('#resize-ok');

    wIn.addEventListener('input', () => sync(wIn));
    hIn.addEventListener('input', () => sync(hIn));
    form.addEventListener('change', (e) => {
      if (e.target.name === 'unit') onUnitChange();
      if (e.target === keep && keep.checked) sync(num(wIn) !== null ? wIn : hIn);
    });
    $('#resize-cancel').addEventListener('click', () => dialog.close());

    // OK é o único botão submit, então Enter num campo também confirma.
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const t = target();
      if (!t || okBtn.disabled) return;
      dialog.close();
      scaleImage(t.w, t.h, smooth.checked);
    });
  }

  return { init, open, scaleImage };
})();
