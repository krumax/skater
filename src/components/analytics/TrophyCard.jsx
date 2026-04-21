import { useState } from 'react';
import { RARITY_CONFIG } from './trophyData';

// ── Hilfsfunktion: Farbe aufhellen/abdunkeln ──────────────────────────────────
function shadeColor(hex, pct) {
  if (!hex || !hex.startsWith('#')) return hex;
  const num = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + pct));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + pct));
  const b = Math.min(255, Math.max(0, (num & 0xff) + pct));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

// ── SVG-Trophäen (flat/low-poly) ─────────────────────────────────────────────
// Gesperrt: einheitlich grau/silhouettenhaft
// Freigeschaltet: satte Farben mit Glanzlicht

function TrophySvg({ color, locked }) {
  const c     = locked ? '#b0a898' : color;
  const light = locked ? '#c8c0b4' : shadeColor(color, 55);
  const dark  = locked ? '#8a8278' : shadeColor(color, -45);
  const shine = locked ? 'rgba(255,255,255,0.0)' : 'rgba(255,255,255,0.35)';
  return (
    <svg viewBox="0 0 64 72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Sockel-Platte */}
      <rect x="18" y="63" width="28" height="5" rx="2" fill={dark} />
      {/* Sockel-Hals */}
      <polygon points="24,54 40,54 38,63 26,63" fill={shadeColor(dark, 15)} />
      {/* Pokal-Körper - Hauptfläche */}
      <polygon points="32,10 46,16 42,44 32,50 22,44 18,16" fill={c} />
      {/* Pokal-Körper - helle Seite (links) */}
      <polygon points="32,10 18,16 22,30 32,28" fill={light} />
      {/* Pokal-Körper - dunkle Seite (rechts) */}
      <polygon points="32,50 42,44 40,32 32,34" fill={shadeColor(c, -20)} />
      {/* Henkel links */}
      <path d="M18,20 Q7,24 9,34 Q11,42 22,40" stroke={dark} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18,20 Q7,24 9,34 Q11,42 22,40" stroke={light} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5" />
      {/* Henkel rechts */}
      <path d="M46,20 Q57,24 55,34 Q53,42 42,40" stroke={dark} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Glanzlicht */}
      <polygon points="24,16 30,14 32,24 26,26" fill={shine} />
    </svg>
  );
}

function MedalSvg({ color, locked }) {
  const c     = locked ? '#b0a898' : color;
  const light = locked ? '#c8c0b4' : shadeColor(color, 50);
  const dark  = locked ? '#8a8278' : shadeColor(color, -50);
  const bandA = locked ? '#9a9288' : '#c0392b';
  const bandB = locked ? '#b0a898' : '#e74c3c';
  return (
    <svg viewBox="0 0 64 72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Band */}
      <polygon points="22,2 32,16 42,2 38,0 26,0" fill={bandA} />
      <polygon points="22,2 32,16 27,20 18,6" fill={bandB} />
      <polygon points="42,2 32,16 37,20 46,6" fill={bandA} />
      {/* Medaille - Außenring */}
      <circle cx="32" cy="46" r="21" fill={dark} />
      {/* Medaille - Hauptfläche */}
      <circle cx="32" cy="46" r="18" fill={c} />
      {/* Medaille - helle Seite */}
      <path d="M20,34 A18,18 0 0,1 44,34" fill={light} opacity="0.5" />
      {/* Stern */}
      <polygon
        points="32,33 34.5,40.5 42.5,40.5 36.2,45.5 38.7,53 32,48.5 25.3,53 27.8,45.5 21.5,40.5 29.5,40.5"
        fill={dark}
      />
      {/* Glanzlicht */}
      {!locked && <circle cx="26" cy="39" r="3.5" fill="rgba(255,255,255,0.28)" />}
    </svg>
  );
}

