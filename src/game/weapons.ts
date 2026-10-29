import * as THREE from 'three';
import { WeaponData, WeaponId } from '../types/game';

export const WEAPONS: Record<WeaponId, WeaponData> = {
  assault: {
    id: 'assault',
    name: 'ARC-4 Assault Rifle',
    category: 'Assault',
    damage: 28,
    headshotMultiplier: 2.0,
    fireRate: 0.1, // 600 RPM
    magSize: 30,
    reserveAmmo: 150,
    reloadTime: 1.4,
    spread: 0.02,
    spreadSprintMultiplier: 2.2,
    aimSpreadMultiplier: 0.35,
    range: 160,
    bulletSpeed: 380,
    recoilVertical: 0.038,
    recoilHorizontal: 0.016,
    zoomFov: 58,
    isAutomatic: true,
    barrelLength: 0.75,
    color: '#38bdf8',
    description: 'Fully automatic tactical rifle. High cyclic rate, reliable mid-to-long range versatility.',
  },
  sniper: {
    id: 'sniper',
    name: 'Vanguard .50 Bolt Sniper',
    category: 'Sniper',
    damage: 105,
    headshotMultiplier: 2.5, // 262.5 dmg (instant fatal headshot)
    fireRate: 1.15, // Bolt cycle delay
    magSize: 5,
    reserveAmmo: 30,
    reloadTime: 2.2,
    spread: 0.065,
    spreadSprintMultiplier: 3.5,
    aimSpreadMultiplier: 0.005, // Pinpoint precision when scoped
    range: 350,
    bulletSpeed: 650,
    recoilVertical: 0.13,
    recoilHorizontal: 0.025,
    zoomFov: 18, // 4.5x optical scope zoom
    isAutomatic: false,
    barrelLength: 1.25,
    color: '#f59e0b',
    description: 'Heavy bolt-action anti-materiel sniper. Devastating damage and extreme optical magnification.',
  },
  pistol: {
    id: 'pistol',
    name: 'Apex-9 Tactical Sidearm',
    category: 'Pistol',
    damage: 36,
    headshotMultiplier: 1.8,
    fireRate: 0.17, // Semi-auto rapid tap
    magSize: 12,
    reserveAmmo: 72,
    reloadTime: 0.9,
    spread: 0.016,
    spreadSprintMultiplier: 1.6,
    aimSpreadMultiplier: 0.4,
    range: 90,
    bulletSpeed: 280,
    recoilVertical: 0.032,
    recoilHorizontal: 0.012,
    zoomFov: 66,
    isAutomatic: false,
    barrelLength: 0.42,
    color: '#10b981',
    description: 'Lightweight high-mobility sidearm with crisp semi-auto trigger and rapid holster swap.',
  },
};

/**
 * Procedural Materials for weapons
 */
function createWeaponMaterials() {
  const metalReceiver = new THREE.MeshStandardMaterial({
    color: 0x1f242d,
    metalness: 0.85,
    roughness: 0.28,
  });

  const bluedSteel = new THREE.MeshStandardMaterial({
    color: 0x12161c,
    metalness: 0.95,
    roughness: 0.18,
  });

  const tacticalPolymer = new THREE.MeshStandardMaterial({
    color: 0x272e38,
    metalness: 0.15,
    roughness: 0.75,
  });

  const accentColor = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    metalness: 0.4,
    roughness: 0.35,
    emissive: 0x082f49,
    emissiveIntensity: 0.2,
  });

  const goldBrass = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.9,
    roughness: 0.2,
  });

  const opticalGlass = new THREE.MeshPhysicalMaterial({
    color: 0x67e8f9,
    metalness: 0.1,
    roughness: 0.05,
    transparent: true,
    opacity: 0.7,
  });

  return { metalReceiver, bluedSteel, tacticalPolymer, accentColor, goldBrass, opticalGlass };
}

/**
 * Builds a composite 3-12 part procedural 3D model for the Assault Rifle
 */
