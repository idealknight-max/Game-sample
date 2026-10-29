import React, { useState } from 'react';
import { WeaponId } from '../types/game';
import { WEAPONS } from '../game/weapons';

interface TitleScreenProps {
  onStartGame: (selectedWeapon: WeaponId, playerName: string) => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStartGame }) => {
  const [selectedWeapon, setSelectedWeapon] = useState<WeaponId>('assault');
  const [playerName, setPlayerName] = useState('Ghost_Operator');

  const curWep = WEAPONS[selectedWeapon];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.code === 'Enter' || e.code === 'Space') {
      onStartGame(selectedWeapon, playerName);
    }
  };

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="absolute inset-0 z-50 flex flex-col justify-between p-8 sm:p-12 text-white outline-none select-none bg-neutral-950/80"
    >
      {/* Background ambient gradient vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 40%, rgba(14, 165, 233, 0.08) 0%, rgba(2, 6, 23, 0.85) 75%)',
        }}
      />

      {/* TOP: Sector status & Server connectivity badge */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span className="text-xs font-mono font-semibold tracking-widest text-neutral-300">
            NETWORK STATUS: MULTIPLAYER PEER ONLINE · 6 TACTICAL BOTS ACTIVE
          </span>
        </div>

        <div className="text-xs font-mono text-neutral-400 border border-neutral-800 bg-neutral-900/60 px-3 py-1 rounded">
          VERSION 1.0.4 · OPEN WORLD COMBAT
        </div>
      </div>

      {/* CENTER: Bespoke Title Lockup + 30-40% Negative Space */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto my-auto">
        {/* Inline SVG Title Lockup */}
        <div className="flex items-center gap-4 mb-4">
          <svg className="w-12 h-12 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="22" y1="12" x2="18" y2="12" />
            <line x1="6" y1="12" x2="2" y2="12" />
            <line x1="12" y1="6" x2="12" y2="2" />
            <line x1="12" y1="22" x2="12" y2="18" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <div className="flex flex-col text-left">
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight font-mono uppercase bg-gradient-to-r from-white via-neutral-200 to-sky-400 bg-clip-text text-transparent">
              POLYZONE
            </h1>
            <span className="text-sm sm:text-base font-mono tracking-widest text-sky-400 font-bold uppercase -mt-1">
              OPEN WORLD 3D GUNNER
            </span>
          </div>
        </div>

        <p className="text-neutral-400 text-sm max-w-lg mb-8 leading-relaxed font-sans">
          Deploy onto an open-world island battlefield. Outgun enemy players and tactical AI bots across warehouses,
          sniping watchtowers, and shipping container yards.
        </p>

        {/* Player Call-sign Name input */}
        <div className="flex items-center gap-2 mb-6 bg-neutral-900/80 border border-neutral-700/80 px-4 py-2 rounded-xl shadow-lg">
          <span className="text-xs font-mono text-neutral-400 font-bold">CODENAME:</span>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value.substring(0, 16))}
            className="bg-transparent border-none text-sky-400 font-mono text-sm font-bold focus:outline-none focus:ring-0 w-36"
            placeholder="Operator Name"
          />
        </div>

        {/* 3 GUN TYPES LOADOUT SELECTOR */}
        <div className="flex flex-col gap-2 w-full max-w-xl mb-8">
          <span className="text-xs font-mono uppercase tracking-widest text-neutral-400 text-left">
            PRIMARY WEAPON SELECTION:
          </span>
          <div className="grid grid-cols-3 gap-3">
            {(['assault', 'sniper', 'pistol'] as WeaponId[]).map((wId) => {
              const w = WEAPONS[wId];
              const isSelected = selectedWeapon === wId;

              return (
                <button
                  key={wId}
                  onClick={() => setSelectedWeapon(wId)}
                  className={`flex flex-col text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-neutral-800/90 border-sky-400 text-white shadow-[0_0_20px_rgba(56,189,248,0.2)] scale-[1.02]'
                      : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-bold uppercase text-sky-400">{w.category}</span>
                    <span className="text-[10px] font-mono bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-400">
                      {w.magSize} RDS
                    </span>
                  </div>
                  <span className="font-bold text-sm text-white mb-2">{w.name}</span>
                  <div className="flex flex-col gap-1 text-[11px] font-mono text-neutral-400">
                    <div className="flex justify-between">
                      <span>DMG</span>
                      <strong className="text-neutral-200">{w.damage}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>RPM</span>
                      <strong className="text-neutral-200">{Math.round(60 / w.fireRate)}</strong>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="text-xs font-mono text-neutral-400 bg-neutral-900/50 p-2.5 rounded-lg border border-neutral-800/80 text-left">
            <strong className="text-sky-400">{curWep.name}:</strong> {curWep.description}
          </div>
        </div>

        {/* PRIMARY START CTA BUTTON */}
        <button
          onClick={() => onStartGame(selectedWeapon, playerName)}
          className="group relative inline-flex items-center justify-center px-10 py-4 font-mono font-bold tracking-widest uppercase rounded-xl bg-sky-500 hover:bg-sky-400 text-neutral-950 shadow-[0_0_30px_rgba(14,165,233,0.4)] transition-all cursor-pointer transform hover:-translate-y-0.5"
        >
          <span className="flex items-center gap-3 text-base">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            DEPLOY TO ZONE (SPACE / ENTER)
          </span>
        </button>
      </div>

      {/* BOTTOM: Single flat control hint line */}
      <div className="relative z-10 text-center">
        <p className="text-xs font-mono tracking-wider text-neutral-400">
          WASD Move · Click Shoot · Right-Click ADS Zoom · 1/2/3 Weapons · R Reload · C Crouch · Shift Sprint · Esc Pause
        </p>
      </div>
    </div>
  );
};