function BadgeSvg({ color, locked }) {
  const c     = locked ? '#b0a898' : color;
  const light = locked ? '#c8c0b4' : shadeColor(color, 55);
  const dark  = locked ? '#8a8278' : shadeColor(color, -45);
  return (
    <svg viewBox="0 0 64 72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Schild - Schatten */}
      <polygon points="34,68 58,40 58,18 34,8" fill={dark} opacity="0.3" />
      {/* Schild - Hauptfläche */}
      <polygon points="32,8 56,18 56,40 32,66 8,40 8,18" fill={c} />
      {/* Schild - helle Seite */}
      <polygon points="32,8 8,18 8,36 20,50 32,40" fill={light} opacity="0.45" />
      {/* Schild - dunkle Seite */}
      <polygon points="32,66 56,40 48,38 32,58 16,38 8,40" fill={dark} opacity="0.5" />
      {/* Innerer Stern */}
      <polygon
        points="32,20 34.5,27.5 42.5,27.5 36.2,32.5 38.7,40 32,35.5 25.3,40 27.8,32.5 21.5,27.5 29.5,27.5"
        fill={dark}
      />
      {!locked && <polygon points="16,20 22,24 20,16" fill="rgba(255,255,255,0.3)" />}
    </svg>
  );
}

function StarSvg({ color, locked }) {
  const c     = locked ? '#b0a898' : color;
  const light = locked ? '#c8c0b4' : shadeColor(color, 60);
  const dark  = locked ? '#8a8278' : shadeColor(color, -40);
  return (
    <svg viewBox="0 0 64 72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Sockel */}
      <rect x="22" y="60" width="20" height="6" rx="2" fill={dark} />
      <rect x="27" y="52" width="10" height="10" fill={shadeColor(dark, 10)} />
      {/* Stern - Hauptfläche */}
      <polygon points="32,4 37,20 54,20 41,30 46,46 32,37 18,46 23,30 10,20 27,20" fill={c} />
      {/* Stern - helle Seite (oben links) */}
      <polygon points="32,4 27,20 10,20 23,30 18,46 32,37" fill={light} opacity="0.4" />
      {/* Stern - dunkle Seite (unten rechts) */}
      <polygon points="32,37 46,46 41,30 54,20 37,20" fill={dark} opacity="0.35" />
      {!locked && <polygon points="20,16 26,20 24,12" fill="rgba(255,255,255,0.35)" />}
    </svg>
  );
}

const SVG_MAP = { trophy: TrophySvg, medal: MedalSvg, badge: BadgeSvg, star: StarSvg };

// ── TrophyCard ────────────────────────────────────────────────────────────────

