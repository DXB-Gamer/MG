const stageText = document.getElementById('stageText');
const resourcesText = document.getElementById('resourcesText');
const basesText = document.getElementById('basesText');
const overlay = document.getElementById('overlay');
const launchButton = document.getElementById('launchButton');
const hud = document.getElementById('hud');
const buildPanel = document.getElementById('buildPanel');
const buildButtons = document.querySelectorAll('.build-button');

let scene, camera, renderer, controls;
let moon, rocket, moonSurface;
let stage = 'prelaunch';
let resources = 0;
let bases = 0;
let clock;
let launchProgress = 0;
let targetMoonPosition = null;
let buildSpots = [];
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let selectedBuildType = null;

init();
animate();

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
  camera.position.set(0, 12, 40);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 6;
  controls.maxDistance = 180;
  controls.maxPolarAngle = Math.PI * 0.9;

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
  createRocket();
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
  });
  moon = new THREE.Mesh(moonGeometry, moonMaterial);
  moon.position.set(0, -20, -150);
  scene.add(moon);

  moonSurface = new THREE.Mesh(
    new THREE.PlaneGeometry(270, 270, 120, 120),
    new THREE.MeshStandardMaterial({ color: 0x6d6d7d, roughness: 1, metalness: 0, side: THREE.DoubleSide })
  );
  moonSurface.rotation.x = -Math.PI / 2;
  moonSurface.position.set(0, -35, -150);
  moonSurface.receiveShadow = true;
  scene.add(moonSurface);
}

function createRocket() {
  const rocketGroup = new THREE.Group();

  const body = new THREE.CylinderGeometry(1.2, 1.2, 9, 28);
  const paint = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15, metalness: 0.35 });
  const fuselage = new THREE.Mesh(body, paint);
  fuselage.position.y = 5;
  rocketGroup.add(fuselage);

  const nose = new THREE.ConeGeometry(1.2, 3.5, 24);
  const noseMat = new THREE.MeshStandardMaterial({ color: 0xff4f6b, roughness: 0.2, metalness: 0.2 });
  const noseMesh = new THREE.Mesh(nose, noseMat);
  noseMesh.position.y = 9.25;
  rocketGroup.add(noseMesh);

  const finGeom = new THREE.BoxGeometry(0.4, 2.6, 2.8);
  const finMat = new THREE.MeshStandardMaterial({ color: 0x183d8c, roughness: 0.28 });
  for (let i = 0; i < 3; i++) {
    const fin = new THREE.Mesh(finGeom, finMat);
    const angle = (i / 3) * Math.PI * 2;
    fin.position.set(Math.cos(angle) * 1.4, 2.8, Math.sin(angle) * 1.4);
    fin.rotation.y = angle;
    rocketGroup.add(fin);
  }

  const flame = new THREE.ConeGeometry(0.8, 2.4, 20);
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xff8a18, transparent: true, opacity: 0.82 });
  const flameMesh = new THREE.Mesh(flame, flameMat);
  flameMesh.position.y = 0.5;
  flameMesh.rotation.x = Math.PI;
  rocketGroup.add(flameMesh);

  rocketGroup.position.set(0, -34, 45);
  scene.add(rocketGroup);
  rocket = rocketGroup;
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
  overlay.classList.add('hidden');
  hud.classList.remove('hidden');
  stage = 'launch';
  stageText.textContent = 'Launch';
  targetMoonPosition = new THREE.Vector3(0, -20, -150);
  buildPanel.classList.add('hidden');
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

  animateRocket(delta);
  controls.update();
  renderer.render(scene, camera);
}

function handleLaunch(delta) {
  if (!targetMoonPosition) return;
  launchProgress += delta * 0.48;
  rocket.position.y += delta * 22;
  rocket.position.z -= delta * 18;
  camera.position.lerp(new THREE.Vector3(5, 12, -10), delta * 0.25);
  camera.lookAt(rocket.position);

  if (rocket.position.z < 0) {
    stage = 'cruise';
    stageText.textContent = 'Cruising to Moon';
  }

  if (rocket.position.z < -120) {
    stage = 'landing';
    stageText.textContent = 'Landing';
  }

  if (rocket.position.z < -145) {
    stage = 'landed';
    stageText.textContent = 'Landed on Moon';
    scene.remove(rocket.children.find(child => child.geometry.type === 'ConeGeometry' && child.material.opacity));
    buildPanel.classList.remove('hidden');
    setTimeout(() => {
      resources = 20;
      updateHud();
    }, 600);
  }
}

function animateRocket(delta) {
  if (!rocket) return;
  rocket.rotation.y += delta * 0.22;
  rocket.position.x = Math.sin(Date.now() * 0.0007) * 0.3;
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
