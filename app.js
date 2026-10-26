/* Laboratorio de transformaciones 3D: vectores columna y composición con glMatrix. */
(function () {
  'use strict';
  const { mat4, vec3 } = window.glMatrix || {};
  const state = { translation: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], order: 'TRS', camera: { yaw: .65, pitch: .35, distance: 7 } };
  const defaults = { translation: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] };
  const axes = ['X', 'Y', 'Z'];
  const canvas = document.querySelector('#gl-canvas');
  const errorBox = document.querySelector('#webgl-error');
  const controls = { translation: document.querySelector('#translation-controls'), rotation: document.querySelector('#rotation-controls'), scale: document.querySelector('#scale-controls') };
  const limits = { translation: [-3, 3, .1], rotation: [-180, 180, 1], scale: [.2, 2.5, .05] };
  const labels = { translation: 'T', rotation: 'R', scale: 'S' };
  const vertex = vec3 ? vec3.fromValues(1, 1, 1) : null;
  let gl, program, buffers, drag;

  function makeSliders() {
    Object.keys(controls).forEach((kind) => {
      controls[kind].innerHTML = axes.map((axis, index) => {
        const [min, max, step] = limits[kind];
        return `<label class="slider-row"><span>${axis}</span><input data-kind="${kind}" data-index="${index}" type="range" min="${min}" max="${max}" step="${step}" value="${state[kind][index]}"><strong id="value-${kind}-${index}">${format(state[kind][index], kind)}</strong></label>`;
      }).join('');
      controls[kind].addEventListener('input', (event) => { if (event.target.matches('input')) { const index = Number(event.target.dataset.index); state[kind][index] = Number(event.target.value); update(); } });
    });
  }
  function format(value, kind) { return kind === 'rotation' ? `${value.toFixed(0)}°` : value.toFixed(2); }
  function matrixFor(order) {
    const matrix = mat4.create();
    const calls = { T: () => mat4.translate(matrix, matrix, state.translation), R: () => { mat4.rotateX(matrix, matrix, state.rotation[0] * Math.PI / 180); mat4.rotateY(matrix, matrix, state.rotation[1] * Math.PI / 180); mat4.rotateZ(matrix, matrix, state.rotation[2] * Math.PI / 180); }, S: () => mat4.scale(matrix, matrix, state.scale) };
    order.split('').forEach((letter) => calls[letter]());
    return matrix;
  }
  function componentMatrices() {
    const translation = mat4.create(); mat4.translate(translation, translation, state.translation);
    const rotation = mat4.create(); mat4.rotateX(rotation, rotation, state.rotation[0] * Math.PI / 180); mat4.rotateY(rotation, rotation, state.rotation[1] * Math.PI / 180); mat4.rotateZ(rotation, rotation, state.rotation[2] * Math.PI / 180);
    const scale = mat4.create(); mat4.scale(scale, scale, state.scale);
    return { translation, rotation, scale };
  }
  function effectiveOrder(order) { return order.split('').reverse().join(' → '); }
  function transformPoint(matrix) { const output = vec3.create(); vec3.transformMat4(output, vertex, matrix); return output; }
  function vectorText(value) { return `(${value.map((number) => number.toFixed(2)).join(', ')})`; }
  function matrixText(matrix) { return [0, 1, 2, 3].map((row) => `[ ${[0, 1, 2, 3].map((column) => matrix[column * 4 + row].toFixed(2).padStart(6)).join(' ')} ]`).join('\n'); }
  function update() {
    Object.keys(controls).forEach((kind) => state[kind].forEach((value, index) => { const input = controls[kind].querySelector(`[data-index="${index}"]`); if (input) input.value = value; document.querySelector(`#value-${kind}-${index}`).textContent = format(value, kind); }));
    const matrix = matrixFor(state.order); const result = transformPoint(matrix); const trs = transformPoint(matrixFor('TRS')); const srt = transformPoint(matrixFor('SRT')); const delta = vec3.distance(trs, srt);
    document.querySelector('#order-summary').textContent = `llamadas ${state.order}`;
    document.querySelector('#effective-order').textContent = `Aplicación efectiva: ${effectiveOrder(state.order)}`;
    document.querySelector('#effective-detail').textContent = `La secuencia visible sobre el vértice se lee de derecha a izquierda en ${state.order}.`;
    const components = componentMatrices(); document.querySelector('#model-matrix').textContent = `M\n${matrixText(matrix)}\n\nT\n${matrixText(components.translation)}\n\nR\n${matrixText(components.rotation)}\n\nS\n${matrixText(components.scale)}`; document.querySelector('#vertex-result').textContent = `antes  ${vectorText(vertex)}\ndespués ${vectorText(result)}`;
    document.querySelector('#trs-result').textContent = vectorText(trs); document.querySelector('#srt-result').textContent = vectorText(srt); document.querySelector('#difference-result').textContent = delta.toFixed(2);
    draw(matrix);
  }
  function reset() { Object.assign(state, { translation: [...defaults.translation], rotation: [...defaults.rotation], scale: [...defaults.scale], order: 'TRS' }); document.querySelector('#order-select').value = state.order; update(); }
  function preset(name) { if (name === 'identity') Object.assign(state, { translation: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }); if (name === 'rotate-translate') Object.assign(state, { translation: [1.1, .35, 0], rotation: [20, 35, -18], scale: [1, 1, 1] }); if (name === 'non-uniform') Object.assign(state, { translation: [0, 0, 0], rotation: [0, 35, 0], scale: [1.7, .65, 1.15] }); update(); }
  function initWebgl() {
    gl = canvas.getContext('webgl', { antialias: true }); if (!gl) { errorBox.textContent = 'Este navegador no ha podido activar WebGL.'; errorBox.classList.remove('hidden'); return false; }
    const vertexSource = `attribute vec3 aPosition; attribute vec3 aColor; uniform mat4 uMvp; varying vec3 vColor; void main(){gl_Position=uMvp*vec4(aPosition,1.0);vColor=aColor;}`;
    const fragmentSource = `precision mediump float; varying vec3 vColor; uniform float uAlpha; void main(){gl_FragColor=vec4(vColor,uAlpha);}`;
    const compile = (type, source) => { const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader); return shader; }; const vs = compile(gl.VERTEX_SHADER, vertexSource); const fs = compile(gl.FRAGMENT_SHADER, fragmentSource);
    program = gl.createProgram(); gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program); gl.useProgram(program); buffers = makeGeometry(); gl.enable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); return true;
  }
  function makeGeometry() { const cube = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]]; const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]]; const lines = edges.flatMap(([a,b]) => [...cube[a], ...cube[b]]); const colors = new Array(lines.length).fill(0).map((_, i) => i%3===0 ? 1 : 1); const solid = [0,1,2,0,2,3,4,6,5,4,7,6,0,4,5,0,5,1,3,2,6,3,6,7,1,5,6,1,6,2,0,3,7,0,7,4]; const positions = solid.flatMap((index) => cube[index]); return { wire: buffer(lines), solid: buffer(positions), colors: buffer(colors), cube }; }
  function buffer(data) { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW); return b; }
  function draw(model) { if (!gl) return; resizeCanvas(); gl.viewport(0, 0, canvas.width, canvas.height); gl.clearColor(.035, .055, .08, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); const view = mat4.create(); const projection = mat4.create(); const mvp = mat4.create(); const camera = state.camera; const eye = [Math.cos(camera.pitch)*Math.sin(camera.yaw)*camera.distance, Math.sin(camera.pitch)*camera.distance, Math.cos(camera.pitch)*Math.cos(camera.yaw)*camera.distance]; mat4.lookAt(view, eye, [0,0,0], [0,1,0]); mat4.perspective(projection, Math.PI/4, canvas.width/canvas.height, .1, 100); mat4.multiply(mvp, projection, view); drawGrid(mvp); drawAxes(mvp); drawArray(buffers.wire, 24, mvp, .22, true, [.55,.65,.75]); mat4.multiply(mvp, mvp, model); drawCube(mvp); }
  function drawGrid(mvp) { const points=[]; for(let i=-5;i<=5;i++){points.push(-5,0,i,5,0,i,i,0,-5,i,0,5)}; drawLines(points, mvp, 0.35, [.3,.4,.5]); }
  function drawAxes(mvp) { drawLines([-5,0,0,5,0,0],mvp,.9,[1,.25,.25]); drawLines([0,-.01,0,0,5,0],mvp,.9,[.35,1,.45]); drawLines([0,0,-5,0,0,5],mvp,.9,[.35,.55,1]); }
  function drawLines(points, mvp, alpha, color) { const b=buffer(points); drawArray(b, points.length/3, mvp, alpha, true, color); gl.deleteBuffer(b); }
  function drawCube(mvp) { drawArray(buffers.wire, 24, mvp, .85, true, [.45,.8,1]); drawArray(buffers.solid, 36, mvp, .28, false, [.4,.7,.85]); }
  function drawArray(bufferObject, count, mvp, alpha, lines, colorValue) { gl.useProgram(program); const position=gl.getAttribLocation(program,'aPosition'); const matrix=gl.getUniformLocation(program,'uMvp'); const color=gl.getAttribLocation(program,'aColor'); gl.bindBuffer(gl.ARRAY_BUFFER,bufferObject); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position,3,gl.FLOAT,false,0,0); gl.disableVertexAttribArray(color); const chosen=colorValue || [.35,.75,.85]; gl.vertexAttrib3f(color, chosen[0], chosen[1], chosen[2]); gl.uniformMatrix4fv(matrix,false,mvp); gl.uniform1f(gl.getUniformLocation(program,'uAlpha'),alpha); gl.drawArrays(lines?gl.LINES:gl.TRIANGLES,0,count); }
  function resizeCanvas() { const rect=canvas.getBoundingClientRect(), ratio=window.devicePixelRatio||1; const width=Math.floor(rect.width*ratio),height=Math.floor(rect.height*ratio); if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;} }
  function attachInteractions() { document.querySelector('#reset-button').addEventListener('click', reset); document.querySelectorAll('.preset').forEach((button)=>button.addEventListener('click',()=>preset(button.dataset.preset))); document.querySelector('#order-select').addEventListener('change',(event)=>{state.order=event.target.value;update();}); canvas.addEventListener('pointerdown',(event)=>{canvas.setPointerCapture(event.pointerId);drag={x:event.clientX,y:event.clientY};}); canvas.addEventListener('pointermove',(event)=>{if(!drag)return;state.camera.yaw+=(event.clientX-drag.x)*.01;state.camera.pitch=Math.max(-1.3,Math.min(1.3,state.camera.pitch+(event.clientY-drag.y)*.01));drag={x:event.clientX,y:event.clientY};draw(matrixFor(state.order));}); canvas.addEventListener('pointerup',()=>{drag=null;}); canvas.addEventListener('wheel',(event)=>{event.preventDefault();state.camera.distance=Math.max(3,Math.min(14,state.camera.distance+event.deltaY*.01));draw(matrixFor(state.order));},{passive:false}); window.addEventListener('resize',()=>draw(matrixFor(state.order))); }
  function executeCode() { const source = document.querySelector('#code-input').value; const status = document.querySelector('#code-status'); const parsed = []; try { source.split('\n').forEach((line, lineIndex) => { const clean = line.replace(/\/\/.*$/, '').trim(); if (!clean) return; const match = clean.match(/^mat4\.(translate|scale|rotateX|rotateY|rotateZ)\s*\(\s*M\s*,\s*M\s*,\s*\[([^\]]+)\]\s*\)\s*;?$/); if (!match) throw new Error(`Línea ${lineIndex + 1}: usa mat4.translate/scale/rotateX/Y/Z con M, M y un vector.`); const values = match[2].split(',').map((item) => Number(item.trim())); if (values.some((value) => Number.isNaN(value))) throw new Error(`Línea ${lineIndex + 1}: hay un número no válido.`); parsed.push({ operation: match[1], values }); }); if (!parsed.length) throw new Error('Escribe al menos una llamada mat4.'); const next = { translation: [0,0,0], rotation: [0,0,0], scale: [1,1,1] }; const order = []; parsed.forEach(({ operation, values }) => { if (operation === 'translate') { next.translation = values; order.push('T'); } else if (operation === 'scale') { next.scale = values; order.push('S'); } else { next.rotation['XYZ'.indexOf(operation.slice(-1))] = values[0] * 180 / Math.PI; if (!order.includes('R')) order.push('R'); } }); Object.assign(state, next, { order: order.join('') || 'TRS' }); document.querySelector('#order-select').value = state.order; status.textContent = `✓ ${parsed.length} llamadas aplicadas. Orden detectado: ${state.order}.`; status.classList.remove('error'); update(); } catch (error) { status.textContent = `✕ ${error.message}`; status.classList.add('error'); } }
  function attachCodeLab() { document.querySelector('#run-code').addEventListener('click', executeCode); document.querySelector('#code-example').addEventListener('click', () => { document.querySelector('#code-input').value = 'mat4.scale(M, M, [1.7, 0.65, 1.15]);\nmat4.rotateZ(M, M, [-0.44]);\nmat4.translate(M, M, [0.8, 0.0, 0.0]);'; executeCode(); }); }
  makeSliders(); attachInteractions(); attachCodeLab(); if (mat4 && initWebgl()) update(); else { errorBox.textContent='No se ha cargado glMatrix. Comprueba tu conexión y recarga.'; errorBox.classList.remove('hidden'); }
})();
