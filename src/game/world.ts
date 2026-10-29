import * as THREE from 'three';
import { SupplyCrate } from '../types/game';

export interface WorldCollisionBox {
  min: THREE.Vector3;
  max: THREE.Vector3;
}

export interface WorldBuildResult {
  scene: THREE.Group;
  colliders: WorldCollisionBox[];
  shootableMeshes: THREE.Object3D[];
  crates: SupplyCrate[];
  crateObjects: Map<string, THREE.Group>;
  spawnPoints: THREE.Vector3[];
  update: (dt: number) => void;
}

/**
 * Creates procedural canvas textures for terrain, concrete, and metal
 */
function createProceduralGroundTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base grass/dirt
  ctx.fillStyle = '#2f482f';
  ctx.fillRect(0, 0, 512, 512);

  // Noise specks
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const s = 1 + Math.random() * 3;
    const r = Math.floor(40 + Math.random() * 30);
    const g = Math.floor(65 + Math.random() * 35);
    const b = Math.floor(35 + Math.random() * 25);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(x, y, s, s);
  }

  // Dirt patches
  for (let i = 0; i < 35; i++) {
    const cx = Math.random() * 512;
    const cy = Math.random() * 512;
    const rad = 10 + Math.random() * 35;
    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, rad);
    grad.addColorStop(0, 'rgba(84, 68, 48, 0.45)');
    grad.addColorStop(1, 'rgba(84, 68, 48, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(32, 32);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createAsphaltTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#23272e';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 1500; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const v = Math.floor(30 + Math.random() * 25);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Builds the open world environment
 */
export function buildOpenWorld(): WorldBuildResult {
  const worldGroup = new THREE.Group();
  worldGroup.name = 'OpenWorld';
  const colliders: WorldCollisionBox[] = [];
  const shootableMeshes: THREE.Object3D[] = [];

  const addCollider = (minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number) => {
    colliders.push({
      min: new THREE.Vector3(minX, minY, minZ),
      max: new THREE.Vector3(maxX, maxY, maxZ),
    });
  };

  // --- 1. TERRAIN & GROUND ---
  const groundTex = createProceduralGroundTexture();
  const groundMat = new THREE.MeshStandardMaterial({
    map: groundTex,
    roughness: 0.88,
    metalness: 0.05,
  });

  const groundGeo = new THREE.PlaneGeometry(500, 500, 32, 32);
  groundGeo.rotateX(-Math.PI / 2);
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.receiveShadow = true;
  worldGroup.add(groundMesh);
  shootableMeshes.push(groundMesh);

  // Surrounding Ocean Plane (coastal water edge)
  const oceanGeo = new THREE.PlaneGeometry(1200, 1200);
  oceanGeo.rotateX(-Math.PI / 2);
  const oceanMat = new THREE.MeshStandardMaterial({
    color: 0x0f2838,
    roughness: 0.15,
    metalness: 0.45,
    transparent: true,
    opacity: 0.88,
  });
  const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
  oceanMesh.position.y = -0.6;
  worldGroup.add(oceanMesh);

  // Outer natural cliffs / boundaries to frame the battlefield naturally
  const cliffMat = new THREE.MeshStandardMaterial({
    color: 0x3d3835,
    roughness: 0.95,
    metalness: 0.05,
  });

  const makeNaturalBarrier = (x: number, z: number, sx: number, sy: number, sz: number, rotY: number) => {
    const rockGeo = new THREE.DodecahedronGeometry(1, 1);
    const rock = new THREE.Mesh(rockGeo, cliffMat);
    rock.scale.set(sx, sy, sz);
    rock.position.set(x, sy * 0.45, z);
    rock.rotation.y = rotY;
    rock.castShadow = true;
    rock.receiveShadow = true;
    worldGroup.add(rock);
    shootableMeshes.push(rock);
    addCollider(x - sx * 0.8, 0, z - sz * 0.8, x + sx * 0.8, sy, z + sz * 0.8);
  };

  // Coastal natural boundary ring (radius ~ 130m)
  for (let i = 0; i < 28; i++) {
    const angle = (i / 28) * Math.PI * 2;
    const rad = 135 + Math.sin(i * 3.7) * 12;
    const bx = Math.cos(angle) * rad;
    const bz = Math.sin(angle) * rad;
    makeNaturalBarrier(bx, bz, 14 + Math.random() * 6, 9 + Math.random() * 5, 12 + Math.random() * 6, Math.random() * Math.PI);
  }

  // --- 2. CENTRAL MILITARY COMPOUND ---
  // Concrete Courtyard Platform (offset slightly on Y to prevent Z-fighting)
  const asphaltTex = createAsphaltTexture();
  const asphaltMat = new THREE.MeshStandardMaterial({
    map: asphaltTex,
    roughness: 0.75,
    metalness: 0.1,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const courtyardGeo = new THREE.PlaneGeometry(90, 80);
  courtyardGeo.rotateX(-Math.PI / 2);
  const courtyard = new THREE.Mesh(courtyardGeo, asphaltMat);
  courtyard.position.set(0, 0.03, 0);
  courtyard.receiveShadow = true;
  worldGroup.add(courtyard);
  shootableMeshes.push(courtyard);

  // Warehouse Building (Composite with walls, roof, doors, interior pillars)
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.25,
    roughness: 0.7,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.5,
    roughness: 0.5,
  });

  const warehouseX = 12;
  const warehouseZ = -15;
  const wWidth = 26;
  const wDepth = 18;
  const wHeight = 6.5;

  // Warehouse Floor
  const whFloor = new THREE.Mesh(new THREE.PlaneGeometry(wWidth, wDepth).rotateX(-Math.PI / 2), asphaltMat);
  whFloor.position.set(warehouseX, 0.05, warehouseZ);
  worldGroup.add(whFloor);

  // Back Wall
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(wWidth, wHeight, 0.6), wallMat);
  backWall.position.set(warehouseX, wHeight / 2, warehouseZ - wDepth / 2);
  backWall.castShadow = true;
  backWall.receiveShadow = true;
  worldGroup.add(backWall);
  shootableMeshes.push(backWall);
  addCollider(warehouseX - wWidth / 2, 0, warehouseZ - wDepth / 2 - 0.4, warehouseX + wWidth / 2, wHeight, warehouseZ - wDepth / 2 + 0.4);

  // Front Wall (with large central open doorway for tactical breaches)
  const fWallL = new THREE.Mesh(new THREE.BoxGeometry(9.5, wHeight, 0.6), wallMat);
  fWallL.position.set(warehouseX - 8, wHeight / 2, warehouseZ + wDepth / 2);
  fWallL.castShadow = true;
  fWallL.receiveShadow = true;
  worldGroup.add(fWallL);
  shootableMeshes.push(fWallL);
  addCollider(warehouseX - 13, 0, warehouseZ + wDepth / 2 - 0.4, warehouseX - 3.25, wHeight, warehouseZ + wDepth / 2 + 0.4);

  const fWallR = new THREE.Mesh(new THREE.BoxGeometry(9.5, wHeight, 0.6), wallMat);
  fWallR.position.set(warehouseX + 8, wHeight / 2, warehouseZ + wDepth / 2);
  fWallR.castShadow = true;
  fWallR.receiveShadow = true;
  worldGroup.add(fWallR);
  shootableMeshes.push(fWallR);
  addCollider(warehouseX + 3.25, 0, warehouseZ + wDepth / 2 - 0.4, warehouseX + 13, wHeight, warehouseZ + wDepth / 2 + 0.4);

  // Door lintel beam
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(7, 1.8, 0.6), trimMat);
  lintel.position.set(warehouseX, wHeight - 0.9, warehouseZ + wDepth / 2);
  worldGroup.add(lintel);
  shootableMeshes.push(lintel);

  // Left & Right Walls
  const lWall = new THREE.Mesh(new THREE.BoxGeometry(0.6, wHeight, wDepth), wallMat);
  lWall.position.set(warehouseX - wWidth / 2, wHeight / 2, warehouseZ);
  lWall.castShadow = true;
  worldGroup.add(lWall);
  shootableMeshes.push(lWall);
  addCollider(warehouseX - wWidth / 2 - 0.4, 0, warehouseZ - wDepth / 2, warehouseX - wWidth / 2 + 0.4, wHeight, warehouseZ + wDepth / 2);

  const rWall = new THREE.Mesh(new THREE.BoxGeometry(0.6, wHeight, wDepth), wallMat);
  rWall.position.set(warehouseX + wWidth / 2, wHeight / 2, warehouseZ);
  rWall.castShadow = true;
  worldGroup.add(rWall);
  shootableMeshes.push(rWall);
  addCollider(warehouseX + wWidth / 2 - 0.4, 0, warehouseZ - wDepth / 2, warehouseX + wWidth / 2 + 0.4, wHeight, warehouseZ + wDepth / 2);

  // Pitched Roof
  const roof = new THREE.Mesh(new THREE.BoxGeometry(wWidth + 1.2, 0.4, wDepth + 1.2), trimMat);
  roof.position.set(warehouseX, wHeight + 0.2, warehouseZ);
  roof.castShadow = true;
  worldGroup.add(roof);
  shootableMeshes.push(roof);

  // Interior tactical pillars & crates inside warehouse
  const pillarGeo = new THREE.BoxGeometry(0.8, wHeight, 0.8);
  const p1 = new THREE.Mesh(pillarGeo, trimMat);
  p1.position.set(warehouseX - 5, wHeight / 2, warehouseZ);
  p1.castShadow = true;
  worldGroup.add(p1);
  shootableMeshes.push(p1);
  addCollider(warehouseX - 5.5, 0, warehouseZ - 0.5, warehouseX - 4.5, wHeight, warehouseZ + 0.5);

  const p2 = new THREE.Mesh(pillarGeo, trimMat);
  p2.position.set(warehouseX + 5, wHeight / 2, warehouseZ);
  p2.castShadow = true;
  worldGroup.add(p2);
  shootableMeshes.push(p2);
  addCollider(warehouseX + 4.5, 0, warehouseZ - 0.5, warehouseX + 5.5, wHeight, warehouseZ + 0.5);

  // --- 3. TWO SNIPER WATCHTOWERS (Elevated vantage points for Sniping) ---
  const buildWatchtower = (tx: number, tz: number) => {
    const towerGroup = new THREE.Group();
    towerGroup.position.set(tx, 0, tz);

    const metalLegMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
    const woodDeckMat = new THREE.MeshStandardMaterial({ color: 0x785127, metalness: 0.1, roughness: 0.85 });

    const towerH = 7.5;
    const legGeo = new THREE.CylinderGeometry(0.14, 0.18, towerH, 8);

    // 4 Corner support legs
    const offsets = [
      [-2, -2],
      [2, -2],
      [-2, 2],
      [2, 2],
    ];
    offsets.forEach(([ox, oz]) => {
      const leg = new THREE.Mesh(legGeo, metalLegMat);
      leg.position.set(ox, towerH / 2, oz);
      leg.castShadow = true;
      towerGroup.add(leg);
      shootableMeshes.push(leg);
    });

    // Cross braces
    const braceGeo = new THREE.BoxGeometry(3.9, 0.12, 0.12);
    for (let h = 2.2; h < towerH; h += 2.4) {
      const b1 = new THREE.Mesh(braceGeo, metalLegMat);
      b1.position.set(0, h, -2);
      const b2 = new THREE.Mesh(braceGeo, metalLegMat);
      b2.position.set(0, h, 2);
      towerGroup.add(b1, b2);
    }

    // Platform Deck (Sniper nest at Y = towerH)
    const deckGeo = new THREE.BoxGeometry(4.8, 0.3, 4.8);
    const deck = new THREE.Mesh(deckGeo, woodDeckMat);
    deck.position.set(0, towerH, 0);
    deck.receiveShadow = true;
    towerGroup.add(deck);
    shootableMeshes.push(deck);

    // Safety Railings & Sandbag Sniping Parapet
    const sandbagMat = new THREE.MeshStandardMaterial({ color: 0xa88d65, roughness: 0.95 });
    const parapetGeo = new THREE.BoxGeometry(4.6, 1.1, 0.35);

    const pNorth = new THREE.Mesh(parapetGeo, sandbagMat);
    pNorth.position.set(0, towerH + 0.65, -2.2);
    pNorth.castShadow = true;
    const pSouth = new THREE.Mesh(parapetGeo, sandbagMat);
    pSouth.position.set(0, towerH + 0.65, 2.2);
    pSouth.castShadow = true;
    const pEast = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.1, 4.6), sandbagMat);
    pEast.position.set(2.2, towerH + 0.65, 0);
    pEast.castShadow = true;

    towerGroup.add(pNorth, pSouth, pEast);
    shootableMeshes.push(pNorth, pSouth, pEast);

    // Roof canopy over tower
    const roofPoles = new THREE.CylinderGeometry(0.06, 0.06, 2.5, 6);
    offsets.forEach(([ox, oz]) => {
      const pole = new THREE.Mesh(roofPoles, metalLegMat);
      pole.position.set(ox * 0.95, towerH + 1.35, oz * 0.95);
      towerGroup.add(pole);
    });
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.2, 5.2), metalLegMat);
    canopy.position.set(0, towerH + 2.55, 0);
    canopy.castShadow = true;
    towerGroup.add(canopy);

    worldGroup.add(towerGroup);

    // Collider for the tower base
    addCollider(tx - 2.2, 0, tz - 2.2, tx + 2.2, towerH, tz + 2.2);
  };

  // North watchtower and South-West watchtower
  buildWatchtower(-25, -35);
  buildWatchtower(32, 28);

  // --- 4. SHIPPING CONTAINER YARD (Tactical Cover & Labyrinth) ---
  const containerColors = [0x1e3a8a, 0xb91c1c, 0x047857, 0xd97706, 0x374151];

  const buildContainer = (cx: number, cy: number, cz: number, length: number, rotY: number, colorIdx: number) => {
    const cMat = new THREE.MeshStandardMaterial({
      color: containerColors[colorIdx % containerColors.length],
      metalness: 0.65,
      roughness: 0.4,
    });
    const cWidth = 2.6;
    const cHeight = 2.8;
    const cGeo = new THREE.BoxGeometry(cWidth, cHeight, length);
    const container = new THREE.Mesh(cGeo, cMat);
    container.position.set(cx, cy + cHeight / 2, cz);
    container.rotation.y = rotY;
    container.castShadow = true;
    container.receiveShadow = true;
    worldGroup.add(container);
    shootableMeshes.push(container);

    // Compute bounding box for collider
    const halfL = length / 2;
    const halfW = cWidth / 2;
    const rad = Math.max(halfL, halfW);
    addCollider(cx - rad * 0.85, cy, cz - rad * 0.85, cx + rad * 0.85, cy + cHeight, cz + rad * 0.85);
  };

  // Container cluster 1 (West flank)
  buildContainer(-16, 0, 8, 6.5, 0, 0);
  buildContainer(-16, 0, 16, 6.5, 0.1, 1);
  buildContainer(-16, 2.8, 12, 6.5, 0, 3); // Stacked container!
  buildContainer(-23, 0, 12, 6.5, Math.PI / 2, 2);

  // Container cluster 2 (East perimeter)
  buildContainer(30, 0, -10, 6.5, 0.25, 4);
  buildContainer(30, 0, -18, 6.5, -0.1, 0);
  buildContainer(38, 0, -14, 6.5, Math.PI / 2, 1);

  // Central alley barricades
  buildContainer(-6, 0, -22, 6.5, Math.PI / 4, 2);

  // --- 5. CONCRETE ROAD BLOCKS & SANDBAG BARRICADES ---
  const barrierMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.15,
    roughness: 0.8,
  });

  const buildBarricade = (bx: number, bz: number, rotY: number) => {
    const bGeo = new THREE.BoxGeometry(3.2, 1.1, 0.7);
    const b = new THREE.Mesh(bGeo, barrierMat);
    b.position.set(bx, 0.55, bz);
    b.rotation.y = rotY;
    b.castShadow = true;
    b.receiveShadow = true;
    worldGroup.add(b);
    shootableMeshes.push(b);
    addCollider(bx - 1.5, 0, bz - 1.5, bx + 1.5, 1.2, bz + 1.5);
  };

  buildBarricade(0, 15, 0);
  buildBarricade(8, 20, 0.3);
  buildBarricade(-10, 24, -0.2);
  buildBarricade(-28, -8, 0.8);
  buildBarricade(18, -32, -0.6);
  buildBarricade(3, -28, 0.1);

  // --- 6. PROCEDURAL PINE TREES (Foliage & Nature) ---
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x452b14, roughness: 0.9 });
  const needleMat = new THREE.MeshStandardMaterial({ color: 0x1e3a1e, roughness: 0.75 });

  const buildTree = (tx: number, tz: number, scale: number = 1.0) => {
    const tree = new THREE.Group();
    tree.position.set(tx, 0, tz);

    // Trunk
    const trunkH = 2.2 * scale;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25 * scale, 0.35 * scale, trunkH, 7), trunkMat);
    trunk.position.y = trunkH / 2;
    trunk.castShadow = true;
    tree.add(trunk);
    shootableMeshes.push(trunk);

    // 3 Foliage cones
    const c1 = new THREE.Mesh(new THREE.ConeGeometry(2.4 * scale, 3.2 * scale, 7), needleMat);
    c1.position.y = trunkH + 1.2 * scale;
    c1.castShadow = true;

    const c2 = new THREE.Mesh(new THREE.ConeGeometry(1.9 * scale, 2.7 * scale, 7), needleMat);
    c2.position.y = trunkH + 2.5 * scale;
    c2.castShadow = true;

    const c3 = new THREE.Mesh(new THREE.ConeGeometry(1.3 * scale, 2.1 * scale, 7), needleMat);
    c3.position.y = trunkH + 3.8 * scale;
    c3.castShadow = true;

    tree.add(c1, c2, c3);
    shootableMeshes.push(c1, c2, c3);
    worldGroup.add(tree);

    addCollider(tx - 0.5 * scale, 0, tz - 0.5 * scale, tx + 0.5 * scale, 5 * scale, tz + 0.5 * scale);
  };

  // Plant trees across the outer perimeter and open fields
  const treePositions = [
    [-45, -20],
    [-52, -35],
    [-40, -45],
    [-30, -55],
    [-15, -60],
    [10, -55],
    [28, -50],
    [45, -40],
    [55, -25],
    [60, -10],
    [55, 15],
    [48, 35],
    [35, 52],
    [15, 58],
    [-10, 52],
    [-30, 48],
    [-50, 32],
    [-55, 10],
    [-35, 15],
    [-42, -5],
    [22, -18],
    [40, 10],
    [-8, 35],
    [18, 42],
  ];

  treePositions.forEach(([x, z], idx) => {
    buildTree(x, z, 0.85 + (idx % 4) * 0.2);
  });

  // --- 7. SUPPLY CRATES (Tactical Pickups: Health, Ammo, Armor) ---
  const crateDefs: { id: string; type: 'ammo' | 'health' | 'armor'; pos: [number, number, number] }[] = [
    { id: 'crate_ammo_1', type: 'ammo', pos: [0, 0.4, 2] },
    { id: 'crate_health_1', type: 'health', pos: [12, 0.4, -12] },
    { id: 'crate_armor_1', type: 'armor', pos: [-25, 7.8, -35] }, // North tower nest!
    { id: 'crate_ammo_2', type: 'ammo', pos: [32, 7.8, 28] }, // South tower nest!
    { id: 'crate_health_2', type: 'health', pos: [-20, 0.4, 12] },
    { id: 'crate_armor_2', type: 'armor', pos: [34, 0.4, -14] },
    { id: 'crate_ammo_3', type: 'ammo', pos: [-38, 0.4, -25] },
    { id: 'crate_health_3', type: 'health', pos: [25, 0.4, 38] },
  ];

  const crates: SupplyCrate[] = [];
  const crateObjects = new Map<string, THREE.Group>();

  crateDefs.forEach((def) => {
    crates.push({
      id: def.id,
      type: def.type,
      position: def.pos,
      respawnTime: 0,
      active: true,
    });

    const cGroup = new THREE.Group();
    cGroup.position.set(def.pos[0], def.pos[1], def.pos[2]);

    const boxMat = new THREE.MeshStandardMaterial({
      color: def.type === 'ammo' ? 0xf59e0b : def.type === 'health' ? 0xef4444 : 0x3b82f6,
      metalness: 0.5,
      roughness: 0.35,
      emissive: def.type === 'ammo' ? 0x78350f : def.type === 'health' ? 0x7f1d1d : 0x1e3a8a,
      emissiveIntensity: 0.3,
    });

    const boxMesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.8), boxMat);
    boxMesh.castShadow = true;
    cGroup.add(boxMesh);

    // Glowing icon floating overhead
    const beaconMat = new THREE.MeshBasicMaterial({
      color: def.type === 'ammo' ? 0xfde047 : def.type === 'health' ? 0x86efac : 0x93c5fd,
      wireframe: true,
    });
    const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), beaconMat);
    beacon.position.y = 0.7;
    beacon.name = 'beacon';
    cGroup.add(beacon);

    worldGroup.add(cGroup);
    crateObjects.set(def.id, cGroup);
  });

  // Spawn points for player and bots
  const spawnPoints: THREE.Vector3[] = [
    new THREE.Vector3(0, 0, 12),
    new THREE.Vector3(-18, 0, -8),
    new THREE.Vector3(18, 0, 10),
    new THREE.Vector3(-30, 0, 20),
    new THREE.Vector3(26, 0, -22),
    new THREE.Vector3(0, 0, -32),
    new THREE.Vector3(-22, 0, -28),
    new THREE.Vector3(30, 0, 18),
  ];

  // Animation update for world elements (floating beacon rotation, crate respawn ticks)
  let timeElapsed = 0;
  const update = (dt: number) => {
    timeElapsed += dt;

    // Rotate beacons
    crateObjects.forEach((grp, id) => {
      const beacon = grp.getObjectByName('beacon');
      if (beacon) {
        beacon.rotation.y += dt * 2.2;
        beacon.position.y = 0.7 + Math.sin(timeElapsed * 3 + id.charCodeAt(6)) * 0.08;
      }
    });

    // Handle crate respawns
    crates.forEach((crate) => {
      if (!crate.active) {
        crate.respawnTime -= dt;
        if (crate.respawnTime <= 0) {
          crate.active = true;
          const grp = crateObjects.get(crate.id);
          if (grp) grp.visible = true;
        }
      }
    });
  };

  return {
    scene: worldGroup,
    colliders,
    shootableMeshes,
    crates,
    crateObjects,
    spawnPoints,
    update,
  };
}
