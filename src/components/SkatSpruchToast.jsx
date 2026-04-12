/**
 * SkatSpruchToast — erscheint kurz nach dem Speichern einer Runde.
 * Dunkel, schmal, unten rechts. Verschwindet nach 4 Sekunden automatisch.
 */
import { useEffect, useState } from 'react';

export default function SkatSpruchToast({ spruch, won, onDone }) {
  const [phase, setPhase] = useState('enter'); // enter → visible → exit

  useEffect(() => {
    if (!spruch) return;
    setPhase('enter');
    const t1 = setTimeout(() => setPhase('visible'), 30);
    const t2 = setTimeout(() => setPhase('exit'), 5200);
    const t3 = setTimeout(() => onDone(), 5600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [spruch]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!spruch) return null;

  const accentColor = won ? '#0b3d2e' : 'var(--secondary)';

  return (
    <div
      onClick={() => { setPhase('exit'); setTimeout(onDone, 400); }}
      style={{
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        zIndex: 8888,
        maxWidth: '340px',
        width: 'calc(100vw - 4rem)',
        backgroundColor: '#d0a600',
        borderRadius: '0.875rem',
        padding: '1rem 1.25rem',
        boxShadow: '0 16px 48px rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.875rem',
        cursor: 'pointer',
        // Animation
        opacity:   phase === 'visible' ? 1 : 0,
        transform: phase === 'visible'
          ? 'translateY(0)'
          : phase === 'enter'
            ? 'translateY(1.5rem)'
            : 'translateY(-0.5rem)',
        transition: phase === 'exit'
          ? 'opacity 0.4s ease, transform 0.4s ease'
          : 'opacity 0.3s ease, transform 0.35s cubic-bezier(0.34, 1.4, 0.64, 1)',
      }}
    >
      {/* Anführungszeichen-Icon */}
      <span style={{
        fontSize: '1.75rem',
        lineHeight: 1,
        color: '#1b1c1c',
        fontFamily: 'Georgia, serif',
        flexShrink: 0,
        marginTop: '-0.1rem',
        userSelect: 'none',
      }}>
        ❝
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: '0.875rem',
          fontStyle: 'italic',
          fontWeight: 600,
          color: '#1b1c1c',
          lineHeight: 1.45,
          margin: 0,
        }}>
          {spruch}
        </p>
        <p style={{
          fontSize: '0.65rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#1b1c1c',
          marginTop: '0.4rem',
          opacity: 0.65,
        }}>
          {won ? 'Sieg' : 'Niederlage'}
        </p>
      </div>
    </div>
  );
}