export function buildAssaultRifleModel(): THREE.Group {
  const group = new THREE.Group();
  const mats = createWeaponMaterials();

  // 1. Lower & Upper Receiver (Main Body)
  const receiverGeo = new THREE.BoxGeometry(0.06, 0.11, 0.38);
  const receiver = new THREE.Mesh(receiverGeo, mats.metalReceiver);
  receiver.position.set(0, 0, -0.05);
  receiver.castShadow = true;
  group.add(receiver);

  // 2. Barrel Assembly
  const barrelGeo = new THREE.CylinderGeometry(0.014, 0.015, 0.42, 10);
  barrelGeo.rotateX(Math.PI / 2);
  const barrel = new THREE.Mesh(barrelGeo, mats.bluedSteel);
  barrel.position.set(0, 0.025, -0.42);
  barrel.castShadow = true;
  group.add(barrel);

  // 3. Muzzle Brake / Compensator
  const muzzleGeo = new THREE.CylinderGeometry(0.02, 0.018, 0.07, 10);
  muzzleGeo.rotateX(Math.PI / 2);
  const muzzle = new THREE.Mesh(muzzleGeo, mats.bluedSteel);
  muzzle.position.set(0, 0.025, -0.66);
  group.add(muzzle);

  // 4. Handguard / Picatinny Rail
  const handguardGeo = new THREE.BoxGeometry(0.055, 0.07, 0.26);
  const handguard = new THREE.Mesh(handguardGeo, mats.tacticalPolymer);
  handguard.position.set(0, 0.02, -0.32);
  group.add(handguard);

  // 5. Curved Banana Magazine
  const magGeo = new THREE.BoxGeometry(0.045, 0.18, 0.08);
  const mag = new THREE.Mesh(magGeo, mats.tacticalPolymer);
  mag.position.set(0, -0.12, -0.08);
  mag.rotation.x = -0.22;
  group.add(mag);

  // 6. Tactical Pistol Grip
  const gripGeo = new THREE.BoxGeometry(0.045, 0.15, 0.06);
  const grip = new THREE.Mesh(gripGeo, mats.tacticalPolymer);
  grip.position.set(0, -0.11, 0.09);
  grip.rotation.x = 0.28;
  group.add(grip);

  // 7. Tactical Telescopic Stock
  const stockTubeGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.22, 8);
  stockTubeGeo.rotateX(Math.PI / 2);
  const stockTube = new THREE.Mesh(stockTubeGeo, mats.bluedSteel);
  stockTube.position.set(0, 0.01, 0.21);
  group.add(stockTube);

  const buttpadGeo = new THREE.BoxGeometry(0.05, 0.15, 0.05);
  const buttpad = new THREE.Mesh(buttpadGeo, mats.tacticalPolymer);
  buttpad.position.set(0, -0.02, 0.32);
  group.add(buttpad);

  // 8. Holo Sight / Iron Sights
  const sightBaseGeo = new THREE.BoxGeometry(0.04, 0.04, 0.1);
  const sightBase = new THREE.Mesh(sightBaseGeo, mats.bluedSteel);
  sightBase.position.set(0, 0.075, -0.08);
  group.add(sightBase);

  const sightLensGeo = new THREE.RingGeometry(0.012, 0.02, 12);
  const sightLens = new THREE.Mesh(sightLensGeo, mats.opticalGlass);
  sightLens.position.set(0, 0.075, -0.03);
  group.add(sightLens);

  // 9. Accent stripe
  const stripeGeo = new THREE.BoxGeometry(0.062, 0.015, 0.18);
  const stripe = new THREE.Mesh(stripeGeo, mats.accentColor);
  stripe.position.set(0, 0.03, -0.05);
  group.add(stripe);

  group.name = 'weapon_assault';
  return group;
}

/**
 * Builds a composite procedural 3D model for the Sniper Rifle
 */
