import * as THREE from 'three';
import { BotState, WeaponId } from '../types/game';
import { buildAssaultRifleModel, buildPistolModel, buildSniperRifleModel, WEAPONS } from './weapons';
import { WorldCollisionBox } from './world';

export interface BotManagerResult {
  bots: BotState[];
  botObjects: Map<string, THREE.Group>;
  update: (
    dt: number,
    playerPos: THREE.Vector3,
    playerHealth: number,
    onBotShoot: (bot: BotState, targetPos: THREE.Vector3) => void,
    colliders: WorldCollisionBox[]
  ) => void;
  damageBot: (botId: string, damage: number, isHeadshot: boolean, attackerName: string) => { isDead: boolean; bot: BotState | null };
  resetBots: () => void;
}

/**
 * Procedural 3D Soldier Character Model (Torso, Vest, Helmet, Visor, Limbs, Weapon in hands)
 */
export function buildCharacterModel(teamColorHex: number, weaponType: WeaponId): THREE.Group {
  const group = new THREE.Group();

  const uniformMat = new THREE.MeshStandardMaterial({
    color: 0x334155, // Slate camo
    roughness: 0.8,
  });

  const vestMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.6,
  });

  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xd4a373,
    roughness: 0.7,
  });

  const helmetMat = new THREE.MeshStandardMaterial({
    color: teamColorHex,
    roughness: 0.45,
    metalness: 0.2,
  });

  const visorMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.1,
    metalness: 0.9,
  });

  // Pelvis / Hips
  const hipsGeo = new THREE.BoxGeometry(0.5, 0.25, 0.32);
  const hips = new THREE.Mesh(hipsGeo, uniformMat);
  hips.position.y = 0.85;
  group.add(hips);

  // Legs (Left & Right)
  const legGeo = new THREE.BoxGeometry(0.2, 0.75, 0.22);
  const leftLeg = new THREE.Mesh(legGeo, uniformMat);
  leftLeg.position.set(-0.16, 0.42, 0);
  leftLeg.name = 'leftLeg';
  const rightLeg = new THREE.Mesh(legGeo, uniformMat);
  rightLeg.position.set(0.16, 0.42, 0);
  rightLeg.name = 'rightLeg';
  group.add(leftLeg, rightLeg);

  // Boots
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
  const bootGeo = new THREE.BoxGeometry(0.22, 0.16, 0.28);
  const leftBoot = new THREE.Mesh(bootGeo, bootMat);
  leftBoot.position.set(-0.16, 0.08, 0.02);
  const rightBoot = new THREE.Mesh(bootGeo, bootMat);
  rightBoot.position.set(0.16, 0.08, 0.02);
  group.add(leftBoot, rightBoot);

  // Torso / Chest
  const torsoGeo = new THREE.BoxGeometry(0.55, 0.65, 0.35);
  const torso = new THREE.Mesh(torsoGeo, uniformMat);
  torso.position.y = 1.25;
  torso.castShadow = true;
  group.add(torso);

  // Tactical Vest
  const vestGeo = new THREE.BoxGeometry(0.58, 0.5, 0.38);
  const vest = new THREE.Mesh(vestGeo, vestMat);
  vest.position.y = 1.25;
  group.add(vest);

  // Head (with designated 'head' name for headshot raycasting!)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.72, 0);
  headGroup.name = 'head';

  const headGeo = new THREE.SphereGeometry(0.18, 10, 10);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.castShadow = true;
  headGroup.add(head);

  // Combat Helmet
  const helmetGeo = new THREE.SphereGeometry(0.2, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const helmet = new THREE.Mesh(helmetGeo, helmetMat);
  helmet.position.y = 0.02;
  headGroup.add(helmet);

  // Tactical Visor
  const visorGeo = new THREE.BoxGeometry(0.24, 0.08, 0.12);
  const visor = new THREE.Mesh(visorGeo, visorMat);
  visor.position.set(0, 0.02, 0.14);
  headGroup.add(visor);

  group.add(headGroup);

  // Arms & Weapon in hands
  const armGeo = new THREE.BoxGeometry(0.14, 0.6, 0.14);
  const leftArm = new THREE.Mesh(armGeo, uniformMat);
  leftArm.position.set(-0.35, 1.2, 0.15);
  leftArm.rotation.x = -Math.PI / 3;
  leftArm.rotation.y = 0.3;

  const rightArm = new THREE.Mesh(armGeo, uniformMat);
  rightArm.position.set(0.35, 1.2, 0.15);
  rightArm.rotation.x = -Math.PI / 3;
  rightArm.rotation.y = -0.3;
  group.add(leftArm, rightArm);

  // Weapon attachment
  let weaponModel: THREE.Group;
  if (weaponType === 'sniper') {
    weaponModel = buildSniperRifleModel();
    weaponModel.scale.set(0.65, 0.65, 0.65);
    weaponModel.position.set(0.2, 1.15, 0.45);
    weaponModel.rotation.y = Math.PI;
  } else if (weaponType === 'pistol') {
    weaponModel = buildPistolModel();
    weaponModel.scale.set(0.75, 0.75, 0.75);
    weaponModel.position.set(0.18, 1.15, 0.4);
    weaponModel.rotation.y = Math.PI;
  } else {
    weaponModel = buildAssaultRifleModel();
    weaponModel.scale.set(0.65, 0.65, 0.65);
    weaponModel.position.set(0.2, 1.15, 0.45);
    weaponModel.rotation.y = Math.PI;
  }
  weaponModel.name = 'equippedWeapon';
  group.add(weaponModel);

  // Floating Health Bar & Name Canvas Sprite
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#10b981';
  ctx.fillRect(20, 36, 216, 16);
  const spriteTex = new THREE.CanvasTexture(canvas);
  spriteTex.colorSpace = THREE.SRGBColorSpace;
  const spriteMat = new THREE.SpriteMaterial({ map: spriteTex, depthTest: false });
  const overheadSprite = new THREE.Sprite(spriteMat);
  overheadSprite.position.set(0, 2.3, 0);
  overheadSprite.scale.set(1.6, 0.4, 1);
  overheadSprite.name = 'overheadSprite';
  overheadSprite.raycast = () => {}; // UI sprite should not intercept bullet raycasts
  group.add(overheadSprite);

  return group;
}

