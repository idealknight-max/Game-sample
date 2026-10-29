import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { BotState, CombatStats, KillfeedEntry, PlayerInventory, WeaponId } from '../types/game';
import { soundController } from './audio';
import { BotManagerResult, buildCharacterModel, initBotManager } from './botAI';
import { networkManager } from './network';
import {
  buildAssaultRifleModel,
  buildPistolModel,
  buildSniperRifleModel,
  createMuzzleFlash,
  WEAPONS,
} from './weapons';
import { buildOpenWorld, WorldBuildResult } from './world';

// Reusable math objects (Zero GC in render loop)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _camWorldPos = new THREE.Vector3();
const _camWorldDir = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();

export interface EngineCallbacks {
  onHealthArmorChange: (health: number, armor: number) => void;
  onInventoryChange: (inv: PlayerInventory) => void;
  onStatsChange: (stats: CombatStats) => void;
  onHitmarker: (isHeadshot: boolean) => void;
  onKillfeed: (entry: KillfeedEntry) => void;
  onDamageTaken: (dirAngle: number) => void;
  onWeaponChange: (weapon: WeaponId) => void;
  onZoomChange: (isScoped: boolean, weapon: WeaponId) => void;
}

export class GameEngine {
  public container: HTMLElement;
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public isRunning: boolean = false;
  private isSoftwareGl: boolean = false;

  // World & AI
  private world!: WorldBuildResult;
  private botManager!: BotManagerResult;
  private remotePlayerObjects: Map<string, THREE.Group> = new Map();

  // Weapon view models
  private weaponRig: THREE.Group;
  private weaponModels: Record<WeaponId, THREE.Group>;
  private muzzleFlash: ReturnType<typeof createMuzzleFlash>;

  // Player state
  public playerHealth = 100;
  public playerMaxHealth = 100;
  public playerArmor = 50;
  public playerMaxArmor = 100;

  public inventory: PlayerInventory = {
    currentWeapon: 'assault',
    ammo: {
      assault: { inMag: 30, inReserve: 120 },
      sniper: { inMag: 5, inReserve: 25 },
      pistol: { inMag: 12, inReserve: 60 },
    },
  };

  public stats: CombatStats = {
    kills: 0,
    deaths: 0,
    damageDealt: 0,
    headshots: 0,
    shotsFired: 0,
    shotsHit: 0,
    score: 0,
  };

  // Movement & Camera
  public playerPos = new THREE.Vector3(0, 1.7, 14);
  private playerVelocity = new THREE.Vector3();
  private yaw = 0;
  private pitch = 0;
  private isPointerLocked = false;

  // Controls state
  private keys: Record<string, boolean> = {};
  public touchMove = { x: 0, y: 0 };
  private isMouseDown = false;
  private isRightMouseDown = false;
  private isReloading = false;
  private reloadTimer = 0;
  private fireTimer = 0;

  // Feel & Kinematics
  private cameraShake = 0;
  private recoilPitch = 0;
  private recoilYaw = 0;
  private swayX = 0;
  private swayY = 0;
  private bobCycle = 0;
  private footstepTimer = 0;

  // Tracers & Impact particles
  private tracerGroup: THREE.Group;
  private particleGroup: THREE.Group;
  private activeTracers: { mesh: THREE.Line; life: number; maxLife: number }[] = [];
  private activeParticles: { mesh: THREE.Mesh; vel: THREE.Vector3; life: number }[] = [];

  private callbacks: EngineCallbacks;
  private animFrameId: number = 0;
  private clock = new THREE.Clock();
  private lastNetBroadcast = 0;

  constructor(container: HTMLElement, callbacks: EngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    // 1. Detect software WebGL guard
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Setup Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    // 3. Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Daylight sky
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.0042); // Matches horizon

