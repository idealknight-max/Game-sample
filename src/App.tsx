import React, { useEffect, useRef, useState } from 'react';
import { HUD } from './components/HUD';
import { GameOverModal, PauseModal } from './components/Modals';
import { TitleScreen } from './components/TitleScreen';
import { soundController } from './game/audio';
import { GameEngine } from './game/engine';
import { networkManager } from './game/network';
import { WEAPONS } from './game/weapons';
import { CombatStats, KillfeedEntry, PlayerInventory, WeaponId } from './types/game';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Game UI State
  const [phase, setPhase] = useState<'title' | 'playing' | 'paused' | 'gameover'>('title');
  const [health, setHealth] = useState(100);
  const [armor, setArmor] = useState(50);
  const [inventory, setInventory] = useState<PlayerInventory>({
    currentWeapon: 'assault',
    ammo: {
      assault: { inMag: 30, inReserve: 120 },
      sniper: { inMag: 5, inReserve: 25 },
      pistol: { inMag: 12, inReserve: 60 },
    },
  });
  const [stats, setStats] = useState<CombatStats>({
    kills: 0,
    deaths: 0,
    damageDealt: 0,
    headshots: 0,
    shotsFired: 0,
    shotsHit: 0,
    score: 0,
  });

  const [isScoped, setIsScoped] = useState(false);
  const [scopedWeapon, setScopedWeapon] = useState<WeaponId>('assault');
  const [killfeed, setKillfeed] = useState<KillfeedEntry[]>([]);
  const [showHitmarker, setShowHitmarker] = useState(false);
  const [hitmarkerHeadshot, setHitmarkerHeadshot] = useState(false);
  const [damageDirection, setDamageDirection] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Initialize Three.js WebGL Engine once on mount
  useEffect(() => {
    if (!mountRef.current) return;

    const engine = new GameEngine(mountRef.current, {
      onHealthArmorChange: (h, a) => {
        setHealth(h);
        setArmor(a);
        if (h <= 0) {
          setPhase('gameover');
          document.exitPointerLock?.();
        }
      },
      onInventoryChange: (inv) => {
        setInventory({ ...inv, ammo: { ...inv.ammo } });
      },
      onStatsChange: (st) => {
        setStats({ ...st });
      },
      onHitmarker: (isHeadshot) => {
        setHitmarkerHeadshot(isHeadshot);
        setShowHitmarker(true);
        setTimeout(() => setShowHitmarker(false), 120);
      },
      onKillfeed: (entry) => {
        setKillfeed((prev) => [...prev.slice(-6), entry]);
      },
      onDamageTaken: (angle) => {
        setDamageDirection(angle);
        setTimeout(() => setDamageDirection(null), 300);
      },
      onWeaponChange: (w) => {
        setInventory((prev) => ({ ...prev, currentWeapon: w }));
      },
      onZoomChange: (scoped, w) => {
        setIsScoped(scoped);
        setScopedWeapon(w);
      },
    });

    engineRef.current = engine;
    engine.start();

    // Global Key Listener for Pause (Esc) and Leaderboard (Tab)
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        setPhase((currentPhase) => {
          if (currentPhase === 'playing') {
            document.exitPointerLock?.();
            return 'paused';
          } else if (currentPhase === 'paused') {
            mountRef.current?.requestPointerLock();
            return 'playing';
          }
          return currentPhase;
        });
      }

      if (e.code === 'Tab') {
        e.preventDefault();
        setShowLeaderboard((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleGlobalKey);

    return () => {
      window.removeEventListener('keydown', handleGlobalKey);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleStartGame = (weapon: WeaponId, name: string) => {
    if (name.trim()) {
      networkManager.playerName = name.trim();
    }
    if (engineRef.current) {
      engineRef.current.switchWeapon(weapon);
      engineRef.current.respawn();
    }
    setPhase('playing');
    mountRef.current?.requestPointerLock();
  };

  const handleResume = () => {
    setPhase('playing');
    mountRef.current?.requestPointerLock();
  };

  const handleRestart = () => {
    setPhase('title');
    document.exitPointerLock?.();
    if (engineRef.current) {
      engineRef.current.respawn();
    }
  };

  const handleRespawn = () => {
    if (engineRef.current) {
      engineRef.current.respawn();
    }
    setPhase('playing');
    mountRef.current?.requestPointerLock();
  };

  const handleSwitchWeapon = (w: WeaponId) => {
    if (engineRef.current) {
      engineRef.current.switchWeapon(w);
    }
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundController.setMuted(nextMuted);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-neutral-950 font-sans select-none">
      {/* 1. Isolated WebGL Canvas Container (zero React re-renders) */}
      <div ref={mountRef} className="absolute inset-0 cursor-crosshair z-0" />

      {/* 2. Title Screen Layer */}
      {phase === 'title' && <TitleScreen onStartGame={handleStartGame} />}

      {/* 3. In-Game Low-Occlusion HUD Overlay */}
      {phase === 'playing' && (
        <HUD
          health={health}
          armor={armor}
          inventory={inventory}
          stats={stats}
          isScoped={isScoped}
          scopedWeapon={scopedWeapon}
          killfeed={killfeed}
          showHitmarker={showHitmarker}
          hitmarkerHeadshot={hitmarkerHeadshot}
          damageDirection={damageDirection}
          onSwitchWeapon={handleSwitchWeapon}
          onToggleMute={handleToggleMute}
          isMuted={isMuted}
        />
      )}

      {/* 4. TAB Tactical Leaderboard Overlay */}
      {showLeaderboard && phase === 'playing' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 pointer-events-none">
          <div className="bg-neutral-900/95 border border-neutral-700/80 p-6 rounded-2xl w-full max-w-2xl text-white shadow-2xl flex flex-col gap-4 font-mono">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <span className="font-bold text-sky-400 text-sm">SECTOR COMBAT ROSTER</span>
              <span className="text-xs text-neutral-400">MULTIPLAYER ACTIVE</span>
            </div>

            <div className="flex flex-col gap-1.5 text-xs">
              <div className="grid grid-cols-12 text-neutral-400 font-bold px-3 py-1">
                <span className="col-span-5">OPERATOR</span>
                <span className="col-span-3">WEAPON</span>
                <span className="col-span-2 text-center">KILLS</span>
                <span className="col-span-2 text-center">DEATHS</span>
              </div>

              {/* Player Row */}
              <div className="grid grid-cols-12 bg-sky-500/20 border border-sky-500/40 text-white font-bold px-3 py-2 rounded-lg items-center">
                <span className="col-span-5 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  {networkManager.playerName} (YOU)
                </span>
                <span className="col-span-3 text-sky-300 uppercase">{WEAPONS[inventory.currentWeapon].category}</span>
                <span className="col-span-2 text-center tabular-nums text-emerald-400">{stats.kills}</span>
                <span className="col-span-2 text-center tabular-nums text-rose-400">{stats.deaths}</span>
              </div>

              {/* Tactical Bots Rows */}
              {[
                { name: 'Viper_99', weapon: 'Assault', kills: 4, deaths: 2 },
                { name: 'Ghost_Kilo', weapon: 'Sniper', kills: 6, deaths: 1 },
                { name: 'Apex_Shadow', weapon: 'Pistol', kills: 3, deaths: 3 },
                { name: 'Zero_One', weapon: 'Assault', kills: 2, deaths: 4 },
                { name: 'HawkEye_7', weapon: 'Sniper', kills: 5, deaths: 2 },
                { name: 'Rogue_Echo', weapon: 'Pistol', kills: 1, deaths: 3 },
              ].map((b) => (
                <div
                  key={b.name}
                  className="grid grid-cols-12 bg-neutral-950/60 border border-neutral-800/80 text-neutral-300 px-3 py-1.5 rounded-lg items-center"
                >
                  <span className="col-span-5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
                    {b.name}
                  </span>
                  <span className="col-span-3 text-neutral-400">{b.weapon}</span>
                  <span className="col-span-2 text-center tabular-nums text-neutral-200">{b.kills}</span>
                  <span className="col-span-2 text-center tabular-nums text-neutral-400">{b.deaths}</span>
                </div>
              ))}
            </div>

            <div className="text-[11px] text-neutral-400 text-center pt-2 border-t border-neutral-800">
              [RELEASE TAB TO CLOSE]
            </div>
          </div>
        </div>
      )}

      {/* 5. Pause Modal */}
      <PauseModal
        isOpen={phase === 'paused'}
        onResume={handleResume}
        onRestart={handleRestart}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        currentWeapon={inventory.currentWeapon}
        onSelectWeapon={handleSwitchWeapon}
      />

      {/* 6. Game Over Modal */}
      <GameOverModal isOpen={phase === 'gameover'} stats={stats} onRespawn={handleRespawn} />
    </div>
  );
}