export function buildSniperRifleModel(): THREE.Group {
  const group = new THREE.Group();
  const mats = createWeaponMaterials();
  mats.accentColor.color.setHex(0xf59e0b);
  mats.accentColor.emissive.setHex(0x78350f);

  // 1. Long Anti-Materiel Receiver
  const receiverGeo = new THREE.BoxGeometry(0.065, 0.12, 0.52);
  const receiver = new THREE.Mesh(receiverGeo, mats.metalReceiver);
  receiver.position.set(0, 0, 0);
  receiver.castShadow = true;
  group.add(receiver);

  // 2. Heavy Fluted Long Barrel
  const barrelGeo = new THREE.CylinderGeometry(0.016, 0.02, 0.85, 12);
  barrelGeo.rotateX(Math.PI / 2);
  const barrel = new THREE.Mesh(barrelGeo, mats.bluedSteel);
  barrel.position.set(0, 0.035, -0.68);
  barrel.castShadow = true;
  group.add(barrel);

  // 3. Huge Muzzle Brake (Baffled)
  const brakeGeo = new THREE.BoxGeometry(0.05, 0.04, 0.11);
  const brake = new THREE.Mesh(brakeGeo, mats.bluedSteel);
  brake.position.set(0, 0.035, -1.14);
  group.add(brake);

  // 4. Large Variable Zoom Optical Scope Tube
  const scopeTubeGeo = new THREE.CylinderGeometry(0.026, 0.026, 0.36, 12);
  scopeTubeGeo.rotateX(Math.PI / 2);
  const scopeTube = new THREE.Mesh(scopeTubeGeo, mats.bluedSteel);
  scopeTube.position.set(0, 0.12, -0.05);
  group.add(scopeTube);

  // Scope Lenses (Front & Rear)
  const frontBellGeo = new THREE.CylinderGeometry(0.036, 0.026, 0.08, 12);
  frontBellGeo.rotateX(Math.PI / 2);
  const frontBell = new THREE.Mesh(frontBellGeo, mats.bluedSteel);
  frontBell.position.set(0, 0.12, -0.26);
  group.add(frontBell);

  const frontLensGeo = new THREE.CircleGeometry(0.032, 12);
  const frontLens = new THREE.Mesh(frontLensGeo, mats.opticalGlass);
  frontLens.position.set(0, 0.12, -0.3);
  group.add(frontLens);

  // Scope Turret Knobs (Elevation & Windage)
  const turretGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.02, 8);
  const turretTop = new THREE.Mesh(turretGeo, mats.goldBrass);
  turretTop.position.set(0, 0.155, -0.05);
  group.add(turretTop);

  // Scope Mount Rings
  const mountGeo = new THREE.BoxGeometry(0.045, 0.06, 0.03);
  const mountFront = new THREE.Mesh(mountGeo, mats.tacticalPolymer);
  mountFront.position.set(0, 0.08, -0.15);
  const mountBack = new THREE.Mesh(mountGeo, mats.tacticalPolymer);
  mountBack.position.set(0, 0.08, 0.08);
  group.add(mountFront, mountBack);

  // 5. Bolt Handle
  const boltLeverGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.06, 6);
  boltLeverGeo.rotateZ(Math.PI / 3);
  const boltLever = new THREE.Mesh(boltLeverGeo, mats.bluedSteel);
  boltLever.position.set(0.045, 0.03, 0.08);
  const boltKnob = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), mats.bluedSteel);
  boltKnob.position.set(0.07, 0.055, 0.08);
  group.add(boltLever, boltKnob);

  // 6. Straight Heavy Magazine
  const magGeo = new THREE.BoxGeometry(0.042, 0.14, 0.1);
  const mag = new THREE.Mesh(magGeo, mats.tacticalPolymer);
  mag.position.set(0, -0.1, -0.06);
  group.add(mag);

  // 7. Ergonomic Sniper Stock with Cheek Rest
  const stockGeo = new THREE.BoxGeometry(0.055, 0.14, 0.34);
  const stock = new THREE.Mesh(stockGeo, mats.tacticalPolymer);
  stock.position.set(0, -0.01, 0.38);
  group.add(stock);

  const cheekRestGeo = new THREE.BoxGeometry(0.06, 0.03, 0.15);
  const cheekRest = new THREE.Mesh(cheekRestGeo, mats.metalReceiver);
  cheekRest.position.set(0, 0.07, 0.35);
  group.add(cheekRest);

  // 8. Folded Bipod on Handguard
  const bipodMountGeo = new THREE.BoxGeometry(0.04, 0.03, 0.05);
  const bipodMount = new THREE.Mesh(bipodMountGeo, mats.bluedSteel);
  bipodMount.position.set(0, -0.02, -0.52);
  group.add(bipodMount);

  // 9. Grip
  const gripGeo = new THREE.BoxGeometry(0.042, 0.14, 0.06);
  const grip = new THREE.Mesh(gripGeo, mats.tacticalPolymer);
  grip.position.set(0, -0.11, 0.14);
  grip.rotation.x = 0.25;
  group.add(grip);

  group.name = 'weapon_sniper';
  return group;
}

/**
 * Builds a composite procedural 3D model for the Tactical Pistol
 */
