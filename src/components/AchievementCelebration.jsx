import React, { useEffect, useRef, useState, useCallback } from 'react';

/* ── Confetti Canvas ────────────────────────────────────────────────────── */
const CONFETTI_COLORS = [
  '#0b3d2e', '#b52619', '#d0a600', '#ff5c47', '#414944',
  '#745b00', '#00261b', '#717974', '#e4e2e1', '#ffffff',
];

function launchConfetti(canvas, durationMs = 3500) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const particles = [];
  const count = 120;

  for (let i = 0; i < count; i++) {
    particles.push({
      x: W * 0.5 + (Math.random() - 0.5) * W * 0.4,
      y: H * 0.45,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 16 - 4,
      w: Math.random() * 8 + 4,
      h: Math.random() * 6 + 2,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 12,
      gravity: 0.18 + Math.random() * 0.08,
      opacity: 1,
      delay: Math.random() * 400,
    });
  }

  const start = performance.now();
  let animId;

  function frame(now) {
    const elapsed = now - start;
    ctx.clearRect(0, 0, W, H);

    let alive = false;
    particles.forEach(p => {
      if (elapsed < p.delay) { alive = true; return; }
      const t = elapsed - p.delay;
      p.x += p.vx * 0.5;
      p.vy += p.gravity;
      p.y += p.vy * 0.5;
      p.vx *= 0.99;
      p.rotation += p.rotSpeed;

      // Fade out in the last 30%
      if (elapsed > durationMs * 0.7) {
        p.opacity = Math.max(0, 1 - (elapsed - durationMs * 0.7) / (durationMs * 0.3));
      }

      if (p.y < H + 40 && p.opacity > 0) {
        alive = true;
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
    });

    if (alive && elapsed < durationMs) {
      animId = requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, W, H);
    }
  }

  animId = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(animId);
}

/* ── Celebration Overlay ────────────────────────────────────────────────── */