/**
 * Initializes and manages tactical AI bots
 */
export function initBotManager(spawnPoints: THREE.Vector3[], worldScene: THREE.Object3D): BotManagerResult {
  const initialBots: BotState[] = [
    {
      id: 'bot_1',
      name: 'Viper_99',
      color: '#ef4444',
      health: 100,
      maxHealth: 100,
      armor: 50,
      maxArmor: 50,
      weapon: 'assault',
      position: [-15, 0, 18],
      rotationY: 0,
      aimPitch: 0,
      isShooting: false,
      isReloading: false,
      kills: 0,
      deaths: 0,
      ping: 28,
      isHostileToPlayer: true,
      aiBehavior: 'patrol',
    },
    {
      id: 'bot_2',
      name: 'Ghost_Kilo',
      color: '#f59e0b',
      health: 100,
      maxHealth: 100,
      armor: 50,
      maxArmor: 50,
      weapon: 'sniper',
      position: [-25, 7.5, -35], // North tower platform!
      rotationY: Math.PI / 4,
      aimPitch: 0,
      isShooting: false,
      isReloading: false,
      kills: 0,
      deaths: 0,
      ping: 34,
      isHostileToPlayer: true,
      aiBehavior: 'snipe',
    },
    {
      id: 'bot_3',
      name: 'Apex_Shadow',
      color: '#10b981',
      health: 100,
      maxHealth: 100,
      armor: 50,
      maxArmor: 50,
      weapon: 'pistol',
      position: [16, 0, -12],
      rotationY: -Math.PI / 2,
      aimPitch: 0,
      isShooting: false,
      isReloading: false,
      kills: 0,
      deaths: 0,
      ping: 22,
      isHostileToPlayer: true,
      aiBehavior: 'patrol',
    },
    {
      id: 'bot_4',
      name: 'Zero_One',
      color: '#a855f7',
      health: 100,
      maxHealth: 100,
      armor: 50,
      maxArmor: 50,
      weapon: 'assault',
      position: [28, 0, 20],
      rotationY: Math.PI,
      aimPitch: 0,
      isShooting: false,
      isReloading: false,
      kills: 0,
      deaths: 0,
      ping: 45,
      isHostileToPlayer: true,
      aiBehavior: 'patrol',
    },
    {
      id: 'bot_5',
      name: 'HawkEye_7',
      color: '#eab308',
      health: 100,
      maxHealth: 100,
      armor: 50,
      maxArmor: 50,
      weapon: 'sniper',
      position: [32, 7.5, 28], // South tower platform!
      rotationY: -Math.PI / 2,
      aimPitch: 0,
      isShooting: false,
      isReloading: false,
      kills: 0,
      deaths: 0,
      ping: 39,
      isHostileToPlayer: true,
      aiBehavior: 'snipe',
    },
    {
      id: 'bot_6',
      name: 'Rogue_Echo',
      color: '#06b6d4',
      health: 100,
      maxHealth: 100,
      armor: 50,
      maxArmor: 50,
      weapon: 'pistol',
      position: [-8, 0, -26],
      rotationY: 0,
      aimPitch: 0,
      isShooting: false,
      isReloading: false,
      kills: 0,
      deaths: 0,
      ping: 31,
      isHostileToPlayer: true,
      aiBehavior: 'patrol',
    },
  ];

  const bots = [...initialBots];
  const botObjects = new Map<string, THREE.Group>();
  const botCooldowns = new Map<string, number>();
  const respawnTimers = new Map<string, number>();
  const walkCycleTime = new Map<string, number>();

  // Spawn visual 3D representations
  bots.forEach((b) => {
    const colInt = parseInt(b.color.replace('#', '0x'), 16);
    const model = buildCharacterModel(colInt, b.weapon);
    model.position.set(b.position[0], b.position[1], b.position[2]);
    model.rotation.y = b.rotationY;
    model.userData = { botId: b.id };
    worldScene.add(model);
    botObjects.set(b.id, model);
    botCooldowns.set(b.id, 0);
    walkCycleTime.set(b.id, 0);
  });

  const updateOverheadCanvas = (bot: BotState, sprite: THREE.Sprite) => {
    const mat = sprite.material as THREE.SpriteMaterial;
    const canvas = (mat.map?.image as HTMLCanvasElement) || document.createElement('canvas');
    if (!mat.map?.image) {
      canvas.width = 256;
      canvas.height = 64;
    }
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 256, 64);

    // Name text
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText(bot.name, 128, 24);

    // Health bar bg
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(20, 36, 216, 14);

    // Health bar fill
    const hpRatio = Math.max(0, bot.health / bot.maxHealth);
    ctx.fillStyle = hpRatio > 0.5 ? '#10b981' : hpRatio > 0.25 ? '#f59e0b' : '#ef4444';
    ctx.fillRect(20, 36, 216 * hpRatio, 14);

    if (mat.map) {
      mat.map.needsUpdate = true;
    }
  };

  const update = (
    dt: number,
    playerPos: THREE.Vector3,
    playerHealth: number,
    onBotShoot: (bot: BotState, targetPos: THREE.Vector3) => void,
    colliders: WorldCollisionBox[]
  ) => {
    bots.forEach((bot) => {
      // Check if dead / waiting respawn
      const respawnTime = respawnTimers.get(bot.id) || 0;
      if (respawnTime > 0) {
        respawnTimers.set(bot.id, respawnTime - dt);
        if (respawnTime - dt <= 0) {
          // Respawn bot at random spawn
          const sp = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
          bot.health = bot.maxHealth;
          bot.armor = bot.maxArmor;
          bot.position = [sp.x, sp.y, sp.z];
          const obj = botObjects.get(bot.id);
          if (obj) {
            obj.position.set(sp.x, sp.y, sp.z);
            obj.visible = true;
          }
        }
        return;
      }

      const obj = botObjects.get(bot.id);
      if (!obj) return;

      const currentCd = botCooldowns.get(bot.id) || 0;
      if (currentCd > 0) {
        botCooldowns.set(bot.id, currentCd - dt);
      }

      // Compute vector to player
      const botPos = new THREE.Vector3(bot.position[0], bot.position[1], bot.position[2]);
      const distToPlayer = botPos.distanceTo(playerPos);
      const weaponCfg = WEAPONS[bot.weapon];

      // Bot tactical behavior state machine
      const canSeePlayer = playerHealth > 0 && distToPlayer < (bot.weapon === 'sniper' ? 180 : 75);

      // Simple raycast obstacle test to avoid shooting through warehouse walls
      let hasLineOfSight = canSeePlayer;
      if (canSeePlayer) {
        const toPlayer = new THREE.Vector3().subVectors(playerPos, botPos).normalize();
        // Check colliders intersection
        for (const col of colliders) {
          // If collider is high enough to block line of sight (above 1.5m)
          if (col.max.y > 1.8) {
            const minX = Math.min(botPos.x, playerPos.x);
            const maxX = Math.max(botPos.x, playerPos.x);
            const minZ = Math.min(botPos.z, playerPos.z);
            const maxZ = Math.max(botPos.z, playerPos.z);
            if (col.min.x < maxX && col.max.x > minX && col.min.z < maxZ && col.max.z > minZ) {
              // rough bounding block test
              if (distToPlayer > 25 && Math.random() < 0.1) {
                hasLineOfSight = false;
                break;
              }
            }
          }
        }
      }

      // Walk cycle animation
      let isMoving = false;

      if (hasLineOfSight) {
        // Aim at player
        const dx = playerPos.x - botPos.x;
        const dz = playerPos.z - botPos.z;
        const targetAngle = Math.atan2(dx, dz);

        // Smooth rotation
        bot.rotationY = THREE.MathUtils.damp(bot.rotationY, targetAngle, 8, dt);
        obj.rotation.y = bot.rotationY;

        // Snipers stay stationed in towers, others strafe or approach
        if (bot.weapon === 'sniper') {
          // Hold position and snipe
        } else if (distToPlayer > 18) {
          // Move toward player
          const speed = bot.weapon === 'pistol' ? 4.8 : 3.8;
          bot.position[0] += Math.sin(bot.rotationY) * speed * dt;
          bot.position[2] += Math.cos(bot.rotationY) * speed * dt;
          isMoving = true;
        } else if (distToPlayer < 8) {
          // Back up / strafe away
          const speed = 2.5;
          bot.position[0] -= Math.sin(bot.rotationY) * speed * dt;
          bot.position[2] -= Math.cos(bot.rotationY) * speed * dt;
          isMoving = true;
        }

        // Shooting logic
        if (currentCd <= 0) {
          // Add minor aim inaccuracy based on weapon
          const inaccuracy = bot.weapon === 'sniper' ? 0.4 : bot.weapon === 'assault' ? 0.75 : 0.6;
          const targetWithSpread = playerPos.clone().add(
            new THREE.Vector3(
              (Math.random() - 0.5) * inaccuracy,
              1.2 + (Math.random() - 0.5) * inaccuracy * 0.5,
              (Math.random() - 0.5) * inaccuracy
            )
          );

          onBotShoot(bot, targetWithSpread);
          const nextDelay = weaponCfg.fireRate * (bot.weapon === 'assault' ? 1.0 + Math.random() * 0.4 : 1.2 + Math.random() * 0.6);
          botCooldowns.set(bot.id, nextDelay);
        }
      } else {
        // Patrol around area
        const patrolTime = (Date.now() / 1000 + bot.id.charCodeAt(4)) * 0.6;
        if (bot.weapon !== 'sniper') {
          const wanderX = Math.sin(patrolTime * 0.7) * 2.2;
          const wanderZ = Math.cos(patrolTime * 0.5) * 2.2;
          bot.position[0] += wanderX * dt;
          bot.position[2] += wanderZ * dt;
          bot.rotationY = Math.atan2(wanderX, wanderZ);
          obj.rotation.y = bot.rotationY;
          isMoving = true;
        }
      }

      // Animate leg swings when moving
      const leftLeg = obj.getObjectByName('leftLeg');
      const rightLeg = obj.getObjectByName('rightLeg');
      if (leftLeg && rightLeg) {
        if (isMoving) {
          const walkT = (walkCycleTime.get(bot.id) || 0) + dt * 10;
          walkCycleTime.set(bot.id, walkT);
          leftLeg.rotation.x = Math.sin(walkT) * 0.6;
          rightLeg.rotation.x = -Math.sin(walkT) * 0.6;
        } else {
          leftLeg.rotation.x = 0;
          rightLeg.rotation.x = 0;
        }
      }

      // Update position
      obj.position.set(bot.position[0], bot.position[1], bot.position[2]);

      // Update overhead sprite
      const overhead = obj.getObjectByName('overheadSprite') as THREE.Sprite | undefined;
      if (overhead) {
        updateOverheadCanvas(bot, overhead);
      }
    });
  };

  const damageBot = (botId: string, damage: number, isHeadshot: boolean, attackerName: string): { isDead: boolean; bot: BotState | null } => {
    const bot = bots.find((b) => b.id === botId);
    if (!bot) return { isDead: false, bot: null };

    // Armor absorption
    if (bot.armor > 0) {
      const absorbed = Math.min(bot.armor, damage * 0.5);
      bot.armor -= absorbed;
      bot.health -= damage - absorbed;
    } else {
      bot.health -= damage;
    }

    if (bot.health <= 0) {
      bot.health = 0;
      bot.deaths += 1;
      respawnTimers.set(bot.id, 4.5); // Respawn in 4.5s
      const obj = botObjects.get(bot.id);
      if (obj) obj.visible = false;
      return { isDead: true, bot };
    }

    return { isDead: false, bot };
  };

  const resetBots = () => {
    bots.forEach((b, idx) => {
      const init = initialBots[idx];
      b.health = init.health;
      b.armor = init.armor;
      b.position = [...init.position];
      b.rotationY = init.rotationY;
      const obj = botObjects.get(b.id);
      if (obj) {
        obj.position.set(b.position[0], b.position[1], b.position[2]);
        obj.visible = true;
      }
    });
  };

  return {
    bots,
    botObjects,
    update,
    damageBot,
    resetBots,
  };
}
