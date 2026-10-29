import React, { useRef, useState, useEffect } from 'react';
import { GameEngine } from '../game/engine';
import { WeaponId } from '../types/game';

interface TouchControlsProps {
  engine: GameEngine | null;
  onSwitchWeapon: (w: WeaponId) => void;
  currentWeapon: WeaponId;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  engine,
  onSwitchWeapon,
  currentWeapon,
}) => {
  // Joystick State
  const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
  const stickTouchId = useRef<number | null>(null);
  const stickOrigin = useRef<{ x: number; y: number } | null>(null);

  // Look / Aim Touch State
  const lookTouchId = useRef<number | null>(null);
  const lastLookPos = useRef<{ x: number; y: number } | null>(null);

  // Auto-detect mobile touch support
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(hasTouch);
  }, []);

  if (!isTouchDevice) return null;

  // Virtual Joystick Handlers (Left Half)
  const handleJoystickStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (stickTouchId.current !== null) return;
    const touch = e.changedTouches[0];
    stickTouchId.current = touch.identifier;
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    stickOrigin.current = { x: centerX, y: centerY };
    updateJoystick(touch.clientX, touch.clientY);
  };

  const handleJoystickMove = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === stickTouchId.current) {
        updateJoystick(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleJoystickEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === stickTouchId.current) {
        stickTouchId.current = null;
        stickOrigin.current = null;
        setStickPos({ x: 0, y: 0 });
        if (engine) {
          engine.touchMove = { x: 0, y: 0 };
        }
        break;
      }
    }
  };

  const updateJoystick = (clientX: number, clientY: number) => {
    if (!stickOrigin.current || !engine) return;
    const maxRadius = 45;
    const dx = clientX - stickOrigin.current.x;
    const dy = clientY - stickOrigin.current.y;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);

    const clampedDist = Math.min(dist, maxRadius);
    const knobX = Math.cos(angle) * clampedDist;
    const knobY = Math.sin(angle) * clampedDist;

    setStickPos({ x: knobX, y: knobY });

    // Normalize -1 to 1 for game engine
    const normX = knobX / maxRadius;
    const normY = knobY / maxRadius;

    engine.touchMove = { x: normX, y: normY };
  };

  // Look / Aim Swipe Pad Handlers (Right Half)
  const handleLookStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (lookTouchId.current !== null) return;
    const touch = e.changedTouches[0];
    lookTouchId.current = touch.identifier;
    lastLookPos.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleLookMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!engine) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchId.current) {
        if (lastLookPos.current) {
          const dx = touch.clientX - lastLookPos.current.x;
          const dy = touch.clientY - lastLookPos.current.y;
          engine.addTouchLook(dx, dy);
        }
        lastLookPos.current = { x: touch.clientX, y: touch.clientY };
        break;
      }
    }
  };

  const handleLookEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouchId.current) {
        lookTouchId.current = null;
        lastLookPos.current = null;
        break;
      }
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-30">
      {/* 1. Left Screen Area: Virtual Joystick Base */}
      <div
        className="absolute bottom-12 left-8 w-36 h-36 rounded-full bg-neutral-900/40 border-2 border-white/20 flex items-center justify-center pointer-events-auto touch-none"
        onTouchStart={handleJoystickStart}
        onTouchMove={handleJoystickMove}
        onTouchEnd={handleJoystickEnd}
        onTouchCancel={handleJoystickEnd}
      >
        {/* Joystick Thumb Knob */}
        <div
          className="w-14 h-14 rounded-full bg-sky-500/80 shadow-lg border-2 border-white/60 pointer-events-none transition-transform duration-75"
          style={{
            transform: `translate(${stickPos.x}px, ${stickPos.y}px)`,
          }}
        />
      </div>

      {/* 2. Right Swipe Area: Aiming and Looking */}
      <div
        className="absolute top-16 right-0 bottom-28 left-1/2 pointer-events-auto touch-none"
        onTouchStart={handleLookStart}
        onTouchMove={handleLookMove}
        onTouchEnd={handleLookEnd}
        onTouchCancel={handleLookEnd}
      />

      {/* 3. Action Buttons Cluster (Right Bottom) */}
      <div className="absolute bottom-8 right-6 flex items-end gap-3 pointer-events-auto">
        {/* Reload & Jump column */}
        <div className="flex flex-col gap-3">
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              engine?.startReload();
            }}
            className="w-12 h-12 rounded-full bg-neutral-900/80 border border-neutral-700 text-white font-mono text-xs font-bold active:scale-95 shadow-md flex items-center justify-center"
          >
            REL
          </button>
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              engine?.touchJump();
            }}
            className="w-12 h-12 rounded-full bg-neutral-900/80 border border-neutral-700 text-white font-mono text-xs font-bold active:scale-95 shadow-md flex items-center justify-center"
          >
            JUMP
          </button>
        </div>

        {/* ADS Zoom Button */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            engine?.toggleTouchAim();
          }}
          className="w-14 h-14 rounded-full bg-sky-600/70 border-2 border-sky-400 text-white font-mono text-xs font-bold active:scale-95 shadow-lg flex items-center justify-center"
        >
          AIM
        </button>

        {/* Big FIRE Button */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            engine?.setTouchShoot(true);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            engine?.setTouchShoot(false);
          }}
          className="w-20 h-20 rounded-full bg-rose-600/85 border-2 border-rose-300 text-white font-mono text-sm font-black active:scale-90 shadow-xl flex items-center justify-center uppercase tracking-wider"
        >
          FIRE
        </button>
      </div>
    </div>
  );
};
