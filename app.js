const state = {
  tool: 'brush', color: '#1c2434', size: 24, opacity: .82, zoom: 1, grid: false, mirror: false,
  layers: [], activeLayer: 0, previousTool: 'brush', history: [], historyIndex: -1, isDrawing: false, lastPoint: null, points: [], strokeBase: null, strokePreview: null, blendPreview: null, blendMask: null, strokeLayerOpacity: 1, cursorPosition: null, stencilMode: false, stencilCanvas: null, stencilCtx: null, stencilHasMarks: false
};

const $ = (id) => document.getElementById(id);
const canvasStack = $('canvasStack');
const stage = $('canvasStage');
const toast = $('toast');
const stencilOverlay = $('stencilOverlay');

function showToast(message) { toast.textContent = message; toast.classList.add('show'); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('show'), 1800); }

function makeLayer(name, type = 'transparent') {
  const canvas = document.createElement('canvas');
  canvas.width = 1200; canvas.height = 900;
  canvas.setAttribute('aria-label', `${name} layer`);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (type === 'paper') { ctx.fillStyle = '#f8f5ee'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  return { name, canvas, ctx, visible: true, opacity: 1, blend: 'source-over', type, background: type === 'paper' ? '#f8f5ee' : null, committed: null };
}

function copyCanvas(source) { const copy = document.createElement('canvas'); copy.width = source.width; copy.height = source.height; copy.getContext('2d').drawImage(source, 0, 0); return copy; }

function seedArtwork(layer) {
  const { ctx } = layer;
  ctx.save();
  ctx.globalAlpha = .95; ctx.fillStyle = '#f8f5ee'; ctx.fillRect(0, 0, 1200, 900);
  ctx.globalAlpha = .9; ctx.fillStyle = '#eef0dd'; ctx.beginPath(); ctx.arc(340, 265, 174, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = .55; ctx.fillStyle = '#d9f28f'; ctx.beginPath(); ctx.arc(820, 630, 240, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = .95; ctx.strokeStyle = '#1c2434'; ctx.lineWidth = 12; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(130, 708); ctx.bezierCurveTo(245, 613, 314, 657, 420, 580); ctx.bezierCurveTo(540, 494, 601, 535, 708, 414); ctx.bezierCurveTo(801, 308, 894, 343, 1057, 201); ctx.stroke();
  ctx.globalAlpha = .75; ctx.strokeStyle = '#ef6f61'; ctx.lineWidth = 38; ctx.beginPath(); ctx.moveTo(125, 721); ctx.bezierCurveTo(251, 620, 319, 668, 428, 590); ctx.bezierCurveTo(526, 519, 616, 544, 716, 428); ctx.stroke();
  ctx.globalAlpha = .86; ctx.strokeStyle = '#5e7ce2'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(850, 275, 99, -.3, Math.PI * 1.45); ctx.stroke();
  ctx.fillStyle = '#1c2434'; ctx.globalAlpha = .88; ctx.font = '600 34px Georgia, serif'; ctx.fillText('notes in motion', 118, 165);
  ctx.globalAlpha = .6; ctx.font = '18px Courier New, monospace'; ctx.fillText('a quiet morning / 01', 121, 196);
  ctx.restore();
}

function init() {
  state.stencilCanvas = stencilOverlay;
  state.stencilCtx = stencilOverlay.getContext('2d');
  const base = makeLayer('Layer 1'); base.background = '#f8f5ee';
  base.ctx.fillStyle = '#f8f5ee'; base.ctx.fillRect(0, 0, 1200, 900);
  state.layers = [base]; state.activeLayer = 0;
  state.layers.forEach(layer => { canvasStack.appendChild(layer.canvas); });
  syncLayerStyles(); renderLayers(); updateControls(); saveHistory();
  bindEvents();
}

function syncLayerStyles() { state.layers.forEach((layer, index) => { layer.canvas.style.display = layer.visible ? 'block' : 'none'; layer.canvas.style.opacity = layer.opacity; layer.canvas.style.mixBlendMode = layer.blend === 'source-over' ? 'normal' : layer.blend; layer.canvas.style.zIndex = index; }); }

function renderLayers() {
  $('layerList').innerHTML = '';
  state.layers.slice().reverse().forEach((layer, reversedIndex) => {
    const index = state.layers.length - 1 - reversedIndex;
    const item = document.createElement('div'); item.className = `layer-item ${index === state.activeLayer ? 'active' : ''}`;
    item.innerHTML = `<button class="layer-visibility" aria-label="${layer.visible ? 'Hide' : 'Show'} ${layer.name}">${layer.visible ? '◉' : '○'}</button><div class="layer-thumb"><canvas width="120" height="90"></canvas></div><div class="layer-details"><span class="layer-name">${layer.name}</span><span class="layer-subtitle">${layer.type === 'paper' ? 'Background' : index === state.activeLayer ? 'Selected layer' : 'Layer'}</span></div>`;
    item.addEventListener('click', () => selectLayer(index));
    item.querySelector('.layer-visibility').addEventListener('click', (event) => { event.stopPropagation(); layer.visible = !layer.visible; syncLayerStyles(); renderLayers(); saveHistory(); });
    const thumb = item.querySelector('canvas'); thumb.getContext('2d').drawImage(layer.canvas, 0, 0, 120, 90);
    $('layerList').appendChild(item);
  });
  const active = state.layers[state.activeLayer]; $('layerNameInput').value = active.name; $('layerOpacityRange').value = Math.round(active.opacity * 100); $('layerOpacityValue').textContent = `${Math.round(active.opacity * 100)}%`; $('blendMode').value = active.blend === 'source-over' ? 'Normal' : active.blend === 'soft-light' ? 'Soft light' : active.blend[0].toUpperCase() + active.blend.slice(1);
}

function selectLayer(index) { state.activeLayer = index; renderLayers(); showToast(`${state.layers[index].name} selected`); }

function updateControls() {
  $('sizeValue').textContent = `${state.size} px`; $('sizeRange').value = state.size; $('opacityValue').textContent = `${Math.round(state.opacity * 100)}%`; $('opacityRange').value = Math.round(state.opacity * 100); $('colorHex').textContent = state.color.toUpperCase(); $('sizePreview').style.width = `${Math.max(4, Math.min(30, state.size / 2))}px`; $('sizePreview').style.height = `${Math.max(4, Math.min(30, state.size / 2))}px`;
  document.querySelectorAll('.swatch').forEach(s => s.classList.toggle('selected', s.dataset.color?.toLowerCase() === state.color.toLowerCase()));
  document.querySelectorAll('.tool-button').forEach(button => button.classList.toggle('active', button.dataset.tool === state.tool));
  $('gridIndicator').classList.toggle('on', state.grid); $('gridOverlay').classList.toggle('visible', state.grid); $('mirrorIndicator').classList.toggle('on', state.mirror); stencilOverlay.classList.toggle('visible', state.stencilMode); applyCanvasTransform();
  $('zoomValue').value = Math.round(state.zoom * 100);
  refreshCursorPreview();
}

function applyCanvasTransform() {
  const mirrorScale = state.mirror ? -1 : 1;
  const transform = `scale(${mirrorScale * state.zoom}, ${state.zoom})`;
  canvasStack.style.transform = transform;
  $('gridOverlay').style.transform = transform;
  stencilOverlay.style.transform = transform;
  $('canvasShadow').style.transform = `translateY(18px) scale(${state.zoom})`;
}
function fitCanvas() {
  const availableWidth = Math.max(1, canvasStage.clientWidth - 48);
  const availableHeight = Math.max(1, canvasStage.clientHeight - 48);
  const baseWidth = Math.max(1, canvasStack.offsetWidth);
  const baseHeight = Math.max(1, canvasStack.offsetHeight);
  state.zoom = Math.max(.25, Math.min(4, Math.min(availableWidth / baseWidth, availableHeight / baseHeight)));
  updateControls();
}
async function toggleFocusMode() {
  const canvasArea = document.querySelector('.canvas-area');
  const entering = !canvasArea.classList.contains('focus-mode');
  canvasArea.classList.toggle('focus-mode', entering);
  $('fullscreenBtn').title = entering ? 'Exit focus mode' : 'Focus mode';
  if (entering) {
    try { await document.documentElement.requestFullscreen?.(); } catch (error) { /* CSS focus mode still works when fullscreen is unavailable. */ }
  } else if (document.fullscreenElement) {
    try { await document.exitFullscreen(); } catch (error) { /* The focus layout has already been restored. */ }
  }
  requestAnimationFrame(fitCanvas);
}

function clearStencilOverlay() { state.stencilCtx.clearRect(0, 0, 1200, 900); state.stencilHasMarks = false; }
function drawStencilStroke() {
  const ctx = state.stencilCtx; ctx.save(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = '#737983'; ctx.fillStyle = '#737983'; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = state.size; ctx.beginPath();
  if (state.points.length === 1) { ctx.arc(state.points[0].x, state.points[0].y, state.size / 2, 0, Math.PI * 2); ctx.fill(); } else { ctx.moveTo(state.points[0].x, state.points[0].y); for (let i = 1; i < state.points.length; i++) ctx.lineTo(state.points[i].x, state.points[i].y); ctx.stroke(); }
  ctx.restore(); state.stencilHasMarks = true;
}
function eraseStencilMaskFromLayers() {
  if (!state.stencilHasMarks) return;
  state.layers.forEach(layer => {
    if (layer.type === 'paper') return;
    layer.ctx.save(); layer.ctx.globalCompositeOperation = 'destination-out'; layer.ctx.globalAlpha = 1; layer.ctx.drawImage(state.stencilCanvas, 0, 0); layer.ctx.restore();
    layer.committed = copyCanvas(layer.canvas);
  });
}
function toggleStencilMode() {
  if (state.stencilMode) {
    eraseStencilMaskFromLayers(); clearStencilOverlay(); state.stencilMode = false; state.tool = state.previousTool || 'brush'; syncLayerStyles(); renderLayers(); updateControls(); saveHistory(); checkEmpty(); showToast('Stencil removed — blank area created'); return;
  }
  clearStencilOverlay(); state.stencilMode = true; state.tool = 'stencil'; updateControls(); showToast('Stencil mode selected — draw a mask');
}
function setTool(tool) {
  if (tool === 'stencil') { toggleStencilMode(); return; }
  if (state.stencilMode) { showToast('Press Stencil again when you are finished'); return; }
  if (tool !== 'eyedropper') state.previousTool = tool; state.tool = tool; updateControls(); const toolLabel = tool === 'eyedropper' ? 'Color picker' : `${tool[0].toUpperCase() + tool.slice(1)}`; showToast(`${toolLabel} selected`);
}

function selectColor(color) { state.color = color; $('colorInput').value = color; updateControls(); }
function addCustomSwatch(color) {
  const normalizedColor = color.toLowerCase();
  if ([...document.querySelectorAll('.swatch[data-color]')].some(swatch => swatch.dataset.color.toLowerCase() === normalizedColor)) return;
  const swatch = document.createElement('button');
  swatch.className = 'swatch'; swatch.dataset.color = color; swatch.style.setProperty('--swatch', color); swatch.setAttribute('aria-label', `Custom color ${color.toUpperCase()}`); swatch.title = `Use ${color.toUpperCase()}`;
  swatch.addEventListener('click', () => selectColor(color));
  $('addSwatchBtn').before(swatch);
}

function pointFromEvent(event) { const rect = canvasStack.getBoundingClientRect(); const visualX = ((event.clientX - rect.left) / rect.width) * 1200; const x = state.mirror ? 1200 - visualX : visualX; const y = ((event.clientY - rect.top) / rect.height) * 900; return { x, y }; }

function cursorDiameter() { return state.size; }
function updateCursorPreview(event) { const preview = $('cursorPreview'); if (!preview) return; const rect = canvasStack.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) { preview.classList.remove('visible'); return; } const layoutWidth = canvasStack.offsetWidth; const layoutHeight = canvasStack.offsetHeight; const visualX = ((event.clientX - rect.left) / rect.width) * layoutWidth; const visualY = ((event.clientY - rect.top) / rect.height) * layoutHeight; const x = state.mirror ? layoutWidth - visualX : visualX; const diameter = cursorDiameter() * (layoutWidth / 1200); preview.style.left = `${x}px`; preview.style.top = `${visualY}px`; preview.style.width = `${Math.max(2, diameter)}px`; preview.style.height = `${Math.max(2, diameter)}px`; preview.style.setProperty('--cursor-color', state.tool === 'eraser' ? '#6b7280' : state.tool === 'stencil' ? '#737983' : state.color); preview.classList.add('visible'); state.cursorPosition = { clientX: event.clientX, clientY: event.clientY }; }
function refreshCursorPreview() { if (state.cursorPosition) updateCursorPreview(state.cursorPosition); }

function toolAlpha() { return state.opacity; }
function setupBrush(ctx, opaque = false) { ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = opaque ? 1 : toolAlpha(); ctx.strokeStyle = state.color; ctx.fillStyle = state.color; ctx.lineWidth = state.size; if (state.tool === 'eraser') { ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'destination-out'; } }

function drawDot(ctx, point) { ctx.beginPath(); ctx.arc(point.x, point.y, Math.max(1, ctx.lineWidth / 2), 0, Math.PI * 2); ctx.fill(); }
function brushNoise(value) { const number = Math.sin(value * 12.9898) * 43758.5453; return number - Math.floor(number); }
function drawBrushLine(ctx, offset, seed, jitterAmount = .1) {
  ctx.beginPath();
  state.points.forEach((point, index) => {
    const previous = state.points[Math.max(0, index - 1)]; const next = state.points[Math.min(state.points.length - 1, index + 1)];
    const dx = next.x - previous.x; const dy = next.y - previous.y; const length = Math.hypot(dx, dy) || 1;
    const normalX = -dy / length; const normalY = dx / length; const jitter = (brushNoise(seed + index * 1.73) - .5) * state.size * jitterAmount;
    const x = point.x + normalX * (offset + jitter); const y = point.y + normalY * (offset + jitter);
    if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();
}
function drawBrushStroke(ctx) {
  ctx.save(); ctx.strokeStyle = state.color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (state.points.length === 1) { ctx.globalAlpha = 1; ctx.fillStyle = state.color; ctx.beginPath(); ctx.arc(state.points[0].x, state.points[0].y, state.size / 2, 0, Math.PI * 2); ctx.fill(); ctx.restore(); return; }
  ctx.globalAlpha = 1; ctx.lineWidth = Math.max(1, state.size * .68); drawBrushLine(ctx, 0, 1);
  const bristleCount = Math.max(12, Math.round(state.size * .8));
  for (let i = 0; i < bristleCount; i++) { const spread = (i / (bristleCount - 1) - .5) * state.size * .9; ctx.globalAlpha = state.opacity >= .999 ? 1 : .07 + brushNoise(i + 4) * .12; ctx.lineWidth = Math.max(.7, state.size * (.025 + brushNoise(i + 18) * .025)); drawBrushLine(ctx, spread, i + 30); }
  ctx.restore();
}
function drawMarkerStroke(ctx) {
  ctx.save(); ctx.strokeStyle = state.color; ctx.lineCap = 'butt'; ctx.lineJoin = 'bevel'; ctx.globalAlpha = 1;
  if (state.points.length === 1) { ctx.fillStyle = state.color; ctx.fillRect(state.points[0].x - state.size / 2, state.points[0].y - state.size / 2, state.size, state.size); ctx.restore(); return; }
  ctx.lineWidth = state.size; drawBrushLine(ctx, 0, 80, 0);
  const streakCount = Math.max(3, Math.min(8, Math.round(state.size / 8)));
  for (let i = 0; i < streakCount; i++) { const offset = (i / (streakCount - 1) - .5) * state.size * .78; ctx.globalAlpha = state.opacity >= .999 ? 1 : .06 + brushNoise(i + 90) * .08; ctx.lineWidth = Math.max(1, state.size * .035); drawBrushLine(ctx, offset, i + 100, 0); }
  ctx.restore();
}
function brightenColor(hex, amount = .25) {
  const value = hex.replace('#', '');
  const red = parseInt(value.slice(0, 2), 16); const green = parseInt(value.slice(2, 4), 16); const blue = parseInt(value.slice(4, 6), 16);
  return `rgb(${Math.round(red + (255 - red) * amount)}, ${Math.round(green + (255 - green) * amount)}, ${Math.round(blue + (255 - blue) * amount)})`;
}
function drawHighlighterStroke(ctx) {
  ctx.save(); ctx.lineCap = 'butt'; ctx.lineJoin = 'bevel'; ctx.globalAlpha = 1;
  if (state.points.length === 1) {
    ctx.fillStyle = state.color; ctx.fillRect(state.points[0].x - state.size / 2, state.points[0].y - state.size / 2, state.size, state.size);
    ctx.fillStyle = state.opacity >= .999 ? state.color : brightenColor(state.color, .28); const inset = Math.max(1, state.size * .18); ctx.fillRect(state.points[0].x - state.size / 2 + inset, state.points[0].y - state.size / 2 + inset, state.size - inset * 2, state.size - inset * 2);
    ctx.restore(); return;
  }
  // A squared marker body keeps the stroke clean and rectangular rather than spiky.
  ctx.strokeStyle = state.color; ctx.lineWidth = state.size; drawBrushLine(ctx, 0, 140, 0);
  // Keep 100% opacity true to the selected color. At lower opacity, the brighter
  // inner pass gives the highlighter its vivid, polished center without making
  // a fully opaque stroke look washed out.
  ctx.strokeStyle = state.opacity >= .999 ? state.color : brightenColor(state.color, .28); ctx.lineWidth = Math.max(1, state.size * .42); drawBrushLine(ctx, 0, 141, 0);
  ctx.restore();
}
function drawBlendStroke(ctx) {
  if (!state.blendPreview) { state.blendPreview = document.createElement('canvas'); state.blendPreview.width = 1200; state.blendPreview.height = 900; }
  if (!state.blendMask) { state.blendMask = document.createElement('canvas'); state.blendMask.width = 1200; state.blendMask.height = 900; }
  const blendCtx = state.blendPreview.getContext('2d'); const maskCtx = state.blendMask.getContext('2d');
  blendCtx.clearRect(0, 0, 1200, 900); maskCtx.clearRect(0, 0, 1200, 900);
  // Blur the untouched stroke base, then reveal only the path covered by the blend brush.
  blendCtx.save(); blendCtx.filter = `blur(${Math.max(1.5, state.size * .22)}px)`; blendCtx.drawImage(state.strokeBase, 0, 0); blendCtx.restore();
  maskCtx.save(); maskCtx.strokeStyle = '#fff'; maskCtx.lineWidth = state.size; maskCtx.lineCap = 'round'; maskCtx.lineJoin = 'round'; maskCtx.beginPath();
  if (state.points.length === 1) { maskCtx.arc(state.points[0].x, state.points[0].y, state.size / 2, 0, Math.PI * 2); maskCtx.fill(); } else { maskCtx.moveTo(state.points[0].x, state.points[0].y); for (let i = 1; i < state.points.length; i++) maskCtx.lineTo(state.points[i].x, state.points[i].y); maskCtx.stroke(); }
  maskCtx.restore();
  blendCtx.save(); blendCtx.globalCompositeOperation = 'destination-in'; blendCtx.drawImage(state.blendMask, 0, 0); blendCtx.restore();
  ctx.save(); ctx.globalAlpha = toolAlpha(); ctx.globalCompositeOperation = 'source-atop'; ctx.drawImage(state.blendPreview, 0, 0); ctx.restore();
}
function traceStroke(ctx) { if (state.tool === 'brush') { drawBrushStroke(ctx); return; } if (state.tool === 'marker') { drawMarkerStroke(ctx); return; } if (state.tool === 'highlighter') { drawHighlighterStroke(ctx); return; } ctx.beginPath(); if (state.points.length === 1) { drawDot(ctx, state.points[0]); return; } ctx.moveTo(state.points[0].x, state.points[0].y); for (let i = 1; i < state.points.length; i++) ctx.lineTo(state.points[i].x, state.points[i].y); ctx.stroke(); }
function eraseSegment(layer, from, to) { const ctx = layer.ctx; ctx.save(); ctx.globalAlpha = 1; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = state.size; ctx.globalCompositeOperation = 'destination-out'; ctx.strokeStyle = '#000000'; ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke(); if (from.x === to.x && from.y === to.y) { ctx.beginPath(); ctx.arc(to.x, to.y, ctx.lineWidth / 2, 0, Math.PI * 2); ctx.fill(); } ctx.restore(); }
function compositeCanvas() { const composite = document.createElement('canvas'); composite.width = 1200; composite.height = 900; const ctx = composite.getContext('2d', { willReadFrequently: true }); state.layers.forEach(layer => { if (!layer.visible) return; ctx.globalAlpha = layer.opacity; ctx.globalCompositeOperation = layer.blend; ctx.drawImage(layer.canvas, 0, 0); }); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; return composite; }
function colorFromPixel(point) { const composite = compositeCanvas(); const x = Math.max(0, Math.min(1199, Math.round(point.x))); const y = Math.max(0, Math.min(899, Math.round(point.y))); const [red, green, blue, alpha] = composite.getContext('2d').getImageData(x, y, 1, 1).data; if (alpha === 0) return null; return `#${[red, green, blue].map(value => value.toString(16).padStart(2, '0')).join('')}`; }
function pickColorAt(point) { const pickedColor = colorFromPixel(point); if (!pickedColor) { showToast('No color at this point'); return; } state.color = pickedColor; $('colorInput').value = pickedColor; state.tool = state.previousTool || 'brush'; updateControls(); showToast(`Picked ${pickedColor.toUpperCase()}`); }
function renderStroke() {
  const layer = state.layers[state.activeLayer]; if (!layer || layer.type === 'paper' || !state.strokeBase) return;
  const ctx = layer.ctx;
  // Restore the layer before every redraw so one gesture is painted once.
  ctx.clearRect(0, 0, 1200, 900); ctx.drawImage(state.strokeBase, 0, 0);
  if (state.tool === 'eraser') {
    ctx.save(); ctx.globalAlpha = 1; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = state.size;
    if (layer.background) { ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = layer.background; ctx.fillStyle = layer.background; }
    else { ctx.globalCompositeOperation = 'destination-out'; }
    traceStroke(ctx); ctx.restore(); return;
  }
  if (state.tool === 'blend') { drawBlendStroke(ctx); return; }

  // Paint an opaque mask, then blend its color into the layer while preserving
  // the destination alpha. Brush opacity changes color intensity, never layer transparency.
  if (!state.strokePreview) { state.strokePreview = document.createElement('canvas'); state.strokePreview.width = 1200; state.strokePreview.height = 900; }
  const previewCtx = state.strokePreview.getContext('2d'); previewCtx.clearRect(0, 0, 1200, 900); setupBrush(previewCtx, true); traceStroke(previewCtx);
  const baseData = state.strokeBase.getContext('2d').getImageData(0, 0, 1200, 900); const inkData = previewCtx.getImageData(0, 0, 1200, 900); const output = ctx.getImageData(0, 0, 1200, 900); const alpha = toolAlpha(); const paper = [248, 245, 238];
  for (let i = 0; i < output.data.length; i += 4) { const coverage = (inkData.data[i + 3] / 255) * alpha; if (coverage <= 0) continue; const baseAlpha = baseData.data[i + 3]; const baseRed = baseAlpha ? baseData.data[i] : paper[0]; const baseGreen = baseAlpha ? baseData.data[i + 1] : paper[1]; const baseBlue = baseAlpha ? baseData.data[i + 2] : paper[2]; output.data[i] = baseRed + (inkData.data[i] - baseRed) * coverage; output.data[i + 1] = baseGreen + (inkData.data[i + 1] - baseGreen) * coverage; output.data[i + 2] = baseBlue + (inkData.data[i + 2] - baseBlue) * coverage; output.data[i + 3] = Math.max(baseAlpha, inkData.data[i + 3]); }
  ctx.putImageData(output, 0, 0);
}
function pixelToHex(pixel) { const [red, green, blue, alpha] = pixel; if (alpha === 0) return null; return `#${[red, green, blue].map(value => value.toString(16).padStart(2, '0')).join('')}`; }
function canvasPixelColor(canvas, point) { const x = Math.max(0, Math.min(1199, Math.round(point.x))); const y = Math.max(0, Math.min(899, Math.round(point.y))); return pixelToHex(canvas.getContext('2d').getImageData(x, y, 1, 1).data); }

function onPointerDown(event) { if (event.button !== undefined && event.button !== 0) return; const point = pointFromEvent(event); if (state.stencilMode) { state.isDrawing = true; state.lastPoint = point; state.points = [point]; canvasStack.setPointerCapture?.(event.pointerId); drawStencilStroke(); return; } if (state.tool === 'eyedropper') { pickColorAt(point); return; } const layer = state.layers[state.activeLayer]; if (!layer || layer.type === 'paper') { showToast('Select a color layer to draw'); return; } state.isDrawing = true; state.strokeLayerOpacity = layer.opacity; state.lastPoint = point; state.points = [state.lastPoint]; canvasStack.setPointerCapture?.(event.pointerId); if (state.tool === 'eraser') { eraseSegment(layer, state.lastPoint, state.lastPoint); return; } state.strokeBase = copyCanvas(layer.committed || layer.canvas); renderStroke(); }
function onPointerMove(event) { if (!state.isDrawing) return; const point = pointFromEvent(event); if (state.stencilMode) { state.points.push(point); state.lastPoint = point; drawStencilStroke(); return; } if (state.tool === 'eraser') { eraseSegment(state.layers[state.activeLayer], state.lastPoint, point); state.lastPoint = point; return; } state.points.push(point); state.lastPoint = point; renderStroke(); }
function onPointerUp() { if (!state.isDrawing) return; if (state.stencilMode) { state.isDrawing = false; state.lastPoint = null; return; } const layer = state.layers[state.activeLayer]; if (layer) { layer.opacity = state.strokeLayerOpacity; layer.canvas.style.opacity = layer.opacity; layer.committed = copyCanvas(layer.canvas); } state.isDrawing = false; state.lastPoint = null; state.strokeBase = null; saveHistory(); checkEmpty(); }
function checkEmpty() { $('emptyState').style.opacity = state.historyIndex <= 0 ? '.8' : '0'; }

function snapshot() { return state.layers.map(layer => ({ name: layer.name, visible: layer.visible, opacity: layer.opacity, blend: layer.blend, type: layer.type, background: layer.background, data: layer.canvas.toDataURL() })); }
function restoreSnapshot(snap) { state.layers = []; canvasStack.innerHTML = ''; let pending = snap.length; snap.forEach(item => { const layer = makeLayer(item.name, item.type); layer.visible = item.visible; layer.opacity = item.opacity; layer.blend = item.blend; layer.background = item.background || null; if (item.data) { const image = new Image(); image.onload = () => { layer.ctx.clearRect(0, 0, 1200, 900); layer.ctx.drawImage(image, 0, 0); if (--pending === 0) { syncLayerStyles(); renderLayers(); } }; image.src = item.data; } state.layers.push(layer); canvasStack.appendChild(layer.canvas); }); state.activeLayer = Math.min(state.activeLayer, state.layers.length - 1); syncLayerStyles(); renderLayers(); }
function saveHistory() { const snap = snapshot(); state.history = state.history.slice(0, state.historyIndex + 1); state.history.push(snap); if (state.history.length > 30) state.history.shift(); state.historyIndex = state.history.length - 1; $('undoBtn').style.opacity = state.historyIndex > 0 ? 1 : .4; $('redoBtn').style.opacity = state.historyIndex < state.history.length - 1 ? 1 : .4; }
function undo() { if (state.historyIndex <= 0) return; state.historyIndex--; restoreSnapshot(state.history[state.historyIndex]); showToast('Undid last action'); }
function redo() { if (state.historyIndex >= state.history.length - 1) return; state.historyIndex++; restoreSnapshot(state.history[state.historyIndex]); showToast('Redid action'); }

function addLayer() { const layer = makeLayer(`Layer ${state.layers.length}`); state.layers.splice(state.activeLayer + 1, 0, layer); canvasStack.appendChild(layer.canvas); state.activeLayer++; syncLayerStyles(); renderLayers(); saveHistory(); showToast('New layer added'); }
function deleteLayer() { if (state.layers.length <= 1) return showToast('Keep at least one layer'); if (state.layers[state.activeLayer].type === 'paper') return showToast('The paper layer cannot be deleted'); state.layers.splice(state.activeLayer, 1); state.activeLayer = Math.max(0, state.activeLayer - 1); canvasStack.innerHTML = ''; state.layers.forEach(layer => canvasStack.appendChild(layer.canvas)); syncLayerStyles(); renderLayers(); saveHistory(); showToast('Layer deleted'); }
function duplicateLayer() { const source = state.layers[state.activeLayer]; const clone = makeLayer(`${source.name} copy`); clone.visible = source.visible; clone.opacity = source.opacity; clone.blend = source.blend; clone.background = source.background; clone.ctx.drawImage(source.canvas, 0, 0); state.layers.splice(state.activeLayer + 1, 0, clone); canvasStack.appendChild(clone.canvas); state.activeLayer++; syncLayerStyles(); renderLayers(); saveHistory(); showToast('Layer duplicated'); }
function moveLayer(direction) { const next = state.activeLayer + direction; if (next < 0 || next >= state.layers.length || state.layers[state.activeLayer].type === 'paper' && direction < 0) return; [state.layers[state.activeLayer], state.layers[next]] = [state.layers[next], state.layers[state.activeLayer]]; state.activeLayer = next; canvasStack.innerHTML = ''; state.layers.forEach(layer => canvasStack.appendChild(layer.canvas)); syncLayerStyles(); renderLayers(); saveHistory(); }

function exportImage() { const out = document.createElement('canvas'); out.width = 1200; out.height = 900; const ctx = out.getContext('2d'); [...state.layers].forEach(layer => { if (!layer.visible) return; ctx.globalAlpha = layer.opacity; ctx.globalCompositeOperation = layer.blend; ctx.drawImage(layer.canvas, 0, 0); }); ctx.globalAlpha = 1; const link = document.createElement('a'); link.download = `${$('documentTitle').value || 'canvas'}.png`; link.href = out.toDataURL('image/png'); link.click(); showToast('PNG exported'); }

function projectFilename() { const title = $('documentTitle').value.trim() || 'canvas-project'; return title.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'canvas-project'; }
function saveProject() { const project = { format: 'canvas-project', version: 1, title: $('documentTitle').value.trim(), activeLayer: state.activeLayer, settings: { tool: state.tool, color: state.color, size: state.size, opacity: state.opacity, zoom: state.zoom, grid: state.grid, mirror: state.mirror }, layers: state.layers.map(layer => ({ name: layer.name, type: layer.type, background: layer.background, visible: layer.visible, opacity: layer.opacity, blend: layer.blend, data: layer.canvas.toDataURL('image/png') })) }; const blob = new Blob([JSON.stringify(project)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.download = `${projectFilename()}.canvas`; link.href = url; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); showToast('Project saved'); }
function loadImageSource(source) { return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = source; }); }
async function loadProject(file) { try { const project = JSON.parse(await file.text()); if (project.format !== 'canvas-project' || !Array.isArray(project.layers) || !project.layers.length) throw new Error('Not a Canvas project file'); const loadedLayers = await Promise.all(project.layers.map(async item => { const layer = makeLayer(item.name || 'Untitled layer', item.type || 'transparent'); layer.background = item.background || null; layer.visible = item.visible !== false; layer.opacity = typeof item.opacity === 'number' ? item.opacity : 1; layer.blend = item.blend || 'source-over'; if (item.data) { const image = await loadImageSource(item.data); layer.ctx.clearRect(0, 0, 1200, 900); layer.ctx.drawImage(image, 0, 0); } layer.committed = copyCanvas(layer.canvas); return layer; })); state.layers = loadedLayers; state.activeLayer = Math.min(Math.max(Number(project.activeLayer) || 0, 0), state.layers.length - 1); const settings = project.settings || {}; if (settings.tool) state.tool = settings.tool; if (settings.color) state.color = settings.color; if (typeof settings.size === 'number') state.size = settings.size; if (typeof settings.opacity === 'number') state.opacity = settings.opacity; if (typeof settings.zoom === 'number') state.zoom = settings.zoom; if (typeof settings.grid === 'boolean') state.grid = settings.grid; if (typeof settings.mirror === 'boolean') state.mirror = settings.mirror; $('documentTitle').value = project.title || ''; $('canvasStatus').textContent = project.title || 'Untitled artwork'; canvasStack.innerHTML = ''; state.layers.forEach(layer => canvasStack.appendChild(layer.canvas)); state.history = []; state.historyIndex = -1; syncLayerStyles(); renderLayers(); updateControls(); saveHistory(); showToast('Project loaded'); } catch (error) { showToast('Could not load that project'); console.error(error); } }

function bindEvents() {
  document.querySelectorAll('[data-tool]').forEach(button => button.addEventListener('click', () => setTool(button.dataset.tool)));
  $('sizeRange').addEventListener('input', e => { state.size = Number(e.target.value); updateControls(); }); $('opacityRange').addEventListener('input', e => { state.opacity = Number(e.target.value) / 100; updateControls(); }); $('colorInput').addEventListener('input', e => { state.color = e.target.value; updateControls(); });
  document.querySelectorAll('.swatch[data-color]').forEach(swatch => swatch.addEventListener('click', () => selectColor(swatch.dataset.color)));
  $('addSwatchBtn').addEventListener('click', () => { $('colorInput').dataset.addToPalette = 'true'; $('colorInput').click(); });
  $('colorInput').addEventListener('change', event => { if (event.target.dataset.addToPalette !== 'true') return; addCustomSwatch(event.target.value); delete event.target.dataset.addToPalette; selectColor(event.target.value); showToast('Color added to palette'); });
  canvasStack.addEventListener('dragstart', event => event.preventDefault()); canvasStack.addEventListener('pointerdown', event => { updateCursorPreview(event); onPointerDown(event); }); canvasStack.addEventListener('pointermove', event => { updateCursorPreview(event); onPointerMove(event); }); canvasStack.addEventListener('pointerenter', updateCursorPreview); canvasStack.addEventListener('pointerleave', () => $('cursorPreview').classList.remove('visible')); canvasStack.addEventListener('pointerup', onPointerUp); canvasStack.addEventListener('pointercancel', onPointerUp);
  $('undoBtn').addEventListener('click', undo); $('redoBtn').addEventListener('click', redo); $('addLayerBtn').addEventListener('click', addLayer); $('deleteLayerBtn').addEventListener('click', deleteLayer); $('duplicateLayerBtn').addEventListener('click', duplicateLayer); $('moveLayerUpBtn').addEventListener('click', () => moveLayer(1)); $('moveLayerDownBtn').addEventListener('click', () => moveLayer(-1)); $('exportBtn').addEventListener('click', exportImage); $('saveProjectBtn').addEventListener('click', saveProject); $('loadProjectBtn').addEventListener('click', () => $('importInput').click()); $('importInput').addEventListener('change', async event => { const file = event.target.files?.[0]; if (file) await loadProject(file); event.target.value = ''; });
  $('clearBtn').addEventListener('click', () => { const layer = state.layers[state.activeLayer]; if (layer.type === 'paper') return showToast('The paper layer cannot be cleared'); layer.ctx.clearRect(0, 0, 1200, 900); if (layer.background) { layer.ctx.fillStyle = layer.background; layer.ctx.fillRect(0, 0, 1200, 900); } layer.committed = copyCanvas(layer.canvas); saveHistory(); renderLayers(); showToast('Active layer cleared'); });
  $('gridBtn').addEventListener('click', () => { state.grid = !state.grid; updateControls(); }); $('mirrorBtn').addEventListener('click', () => { state.mirror = !state.mirror; updateControls(); });
  $('zoomInBtn').addEventListener('click', () => { state.zoom = Math.min(4, state.zoom * 1.15); updateControls(); }); $('zoomOutBtn').addEventListener('click', () => { state.zoom = Math.max(.25, state.zoom / 1.15); updateControls(); }); $('zoomValue').addEventListener('change', event => { const percent = Number(event.target.value); if (!Number.isFinite(percent)) return updateControls(); state.zoom = Math.max(.25, Math.min(4, percent / 100)); updateControls(); }); $('fitBtn').addEventListener('click', fitCanvas); $('fullscreenBtn').addEventListener('click', toggleFocusMode); document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && document.querySelector('.canvas-area').classList.contains('focus-mode')) { document.querySelector('.canvas-area').classList.remove('focus-mode'); $('fullscreenBtn').title = 'Focus mode'; requestAnimationFrame(fitCanvas); } }); window.addEventListener('resize', () => { if (document.querySelector('.canvas-area').classList.contains('focus-mode')) fitCanvas(); });
  $('layerOpacityRange').addEventListener('input', e => { const layer = state.layers[state.activeLayer]; layer.opacity = Number(e.target.value) / 100; renderLayers(); syncLayerStyles(); }); $('layerOpacityRange').addEventListener('change', saveHistory); $('layerNameInput').addEventListener('change', e => { state.layers[state.activeLayer].name = e.target.value || 'Untitled layer'; renderLayers(); saveHistory(); }); $('blendMode').addEventListener('change', e => { const modes = {'Normal':'source-over','Multiply':'multiply','Screen':'screen','Overlay':'overlay','Soft light':'soft-light'}; state.layers[state.activeLayer].blend = modes[e.target.value]; syncLayerStyles(); saveHistory(); });
  $('documentTitle').addEventListener('input', e => { $('canvasStatus').textContent = e.target.value.trim() || 'Untitled artwork'; });
  document.addEventListener('keydown', e => { const key = e.key.toLowerCase(); if ((e.metaKey || e.ctrlKey) && key === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); } else if (!e.metaKey && !e.ctrlKey && !e.altKey && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) { if (key === 'b') setTool('brush'); if (key === 'e') setTool('eraser'); if (key === 'p') setTool('pencil'); if (key === 'i') setTool('eyedropper'); if (key === 'g') setTool('blend'); } });
}

init();
