(function () {
  'use strict';
  const { text, lesson } = window.LabI18n;
  const find = (selector) => document.querySelector(selector);
  const canvas = find('#gl-canvas');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  } catch {
    find('#webgl-error').textContent = text('webglError');
    find('#webgl-error').classList.remove('hidden');
    return;
  }
  const initialJoints = { platform: 25, boom: 25, stick: -40, bucket: -20, mesh: 0 };
  const limits = { platform: [-180, 180], boom: [-15, 80], stick: [-120, 20], bucket: [-100, 60], mesh: [-180, 180] };
  const state = {
    mode: 'excavator', selected: 'platform', joints: { ...initialJoints }, animate: false, orbit: false, multi: false,
    time: 0, yaw: .75, pitch: .4, distance: 10, divisions: 16, rows: 4, wire: false, normals: false, flat: false,
    translation: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], order: 'TRS', codeMatrix: null, codeCalls: [],
    concept: 0, experiment: null, codeMessage: null
  };
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1119);
  scene.add(new THREE.HemisphereLight(0xbad8ff, 0x273041, 2.2));
  const light = new THREE.DirectionalLight(0xffffff, 2.5);
  light.position.set(5, 9, 6);
  scene.add(light);
  const grid = new THREE.GridHelper(14, 28, 0x456074, 0x263746);
  grid.position.y = -.26;
  scene.add(grid, new THREE.AxesHelper(3));
  const camera = new THREE.PerspectiveCamera(45, 1, .1, 150);
  const cameras = [camera, new THREE.OrthographicCamera(), new THREE.OrthographicCamera(), new THREE.OrthographicCamera()];
  const root = new THREE.Group();
  root.position.x = .5;
  scene.add(root);
  const joints = {};
  const selectable = [];
  const orange = new THREE.MeshStandardMaterial({ color: 0xe89024, roughness: .7 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x3d9bb8, roughness: .7, side: THREE.DoubleSide });
  const highlight = new THREE.MeshStandardMaterial({ color: 0xffcb29, roughness: .7, side: THREE.DoubleSide });
  const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
  function block(parent, piece, size, position) {
    const mesh = new THREE.Mesh(cubeGeometry, orange);
    mesh.scale.set(...size);
    mesh.position.set(...position);
    mesh.userData.piece = piece;
    parent.add(mesh);
    selectable.push(mesh);
  }
  function joint(parent, name, position) {
    const group = new THREE.Group();
    group.position.set(...position);
    parent.add(group);
    joints[name] = group;
    return group;
  }
  block(root, 'platform', [1.8, .5, 1.4], [0, 0, 0]);
  const platform = joint(root, 'platform', [0, .5, 0]);
  block(platform, 'platform', [1.2, .5, 1], [0, 0, 0]);
  const boom = joint(platform, 'boom', [0, .3, 0]);
  block(boom, 'boom', [2, .25, .3], [1, 0, 0]);
  const stick = joint(boom, 'stick', [2, 0, 0]);
  block(stick, 'stick', [1.6, .22, .25], [.8, 0, 0]);
  const bucket = joint(stick, 'bucket', [1.6, 0, 0]);
  block(bucket, 'bucket', [.7, .6, .7], [.35, -.2, 0]);
  const meshGroup = new THREE.Group();
  meshGroup.position.x = -3;
  scene.add(meshGroup);
  const cylinder = new THREE.Mesh(new THREE.BufferGeometry(), blue);
  cylinder.userData.piece = 'mesh';
  meshGroup.add(cylinder);
  selectable.push(cylinder);
  const wire = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x09242a }));
  const normalLines = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffe665 }));
  meshGroup.add(wire, normalLines);
  const transformCube = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), blue);
  transformCube.matrixAutoUpdate = false;
  scene.add(transformCube);
  let indexedGeometry;
  function rebuildMesh() {
    const positions = [], normals = [], indices = [];
    for (let row = 0; row <= state.rows; row++) {
      for (let column = 0; column < state.divisions; column++) {
        const angle = 2 * Math.PI * column / state.divisions;
        positions.push(.7 * Math.cos(angle), 2 * row / state.rows, .7 * Math.sin(angle));
        normals.push(Math.cos(angle), 0, Math.sin(angle));
      }
    }
    for (let row = 0; row < state.rows; row++) {
      for (let column = 0; column < state.divisions; column++) {
        const first = row * state.divisions + column;
        const next = row * state.divisions + (column + 1) % state.divisions;
        const above = first + state.divisions, nextAbove = next + state.divisions;
        indices.push(first, above, next, next, above, nextAbove);
      }
    }
    cylinder.geometry.dispose();
    if (indexedGeometry && indexedGeometry !== cylinder.geometry) indexedGeometry.dispose();
    indexedGeometry = new THREE.BufferGeometry();
    indexedGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    indexedGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    indexedGeometry.setIndex(indices);
    cylinder.geometry = state.flat ? indexedGeometry.toNonIndexed() : indexedGeometry;
    if (state.flat) cylinder.geometry.computeVertexNormals();
    wire.geometry.dispose();
    wire.geometry = new THREE.WireframeGeometry(indexedGeometry);
    const normalPositions = [];
    const attributes = cylinder.geometry.attributes;
    const stride = Math.max(1, Math.ceil(attributes.position.count / 240));
    for (let index = 0; index < attributes.position.count; index += stride) {
      const position = new THREE.Vector3().fromBufferAttribute(attributes.position, index);
      const normal = new THREE.Vector3().fromBufferAttribute(attributes.normal, index).multiplyScalar(.22);
      normalPositions.push(...position.toArray(), ...position.clone().add(normal).toArray());
    }
    normalLines.geometry.dispose();
    normalLines.geometry = new THREE.BufferGeometry();
    normalLines.geometry.setAttribute('position', new THREE.Float32BufferAttribute(normalPositions, 3));
  }
  function componentMatrices() {
    return {
      T: new THREE.Matrix4().makeTranslation(...state.translation),
      R: new THREE.Matrix4().makeRotationX(THREE.MathUtils.degToRad(state.rotation[0]))
        .multiply(new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(state.rotation[1])))
        .multiply(new THREE.Matrix4().makeRotationZ(THREE.MathUtils.degToRad(state.rotation[2]))),
      S: new THREE.Matrix4().makeScale(...state.scale)
    };
  }
  function modelMatrix() {
    if (state.codeMatrix) return state.codeMatrix;
    const components = componentMatrices();
    return state.order.split('').reduce((matrix, operation) => matrix.multiply(components[operation]), new THREE.Matrix4());
  }
  function applyState() {
    root.visible = meshGroup.visible = state.mode === 'excavator';
    transformCube.visible = state.mode === 'cube';
    platform.rotation.y = THREE.MathUtils.degToRad(state.joints.platform);
    boom.rotation.z = THREE.MathUtils.degToRad(state.joints.boom);
    stick.rotation.z = THREE.MathUtils.degToRad(state.joints.stick);
    bucket.rotation.z = THREE.MathUtils.degToRad(state.joints.bucket);
    meshGroup.rotation.y = THREE.MathUtils.degToRad(state.joints.mesh);
    selectable.forEach((mesh) => { mesh.material = mesh.userData.piece === state.selected ? highlight : mesh === cylinder ? blue : orange; });
    wire.visible = state.wire;
    normalLines.visible = state.normals;
    transformCube.matrix.copy(modelMatrix());
    scene.updateMatrixWorld(true);
  }
  let width = 1, height = 1, dockHeight = 0;
  function viewports() {
    const sceneHeight = Math.max(1, height - dockHeight);
    const topSpace = width <= 700 ? Math.min(310, Math.floor(sceneHeight * .6)) : 0;
    const availableHeight = Math.max(1, sceneHeight - topSpace);
    if (!state.multi) return [{ x: 0, y: dockHeight, width, height: availableHeight, index: 0 }];
    const leftWidth = Math.floor(width / 2), bottomHeight = Math.floor(availableHeight / 2);
    return [
      { x: 0, y: dockHeight + bottomHeight, width: leftWidth, height: availableHeight - bottomHeight, index: 0 },
      { x: leftWidth, y: dockHeight + bottomHeight, width: width - leftWidth, height: availableHeight - bottomHeight, index: 1 },
      { x: 0, y: dockHeight, width: leftWidth, height: bottomHeight, index: 2 },
      { x: leftWidth, y: dockHeight, width: width - leftWidth, height: bottomHeight, index: 3 }
    ];
  }
  function updateCameras() {
    viewports().forEach((viewport) => {
      const viewCamera = cameras[viewport.index], aspect = viewport.width / Math.max(1, viewport.height);
      if (viewport.index === 0) {
        viewCamera.aspect = aspect;
        const distance = state.distance / Math.min(1, aspect);
        viewCamera.position.set(Math.cos(state.pitch) * Math.sin(state.yaw) * distance, Math.sin(state.pitch) * distance + 1, Math.cos(state.pitch) * Math.cos(state.yaw) * distance);
        viewCamera.up.set(0, 1, 0);
      } else {
        const span = 4.5 / Math.min(1, aspect);
        Object.assign(viewCamera, { left: -span * aspect, right: span * aspect, top: span, bottom: -span, near: .1, far: 100 });
        const positions = [[0, 18, 0], [0, 1, 18], [18, 1, 0]];
        viewCamera.position.set(...positions[viewport.index - 1]);
        viewCamera.up.set(0, viewport.index === 1 ? 0 : 1, viewport.index === 1 ? -1 : 0);
      }
      viewCamera.lookAt(0, 1, 0);
      viewCamera.updateProjectionMatrix();
      viewCamera.updateMatrixWorld(true);
    });
  }
  function render() {
    applyState();
    updateCameras();
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, width, height);
    renderer.clear();
    renderer.setScissorTest(true);
    viewports().forEach((viewport) => {
      renderer.setViewport(viewport.x, viewport.y, viewport.width, viewport.height);
      renderer.setScissor(viewport.x, viewport.y, viewport.width, viewport.height);
      renderer.render(scene, cameras[viewport.index]);
    });
    renderer.setScissorTest(false);
    syncUI();
  }
  function resize() {
    width = canvas.clientWidth; height = canvas.clientHeight;
    dockHeight = find('#controls-panel').classList.contains('hidden') ? 0 : Math.ceil(find('#controls-panel').getBoundingClientRect().height + 20);
    document.documentElement.style.setProperty('--dock-height', `${dockHeight}px`);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    render();
  }
  function syncUI() {
    const range = limits[state.selected] || [-180, 180], angle = state.joints[state.selected] || 0;
    find('#joint-slider').min = range[0]; find('#joint-slider').max = range[1]; find('#joint-slider').value = angle;
    find('#joint-slider').disabled = !state.selected || state.mode !== 'excavator';
    find('#joint-value').textContent = `${angle.toFixed(0)}°`;
    find('#selection-status').textContent = state.selected ? text('selected', { name: text(state.selected), angle: angle.toFixed(0), min: range[0], max: range[1] }) : text('noSelection');
    document.querySelectorAll('[data-piece]').forEach((button) => { button.classList.toggle('active', button.dataset.piece === state.selected); button.setAttribute('aria-pressed', String(button.dataset.piece === state.selected)); });
    find('#mesh-u').value = state.divisions; find('#mesh-u-value').value = state.divisions;
    find('#mesh-v').value = state.rows; find('#mesh-v-value').value = state.rows;
    find('#wireframe').checked = state.wire; find('#normals').checked = state.normals; find('#flat-shading').checked = state.flat;
    find('#mesh-stats').textContent = text('meshStats', { vertices: state.divisions * (state.rows + 1), triangles: 2 * state.divisions * state.rows, indices: 6 * state.divisions * state.rows });
    find('#animate-button').textContent = text(state.animate ? 'pause' : 'animate');
    find('#orbit-button').textContent = text(state.orbit ? 'stopOrbit' : 'orbit');
    find('#views-button').textContent = text(state.multi ? 'oneView' : 'fourViews');
    ['animate', 'orbit', 'views'].forEach((name) => find(`#${name}-button`).setAttribute('aria-pressed', String(state[name === 'views' ? 'multi' : name])));
    find('#mode-excavator').classList.toggle('active', state.mode === 'excavator');
    find('#mode-cube').classList.toggle('active', state.mode === 'cube');
    const controlsHidden = find('#controls-panel').classList.contains('hidden');
    find('#controls-toggle').textContent = text(controlsHidden ? 'showControls' : 'hideControls');
    find('#controls-toggle').setAttribute('aria-expanded', String(!controlsHidden));
    find('#fullscreen-button').textContent = text(document.fullscreenElement ? 'exitFullscreen' : 'fullscreen');
    const matrix = modelMatrix(), point = new THREE.Vector3(1, 1, 1).applyMatrix4(matrix);
    find('#matrix-result').textContent = [0, 1, 2, 3].map((row) => `[ ${[0, 1, 2, 3].map((column) => matrix.elements[column * 4 + row].toFixed(2).padStart(6)).join(' ')} ]`).join('\n');
    const calls = state.codeMatrix ? state.codeCalls : state.order.split('');
    find('#effective-order').textContent = text('calls', { calls: calls.join(' → '), effective: [...calls].reverse().join(' → ') });
    find('#vertex-result').textContent = text('vertex', { point: point.toArray().map((value) => value.toFixed(2)).join(', ') });
    if (state.codeMessage) find('#code-status').textContent = text(state.codeMessage.key, state.codeMessage.values);
    updateExperiment();
  }
  function selectPiece(name, source = 'button') {
    state.selected = name;
    if (source === 'canvas' && state.experiment?.index === 2) {
      if (name) state.experiment.pieces.add(name);
      else if (state.experiment.pieces.size >= 2) state.experiment.completed = true;
    }
    render();
  }
  function moveJoint(value, absolute = false) {
    if (!state.selected || state.mode !== 'excavator') return;
    state.animate = false;
    const previous = state.joints[state.selected], range = limits[state.selected];
    const target = absolute ? value : previous + value;
    state.joints[state.selected] = THREE.MathUtils.clamp(target, ...range);
    if (state.experiment?.index === 3 && state.selected === 'boom' && previous === 80 && target > 80) state.experiment.completed = true;
    render();
  }
  function showGuide(index = state.concept) {
    state.concept = index;
    find('#guide-modal').classList.remove('hidden');
    const content = lesson(index);
    find('#guide-step-label').textContent = text('step', { index: index + 1 });
    find('#guide-title').textContent = content.title; find('#guide-body').textContent = content.body;
    find('#guide-visual').textContent = content.diagram; find('#exercise-task').textContent = content.task;
    find('#guide-next').textContent = text(index === 4 ? 'close' : 'next');
    document.querySelectorAll('[data-concept]').forEach((button) => {
      const active = Number(button.dataset.concept) === index;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
    });
    updateExperiment();
  }
  function prepareExperiment() {
    state.mode = 'excavator'; state.animate = false; state.orbit = false; state.multi = false;
    state.joints = { ...initialJoints };
    state.experiment = { index: state.concept, completed: false, baseline: { ...state.joints }, pieces: new Set(), played: false, paused: false };
    state.selected = ['mesh', 'platform', null, 'boom', 'platform'][state.concept];
    if (state.concept === 0) { state.divisions = 16; state.rows = 4; state.wire = false; state.normals = false; rebuildMesh(); }
    find('#controls-panel').classList.remove('hidden');
    resize();
  }
  function updateExperiment() {
    const experiment = state.experiment;
    if (!experiment || experiment.index !== state.concept) { find('#exercise-status').textContent = text('pending'); return; }
    if (experiment.index === 0 && state.divisions === 40 && state.rows === 4 && state.wire && state.normals) experiment.completed = true;
    if (experiment.index === 1 && Math.abs(state.joints.platform - experiment.baseline.platform) >= 15 && Math.abs(state.joints.bucket - experiment.baseline.bucket) >= 15) experiment.completed = true;
    if (experiment.index === 4 && experiment.played && experiment.paused && state.multi) experiment.completed = true;
    find('#exercise-status').textContent = experiment.completed ? text('passed', { result: lesson(state.concept).result }) : text('progress', { task: lesson(state.concept).task });
  }
  function toggleAnimation() {
    state.animate = !state.animate;
    if (state.animate) state.mode = 'excavator';
    if (state.experiment?.index === 4) {
      if (state.animate) state.experiment.played = true;
      else if (state.experiment.played) state.experiment.paused = true;
    }
    render();
  }
  function updateViewLabels() {
    find('#view-labels').replaceChildren();
    if (!state.multi) return;
    viewports().forEach((viewport) => {
      const label = document.createElement('span');
      label.textContent = text(['perspective', 'top', 'front', 'side'][viewport.index]);
      label.style.left = `${viewport.x + 8}px`;
      label.style.top = `${height - viewport.y - viewport.height + 65}px`;
      find('#view-labels').append(label);
    });
  }
  function toggleViews() { state.multi = !state.multi; render(); updateViewLabels(); }
  function makeTransformSliders() {
    const container = find('#transform-sliders');
    container.replaceChildren();
    ['translation', 'rotation', 'scale'].forEach((kind) => {
      const label = document.createElement('h3'); label.textContent = text(kind); container.append(label);
      ['X', 'Y', 'Z'].forEach((axis, index) => {
        const row = document.createElement('label'); row.className = 'transform-row';
        const name = document.createElement('span'); name.textContent = axis;
        const input = document.createElement('input'); input.type = 'range'; input.dataset.transform = `${kind}-${index}`;
        input.min = kind === 'scale' ? .2 : kind === 'rotation' ? -180 : -3;
        input.max = kind === 'scale' ? 2.5 : kind === 'rotation' ? 180 : 3;
        input.step = kind === 'rotation' ? 1 : .05; input.value = state[kind][index];
        input.setAttribute('aria-label', `${text(kind)} ${axis}`);
        const output = document.createElement('output'); output.textContent = state[kind][index].toFixed(2);
        input.addEventListener('input', () => {
          state[kind][index] = Number(input.value); output.textContent = Number(input.value).toFixed(2);
          state.codeMatrix = null; state.codeMessage = null; find('#code-status').textContent = ''; state.mode = 'cube'; render();
        });
        row.append(name, input, output); container.append(row);
      });
    });
  }
  function executeCode() {
    const matrix = new THREE.Matrix4(), calls = [];
    try {
      find('#code-input').value.split('\n').forEach((line, index) => {
        const source = line.replace(/\/\/.*$/, '').trim(); if (!source) return;
        const match = source.match(/^mat4\.(translate|scale|rotateX|rotateY|rotateZ)\s*\(\s*M\s*,\s*M\s*,\s*(.*?)\s*\)\s*;?$/);
        if (!match) throw new Error(String(index + 1));
        const operation = match[1], argument = match[2];
        if (operation === 'translate' || operation === 'scale') {
          if (!/^\[[^\[\]]+\]$/.test(argument)) throw new Error(String(index + 1));
          const values = argument.slice(1, -1).split(',').map((value) => value.trim());
          if (values.length !== 3 || values.some((value) => !value || !Number.isFinite(Number(value)))) throw new Error(String(index + 1));
          matrix.multiply(operation === 'translate' ? new THREE.Matrix4().makeTranslation(...values.map(Number)) : new THREE.Matrix4().makeScale(...values.map(Number)));
          calls.push(operation === 'translate' ? 'T' : 'S');
        } else {
          const degrees = argument.match(/^glMatrix\.toRadian\(\s*([^()]+)\s*\)$/);
          const value = degrees ? THREE.MathUtils.degToRad(Number(degrees[1])) : Number(argument.replace(/^\[([^\[\]]+)\]$/, '$1'));
          if (!argument || !Number.isFinite(value)) throw new Error(String(index + 1));
          const rotation = new THREE.Matrix4(); rotation[`makeRotation${operation.slice(-1)}`](value); matrix.multiply(rotation); calls.push(`R${operation.slice(-1)}`);
        }
      });
      if (!calls.length) { state.codeMessage = { key: 'codeEmpty' }; syncUI(); return; }
      if (!matrix.elements.every(Number.isFinite)) throw new Error('1');
      state.codeMatrix = matrix; state.codeCalls = calls; state.mode = 'cube'; state.multi = false;
      state.codeMessage = { key: 'codeDone', values: { count: calls.length } }; render(); updateViewLabels();
    } catch (error) {
      state.codeMessage = { key: 'codeError', values: { line: error.message } }; syncUI();
    }
  }
  function reset() {
    Object.assign(state, { joints: { ...initialJoints }, animate: false, orbit: false, multi: false, time: 0, selected: 'platform', translation: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], order: 'TRS', codeMatrix: null, codeCalls: [], codeMessage: null, experiment: null, divisions: 16, rows: 4, wire: false, normals: false, flat: false });
    find('#order-select').value = 'TRS'; find('#code-status').textContent = '';
    rebuildMesh(); makeTransformSliders(); render(); updateViewLabels();
  }
  document.querySelectorAll('[data-concept]').forEach((button) => button.addEventListener('click', () => showGuide(Number(button.dataset.concept))));
  document.querySelectorAll('[data-piece]').forEach((button) => button.addEventListener('click', () => { state.mode = 'excavator'; selectPiece(button.dataset.piece); }));
  find('#guide-button').addEventListener('click', () => showGuide());
  find('#guide-close').addEventListener('click', () => find('#guide-modal').classList.add('hidden'));
  find('#guide-next').addEventListener('click', () => state.concept === 4 ? find('#guide-modal').classList.add('hidden') : showGuide(state.concept + 1));
  find('#guide-action').addEventListener('click', prepareExperiment);
  find('#controls-toggle').addEventListener('click', () => { find('#controls-panel').classList.toggle('hidden'); resize(); updateViewLabels(); });
  find('#joint-slider').addEventListener('input', (event) => moveJoint(Number(event.target.value), true));
  find('#joint-minus').addEventListener('click', () => moveJoint(-3)); find('#joint-plus').addEventListener('click', () => moveJoint(3));
  ['mesh-u', 'mesh-v'].forEach((name) => find(`#${name}`).addEventListener('input', (event) => { state.mode = 'excavator'; state[name === 'mesh-u' ? 'divisions' : 'rows'] = Number(event.target.value); rebuildMesh(); render(); }));
  ['wireframe', 'normals', 'flat-shading'].forEach((name) => find(`#${name}`).addEventListener('change', (event) => { state.mode = 'excavator'; state[name === 'wireframe' ? 'wire' : name === 'normals' ? 'normals' : 'flat'] = event.target.checked; if (name === 'flat-shading') rebuildMesh(); render(); }));
  find('#animate-button').addEventListener('click', toggleAnimation);
  find('#orbit-button').addEventListener('click', () => { state.orbit = !state.orbit; render(); });
  find('#views-button').addEventListener('click', toggleViews);
  find('#reset-button').addEventListener('click', reset);
  find('#mode-excavator').addEventListener('click', () => { state.mode = 'excavator'; render(); });
  find('#mode-cube').addEventListener('click', () => { state.mode = 'cube'; find('#transform-details').open = true; render(); });
  find('#order-select').addEventListener('change', (event) => { state.order = event.target.value; state.codeMatrix = null; state.mode = 'cube'; render(); });
  find('#run-code').addEventListener('click', executeCode);
  find('#language-select').addEventListener('change', (event) => {
    const guideHidden = find('#guide-modal').classList.contains('hidden');
    window.LabI18n.setLanguage(event.target.value); makeTransformSliders(); showGuide();
    find('#guide-modal').classList.toggle('hidden', guideHidden); render(); updateViewLabels();
  });
  find('#fullscreen-button').addEventListener('click', async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen(); }
    catch { state.codeMessage = { key: 'fullscreenError' }; syncUI(); }
  });
  document.addEventListener('fullscreenchange', resize);
  const raycaster = new THREE.Raycaster();
  function pick(event) {
    const rectangle = canvas.getBoundingClientRect(), pixelX = event.clientX - rectangle.left, pixelY = height - (event.clientY - rectangle.top);
    const viewport = viewports().find((view) => pixelX >= view.x && pixelX < view.x + view.width && pixelY >= view.y && pixelY < view.y + view.height);
    if (!viewport || state.mode !== 'excavator') return;
    raycaster.setFromCamera(new THREE.Vector2(2 * (pixelX - viewport.x) / viewport.width - 1, 2 * (pixelY - viewport.y) / viewport.height - 1), cameras[viewport.index]);
    const hit = raycaster.intersectObjects(selectable, false)[0];
    selectPiece(hit ? hit.object.userData.piece : null, 'canvas');
  }
  let drag = null;
  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    canvas.setPointerCapture(event.pointerId);
    const orbiting = event.shiftKey || state.mode === 'cube';
    if (!orbiting) pick(event);
    drag = { x: event.clientX, y: event.clientY, orbiting };
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const deltaX = event.clientX - drag.x, deltaY = event.clientY - drag.y;
    if (drag.orbiting) { state.yaw -= deltaX * .01; state.pitch = THREE.MathUtils.clamp(state.pitch + deltaY * .01, -.9, 1.2); render(); }
    else if (deltaX) moveJoint(deltaX * .4);
    drag.x = event.clientX; drag.y = event.clientY;
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((name) => canvas.addEventListener(name, () => { drag = null; }));
  canvas.addEventListener('wheel', (event) => { event.preventDefault(); state.distance = THREE.MathUtils.clamp(state.distance + event.deltaY * .01, 4, 22); render(); }, { passive: false });
  window.addEventListener('keydown', (event) => {
    if (event.target.closest('input,textarea,select,button,summary')) return;
    if (event.key >= '1' && event.key <= '5') selectPiece(['platform', 'boom', 'stick', 'bucket', 'mesh'][Number(event.key) - 1]);
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); moveJoint(event.key === 'ArrowLeft' ? -3 : 3); }
    if (event.key.toLowerCase() === 'a') toggleAnimation();
    if (event.key.toLowerCase() === 'v') toggleViews();
    if (event.key === 'Escape') find('#guide-modal').classList.add('hidden');
  });
  window.addEventListener('resize', () => { resize(); updateViewLabels(); });
  new ResizeObserver(() => { resize(); updateViewLabels(); }).observe(find('#controls-panel'));
  let previousTime = null;
  function frame(timestamp) {
    const delta = previousTime === null ? 0 : Math.min((timestamp - previousTime) / 1000, .1);
    previousTime = timestamp;
    if (state.animate) {
      state.time += delta;
      state.joints.platform = (state.joints.platform + delta * 15 + 180) % 360 - 180;
      state.joints.boom = 30 + 20 * Math.sin(state.time);
      state.joints.stick = -50 + 25 * Math.sin(state.time + .8);
      state.joints.bucket = -20 + 30 * Math.sin(state.time + 1.6);
      state.joints.mesh = (state.joints.mesh + delta * 20 + 180) % 360 - 180;
    }
    if (state.orbit) state.yaw += delta * .35;
    if (state.animate || state.orbit) render();
    requestAnimationFrame(frame);
  }
  renderer.autoClear = false;
  rebuildMesh(); makeTransformSliders(); showGuide(0); resize(); requestAnimationFrame(frame);
})();