export default function TrophyCard({ item }) {
  const [hovered, setHovered] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);

  const cfg = RARITY_CONFIG[item.rarity] ?? RARITY_CONFIG.common;
  const SvgComp = SVG_MAP[item.type] ?? TrophySvg;

  const cardStyle = {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.875rem 0.75rem 0.625rem',
    borderRadius: '0.75rem',
    background: item.unlocked ? cfg.bg : '#e8e2d8',
    border: `2px solid ${item.unlocked ? cfg.border : '#c8c0b0'}`,
    cursor: 'pointer',
    transition: 'transform 0.22s ease, box-shadow 0.22s ease',
    transform: hovered && item.unlocked
      ? 'translateY(-7px) rotate(-1.5deg) scale(1.05)'
      : 'translateY(0) rotate(0deg) scale(1)',
    boxShadow: hovered && item.unlocked
      ? `0 14px 36px ${cfg.glow}, 0 4px 12px rgba(100,60,0,0.2)`
      : item.unlocked
        ? '0 3px 10px rgba(100,60,0,0.15)'
        : '0 1px 4px rgba(100,60,0,0.08)',
    filter: item.unlocked ? 'none' : 'grayscale(1) opacity(0.55)',
    minWidth: '88px',
    maxWidth: '108px',
    userSelect: 'none',
  };

  const svgWrapStyle = {
    width: '54px',
    height: '62px',
    position: 'relative',
    filter: item.unlocked
      ? (item.rarity === 'legendary'
          ? `drop-shadow(0 3px 8px ${cfg.glow})`
          : item.rarity === 'epic'
            ? `drop-shadow(0 2px 5px ${cfg.glow})`
            : 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))')
      : 'none',
    transition: 'filter 0.22s ease',
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={() => { setHovered(true); setTooltipVisible(true); }}
      onMouseLeave={() => { setHovered(false); setTooltipVisible(false); }}
      onFocus={() => setTooltipVisible(true)}
      onBlur={() => setTooltipVisible(false)}
      tabIndex={0}
      role="button"
      aria-label={`${item.title}${item.unlocked ? '' : ' (gesperrt)'}`}
    >
      {/* Seltenheits-Pip oben rechts */}
      <div style={{
        position: 'absolute', top: '0.4rem', right: '0.45rem',
        width: '7px', height: '7px', borderRadius: '50%',
        background: item.unlocked ? cfg.color : '#b0a898',
        boxShadow: item.unlocked && item.rarity !== 'common'
          ? `0 0 5px ${cfg.color}`
          : 'none',
      }} />

      {/* SVG */}
      <div style={svgWrapStyle}>
        <SvgComp color={cfg.color} locked={!item.unlocked} />
        {!item.unlocked && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: '1.3rem', opacity: 0.6 }}>🔒</span>
          </div>
        )}
      </div>

      {/* Titel */}
      <p style={{
        fontSize: '0.62rem',
        fontWeight: 800,
        textAlign: 'center',
        color: item.unlocked ? cfg.textColor : '#9a9288',
        lineHeight: 1.25,
        letterSpacing: '0.01em',
        maxWidth: '88px',
        margin: 0,
      }}>
        {item.title}
      </p>

      {/* Saison */}
      {item.unlocked && item.season && (
        <span style={{
          fontSize: '0.55rem',
          fontWeight: 700,
          color: cfg.color,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          opacity: 0.8,
        }}>
          {item.season}
        </span>
      )}

      {/* Tooltip */}
      {tooltipVisible && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 10px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#fffdf5',
          border: `2px solid ${cfg.border}`,
          borderRadius: '0.6rem',
          padding: '0.65rem 0.85rem',
          minWidth: '165px',
          maxWidth: '210px',
          zIndex: 100,
          pointerEvents: 'none',
          boxShadow: `0 8px 28px rgba(100,60,0,0.2), 0 2px 8px rgba(100,60,0,0.12)`,
        }}>
          <p style={{ fontWeight: 800, fontSize: '0.78rem', color: cfg.textColor, marginBottom: '0.25rem' }}>
            {item.icon} {item.title}
          </p>
          <p style={{ fontSize: '0.67rem', color: '#6a5a40', lineHeight: 1.45, marginBottom: '0.45rem' }}>
            {item.description}
          </p>
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '0.58rem', fontWeight: 800, padding: '0.15rem 0.45rem',
              borderRadius: '0.3rem',
              background: cfg.bg,
              border: `1px solid ${cfg.border}`,
              color: cfg.textColor,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              {RARITY_CONFIG[item.rarity]?.label}
            </span>
            {item.category && (
              <span style={{
                fontSize: '0.58rem', fontWeight: 700, padding: '0.15rem 0.45rem',
                borderRadius: '0.3rem', background: '#f0ece4',
                border: '1px solid #d4c8b0',
                color: '#6a5a40',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                {item.category}
              </span>
            )}
            {item.rank && (
              <span style={{
                fontSize: '0.58rem', fontWeight: 700, padding: '0.15rem 0.45rem',
                borderRadius: '0.3rem', background: '#f0ece4',
                border: '1px solid #d4c8b0', color: '#6a5a40',
              }}>
                Platz {item.rank}
              </span>
            )}
          </div>
          {/* Pfeil */}
          <div style={{
            position: 'absolute', bottom: '-7px', left: '50%',
            transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: `6px solid ${cfg.border}`,
          }} />
        </div>
      )}
    </div>
  );
}
