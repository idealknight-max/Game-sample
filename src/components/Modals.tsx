import React from 'react';
import { CombatStats, WeaponId } from '../types/game';
import { WEAPONS } from '../game/weapons';

interface PauseModalProps {
  isOpen: boolean;
  onResume: () => void;
  onRestart: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  currentWeapon: WeaponId;
  onSelectWeapon: (w: WeaponId) => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  isOpen,
  onResume,
  onRestart,
  isMuted,
  onToggleMute,
  currentWeapon,
  onSelectWeapon,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 p-6 backdrop-blur-none font-sans select-none">
      <div className="bg-neutral-900 border border-neutral-700/80 p-8 rounded-2xl max-w-md w-full shadow-2xl flex flex-col gap-6 text-white text-center">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-mono font-bold tracking-widest text-sky-400">POLYZONE TACTICAL PAUSE</span>
          <h2 className="text-2xl font-bold font-mono">MISSION SUSPENDED</h2>
        </div>

        {/* Weapon quick selection */}
        <div className="flex flex-col gap-2 text-left">
          <span className="text-xs font-mono uppercase text-neutral-400">CURRENT WEAPON:</span>
          <div className="grid grid-cols-3 gap-2">
            {(['assault', 'sniper', 'pistol'] as WeaponId[]).map((wId) => {
              const w = WEAPONS[wId];
              const isSelected = currentWeapon === wId;
              return (
                <button
                  key={wId}
                  onClick={() => onSelectWeapon(wId)}
                  className={`p-2.5 rounded-lg border font-mono text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                      : 'bg-neutral-800/80 border-neutral-700 text-neutral-400 hover:text-white'
                  }`}
                >
                  {w.category}
                </button>
              );
            })}
          </div>
        </div>

        {/* Audio Mute Setting */}
        <div className="flex items-center justify-between p-3 bg-neutral-800/60 rounded-xl border border-neutral-700/60">
          <span className="text-sm font-medium text-neutral-300">Procedural Audio Synth</span>
          <button
            onClick={onToggleMute}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold cursor-pointer transition-colors ${
              isMuted ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            }`}
          >
            {isMuted ? 'MUTED' : 'ENABLED'}
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onResume}
            className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-neutral-950 font-mono font-bold text-sm tracking-wider uppercase rounded-xl transition-all shadow-lg cursor-pointer"
          >
            RESUME COMBAT (ESC)
          </button>
          <button
            onClick={onRestart}
            className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-xs font-semibold uppercase rounded-xl border border-neutral-700 transition-colors cursor-pointer"
          >
            EXIT TO TITLE SCREEN
          </button>
        </div>
      </div>
    </div>
  );
};

interface GameOverModalProps {
  isOpen: boolean;
  stats: CombatStats;
  onRespawn: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ isOpen, stats, onRespawn }) => {
  if (!isOpen) return null;

  const accuracy = stats.shotsFired > 0 ? Math.round((stats.shotsHit / stats.shotsFired) * 100) : 0;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 p-6 backdrop-blur-none font-sans select-none">
      <div className="bg-neutral-900 border border-rose-500/40 p-8 rounded-2xl max-w-md w-full shadow-[0_0_50px_rgba(244,63,94,0.15)] flex flex-col gap-6 text-white text-center">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-mono font-bold tracking-widest text-rose-500">CRITICAL CASUALTY</span>
          <h2 className="text-3xl font-extrabold font-mono tracking-tight text-white">OPERATOR DOWN</h2>
        </div>

        {/* Match Statistics Summary */}
        <div className="grid grid-cols-2 gap-3 p-4 bg-neutral-950/80 rounded-xl border border-neutral-800 font-mono text-left">
          <div className="flex flex-col">
            <span className="text-[11px] text-neutral-400">TOTAL KILLS</span>
            <span className="text-xl font-bold text-emerald-400 tabular-nums">{stats.kills}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] text-neutral-400">HEADSHOTS</span>
            <span className="text-xl font-bold text-amber-400 tabular-nums">{stats.headshots}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] text-neutral-400">ACCURACY</span>
            <span className="text-xl font-bold text-sky-400 tabular-nums">{accuracy}%</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] text-neutral-400">COMBAT SCORE</span>
            <span className="text-xl font-bold text-purple-400 tabular-nums">{stats.score}</span>
          </div>
        </div>

        {/* Redeploy CTA */}
        <button
          onClick={onRespawn}
          className="w-full py-4 bg-rose-500 hover:bg-rose-400 text-neutral-950 font-mono font-bold text-base tracking-widest uppercase rounded-xl transition-all shadow-[0_0_25px_rgba(244,63,94,0.4)] cursor-pointer"
        >
          REDEPLOY TO COMBAT ZONE
        </button>
      </div>
    </div>
  );
};
