/**
 * MAF World — démonstrateur Three.js indépendant (sans Godot).
 * Trois modules sont copiés depuis le paquet Three.js existant du projet
 * par Installer-MAF-Ville3D.ps1. Aucune connexion CDN n'est nécessaire.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const CELL = 4;
const LIMIT = 10;
const STORAGE = 'maf-world-demo-map-v1';
const TYPES = ['house', 'tower', 'shop', 'tree', 'car'];
const viewport = document.querySelector('#viewport');
const modeInfo = document.querySelector('#modeInfo');
const objectCount = document.querySelector('#objectCount');
const scaleInput = document.querySelector('#characterScale');
const scaleLabel = document.querySelector('#characterScaleLabel');
const loader = new GLTFLoader();
const objects = new Map();
const modelOverrides = new Map();
let mapState = new Map();
let tool = 'explore';
let activePlayer = null;
let activeMixer = null;
let animations = {};
let walking = false;
let path = [];
let playerScaleFactor = 1;
let toastTimer = null;
let pointerDown = null;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#a9d9e1');
scene.fog = new THREE.Fog('#a9d9e1', 75, 175);
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 250);
camera.position.set(57, 61, 70);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.45;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.setAttribute('aria-label', 'Carte 3D, cliquer pour interagir');
viewport.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.dampingFactor = .08;
controls.screenSpacePanning = false;
controls.minPolarAngle = .08;
controls.maxPolarAngle = Math.PI / 2 - .06;
controls.minDistance = 8;
controls.maxDistance = 150;
controls.maxTargetRadius = 73;
controls.update();

scene.add(new THREE.HemisphereLight('#e7faff', '#7f9a70', 2.3));
const sunlight = new THREE.DirectionalLight('#fff4d5', 3.2);
sunlight.position.set(-35, 75, 38);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(1024, 1024);
sunlight.shadow.camera.left = -64;
sunlight.shadow.camera.right = 64;
sunlight.shadow.camera.top = 64;
sunlight.shadow.camera.bottom = -64;
sunlight.shadow.camera.near = 1;
sunlight.shadow.camera.far = 165;
sunlight.shadow.normalBias = .08;
scene.add(sunlight);

const mat = (color, roughness = .83) => new THREE.MeshStandardMaterial({ color, roughness });
const grass = mat('#9ccc83');
const roadMat = mat('#52656c');
const roadEdge = mat('#d6d4c5');
const stripe = mat('#ecedd8');
const concrete = mat('#dedbc7');
const leaves1 = mat('#33945e');
const leaves2 = mat('#47ad65');
const treeBark = mat('#966b43');
const dark = mat('#364555');
const windowMat = new THREE.MeshStandardMaterial({ color: '#79b5c8', metalness: .16, roughness: .32 });
const roofMat = mat('#b55755');
const wheelsMat = mat('#263446');
const ground = new THREE.Mesh(new THREE.PlaneGeometry(98, 98), grass);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
const roads = new THREE.Group();
scene.add(roads);
const buildings = new THREE.Group();
scene.add(buildings);
const playerLayer = new THREE.Group();
scene.add(playerLayer);

function cube(parent, dimensions, position, material, shadows = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...dimensions), material);
  mesh.position.set(...position);
  mesh.castShadow = shadows;
  mesh.receiveShadow = shadows;
  parent.add(mesh);
  return mesh;
}
function cylinder(parent, rt, rb, h, pos, material, sides = 8) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, sides), material);
  mesh.position.set(...pos);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}
function isRoad(c, r) { return c % 5 === 0 || r % 5 === 0; }
function isValid(c, r) { return Number.isInteger(c) && Number.isInteger(r) && Math.abs(c) <= LIMIT && Math.abs(r) <= LIMIT; }
function key(c, r) { return `${c},${r}`; }
function seeded(seed) {
  let x = seed >>> 0;
  return () => { x = (1664525 * x + 1013904223) >>> 0; return x / 4294967296; };
}
const random = seeded(12345);
for (let c = -LIMIT; c <= LIMIT; c++) {
  for (let r = -LIMIT; r <= LIMIT; r++) {
    const road = isRoad(c, r);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(CELL - .035, .14, CELL - .035), road ? roadMat : concrete);
    slab.position.set(c * CELL, .035, r * CELL);
    slab.receiveShadow = true;
    roads.add(slab);
    if (road) {
      const inner = new THREE.Mesh(new THREE.PlaneGeometry(CELL - .55, CELL - .55), roadMat);
      inner.rotation.x = -Math.PI / 2;
      inner.position.set(c * CELL, .114, r * CELL);
      roads.add(inner);
      if (c % 5 === 0 && r % 5 !== 0) cube(roads, [.08, .02, 1.2], [c * CELL, .13, r * CELL], stripe, false);
      if (r % 5 === 0 && c % 5 !== 0) cube(roads, [1.2, .02, .08], [c * CELL, .13, r * CELL], stripe, false);
    } else {
      const plot = new THREE.Mesh(new THREE.BoxGeometry(CELL - .3, .1, CELL - .3), roadEdge);
      plot.position.set(c * CELL, .125, r * CELL);
      plot.receiveShadow = true;
      roads.add(plot);
    }
  }
}

function createHouse(group, palette = 0) {
  const walls = mat(['#efdbc8', '#fff0c3', '#cce4d7', '#d5d6f0'][palette % 4]);
  cube(group, [2.85, 3.4, 2.6], [0, 1.85, 0], walls);
  cube(group, [3.25, .37, 3.03], [0, 3.65, 0], roofMat);
  cube(group, [.9, 1.6, .08], [0, .98, 1.35], dark);
  for (const x of [-.95, .95]) cube(group, [.62, .8, .08], [x, 2.5, 1.35], windowMat);
  cube(group, [2.8, .12, .7], [0, .2, 1.65], concrete, false);
}
function createTower(group, palette = 0) {
  const buildingMat = mat(['#8eb5c8', '#cbc7c0', '#b2bfd4'][palette % 3]);
  const height = 9 + (palette % 3) * 2;
  cube(group, [3.02, height, 3.02], [0, height / 2 + .18, 0], buildingMat);
  cube(group, [3.38, .3, 3.38], [0, height + .25, 0], dark);
  for (let y = 1.5; y < height; y += 1.6) {
    for (const x of [-.85, 0, .85]) cube(group, [.48, .72, .025], [x, y, 1.53], windowMat, false);
  }
}
function createShop(group, palette = 0) {
  cube(group, [3.1, 2.75, 2.9], [0, 1.52, 0], mat('#e9d2bd'));
  cube(group, [3.4, .28, 3.1], [0, 2.98, 0], mat('#f2e8cc'));
  cube(group, [2.7, 1.34, .1], [0, 1.19, 1.5], windowMat);
  const awning = mat(['#dc8b68', '#54b6a4', '#8fa3dd'][palette % 3]);
  cube(group, [3.35, .3, 1.2], [0, 2.24, 1.8], awning);
}
function createTree(group, palette = 0) {
  cylinder(group, .22, .33, 1.6, [0, .95, 0], treeBark, 7);
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.25, 0), palette % 2 === 0 ? leaves1 : leaves2);
  crown.position.set(0, 2.65, 0);
  crown.castShadow = true;
  group.add(crown);
  const crown2 = new THREE.Mesh(new THREE.IcosahedronGeometry(.8, 0), leaves2);
  crown2.position.set(.45, 3.12, .12);
  crown2.castShadow = true;
  group.add(crown2);
}
function createCar(group, palette = 0) {
  const paint = mat(['#f1b45f', '#cc6669', '#5ab3c9', '#d7dce3'][palette % 4]);
  cube(group, [1.7, .58, 2.85], [0, .62, 0], paint);
  cube(group, [1.56, .58, 1.55], [0, 1.15, -.18], paint);
  cube(group, [1.4, .38, .04], [0, 1.22, .65], windowMat);
  for (const x of [-.89, .89]) for (const z of [-.89, .89]) {
    const wheel = cylinder(group, .42, .42, .22, [x, .42, z], wheelsMat, 12);
    wheel.rotation.z = Math.PI / 2;
  }
  for (const x of [-.55, .55]) cube(group, [.32, .19, .05], [x, .62, 1.44], mat('#fff1c6'), false);
}
const constructors = { house: createHouse, tower: createTower, shop: createShop, tree: createTree, car: createCar };
const allowedDimensions = { house: [3.2, 5.2, 3.2], tower: [3.2, 12, 3.2], shop: [3.3, 4.2, 3.3], tree: [2.9, 4.1, 2.9], car: [2, 1.6, 3] };
function normalizedModel(source, type) {
  const root = source.clone(true);
  root.updateMatrixWorld(true);
  const bound = new THREE.Box3().setFromObject(root);
  const dims = new THREE.Vector3();
  bound.getSize(dims);
  const limit = allowedDimensions[type];
  const s = Math.min(limit[0] / Math.max(.001, dims.x), limit[1] / Math.max(.001, dims.y), limit[2] / Math.max(.001, dims.z));
  root.scale.multiplyScalar(s);
  root.updateMatrixWorld(true);
  const newBox = new THREE.Box3().setFromObject(root);
  root.position.x -= (newBox.min.x + newBox.max.x) / 2;
  root.position.y -= newBox.min.y;
  root.position.z -= (newBox.min.z + newBox.max.z) / 2;
  root.traverse(node => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } });
  return root;
}
function drawEntry(c, r, entry) {
  const group = new THREE.Group();
  group.position.set(c * CELL, .19, r * CELL);
  group.rotation.y = (entry.rotation || 0) * Math.PI / 2;
  group.userData.sharedGLB = modelOverrides.has(entry.type);
  if (group.userData.sharedGLB) group.add(normalizedModel(modelOverrides.get(entry.type), entry.type));
  else constructors[entry.type](group, entry.variant ?? 0);
  buildings.add(group);
  objects.set(key(c, r), group);
}
function redrawObjects() {
  // Les géométries supprimées sont petites, les matériaux partagés restent en mémoire.
  for (const group of objects.values()) {
    buildings.remove(group);
    if (!group.userData.sharedGLB) group.traverse(node => { if (node.geometry) node.geometry.dispose(); });
  }
  objects.clear();
  for (const [position, entry] of mapState) {
    const [c, r] = position.split(',').map(Number);
    drawEntry(c, r, entry);
  }
  objectCount.textContent = `${mapState.size} objets • vraie scène 3D`;
}
function newMap() {
  const output = new Map();
  for (let c = -LIMIT; c <= LIMIT; c++) {
    for (let r = -LIMIT; r <= LIMIT; r++) {
      if (c === 0 && r === 0) continue;
      const u = random();
      const road = isRoad(c, r);
      let type = null;
      if (road && u < .07) type = 'car';
      if (!road && u < .46) type = 'house';
      else if (!road && u < .55) type = 'tower';
      else if (!road && u < .62) type = 'shop';
      else if (!road && u < .85) type = 'tree';
      if (type) output.set(key(c, r), { type, variant: Math.floor(random() * 9), rotation: Math.floor(random() * 4) });
    }
  }
  return output;
}
function asState(items) {
  if (!Array.isArray(items) || items.length > 441) throw new Error('Carte invalide');
  const next = new Map();
  for (const item of items) {
    const { c, r, type } = item || {};
    if (!isValid(c, r) || !TYPES.includes(type)) continue;
    if (type === 'car' ? !isRoad(c, r) : isRoad(c, r)) continue;
    next.set(key(c, r), { type, variant: Number.isInteger(item.variant) ? Math.abs(item.variant) % 9 : 0, rotation: Number.isInteger(item.rotation) ? ((item.rotation % 4) + 4) % 4 : 0 });
  }
  return next;
}
function serializeMap() {
  return { version: 1, title: 'MAF World', tiles: [...mapState.entries()].map(([position, item]) => {
    const [c, r] = position.split(',').map(Number);
    return { c, r, ...item };
  }) };
}
function save() {
  try { localStorage.setItem(STORAGE, JSON.stringify(serializeMap())); notify('Ville sauvegardée sur cet appareil.'); }
  catch (error) { notify('Sauvegarde impossible : stockage du navigateur désactivé.'); }
}
function initMap() {
  try {
    const raw = localStorage.getItem(STORAGE);
    mapState = raw ? asState(JSON.parse(raw).tiles) : newMap();
  } catch { mapState = newMap(); }
  redrawObjects();
}

function fakeCharacter() {
  const avatar = new THREE.Group();
  const pants = mat('#273f6b');
  const shirt = mat('#40b8a6');
  const skin = mat('#c88f68');
  cube(avatar, [.7, 1.02, .42], [0, 1.43, 0], shirt);
  cylinder(avatar, .29, .29, .48, [0, 2.23, 0], skin, 14);
  cylinder(avatar, .34, .34, .31, [0, 2.6, 0], dark, 14);
  cube(avatar, [.29, .9, .28], [-.22, .48, 0], pants);
  cube(avatar, [.29, .9, .28], [.22, .48, 0], pants);
  cube(avatar, [.22, .82, .22], [-.49, 1.43, 0], skin);
  cube(avatar, [.22, .82, .22], [.49, 1.43, 0], skin);
  const disk = new THREE.Mesh(new THREE.RingGeometry(.7, .83, 28), new THREE.MeshBasicMaterial({ color: '#4feac8', side: THREE.DoubleSide }));
  disk.rotation.x = -Math.PI / 2;
  disk.position.y = .035;
  avatar.add(disk);
  return avatar;
}
function loadAvatar(sceneModel, clips = []) {
  const previous = activePlayer ? activePlayer.position.clone() : new THREE.Vector3(0, .2, 0);
  if (activePlayer) playerLayer.remove(activePlayer);
  if (activeMixer) activeMixer.stopAllAction();
  path = [];
  walking = false;
  activeMixer = null;
  animations = {};
  activePlayer = new THREE.Group();
  activePlayer.position.copy(previous);
  const model = sceneModel;
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  if (!bounds.isEmpty()) {
    const size = new THREE.Vector3(); bounds.getSize(size);
    const factor = 2.65 / Math.max(size.y, .01);
    model.scale.multiplyScalar(factor);
    model.updateMatrixWorld(true);
    const fit = new THREE.Box3().setFromObject(model);
    model.position.x -= (fit.min.x + fit.max.x) / 2;
    model.position.y -= fit.min.y;
    model.position.z -= (fit.min.z + fit.max.z) / 2;
  }
  model.traverse(node => { if (node.isMesh) node.castShadow = true; });
  activePlayer.add(model);
  activePlayer.scale.setScalar(playerScaleFactor);
  playerLayer.add(activePlayer);
  if (clips.length) {
    activeMixer = new THREE.AnimationMixer(model);
    const walk = clips.find(clip => /walk|run|course|marche|jog/i.test(clip.name)) || clips[0];
    const idle = clips.find(clip => /idle|stand|repos|wait/i.test(clip.name));
    animations.walk = activeMixer.clipAction(walk);
    animations.idle = idle ? activeMixer.clipAction(idle) : null;
    if (animations.idle) animations.idle.play();
    else { animations.walk.play(); animations.walk.paused = true; }
  }
  setWalking(false);
}
function setWalking(next) {
  if (walking === next) return;
  walking = next;
  if (!activeMixer) return;
  if (animations.idle) {
    const on = next ? animations.walk : animations.idle;
    const off = next ? animations.idle : animations.walk;
    if (off && off !== on) off.fadeOut(.18);
    if (on) on.reset().fadeIn(.18).play();
  } else if (animations.walk) animations.walk.paused = !next;
}
loadAvatar(fakeCharacter());

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
function targetTile(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObject(ground, false);
  if (!hits.length) return null;
  const c = Math.round(hits[0].point.x / CELL), r = Math.round(hits[0].point.z / CELL);
  return isValid(c, r) ? { c, r } : null;
}
function nearestRoad(c, r) {
  let best = { c: 0, r: 0 }, distance = Infinity;
  for (let i = -LIMIT; i <= LIMIT; i++) for (let j = -LIMIT; j <= LIMIT; j++) {
    if (!isRoad(i, j)) continue;
    const d = (i - c) ** 2 + (j - r) ** 2;
    if (d < distance) { best = { c: i, r: j }; distance = d; }
  }
  return best;
}
function roadPath(from, to) {
  const start = nearestRoad(from.c, from.r), target = nearestRoad(to.c, to.r);
  const queue = [start];
  const seen = new Map([[key(start.c, start.r), null]]);
  let index = 0;
  while (index < queue.length) {
    const p = queue[index++];
    if (p.c === target.c && p.r === target.r) break;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c = p.c + dx, r = p.r + dz, id = key(c, r);
      if (!isValid(c, r) || !isRoad(c, r) || seen.has(id)) continue;
      seen.set(id, key(p.c, p.r));
      queue.push({ c, r });
    }
  }
  const dest = key(target.c, target.r);
  if (!seen.has(dest)) return [];
  const route = [];
  for (let id = dest; id !== null; id = seen.get(id)) {
    const [c, r] = id.split(',').map(Number);
    route.unshift(new THREE.Vector3(c * CELL, .2, r * CELL));
  }
  return route;
}
function interact(tile) {
  const { c, r } = tile;
  if (tool === 'explore') {
    const start = { c: Math.round(activePlayer.position.x / CELL), r: Math.round(activePlayer.position.z / CELL) };
    path = roadPath(start, tile);
    if (path.length > 1) { path.shift(); setWalking(true); notify('Personnage en route !'); }
    else notify('Touchez une autre route pour déplacer le personnage.');
    return;
  }
  const road = isRoad(c, r);
  if (tool === 'erase') {
    const existing = objects.get(key(c, r));
    if (existing) { buildings.remove(existing); if (!existing.userData.sharedGLB) existing.traverse(n => { if (n.geometry) n.geometry.dispose(); }); objects.delete(key(c, r)); }
    mapState.delete(key(c, r));
    objectCount.textContent = `${mapState.size} objets • vraie scène 3D`;
    return;
  }
  if (road && tool !== 'car') { notify('Les bâtiments et arbres doivent être placés hors des routes.'); return; }
  if (!road && tool === 'car') { notify('Les voitures doivent être placées sur une route.'); return; }
  if (objects.has(key(c, r))) { notify('Case occupée : utilisez Effacer avant de remplacer.'); return; }
  const entry = { type: tool, variant: Math.floor(Math.random() * 8), rotation: Math.floor(Math.random() * 4) };
  mapState.set(key(c, r), entry);
  drawEntry(c, r, entry);
  objectCount.textContent = `${mapState.size} objets • vraie scène 3D`;
}
renderer.domElement.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !e.isPrimary) { pointerDown = null; return; }
  pointerDown = { x: e.clientX, y: e.clientY, time: performance.now() };
});
renderer.domElement.addEventListener('pointerup', e => {
  if (!pointerDown || e.button !== 0 || !e.isPrimary) return;
  const moved = Math.hypot(e.clientX - pointerDown.x, e.clientY - pointerDown.y);
  const duration = performance.now() - pointerDown.time;
  pointerDown = null;
  if (moved < 8 && duration < 550) {
    const tile = targetTile(e.clientX, e.clientY);
    if (tile) interact(tile);
  }
});
renderer.domElement.addEventListener('pointercancel', () => { pointerDown = null; });
renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());

function notify(text) {
  const el = document.querySelector('#toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}
function selectTool(value) {
  tool = value;
  for (const el of document.querySelectorAll('[data-tool]')) el.classList.toggle('active', el.dataset.tool === value);
  const names = { explore: '🚶 Exploration : touchez une route', house: '🏠 Placez une maison', tower: '🏢 Placez un immeuble', shop: '🏬 Placez un commerce', tree: '🌳 Plantez un arbre', car: '🚙 Placez une voiture', erase: '🧽 Supprimez un objet' };
  modeInfo.textContent = names[value];
}
for (const el of document.querySelectorAll('[data-tool]')) el.addEventListener('click', () => selectTool(el.dataset.tool));
document.querySelector('#homeCamera').addEventListener('click', () => {
  camera.position.set(57, 61, 70);
  controls.target.set(0, 0, 0);
  controls.update();
});
document.querySelector('#saveMap').addEventListener('click', save);
document.querySelector('#resetMap').addEventListener('click', () => {
  if (!confirm('Réinitialiser la ville ? Votre ville actuelle sera remplacée.')) return;
  mapState = newMap(); redrawObjects();
  try { localStorage.removeItem(STORAGE); } catch {}
  notify('Ville de démonstration recréée.');
});
document.querySelector('#exportMap').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(serializeMap(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = 'maf-ville-3d-sauvegarde.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  notify('Fichier JSON exporté.');
});
document.querySelector('#importMap').addEventListener('change', async e => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (data.version !== 1 || !Array.isArray(data.tiles)) throw new Error('Format non reconnu');
    mapState = asState(data.tiles); redrawObjects(); save();
  } catch { notify('Fichier JSON invalide.'); }
  e.target.value = '';
});
scaleInput.addEventListener('input', () => {
  playerScaleFactor = Number(scaleInput.value);
  activePlayer.scale.setScalar(playerScaleFactor);
  scaleLabel.textContent = `${Math.round(playerScaleFactor * 100)} %`;
});
async function addCharacterFromURL(url, fromUpload = false) {
  const gltf = await loader.loadAsync(url);
  loadAvatar(gltf.scene, gltf.animations);
  notify(`${fromUpload ? 'Personnage importé' : 'Personnage chargé'} • ${gltf.animations.length} animation(s).`);
}
document.querySelector('#characterFile').addEventListener('change', async e => {
  const file = e.target.files?.[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.glb')) { notify('Utilisez un fichier GLB contenant le modèle et ses animations.'); e.target.value = ''; return; }
  const url = URL.createObjectURL(file);
  try { await addCharacterFromURL(url, true); }
  catch (error) { console.error(error); notify('GLB illisible ou utilisant une compression non prise en charge.'); }
  finally { URL.revokeObjectURL(url); e.target.value = ''; }
});

async function loadManifest() {
  let manifest;
  try {
    const response = await fetch('./models/manifest.json', { cache: 'no-store' });
    if (!response.ok) return;
    manifest = await response.json();
  } catch { return; }
  if (manifest && typeof manifest.character === 'string' && manifest.character.endsWith('.glb')) {
    try { await addCharacterFromURL(new URL(manifest.character, location.href).href); }
    catch (error) { console.warn('Personnage GLB absent : avatar de démonstration conservé.', error); }
  }
  for (const type of TYPES) {
    const pathToModel = manifest?.objects?.[type];
    if (typeof pathToModel !== 'string' || !pathToModel.endsWith('.glb')) continue;
    try {
      const gltf = await loader.loadAsync(new URL(pathToModel, location.href).href);
      modelOverrides.set(type, gltf.scene);
      redrawObjects();
    } catch (error) { console.warn(`Modèle ${type} non chargé`, error); }
  }
}

function resize() {
  const width = viewport.clientWidth, height = viewport.clientHeight;
  camera.aspect = width / Math.max(height, 1);
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}
window.addEventListener('resize', resize);
resize();
initMap();
loadManifest();
const clock = new THREE.Clock();
let animationHandle = 0;
function renderLoop() {
  animationHandle = requestAnimationFrame(renderLoop);
  const dt = Math.min(clock.getDelta(), .05);
  controls.update();
  if (activeMixer) activeMixer.update(dt);
  if (activePlayer && path.length) {
    const point = path[0];
    const offset = point.clone().sub(activePlayer.position);
    offset.y = 0;
    const distance = offset.length();
    if (distance < .075) { activePlayer.position.x = point.x; activePlayer.position.z = point.z; path.shift(); if (!path.length) setWalking(false); }
    else {
      const travel = Math.min(6.3 * dt, distance);
      activePlayer.position.addScaledVector(offset.normalize(), travel);
      const targetYaw = Math.atan2(offset.x, offset.z);
      activePlayer.rotation.y = THREE.MathUtils.lerp(activePlayer.rotation.y, targetYaw, Math.min(1, dt * 12));
    }
  }
  renderer.render(scene, camera);
}
renderLoop();
window.addEventListener('beforeunload', () => { cancelAnimationFrame(animationHandle); renderer.dispose(); });
