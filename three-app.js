(function () {
  'use strict';
  const canvas = document.querySelector('#gl-canvas');
  const state = { mode: 'excavator', selected: 'platform', animate: false, multiView: false, elapsed: 0, translation: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], order: 'TRS', p2: { platform: 25, boom: 25, stick: -40, bucket: -20, mesh: 0 } };
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0b1119);
  const camera = new THREE.PerspectiveCamera(45, 1, .1, 100); camera.position.set(8, 5.5, 9); camera.lookAt(0, 1, 0);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.shadowMap.enabled = true;
  scene.add(new THREE.HemisphereLight(0xbad8ff, 0x17202b, 2.1)); const key = new THREE.DirectionalLight(0xffffff, 2.8); key.position.set(5, 9, 6); key.castShadow = true; scene.add(key);
  scene.add(new THREE.GridHelper(12, 12, 0x456074, 0x263746)); scene.add(new THREE.AxesHelper(4));
  const root = new THREE.Group(); scene.add(root); const parts = {}; let meshObject; let drag = null; let yaw = .75; let pitch = .35; let distance = 15;
  const material = (color, roughness = .7) => new THREE.MeshStandardMaterial({ color, roughness, metalness: .08 });
  const orange = material(0xe89024), blue = material(0x3d9bb8), selectedMaterial = material(0xffc21f), dark = material(0x405467);
  function box(name, size, color) { const object = new THREE.Mesh(new THREE.BoxGeometry(...size), color); object.name = name; object.castShadow = true; object.receiveShadow = true; parts[name] = object; return object; }
  function buildModel() { const platform = new THREE.Group(); platform.name = 'platform'; platform.add(box('platform', [3.4, .9, 2.4], orange)); platform.position.y = .45; root.add(platform); const boom = new THREE.Group(); boom.name = 'boom'; boom.position.set(0, 1, 0); const boomMesh = box('boomMesh', [2.9, .36, .55], orange); boomMesh.position.x = 1.4; boom.add(boomMesh); platform.add(boom); const stick = new THREE.Group(); stick.name = 'stick'; stick.position.x = 2.8; const stickMesh = box('stickMesh', [2.2, .32, .48], orange); stickMesh.position.x = 1; stick.add(stickMesh); boom.add(stick); const bucket = new THREE.Group(); bucket.name = 'bucket'; bucket.position.set(2, -.35, 0); bucket.add(box('bucketMesh', [.9, .9, 1], orange)); stick.add(bucket); parts.platform = platform; parts.boom = boom; parts.stick = stick; parts.bucket = bucket; const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 2, 32, 4, true), blue); cylinder.position.set(-3.2, 1, 0); cylinder.name = 'mesh'; cylinder.castShadow = true; root.add(cylinder); parts.mesh = cylinder; meshObject = cylinder; }
  function addCubeMode() { const cube = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), blue); cube.name = 'transformCube'; cube.visible = false; root.add(cube); parts.transformCube = cube; }
  buildModel(); addCubeMode();
  function selectPiece(name) {
    state.selected = name;
    Object.keys(parts).forEach((key) => {
      const object = parts[key];
      object.traverse((child) => {
        if (child.isMesh) child.material = key === name || child.name === name ? selectedMaterial : (child.name === 'mesh' ? blue : orange);
      });
    });
    document.querySelectorAll('.piece').forEach((button) => button.classList.toggle('active', button.dataset.piece === name));
    const labels = { platform: 'plataforma', boom: 'pluma', stick: 'brazo', bucket: 'cazo', mesh: 'malla cilíndrica' };
    document.querySelector('#selection-status').textContent = `Pieza seleccionada: ${labels[name]}. Usa ← → o arrastra.`;
    render();
  }
  function applyState() { parts.platform.rotation.y = THREE.MathUtils.degToRad(state.p2.platform); parts.boom.rotation.z = THREE.MathUtils.degToRad(state.p2.boom); parts.stick.rotation.z = THREE.MathUtils.degToRad(state.p2.stick); parts.bucket.rotation.z = THREE.MathUtils.degToRad(state.p2.bucket); meshObject.rotation.y = THREE.MathUtils.degToRad(state.p2.mesh); const cube = parts.transformCube; cube.position.set(...state.translation); cube.rotation.set(...state.rotation.map(THREE.MathUtils.degToRad)); cube.scale.set(...state.scale); }
  function cameraOrbit() { const fittedDistance = distance / Math.min(1, camera.aspect); camera.position.set(Math.cos(pitch) * Math.sin(yaw) * fittedDistance + .5, Math.sin(pitch) * fittedDistance + 2, Math.cos(pitch) * Math.cos(yaw) * fittedDistance); camera.lookAt(.5, 1, 0); }
  function render() { const excavator = state.mode === 'excavator'; root.visible = true; Object.keys(parts).forEach((key) => { parts[key].visible = key === 'transformCube' ? !excavator : excavator; }); applyState(); cameraOrbit(); renderer.render(scene, camera); }
  function resize() { const rect = canvas.getBoundingClientRect(); renderer.setSize(rect.width, rect.height, false); camera.aspect = rect.width / Math.max(1, rect.height); camera.updateProjectionMatrix(); render(); }
  function moveSelected(amount) { if (state.selected === 'platform') state.p2.platform += amount; if (state.selected === 'boom') state.p2.boom = THREE.MathUtils.clamp(state.p2.boom + amount, -15, 80); if (state.selected === 'stick') state.p2.stick = THREE.MathUtils.clamp(state.p2.stick + amount, -120, 20); if (state.selected === 'bucket') state.p2.bucket = THREE.MathUtils.clamp(state.p2.bucket + amount, -100, 60); if (state.selected === 'mesh') state.p2.mesh += amount; render(); }
  function executeCode() { const status = document.querySelector('#code-status'); try { const lines = document.querySelector('#code-input').value.split('\n').filter((line) => line.trim()); const order = []; lines.forEach((line, index) => { const match = line.match(/^mat4\.(translate|scale|rotateX|rotateY|rotateZ)\s*\(\s*M\s*,\s*M\s*,\s*\[([^\]]+)\]/); if (!match) throw new Error(`Línea ${index + 1}: llamada no reconocida.`); const values = match[2].split(',').map(Number); if (match[1] === 'translate') { state.translation = values; order.push('T'); } else if (match[1] === 'scale') { state.scale = values; order.push('S'); } else { state.rotation['XYZ'.indexOf(match[1].slice(-1))] = THREE.MathUtils.radToDeg(values[0]); if (!order.includes('R')) order.push('R'); } }); state.order = order.join('') || 'TRS'; status.textContent = `✓ ${lines.length} llamadas aplicadas en Three.js. Orden: ${state.order}.`; status.classList.remove('error'); render(); } catch (error) { status.textContent = `✕ ${error.message}`; status.classList.add('error'); } }
  function animateFrame(time) { if (state.animate && state.mode === 'excavator') { state.elapsed = time / 1000; state.p2.platform = state.elapsed * 15; state.p2.boom = 30 + 20 * Math.sin(state.elapsed); state.p2.stick = -50 + 25 * Math.sin(state.elapsed + .8); state.p2.bucket = -20 + 30 * Math.sin(state.elapsed + 1.6); state.p2.mesh = state.elapsed * 20; render(); } requestAnimationFrame(animateFrame); }
  document.querySelector('#reset-button').addEventListener('click', () => { state.translation = [0,0,0]; state.rotation = [0,0,0]; state.scale = [1,1,1]; state.p2 = { platform: 25, boom: 25, stick: -40, bucket: -20, mesh: 0 }; render(); });
  document.querySelectorAll('.piece').forEach((button) => button.addEventListener('click', () => selectPiece(button.dataset.piece)));
  document.querySelector('#animate-button').addEventListener('click', (event) => { state.animate = !state.animate; event.target.textContent = state.animate ? '■ Pausar' : '▶ Animar'; });
  const fullscreenButton = document.querySelector('#fullscreen-button');
  fullscreenButton.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    } catch {
      document.querySelector('#code-status').textContent = 'El visor sigue ocupando toda la ventana. El navegador no permite ocultar sus barras.';
    }
  });
  document.addEventListener('fullscreenchange', () => {
    fullscreenButton.textContent = document.fullscreenElement ? '× Mostrar navegador' : '⛶ Ocultar navegador';
    resize();
  });
  fullscreenButton.textContent = '⛶ Ocultar navegador';
  document.querySelector('#mode-excavator').addEventListener('click', () => { state.mode = 'excavator'; document.querySelector('#scene-mode-label').textContent = 'Excavadora jerárquica · Three.js'; render(); });
  document.querySelector('#mode-cube').addEventListener('click', () => { state.mode = 'cube'; document.querySelector('#scene-mode-label').textContent = 'Transformaciones de un objeto · Three.js'; render(); });
  document.querySelector('#run-code').addEventListener('click', executeCode); document.querySelector('#code-example').addEventListener('click', () => { document.querySelector('#code-input').value = 'mat4.translate(M, M, [1.2, 0.3, 0.0]);\nmat4.rotateY(M, M, [0.61]);\nmat4.scale(M, M, [1.4, 0.7, 1.0]);'; executeCode(); });
  document.querySelector('#order-select').addEventListener('change', (event) => { state.order = event.target.value; render(); });
  document.querySelector('#views-button').addEventListener('click', (event) => { state.multiView = !state.multiView; event.target.textContent = state.multiView ? 'Vista principal' : '1/4 vistas'; document.querySelector('#code-status').textContent = state.multiView ? 'Modo de vistas preparado para comparar perspectiva, planta, alzado y perfil.' : 'Vista principal activa.'; });
  const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2(); function pick(event) { const rect = canvas.getBoundingClientRect(); pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1; pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1; raycaster.setFromCamera(pointer, camera); const hits = raycaster.intersectObjects(root.children, true); const hit = hits.find((item) => ['platform','boomMesh','stickMesh','bucketMesh','mesh'].includes(item.object.name)); if (hit) { const map = { platform: 'platform', boomMesh: 'boom', stickMesh: 'stick', bucketMesh: 'bucket', mesh: 'mesh' }; selectPiece(map[hit.object.name]); } }
  canvas.addEventListener('pointerdown', (event) => { canvas.setPointerCapture(event.pointerId); drag = { x: event.clientX, y: event.clientY }; }); canvas.addEventListener('pointermove', (event) => { if (!drag) return; if (state.mode === 'excavator') moveSelected((event.clientX - drag.x) * .4); else { yaw -= (event.clientX - drag.x) * .01; pitch = THREE.MathUtils.clamp(pitch + (event.clientY - drag.y) * .01, -.9, 1.2); render(); } drag = { x: event.clientX, y: event.clientY }; }); canvas.addEventListener('pointerup', (event) => { if (Math.abs(event.clientX - drag.x) < 4 && Math.abs(event.clientY - drag.y) < 4) pick(event); drag = null; }); canvas.addEventListener('wheel', (event) => { event.preventDefault(); distance = THREE.MathUtils.clamp(distance + event.deltaY * .01, 4, 18); render(); }, { passive: false }); window.addEventListener('keydown', (event) => { if (event.key >= '1' && event.key <= '5') selectPiece(['platform','boom','stick','bucket','mesh'][Number(event.key) - 1]); if (event.key === 'ArrowLeft') moveSelected(-3); if (event.key === 'ArrowRight') moveSelected(3); }); window.addEventListener('resize', resize);
  const guideSteps = [{ tag: 'MALLA', title: 'De vértices a triángulos', body: 'La malla no es una caja mágica: está formada por vértices, triángulos y normales. En la P2 se construye un cilindro con una costura cerrada y se compara el aspecto de la superficie.', visual: 'Malla cilíndrica\n  vértices → índices → triángulos → normales', action: () => selectPiece('mesh') }, { tag: 'JERARQUÍA', title: 'Cada pieza hereda de su padre', body: 'La plataforma es padre de la pluma; la pluma es padre del brazo; el brazo es padre del cazo. Mueve un padre y todo su subárbol conserva las uniones.', visual: 'plataforma\n  └─ pluma\n      └─ brazo\n          └─ cazo', action: () => selectPiece('boom') }, { tag: 'SELECCIÓN', title: 'Seleccionar no es colorear por accidente', body: 'El clic identifica una pieza y la resaltamos en amarillo. El objeto seleccionado mantiene su estado mientras el fondo no cambia los ángulos.', visual: 'clic → identificar pieza → resaltar → modificar solo esa pieza', action: () => selectPiece('bucket') }, { tag: 'INTERACCIÓN', title: 'Arrastre y límites', body: 'Arrastra horizontalmente o usa las flechas. La pluma, el brazo y el cazo tienen límites didácticos para evitar giros completos y hacer visible el control articular.', visual: 'pluma  -15° … 80°\nbrazo -120° … 20°\ncazo  -100° … 60°', action: () => selectPiece('stick') }, { tag: 'ANIMACIÓN', title: 'La pose cambia con el tiempo', body: 'La animación actualiza las articulaciones con funciones seno y usa el tiempo transcurrido, no un salto fijo por fotograma. Pulsa el botón y observa la jerarquía.', visual: 'tiempo → yaw, boom, stick, bucket → nueva pose', action: () => { selectPiece('platform'); document.querySelector('#animate-button').click(); } }]; let guideIndex = 0;
  function showGuide(index) { guideIndex = (index + guideSteps.length) % guideSteps.length; const step = guideSteps[guideIndex]; document.querySelector('#guide-step-label').textContent = `CONCEPTO ${guideIndex + 1} DE ${guideSteps.length}`; document.querySelector('#guide-tag').textContent = step.tag; document.querySelector('#guide-title').textContent = step.title; document.querySelector('#guide-body').textContent = step.body; document.querySelector('#guide-visual').textContent = step.visual; document.querySelectorAll('.step-dot').forEach((dot) => dot.classList.toggle('active', Number(dot.dataset.step) === guideIndex)); document.querySelector('#guide-next').textContent = guideIndex === guideSteps.length - 1 ? 'Cerrar' : 'Siguiente →'; }
  const controlsPanel = document.querySelector('#controls-panel');
  const controlsToggle = document.querySelector('#controls-toggle');
  function openConcept(index) {
    controlsPanel.classList.add('hidden');
    controlsToggle.textContent = 'Abrir controles';
    controlsToggle.setAttribute('aria-expanded', 'false');
    document.querySelector('#guide-modal').classList.remove('hidden');
    showGuide(index);
    document.querySelectorAll('[data-concept]').forEach((button) => {
      const active = Number(button.dataset.concept) === guideIndex;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  controlsToggle.addEventListener('click', () => {
    const opening = controlsPanel.classList.contains('hidden');
    controlsPanel.classList.toggle('hidden', !opening);
    document.querySelector('#guide-modal').classList.toggle('hidden', opening);
    controlsToggle.textContent = opening ? 'Cerrar controles' : 'Abrir controles';
    controlsToggle.setAttribute('aria-expanded', String(opening));
  });
  document.querySelector('#guide-button').addEventListener('click', () => openConcept(guideIndex));
  document.querySelector('#guide-close').addEventListener('click', () => document.querySelector('#guide-modal').classList.add('hidden'));
  document.querySelector('#guide-next').addEventListener('click', () => {
    if (guideIndex === guideSteps.length - 1) document.querySelector('#guide-modal').classList.add('hidden');
    else openConcept(guideIndex + 1);
  });
  document.querySelector('#guide-action').addEventListener('click', () => guideSteps[guideIndex].action());
  document.querySelectorAll('.step-dot').forEach((dot) => dot.addEventListener('click', () => openConcept(Number(dot.dataset.step))));
  document.querySelectorAll('[data-concept]').forEach((button) => button.addEventListener('click', () => openConcept(Number(button.dataset.concept))));
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      document.querySelector('#guide-modal').classList.add('hidden');
      controlsPanel.classList.add('hidden');
      controlsToggle.setAttribute('aria-expanded', 'false');
      controlsToggle.textContent = 'Abrir controles';
    }
  });
  openConcept(0);
  selectPiece('platform'); resize(); requestAnimationFrame(animateFrame);
})();
