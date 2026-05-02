let stageText;
let resourcesText;
let basesText;
let overlay;
let launchButton;
let hud;
let buildPanel;
let buildButtons;

let scene, camera, renderer, controls;
let moon, moonSurface, moonHalo;
let stage = 'prelaunch';
let resources = 0;
let bases = 0;
let clock;
let dissolveProgress = 0;
let buildSpots = [];
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let selectedBuildType = null;
let cameraStart = new THREE.Vector3(0, 18, 80);
let cameraMoon = new THREE.Vector3(0, -7, -90);

window.addEventListener('DOMContentLoaded', () => {
  stageText = document.getElementById('stageText');
  resourcesText = document.getElementById('resourcesText');
  basesText = document.getElementById('basesText');
  overlay = document.getElementById('overlay');
  launchButton = document.getElementById('launchButton');
  hud = document.getElementById('hud');
  buildPanel = document.getElementById('buildPanel');
  buildButtons = document.querySelectorAll('.build-button');

  init();
  animate();
});

function init() {
  const canvas = document.createElement('canvas');
  document.body.appendChild(canvas);
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x02040d);
  
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x02040d, 0.0025);
  
  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 4000);
  camera.position.copy(cameraStart);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 10;
  controls.maxDistance = 180;
  controls.maxPolarAngle = Math.PI * 0.95;

  clock = new THREE.Clock();

  const ambient = new THREE.AmbientLight(0x9bbad6, 0.25);
  scene.add(ambient);
  const keyLight = new THREE.DirectionalLight(0xdfebff, 1.1);
  keyLight.position.set(20, 30, 10);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0x7a8bc4, 0.4);
  fillLight.position.set(-18, -12, 20);
  scene.add(fillLight);

  createStarField();
  createMoon();
  createBaseZone();

  window.addEventListener('resize', onWindowResize);
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  launchButton.addEventListener('click', beginLaunch);
  buildButtons.forEach(btn => btn.addEventListener('click', e => selectBuildType(e.target.dataset.type)));
}

function createStarField() {
  const starGeometry = new THREE.BufferGeometry();
  const starCount = 1600;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 1800;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 1800;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 1800;
  }
  starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.9, sizeAttenuation: true });
  scene.add(new THREE.Points(starGeometry, starMaterial));
}

function createMoon() {
  const moonGeometry = new THREE.SphereGeometry(25, 72, 72);
  const moonMaterial = new THREE.MeshStandardMaterial({
    color: 0xb8b8c1,
    roughness: 0.95,
    metalness: 0.05,
    bumpMap: new THREE.TextureLoader().load('https://threejs.org/examples/textures/terrain/grasslight-big.jpg'),
    bumpScale: 0.3,
    transparent: true,
    opacity: 0,
  });
  moon = new THREE.Mesh(moonGeometry, moonMaterial);
  moon.position.set(0, -20, -150);
  scene.add(moon);

  moonHalo = new THREE.Mesh(
    new THREE.SphereGeometry(28.5, 64, 64),
    new THREE.MeshBasicMaterial({ color: 0x92b8ff, transparent: true, opacity: 0, side: THREE.BackSide })
  );
  moonHalo.position.copy(moon.position);
  scene.add(moonHalo);

  moonSurface = new THREE.Mesh(
    new THREE.PlaneGeometry(270, 270, 120, 120),
    new THREE.MeshStandardMaterial({ color: 0x6d6d7d, roughness: 1, metalness: 0, side: THREE.DoubleSide, transparent: true, opacity: 0 })
  );
  moonSurface.rotation.x = -Math.PI / 2;
  moonSurface.position.set(0, -35, -150);
  moonSurface.receiveShadow = true;
  scene.add(moonSurface);
}

function createBaseZone() {
  const baseZone = new THREE.Mesh(
    new THREE.CircleGeometry(22, 60),
    new THREE.MeshBasicMaterial({ color: 0x44566b, opacity: 0.35, transparent: true })
  );
  baseZone.rotation.x = -Math.PI / 2;
  baseZone.position.set(0, -34.7, -150);
  scene.add(baseZone);
}

function beginLaunch() {
  if (stage !== 'prelaunch') return;
  overlay.classList.add('fade-out');
  hud.classList.remove('hidden');
  hud.classList.add('visible');
  stage = 'launch';
  stageText.textContent = 'Dissolving to Moon';
  buildPanel.classList.add('hidden');
  setTimeout(() => overlay.classList.add('hidden'), 1200);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (stage === 'launch') {
    handleLaunch(delta);
  }

  controls.update();
  renderer.render(scene, camera);
}

function handleLaunch(delta) {
  dissolveProgress += delta * 0.48;
  const t = Math.min(dissolveProgress, 1);
  moon.material.opacity = t;
  moonHalo.material.opacity = Math.max(0, 0.55 * (1 - t));
  moonSurface.material.opacity = Math.min(0.84, t * 0.84);
  moon.scale.setScalar(0.95 + 0.05 * t);
  camera.position.lerp(cameraMoon, delta * 0.28);
  camera.lookAt(moon.position);

  if (t >= 0.45) {
    buildPanel.classList.add('visible');
  }

  if (t >= 1) {
    stage = 'landed';
    stageText.textContent = 'Landed on Moon';
    buildPanel.classList.remove('hidden');
    setTimeout(() => {
      resources = 20;
      updateHud();
    }, 600);
  }
}

function updateHud() {
  resourcesText.textContent = resources;
  basesText.textContent = bases;
}

function selectBuildType(type) {
  if (stage !== 'landed') return;
  selectedBuildType = type;
  buildButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.type === type));
}

function onPointerDown(event) {
  if (stage !== 'landed' || !selectedBuildType) return;
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(moonSurface);
  if (intersects.length > 0) {
    const point = intersects[0].point;
    buildAt(point, selectedBuildType);
  }
}

function buildAt(position, type) {
  const cost = type === 'habitat' ? 10 : type === 'solar' ? 15 : 25;
  if (resources < cost) {
    stageText.textContent = 'Not enough resources';
    setTimeout(() => { stageText.textContent = 'Landed on Moon'; }, 1500);
    return;
  }

  const color = type === 'habitat' ? 0xe3c36b : type === 'solar' ? 0x6ecfdb : 0xce517b;
  const height = type === 'habitat' ? 3.5 : type === 'solar' ? 1.2 : 4.5;
  const geometry = new THREE.BoxGeometry(4, height, 4);
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.2 });
  const building = new THREE.Mesh(geometry, material);
  building.position.copy(position);
  building.position.y += height / 2 - 35;
  building.position.z = -150;
  scene.add(building);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(type === 'solar' ? 1.2 : 1.6, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xffffff, opacity: 0.3, transparent: true })
  );
  dome.position.set(position.x, building.position.y + height / 2 + 0.6, -150);
  scene.add(dome);

  resources -= cost;
  bases += 1;
  updateHud();
  stageText.textContent = `${type === 'habitat' ? 'Habitat' : type === 'solar' ? 'Solar Farm' : 'Command Center'} built`;
  setTimeout(() => { stageText.textContent = 'Landed on Moon'; }, 1400);
  selectedBuildType = null;
  buildButtons.forEach(btn => btn.classList.remove('active'));
}

setInterval(() => {
  if (stage === 'landed') {
    resources += 2 + bases;
    updateHud();
  }
}, 4000);

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    overlay.classList.toggle('hidden');
  }
});