export function buildPistolModel(): THREE.Group {
  const group = new THREE.Group();
  const mats = createWeaponMaterials();
  mats.accentColor.color.setHex(0x10b981);
  mats.accentColor.emissive.setHex(0x064e3b);

  // 1. Slide (Upper Body with Serrations)
  const slideGeo = new THREE.BoxGeometry(0.048, 0.06, 0.25);
  const slide = new THREE.Mesh(slideGeo, mats.bluedSteel);
  slide.position.set(0, 0.03, -0.04);
  slide.castShadow = true;
  group.add(slide);

  // 2. Lower Polymer Frame
  const frameGeo = new THREE.BoxGeometry(0.045, 0.04, 0.22);
  const frame = new THREE.Mesh(frameGeo, mats.tacticalPolymer);
  frame.position.set(0, -0.01, -0.04);
  group.add(frame);

  // 3. Ergonomic Grip
  const gripGeo = new THREE.BoxGeometry(0.042, 0.14, 0.065);
  const grip = new THREE.Mesh(gripGeo, mats.tacticalPolymer);
  grip.position.set(0, -0.08, 0.045);
  grip.rotation.x = 0.24;
  group.add(grip);

  // 4. Trigger Guard & Trigger
  const guardGeo = new THREE.BoxGeometry(0.02, 0.05, 0.065);
  const guard = new THREE.Mesh(guardGeo, mats.bluedSteel);
  guard.position.set(0, -0.04, -0.02);
  group.add(guard);

  // 5. Barrel Crown & Thread
  const barrelGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.05, 8);
  barrelGeo.rotateX(Math.PI / 2);
  const barrel = new THREE.Mesh(barrelGeo, mats.metalReceiver);
  barrel.position.set(0, 0.03, -0.17);
  group.add(barrel);

  // 6. Tactical Rail & Flashlight Underbarrel
  const tacLightGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.08, 8);
  tacLightGeo.rotateX(Math.PI / 2);
  const tacLight = new THREE.Mesh(tacLightGeo, mats.bluedSteel);
  tacLight.position.set(0, -0.04, -0.1);
  group.add(tacLight);

  // 7. Sights (Rear notch + Front post with optic green dots)
  const rearSightGeo = new THREE.BoxGeometry(0.03, 0.018, 0.015);
  const rearSight = new THREE.Mesh(rearSightGeo, mats.metalReceiver);
  rearSight.position.set(0, 0.065, 0.06);
  group.add(rearSight);

  const frontSightGeo = new THREE.BoxGeometry(0.01, 0.018, 0.012);
  const frontSight = new THREE.Mesh(frontSightGeo, mats.accentColor);
  frontSight.position.set(0, 0.065, -0.14);
  group.add(frontSight);

  group.name = 'weapon_pistol';
  return group;
}

/**
 * Creates procedural muzzle flash mesh and dynamic light
 */
export function createMuzzleFlash(): { group: THREE.Group; light: THREE.PointLight; trigger: () => void; update: (dt: number) => void } {
  const group = new THREE.Group();
  let flashLife = 0;

  // Flash spike petals (3 intersecting crossed planes)
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xfffbeb,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const petalGeo = new THREE.PlaneGeometry(0.18, 0.18);
  for (let i = 0; i < 3; i++) {
    const p = new THREE.Mesh(petalGeo, flashMat);
    p.rotation.z = (i * Math.PI) / 3;
    group.add(p);
  }

  // Core flare sphere
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), coreMat);
  group.add(core);

  // Dynamic light
  const light = new THREE.PointLight(0xfef08a, 0, 8);
  group.add(light);

  const trigger = () => {
    flashLife = 0.06; // 60ms flash burst
    group.rotation.z = Math.random() * Math.PI * 2;
    const s = 0.8 + Math.random() * 0.4;
    group.scale.set(s, s, s);
    flashMat.opacity = 0.95;
    coreMat.opacity = 1.0;
    light.intensity = 3.5;
  };

  const update = (dt: number) => {
    if (flashLife > 0) {
      flashLife -= dt;
      if (flashLife <= 0) {
        flashLife = 0;
        flashMat.opacity = 0;
        coreMat.opacity = 0;
        light.intensity = 0;
      } else {
        const factor = flashLife / 0.06;
        flashMat.opacity = 0.95 * factor;
        coreMat.opacity = factor;
        light.intensity = 3.5 * factor;
      }
    }
  };

  return { group, light, trigger, update };
}
