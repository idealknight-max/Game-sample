export type WeaponId = 'assault' | 'sniper' | 'pistol';

export interface WeaponData {
  id: WeaponId;
  name: string;
  category: string;
  damage: number;
  headshotMultiplier: number;
  fireRate: number; // seconds between shots
  magSize: number;
  reserveAmmo: number;
  reloadTime: number; // seconds
  spread: number; // base hipfire spread radians
  spreadSprintMultiplier: number;
  aimSpreadMultiplier: number;
  range: number;
  bulletSpeed: number; // hitscan or fast projectile
  recoilVertical: number;
  recoilHorizontal: number;
  zoomFov: number; // normal is ~75
  isAutomatic: boolean;
  barrelLength: number;
  color: string;
  description: string;
}

export interface PlayerInventory {
  currentWeapon: WeaponId;
  ammo: Record<WeaponId, { inMag: number; inReserve: number }>;
}

export interface CombatStats {
  kills: number;
  deaths: number;
  damageDealt: number;
  headshots: number;
  shotsFired: number;
  shotsHit: number;
  score: number;
}

export interface BotState {
  id: string;
  name: string;
  color: string;
  health: number;
  maxHealth: number;
  armor: number;
  maxArmor: number;
  weapon: WeaponId;
  position: [number, number, number];
  rotationY: number;
  aimPitch: number;
  isShooting: boolean;
  isReloading: boolean;
  kills: number;
  deaths: number;
  ping: number;
  isHostileToPlayer: boolean;
  aiBehavior: 'patrol' | 'engage' | 'snipe' | 'cover' | 'hunt';
  targetPos?: [number, number, number];
}

export interface KillfeedEntry {
  id: string;
  killer: string;
  victim: string;
  weapon: WeaponId;
  isHeadshot: boolean;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface SupplyCrate {
  id: string;
  type: 'ammo' | 'health' | 'armor';
  position: [number, number, number];
  respawnTime: number;
  active: boolean;
}

export interface HitEffect {
  id: string;
  position: [number, number, number];
  normal: [number, number, number];
  type: 'metal' | 'dirt' | 'flesh';
  timestamp: number;
}

export interface TracerLine {
  id: string;
  start: [number, number, number];
  end: [number, number, number];
  color: string;
  progress: number;
}