    this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.05, 800);
    this.camera.position.copy(this.playerPos);

    // 4. Studio Environment Reflection via RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Lighting: Warm Key Light + Cool Hemisphere
    const sunLight = new THREE.DirectionalLight(0xfff5e6, 2.2);
    sunLight.position.set(60, 90, 40);
    sunLight.castShadow = !this.isSoftwareGl;
    if (sunLight.castShadow) {
      sunLight.shadow.mapSize.width = 1024;
      sunLight.shadow.mapSize.height = 1024;
      sunLight.shadow.camera.near = 10;
      sunLight.shadow.camera.far = 250;
      sunLight.shadow.camera.left = -60;
      sunLight.shadow.camera.right = 60;
      sunLight.shadow.camera.top = 60;
      sunLight.shadow.camera.bottom = -60;
      sunLight.shadow.bias = -0.0005;
      sunLight.shadow.normalBias = 0.02;
    }
    this.scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0xbae6fd, 0x334155, 1.2);
    this.scene.add(hemiLight);

    // 6. Build World
    this.world = buildOpenWorld();
    this.scene.add(this.world.scene);

    // 7. Bot Manager
    this.botManager = initBotManager(this.world.spawnPoints, this.scene);

    // 8. Particle & Tracer Groups
    this.tracerGroup = new THREE.Group();
    this.particleGroup = new THREE.Group();
    this.scene.add(this.tracerGroup, this.particleGroup);

    // 9. First-person weapon rig attached to camera
    this.weaponRig = new THREE.Group();
    this.camera.add(this.weaponRig);
    this.scene.add(this.camera);

    const assaultMesh = buildAssaultRifleModel();
    const sniperMesh = buildSniperRifleModel();
    const pistolMesh = buildPistolModel();

    this.weaponModels = {
      assault: assaultMesh,
      sniper: sniperMesh,
      pistol: pistolMesh,
    };

    // Position default weapon in first-person view
    Object.entries(this.weaponModels).forEach(([id, mesh]) => {
      mesh.visible = id === this.inventory.currentWeapon;
      mesh.scale.set(0.85, 0.85, 0.85);
      mesh.position.set(0.24, -0.22, -0.45);
      this.weaponRig.add(mesh);
    });

    // Muzzle Flash
    this.muzzleFlash = createMuzzleFlash();
    this.muzzleFlash.group.position.set(0.24, -0.2, -0.95);
    this.weaponRig.add(this.muzzleFlash.group);

    // 10. Bind events
    this.setupInputs();
    this.setupNetwork();

    window.addEventListener('resize', this.onResize);
  }

  private setupInputs() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      // Weapon switching keys 1, 2, 3
      if (e.code === 'Digit1') this.switchWeapon('assault');
      if (e.code === 'Digit2') this.switchWeapon('sniper');
      if (e.code === 'Digit3') this.switchWeapon('pistol');

      // Reload
      if (e.code === 'KeyR') {
        this.startReload();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener('blur', () => {
      this.keys = {};
      this.isMouseDown = false;
      this.isRightMouseDown = false;
    });

    this.container.addEventListener('mousedown', (e) => {
      if (!this.isPointerLocked) {
        this.container.requestPointerLock();
        return;
      }

      if (e.button === 0) {
        this.isMouseDown = true;
        const currentWep = WEAPONS[this.inventory.currentWeapon];
        if (!currentWep.isAutomatic) {
          this.tryShoot();
        }
      } else if (e.button === 2) {
        this.isRightMouseDown = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.isMouseDown = false;
      if (e.button === 2) this.isRightMouseDown = false;
    });

    this.container.addEventListener('contextmenu', (e) => e.preventDefault());

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.container;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isPointerLocked) return;

      const isScoped = this.isRightMouseDown && this.inventory.currentWeapon === 'sniper';
      const sens = isScoped ? 0.0006 : 0.0022;

      this.yaw -= e.movementX * sens;
      this.pitch -= e.movementY * sens;
      this.pitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, this.pitch));

      // Weapon sway
      this.swayX = THREE.MathUtils.clamp(this.swayX - e.movementX * 0.0008, -0.06, 0.06);
      this.swayY = THREE.MathUtils.clamp(this.swayY + e.movementY * 0.0008, -0.06, 0.06);
    });
  }

  private setupNetwork() {
    networkManager.setCallbacks({
      onKillfeed: (entry) => {
        this.callbacks.onKillfeed(entry);
      },
      onChat: () => {},
      onRemoteShoot: (senderId, weapon, origin, dir) => {
        this.spawnTracer(new THREE.Vector3(...origin), new THREE.Vector3(...origin).add(new THREE.Vector3(...dir).multiplyScalar(80)), weapon);
        if (weapon === 'sniper') soundController.playSniperShot();
        else if (weapon === 'pistol') soundController.playPistolShot();
        else soundController.playAssaultShot();
      },
      onDamageReceived: (damage, attackerName, isHeadshot) => {
        this.takeDamage(damage, attackerName, isHeadshot);
      },
    });

    networkManager.broadcastJoin();
  }

  public switchWeapon(newWeapon: WeaponId) {
    if (this.inventory.currentWeapon === newWeapon || this.isReloading) return;
    this.inventory.currentWeapon = newWeapon;

    Object.entries(this.weaponModels).forEach(([id, mesh]) => {
      mesh.visible = id === newWeapon;
    });

    this.callbacks.onWeaponChange(newWeapon);
    this.callbacks.onInventoryChange(this.inventory);
    soundController.playEmptyClick();
  }

  public startReload() {
    const curWepId = this.inventory.currentWeapon;
    const wep = WEAPONS[curWepId];
    const ammoData = this.inventory.ammo[curWepId];

    if (this.isReloading || ammoData.inMag === wep.magSize || ammoData.inReserve <= 0) return;

    this.isReloading = true;
    this.reloadTimer = wep.reloadTime;
    soundController.playReload();
  }

  private tryShoot() {
    if (this.isReloading || this.playerHealth <= 0) return;

    const curWepId = this.inventory.currentWeapon;
    const wep = WEAPONS[curWepId];
    const ammoData = this.inventory.ammo[curWepId];

    if (ammoData.inMag <= 0) {
      soundController.playEmptyClick();
      this.startReload();
      return;
    }

    if (this.fireTimer > 0) return;

    // Fire bullet!
    ammoData.inMag--;
    this.fireTimer = wep.fireRate;
    this.stats.shotsFired++;
    this.callbacks.onInventoryChange(this.inventory);
    this.callbacks.onStatsChange(this.stats);

    // Audio cue
    if (curWepId === 'sniper') soundController.playSniperShot();
    else if (curWepId === 'pistol') soundController.playPistolShot();
    else soundController.playAssaultShot();

    // Muzzle flash
    this.muzzleFlash.trigger();

    // Recoil kinematics
    const isAiming = this.isRightMouseDown;
    const recoilMult = isAiming ? 0.6 : 1.0;
    this.recoilPitch += wep.recoilVertical * recoilMult;
    this.recoilYaw += (Math.random() - 0.5) * wep.recoilHorizontal * recoilMult;
    this.cameraShake = Math.min(0.25, this.cameraShake + (curWepId === 'sniper' ? 0.14 : 0.04));

    // Raycast bullet trajectory
    this.camera.getWorldPosition(_camWorldPos);
    this.camera.getWorldDirection(_camWorldDir);

    // Calculate spread
    const spreadVal = wep.spread * (isAiming ? wep.aimSpreadMultiplier : this.keys['ShiftLeft'] ? wep.spreadSprintMultiplier : 1.0);
    _dir.copy(_camWorldDir);
    _dir.x += (Math.random() - 0.5) * spreadVal;
    _dir.y += (Math.random() - 0.5) * spreadVal;
    _dir.z += (Math.random() - 0.5) * spreadVal;
    _dir.normalize();

    _raycaster.set(_camWorldPos, _dir);
    _raycaster.far = wep.range;

    // Targets: world shootable meshes + bots
    const targets: THREE.Object3D[] = [...this.world.shootableMeshes];
    this.botManager.botObjects.forEach((botGrp) => {
      if (botGrp.visible) targets.push(botGrp);
    });
    this.remotePlayerObjects.forEach((rpGrp) => {
      if (rpGrp.visible) targets.push(rpGrp);
    });

    const intersects = _raycaster.intersectObjects(targets, true);

    const hitPoint = intersects.length > 0 ? intersects[0].point : _camWorldPos.clone().add(_dir.clone().multiplyScalar(wep.range));

    // Spawn tracer
    this.spawnTracer(_camWorldPos, hitPoint, curWepId);

    // Network broadcast shot
    networkManager.broadcastShoot(
      [_camWorldPos.x, _camWorldPos.y, _camWorldPos.z],
      [_dir.x, _dir.y, _dir.z],
      curWepId
    );

    if (intersects.length > 0) {
      const hit = intersects[0];
      const hitObj = hit.object;

      // Check if bot was hit
      let targetBotId: string | null = null;
      let currObj: THREE.Object3D | null = hitObj;
      let isHeadshot = false;

      while (currObj) {
        if (currObj.name === 'head') isHeadshot = true;
        if (currObj.userData?.botId) {
          targetBotId = currObj.userData.botId;
          break;
        }
        currObj = currObj.parent;
      }

      if (targetBotId) {
        // Hit Bot!
        const dmg = wep.damage * (isHeadshot ? wep.headshotMultiplier : 1.0);
        const { isDead, bot } = this.botManager.damageBot(targetBotId, dmg, isHeadshot, networkManager.playerName);

        this.stats.shotsHit++;
        this.stats.damageDealt += dmg;
        if (isHeadshot) this.stats.headshots++;

        soundController.playHitmarker(isHeadshot);
        this.callbacks.onHitmarker(isHeadshot);

        if (isDead && bot) {
          this.stats.kills++;
          this.stats.score += isHeadshot ? 150 : 100;
          soundController.playKillConfirmed();
          networkManager.broadcastKill(bot.name, curWepId, isHeadshot);
        }
        this.callbacks.onStatsChange(this.stats);

        // Blood particles
        this.spawnHitParticles(hit.point, hit.face ? hit.face.normal : new THREE.Vector3(0, 1, 0), 0xdc2626);
      } else {
        // Hit world surface: spark / dust particles
        this.spawnHitParticles(hit.point, hit.face ? hit.face.normal : new THREE.Vector3(0, 1, 0), 0xfacc15);
      }
    }
  }

  private spawnTracer(start: THREE.Vector3, end: THREE.Vector3, weapon: WeaponId) {
    const points = [start.clone().add(new THREE.Vector3(0.15, -0.15, 0)), end];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const col = weapon === 'sniper' ? 0xf59e0b : weapon === 'pistol' ? 0x10b981 : 0x38bdf8;
    const mat = new THREE.LineBasicMaterial({ color: col, linewidth: 2, transparent: true, opacity: 0.85 });
    const line = new THREE.Line(geo, mat);
    this.tracerGroup.add(line);
    this.activeTracers.push({ mesh: line, life: 0.1, maxLife: 0.1 });
  }

  private spawnHitParticles(pos: THREE.Vector3, normal: THREE.Vector3, color: number) {
    const geo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
    const mat = new THREE.MeshBasicMaterial({ color });
    for (let i = 0; i < 6; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      const vel = normal
        .clone()
        .multiplyScalar(2.5 + Math.random() * 2)
        .add(new THREE.Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2));
      this.particleGroup.add(mesh);
      this.activeParticles.push({ mesh, vel, life: 0.3 + Math.random() * 0.2 });
    }
  }

  public takeDamage(amount: number, attackerName: string, isHeadshot: boolean = false) {
    if (this.playerHealth <= 0) return;

    soundController.playHurt();
    this.cameraShake = Math.min(0.35, this.cameraShake + 0.2);

    if (this.playerArmor > 0) {
      const absorb = Math.min(this.playerArmor, amount * 0.55);
      this.playerArmor -= absorb;
      this.playerHealth -= amount - absorb;
    } else {
      this.playerHealth -= amount;
    }

    if (this.playerHealth <= 0) {
      this.playerHealth = 0;
      this.stats.deaths++;
      this.callbacks.onStatsChange(this.stats);
      networkManager.broadcastKill(networkManager.playerName, 'assault', isHeadshot);
    }

    this.callbacks.onHealthArmorChange(this.playerHealth, this.playerArmor);
    this.callbacks.onDamageTaken(Math.random() * 360);
  }

  public respawn() {
    const sp = this.world.spawnPoints[Math.floor(Math.random() * this.world.spawnPoints.length)];
    this.playerPos.set(sp.x, 1.7, sp.z);
    this.playerVelocity.set(0, 0, 0);
    this.playerHealth = this.playerMaxHealth;
    this.playerArmor = 50;
    this.callbacks.onHealthArmorChange(this.playerHealth, this.playerArmor);
  }

  public start() {
    this.isRunning = true;
    this.clock.start();
    this.tick();
  }

  public stop() {
    this.isRunning = false;
    cancelAnimationFrame(this.animFrameId);
  }

  private tick = () => {
    if (!this.isRunning) return;

    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.05); // Frame delta clamp

    this.updatePhysics(dt);
    this.updateWeapons(dt);
    this.updateParticlesAndTracers(dt);

    // Update Bots & World
    this.world.update(dt);
    this.botManager.update(
      dt,
      this.playerPos,
      this.playerHealth,
      (bot: BotState, targetPos: THREE.Vector3) => {
        // Bot fired shot!
        const botObj = this.botManager.botObjects.get(bot.id);
        const origin = botObj ? botObj.position.clone().add(new THREE.Vector3(0, 1.3, 0)) : new THREE.Vector3(...bot.position);
        this.spawnTracer(origin, targetPos, bot.weapon);

        if (bot.weapon === 'sniper') soundController.playSniperShot();
        else if (bot.weapon === 'pistol') soundController.playPistolShot();
        else soundController.playAssaultShot();

        // Check if player is hit by bot
        if (targetPos.distanceTo(this.playerPos) < 1.1) {
          const dmg = WEAPONS[bot.weapon].damage * 0.75; // Balanced bot damage
          this.takeDamage(dmg, bot.name, false);
        }
      },
      this.world.colliders
    );

    // Sync remote network players
    this.updateRemotePlayers(dt);

    // Render scene
    this.renderer.render(this.scene, this.camera);

    this.animFrameId = requestAnimationFrame(this.tick);
  };

  private updatePhysics(dt: number) {
    if (this.playerHealth <= 0) return;

    // Movement calculation
    const isSprinting = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
    const isCrouching = this.keys['KeyC'];
    const moveSpeed = isCrouching ? 2.5 : isSprinting ? 8.2 : 4.8;

    _v1.set(0, 0, 0);
    if (this.keys['KeyW']) _v1.z -= 1;
    if (this.keys['KeyS']) _v1.z += 1;
    if (this.keys['KeyA']) _v1.x -= 1;
    if (this.keys['KeyD']) _v1.x += 1;
    if (this.touchMove.x !== 0 || this.touchMove.y !== 0) {
      _v1.x += this.touchMove.x;
      _v1.z += this.touchMove.y;
    }

    if (_v1.lengthSq() > 0) {
      _v1.normalize();

      // Footsteps
      this.footstepTimer += dt * (isSprinting ? 2.2 : 1.4);
      if (this.footstepTimer > 1.0) {
        this.footstepTimer = 0;
        soundController.playFootstep();
      }

      // Bob cycle
      this.bobCycle += dt * (isSprinting ? 14 : 9);
    } else {
      this.footstepTimer = 0.5;
    }

    // Rotate movement vector by yaw
    _v2.copy(_v1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

    // Horizontal acceleration & friction
    this.playerVelocity.x = THREE.MathUtils.damp(this.playerVelocity.x, _v2.x * moveSpeed, 12, dt);
    this.playerVelocity.z = THREE.MathUtils.damp(this.playerVelocity.z, _v2.z * moveSpeed, 12, dt);

    // Gravity
    this.playerVelocity.y -= 18.0 * dt;

    // Jump
    if (this.keys['Space'] && Math.abs(this.playerVelocity.y) < 0.1 && this.playerPos.y <= 1.75) {
      this.playerVelocity.y = 6.2;
    }

    // Desired next position
    const nextX = this.playerPos.x + this.playerVelocity.x * dt;
    const nextZ = this.playerPos.z + this.playerVelocity.z * dt;
    const nextY = this.playerPos.y + this.playerVelocity.y * dt;

    // Simple AABB collision resolution against world obstacles
    const radius = 0.45;
    let finalX = nextX;
    let finalZ = nextZ;

    for (const col of this.world.colliders) {
      if (nextY >= col.min.y && nextY <= col.max.y + 1.8) {
        if (finalX + radius > col.min.x && finalX - radius < col.max.x && this.playerPos.z + radius > col.min.z && this.playerPos.z - radius < col.max.z) {
          finalX = this.playerPos.x;
        }
        if (finalZ + radius > col.min.z && finalZ - radius < col.max.z && this.playerPos.x + radius > col.min.x && this.playerPos.x - radius < col.max.x) {
          finalZ = this.playerPos.z;
        }
      }
    }

    this.playerPos.x = finalX;
    this.playerPos.z = finalZ;
    this.playerPos.y = Math.max(isCrouching ? 1.1 : 1.7, nextY);

    if (this.playerPos.y <= (isCrouching ? 1.1 : 1.7)) {
      this.playerVelocity.y = 0;
    }

    // Camera recoil decay
    this.recoilPitch = THREE.MathUtils.damp(this.recoilPitch, 0, 10, dt);
    this.recoilYaw = THREE.MathUtils.damp(this.recoilYaw, 0, 10, dt);
    this.cameraShake = THREE.MathUtils.damp(this.cameraShake, 0, 8, dt);

    // Camera rotation
    const shakeX = (Math.random() - 0.5) * this.cameraShake * 0.12;
    const shakeY = (Math.random() - 0.5) * this.cameraShake * 0.12;
    this.camera.rotation.set(this.pitch + this.recoilPitch + shakeY, this.yaw + this.recoilYaw + shakeX, 0, 'YXZ');

    // Camera position with bobbing
    const bobOffset = _v1.lengthSq() > 0 ? Math.sin(this.bobCycle) * 0.05 : 0;
    this.camera.position.set(this.playerPos.x, this.playerPos.y + bobOffset, this.playerPos.z);

    // Supply crate pickup check
    for (const crate of this.world.crates) {
      if (crate.active) {
        const crateV = new THREE.Vector3(...crate.position);
        if (crateV.distanceTo(this.playerPos) < 2.0) {
          crate.active = false;
          crate.respawnTime = 18; // 18s cooldown
          const obj = this.world.crateObjects.get(crate.id);
          if (obj) obj.visible = false;

          soundController.playPickup();

          if (crate.type === 'health') {
            this.playerHealth = Math.min(this.playerMaxHealth, this.playerHealth + 40);
          } else if (crate.type === 'armor') {
            this.playerArmor = Math.min(this.playerMaxArmor, this.playerArmor + 50);
          } else if (crate.type === 'ammo') {
            const wepId = this.inventory.currentWeapon;
            this.inventory.ammo[wepId].inReserve += WEAPONS[wepId].magSize * 2;
            this.callbacks.onInventoryChange(this.inventory);
          }
          this.callbacks.onHealthArmorChange(this.playerHealth, this.playerArmor);
        }
      }
    }
  }

  private updateWeapons(dt: number) {
    const curWepId = this.inventory.currentWeapon;
    const wep = WEAPONS[curWepId];

    // Fire cooldown
    if (this.fireTimer > 0) {
      this.fireTimer -= dt;
    }

    // Auto fire for assault rifle
    if (this.isMouseDown && wep.isAutomatic && this.fireTimer <= 0) {
      this.tryShoot();
    }

    // Reload progress
    if (this.isReloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.isReloading = false;
        const ammoData = this.inventory.ammo[curWepId];
        const needed = wep.magSize - ammoData.inMag;
        const take = Math.min(needed, ammoData.inReserve);
        ammoData.inMag += take;
        ammoData.inReserve -= take;
        this.callbacks.onInventoryChange(this.inventory);
      }
    }

    // ADS Zoom FOV
    const isAiming = this.isRightMouseDown;
    const targetFov = isAiming ? wep.zoomFov : 75;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 14, dt);
    this.camera.updateProjectionMatrix();
    this.callbacks.onZoomChange(isAiming, curWepId);

    // Weapon sway recovery
    this.swayX = THREE.MathUtils.damp(this.swayX, 0, 8, dt);
    this.swayY = THREE.MathUtils.damp(this.swayY, 0, 8, dt);

    // Muzzle flash update
    this.muzzleFlash.update(dt);

    // First person weapon position and animation
    const curMesh = this.weaponModels[curWepId];
    if (curMesh) {
      // If scoped with sniper, hide viewmodel so scope reticle covers screen nicely
      const isSniperScoped = isAiming && curWepId === 'sniper';
      curMesh.visible = !isSniperScoped;

      // Base offset: centered when aiming, offset right when hipfiring
      const targetX = isAiming ? 0 : 0.24;
      const targetY = isAiming ? -0.16 : -0.22;
      const targetZ = isAiming ? -0.38 : -0.45;

      curMesh.position.x = THREE.MathUtils.damp(curMesh.position.x, targetX + this.swayX, 12, dt);
      curMesh.position.y = THREE.MathUtils.damp(curMesh.position.y, targetY + this.swayY, 12, dt);
      curMesh.position.z = THREE.MathUtils.damp(curMesh.position.z, targetZ, 12, dt);

      // Reload dip animation
      if (this.isReloading) {
        const reloadProg = this.reloadTimer / wep.reloadTime;
        curMesh.rotation.x = THREE.MathUtils.damp(curMesh.rotation.x, -0.4 + Math.sin(reloadProg * Math.PI) * 0.3, 10, dt);
      } else {
        curMesh.rotation.x = THREE.MathUtils.damp(curMesh.rotation.x, 0, 12, dt);
      }
    }
  }

  private updateParticlesAndTracers(dt: number) {
    // Tracers fade
    for (let i = this.activeTracers.length - 1; i >= 0; i--) {
      const t = this.activeTracers[i];
      t.life -= dt;
      if (t.life <= 0) {
        this.tracerGroup.remove(t.mesh);
        t.mesh.geometry.dispose();
        (t.mesh.material as THREE.Material).dispose();
        this.activeTracers.splice(i, 1);
      } else {
        const mat = t.mesh.material as THREE.LineBasicMaterial;
        mat.opacity = t.life / t.maxLife;
      }
    }

    // Particles physics
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const p = this.activeParticles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particleGroup.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.activeParticles.splice(i, 1);
      } else {
        p.vel.y -= 9.8 * dt; // gravity
        p.mesh.position.addScaledVector(p.vel, dt);
        p.mesh.scale.multiplyScalar(0.96);
      }
    }
  }

  private updateRemotePlayers(dt: number) {
    const now = Date.now();

    // Broadcast our state every 60ms
    if (now - this.lastNetBroadcast > 60) {
      this.lastNetBroadcast = now;
      networkManager.broadcastUpdate({
        position: [this.playerPos.x, this.playerPos.y, this.playerPos.z],
        rotationY: this.yaw,
        pitch: this.pitch,
        weapon: this.inventory.currentWeapon,
        health: this.playerHealth,
        armor: this.playerArmor,
        isShooting: this.isMouseDown,
        isCrouching: !!this.keys['KeyC'],
        kills: this.stats.kills,
        deaths: this.stats.deaths,
      });
      networkManager.purgeStalePlayers();
    }

    // Sync remote players 3D meshes
    for (const [id, remote] of networkManager.remotePlayers.entries()) {
      let obj = this.remotePlayerObjects.get(id);
      if (!obj) {
        const colInt = parseInt(remote.color.replace('#', '0x'), 16);
        obj = buildCharacterModel(colInt, remote.weapon);
        this.scene.add(obj);
        this.remotePlayerObjects.set(id, obj);
      }

      // Smooth interpolation
      obj.position.x = THREE.MathUtils.damp(obj.position.x, remote.position[0], 15, dt);
      obj.position.y = THREE.MathUtils.damp(obj.position.y, remote.position[1], 15, dt);
      obj.position.z = THREE.MathUtils.damp(obj.position.z, remote.position[2], 15, dt);
      obj.rotation.y = THREE.MathUtils.damp(obj.rotation.y, remote.rotationY, 15, dt);
    }

    // Remove disconnected remote players
    for (const [id, obj] of this.remotePlayerObjects.entries()) {
      if (!networkManager.remotePlayers.has(id)) {
        this.scene.remove(obj);
        this.remotePlayerObjects.delete(id);
      }
    }
  }

  public addTouchLook(dx: number, dy: number) {
    const isScoped = this.isRightMouseDown && this.inventory.currentWeapon === 'sniper';
    const sens = isScoped ? 0.0022 : 0.0055;
    this.yaw -= dx * sens;
    this.pitch -= dy * sens;
    this.pitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, this.pitch));
  }

  public setTouchShoot(shooting: boolean) {
    this.isMouseDown = shooting;
    if (shooting) {
      const currentWep = WEAPONS[this.inventory.currentWeapon];
      if (!currentWep.isAutomatic) {
        this.tryShoot();
      }
    }
  }

  public toggleTouchAim() {
    this.isRightMouseDown = !this.isRightMouseDown;
  }

  public touchJump() {
    if (Math.abs(this.playerVelocity.y) < 0.1 && this.playerPos.y <= 1.75) {
      this.playerVelocity.y = 6.2;
    }
  }

  private onResize = () => {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  public dispose() {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