const AchievementCelebration = ({ achievement, onClose }) => {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState('enter'); // 'enter' | 'visible' | 'exit'

  useEffect(() => {
    if (!achievement) return;
    setPhase('enter');
    const t1 = setTimeout(() => setPhase('visible'), 50);
    return () => clearTimeout(t1);
  }, [achievement]);

  useEffect(() => {
    if (phase === 'visible' && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      const cancel = launchConfetti(canvas, 3500);
      return cancel;
    }
  }, [phase]);

  const handleClose = useCallback(() => {
    setPhase('exit');
    setTimeout(() => onClose(), 350);
  }, [onClose]);

  // Auto-close after 6 seconds
  useEffect(() => {
    if (!achievement) return;
    const t = setTimeout(handleClose, 6000);
    return () => clearTimeout(t);
  }, [achievement, handleClose]);

  if (!achievement) return null;

  const { playerName, gameTypeName, gameTypeIcon, gameTypeSuit, colLabel, isSpecial, isLevelUp, oldLevel, newLevel, oldCount, newCount, totalPossible, newPercent } = achievement;

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: phase === 'exit' ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,0.5)',
        backdropFilter: phase === 'exit' ? 'blur(0px)' : 'blur(6px)',
        transition: 'background-color 0.35s, backdrop-filter 0.35s',
        cursor: 'pointer',
      }}
    >
      {/* Confetti canvas behind modal */}
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      />

      {/* Modal card */}
      <div
        onClick={e => {
          e.stopPropagation();
          handleClose();
        }}
        style={{
          position: 'relative', zIndex: 2,
          backgroundColor: 'var(--surface)',
          borderRadius: '1.5rem',
          padding: '3rem 3rem 2rem',
          maxWidth: '480px', width: '90%',
          boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
          textAlign: 'center',
          transform: phase === 'enter' ? 'scale(0.7) translateY(30px)' : phase === 'exit' ? 'scale(0.9) translateY(-20px)' : 'scale(1) translateY(0)',
          opacity: phase === 'enter' ? 0 : phase === 'exit' ? 0 : 1,
          transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.35s ease',
        }}
      >
        {/* Trophy icon */}
        <div style={{
          width: '5rem', height: '5rem', borderRadius: '50%',
          background: isLevelUp
            ? 'linear-gradient(135deg, var(--tertiary), var(--tertiary-container))'
            : 'linear-gradient(135deg, var(--primary), var(--primary-container))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '-5.5rem auto 1.5rem',
          boxShadow: isLevelUp
            ? '0 8px 24px rgba(116, 91, 0, 0.4)'
            : '0 8px 24px rgba(0, 38, 27, 0.4)',
          animation: phase === 'visible' ? 'celebPulse 1.2s ease-in-out infinite alternate' : 'none',
        }}>
          <span className="material-symbols-outlined" style={{
            fontSize: '2.25rem', color: '#fff',
            fontVariationSettings: "'FILL' 1",
          }}>
            {isLevelUp ? 'workspace_premium' : 'emoji_events'}
          </span>
        </div>

        {/* Title */}
        <h2 style={{
          fontFamily: "'Manrope', sans-serif", fontWeight: 800,
          fontSize: isLevelUp ? '1.75rem' : '1.5rem',
          color: isLevelUp ? 'var(--tertiary)' : 'var(--primary)',
          marginBottom: '0.5rem',
        }}>
          {isLevelUp ? '🎉 Level Up!' : '🏆 Achievement Unlocked!'}
        </h2>

        {/* Player name */}
        <p style={{
          fontSize: '1.125rem', fontWeight: 600,
          color: 'var(--on-surface)', marginBottom: '1rem',
        }}>
          {playerName}
        </p>

        {/* Achievement detail card */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '1rem',
          backgroundColor: 'var(--surface-low)', borderRadius: '0.75rem',
          padding: '1rem 1.25rem', marginBottom: '1.5rem',
          textAlign: 'left',
        }}>
          <div style={{
            width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem', flexShrink: 0,
            backgroundColor: isSpecial ? 'var(--tertiary-container)' : 'var(--primary-container)',
            color: isSpecial ? 'var(--primary)' : 'var(--on-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', fontVariationSettings: "'FILL' 1" }}>
              {isSpecial ? 'star' : 'military_tech'}
            </span>
          </div>
          <div>
            <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '0.9375rem', color: 'var(--on-surface)' }}>
              {gameTypeIcon
                ? <span className="material-symbols-outlined" style={{ fontSize: '1rem', verticalAlign: 'text-bottom', marginRight: '0.25rem' }}>{gameTypeIcon}</span>
                : gameTypeSuit
                ? <span style={{ marginRight: '0.25rem' }}>{gameTypeSuit}</span>
                : null
              }
              {gameTypeName} — {colLabel}
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
              Erstmals gewonnen!
            </div>
          </div>
        </div>

        {/* Level-up extra banner */}
        {isLevelUp && (
          <div style={{
            background: 'linear-gradient(135deg, var(--tertiary), var(--tertiary-container))',
            borderRadius: '0.75rem', padding: '1rem',
            marginBottom: '1.5rem', color: 'var(--on-surface)',
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8, marginBottom: '0.25rem' }}>
              Neues Level erreicht!
            </div>
            <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '2rem' }}>
              Level {oldLevel} → Level {newLevel}
            </div>
          </div>
        )}

        {/* Progress info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {oldCount} → {newCount} / {totalPossible}
          </span>
          <div style={{ flex: 1, height: '0.5rem', backgroundColor: 'var(--surface-high)', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '999px',
              background: 'linear-gradient(90deg, var(--primary), var(--primary-container))',
              width: `${newPercent}%`,
              transition: 'width 1s ease-out',
            }} />
          </div>
          <span style={{ fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 700 }}>{newPercent}%</span>
        </div>

        {/* Dismiss hint */}
        <p style={{ fontSize: '0.75rem', color: 'var(--outline)', marginTop: '1rem' }}>
          Klicke, um fortzufahren
        </p>
      </div>

      {/* Keyframe injection */}
      <style>{`
        @keyframes celebPulse {
          from { transform: scale(1); }
          to   { transform: scale(1.08); }
        }
      `}</style>
    </div>
  );
};

export default AchievementCelebration;
