import React from 'react';
import { CombatStats, KillfeedEntry, PlayerInventory, WeaponId } from '../types/game';
import { WEAPONS } from '../game/weapons';

interface HUDProps {
  health: number;
  armor: number;
  inventory: PlayerInventory;
  stats: CombatStats;
  isScoped: boolean;
  scopedWeapon: WeaponId;
  killfeed: KillfeedEntry[];
  showHitmarker: boolean;
  hitmarkerHeadshot: boolean;
  damageDirection: number | null;
  onSwitchWeapon: (w: WeaponId) => void;
  onToggleMute: () => void;
  isMuted: boolean;
}

export const HUD: React.FC<HUDProps> = ({
  health,
  armor,
  inventory,
  stats,
  isScoped,
  scopedWeapon,
  killfeed,
  showHitmarker,
  hitmarkerHeadshot,
  damageDirection,
  onSwitchWeapon,
  onToggleMute,
  isMuted,
}) => {
  const curWep = WEAPONS[inventory.currentWeapon];
  const ammo = inventory.ammo[inventory.currentWeapon];
  const isSniperScope = isScoped && scopedWeapon === 'sniper';

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden font-sans">
      {/* 1. SNIPER OPTICAL SCOPE OVERLAY */}
      {isSniperScope && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          {/* Black outer mask with circular transparent aperture */}
          <div
            className="w-[min(90vw,90vh)] h-[min(90vw,90vh)] rounded-full border-4 border-neutral-900 relative shadow-[0_0_0_100vmax_rgba(5,7,12,0.96)] overflow-hidden"
            style={{
              background: 'radial-gradient(circle, rgba(14,165,233,0.04) 0%, rgba(2,6,23,0.4) 85%, rgba(0,0,0,0.85) 100%)',
            }}
          >
            {/* Scope Crosshairs */}
            <div className="absolute top-0 bottom-0 left-1/2 w-[1.5px] -translate-x-1/2 bg-black/85"></div>
            <div className="absolute left-0 right-0 top-1/2 h-[1.5px] -translate-y-1/2 bg-black/85"></div>

            {/* Mil-dot graduation ticks */}
            {[-120, -80, -40, 40, 80, 120].map((offset) => (
              <React.Fragment key={offset}>
                <div
                  className="absolute left-1/2 top-1/2 w-4 h-[1px] bg-black/80 -translate-x-1/2"
                  style={{ transform: `translate(-50%, ${offset}px)` }}
                />
                <div
                  className="absolute left-1/2 top-1/2 h-4 w-[1px] bg-black/80 -translate-y-1/2"
                  style={{ transform: `translate(${offset}px, -50%)` }}
                />
              </React.Fragment>
            ))}

            {/* Tactical Compass / Range reading */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 text-xs font-mono font-bold tracking-widest text-amber-400/80 px-2 py-0.5 bg-black/60 rounded">
              ELEVATION: +0.25 MIL · RNG: 240M
            </div>

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs font-mono tracking-wider text-neutral-400 bg-black/60 px-3 py-1 rounded">
              [HOLD SHIFT: STEADY BREATH]
            </div>
          </div>
        </div>
      )}

      {/* 2. REGULAR DYNAMIC CROSSHAIR & HITMARKER */}
      {!isSniperScope && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
          {/* Central dot */}
          <div className="w-1.5 h-1.5 bg-white/90 rounded-full shadow-sm" />

          {/* Crosshair 4 ticks */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-[1.5px] h-2 bg-white/80" />
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-[1.5px] h-2 bg-white/80" />
          <div className="absolute -left-3 top-1/2 -translate-y-1/2 h-[1.5px] w-2 bg-white/80" />
          <div className="absolute -right-3 top-1/2 -translate-y-1/2 h-[1.5px] w-2 bg-white/80" />

          {/* Hitmarker X */}
          {showHitmarker && (
            <div
              className={`absolute w-7 h-7 border-2 ${
                hitmarkerHeadshot ? 'border-red-500 scale-125' : 'border-amber-400'
              } rotate-45 animate-out fade-out duration-150`}
            />
          )}
        </div>
      )}

      {/* 3. DAMAGE DIRECTION VIGNETTE ARCS */}
      {damageDirection !== null && (
        <div className="absolute inset-0 border-8 border-red-600/40 pointer-events-none animate-pulse" />
      )}

      {/* 4. PERIMETER TOP CLUSTER: MATCH STATS & KILLFEED */}
      <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
        {/* Top-Left: Player Tag & Score */}
        <div className="flex items-center gap-3 bg-neutral-900/85 text-white px-3.5 py-2 rounded-lg border border-neutral-700/60 shadow-lg">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <div className="flex flex-col">
            <span className="text-xs font-mono font-semibold tracking-wider text-neutral-300">POLYZONE · SECTOR 4</span>
            <div className="flex items-center gap-3 text-xs font-mono text-neutral-400">
              <span>
                KILLS <strong className="text-emerald-400 tabular-nums">{stats.kills}</strong>
              </span>
              <span>
                DEATHS <strong className="text-rose-400 tabular-nums">{stats.deaths}</strong>
              </span>
              <span>
                SCORE <strong className="text-amber-400 tabular-nums">{stats.score}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Top-Right: Killfeed */}
        <div className="flex flex-col gap-1.5 max-w-xs items-end">
          {killfeed.slice(-4).map((entry) => (
            <div
              key={entry.id}
              className="bg-neutral-950/85 border border-neutral-800 text-xs font-mono text-white px-3 py-1.5 rounded flex items-center gap-2 shadow-md"
            >
              <span className="font-bold text-sky-400">{entry.killer}</span>
              <span className="text-neutral-400 uppercase text-[10px] px-1 bg-neutral-800 rounded">
                [{entry.weapon}]
              </span>
              {entry.isHeadshot && <span className="text-rose-400 font-bold text-[10px]">🎯 HS</span>}
              <span className="font-medium text-neutral-300">{entry.victim}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. PERIMETER BOTTOM STATUS CLUSTER */}
      <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between">
        {/* Bottom-Left: Vitality Bars (Health & Armor) */}
        <div className="bg-neutral-950/90 border border-neutral-800/90 p-3.5 rounded-xl text-white shadow-xl flex flex-col gap-2 min-w-[240px]">
          {/* Health */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
                HEALTH
              </span>
              <span className="font-bold tabular-nums text-sm">{Math.round(health)}</span>
            </div>
            <div className="h-2.5 w-full bg-neutral-800 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-150 ${
                  health > 50 ? 'bg-emerald-500' : health > 25 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${Math.max(0, Math.min(100, health))}%` }}
              />
            </div>
          </div>

          {/* Armor */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="flex items-center gap-1.5 font-bold text-sky-400">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                </svg>
                ARMOR
              </span>
              <span className="font-bold tabular-nums text-sm">{Math.round(armor)}</span>
            </div>
            <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-sky-500 rounded-full transition-all duration-150"
                style={{ width: `${Math.max(0, Math.min(100, armor))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Bottom-Center: Sleek Weapon Selection Dock */}
        <div className="pointer-events-auto flex items-center gap-2 bg-neutral-950/90 border border-neutral-800 p-1.5 rounded-xl shadow-2xl">
          {(['assault', 'sniper', 'pistol'] as WeaponId[]).map((wId, idx) => {
            const wepData = WEAPONS[wId];
            const isEquipped = inventory.currentWeapon === wId;
            const wAmmo = inventory.ammo[wId];

            return (
              <button
                key={wId}
                onClick={() => onSwitchWeapon(wId)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                  isEquipped
                    ? 'bg-neutral-800 text-white border border-sky-500/50 shadow-md scale-105'
                    : 'bg-neutral-900/60 text-neutral-400 hover:text-white border border-transparent'
                }`}
              >
                <span className="text-[10px] font-mono font-bold bg-neutral-700/80 px-1.5 py-0.5 rounded text-neutral-200">
                  {idx + 1}
                </span>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold leading-tight">{wepData.category}</span>
                  <span className="text-[10px] font-mono tabular-nums text-neutral-400">
                    {wAmmo.inMag} / {wAmmo.inReserve}
                  </span>
                </div>
              </button>
            );
          })}

          {/* Audio toggle button */}
          <button
            onClick={onToggleMute}
            className="p-2 ml-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? (
              <svg className="w-4 h-4 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </button>
        </div>

        {/* Bottom-Right: Large Ammo Counter & Gun Silhouette */}
        <div className="bg-neutral-950/90 border border-neutral-800/90 p-4 rounded-xl text-white shadow-xl flex items-center gap-4 min-w-[200px] justify-end">
          <div className="flex flex-col items-end">
            <span className="text-xs font-mono font-bold tracking-wider text-sky-400">{curWep.name.toUpperCase()}</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-3xl font-extrabold font-mono tabular-nums leading-none text-white">{ammo.inMag}</span>
              <span className="text-sm font-mono font-medium text-neutral-400">/ {ammo.inReserve}</span>
            </div>
            <span className="text-[10px] font-mono text-neutral-400 mt-1">[R] RELOAD</span>
          </div>

          <div className="w-12 h-12 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-sky-400">
            {curWep.id === 'sniper' ? (
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="9" />
                <line x1="12" y1="3" x2="12" y2="21" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            ) : curWep.id === 'pistol' ? (
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 8h12v4H9v6H5V8z" />
                <path d="M16 8l4 2v2l-4-1" />
              </svg>
            ) : (
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M2 10h16v3h-5l-1 5h-3l1-5H2v-3z" />
                <path d="M18 10l4 1v2l-4-1" />
                <path d="M6 13v4" />
              </svg>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
