import { useMemo } from 'react';
import TrophyCard from './TrophyCard';
import { RARITY_CONFIG } from './trophyData';
import './TrophyShowcase.css';

// ── Regal ─────────────────────────────────────────────────────────────────────

function TrophyShelf({ items, label, icon }) {
  if (items.length === 0) return null;
  return (
    <div className="trophy-shelf-wrap">
      {label && (
        <p className="trophy-shelf-label">
          {icon && <span>{icon}</span>} {label}
        </p>
      )}
      <div className="trophy-shelf">
        <div className="trophy-shelf-board" />
        <div className="trophy-shelf-items">
          {items.map(item => (
            <TrophyCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Spieler-Header ────────────────────────────────────────────────────────────

function PlayerCabinetHeader({ playerName, avatar, levelLabel, levelEmoji, unlockedCount, totalCount, showLocked, onToggleLocked }) {
  const pct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;
  return (
    <div className="trophy-cabinet-header">
      <div className="trophy-cabinet-avatar">
        {avatar
          ? <img src={avatar} alt={playerName} />
          : <span>{playerName?.[0]?.toUpperCase() ?? '?'}</span>
        }
      </div>
      <div className="trophy-cabinet-player-info">
        <h2 className="trophy-cabinet-name">{playerName}</h2>
        <p className="trophy-cabinet-level">
          <span className="trophy-level-emoji">{levelEmoji}</span>
          {levelLabel}
        </p>
      </div>
      <div className="trophy-cabinet-progress">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.35rem' }}>
          <p className="trophy-progress-label">{unlockedCount} / {totalCount}</p>
          <span className="trophy-progress-pct">{pct}%</span>
        </div>
        <div className="trophy-progress-bar-track">
          <div
            className="trophy-progress-bar-fill"
            style={{ width: `${pct}%` }}
          />
        </div>
        {onToggleLocked && (
          <button className="trophy-toggle-locked" onClick={onToggleLocked}>
            {showLocked ? '🔒 Gesperrte ausblenden' : '🔓 Alle anzeigen'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Vitrine-Rahmen ────────────────────────────────────────────────────────────

function CabinetFrame({ children }) {
  return (
    <div className="trophy-cabinet-frame">
      <div className="cabinet-corner cabinet-corner-tl" />
      <div className="cabinet-corner cabinet-corner-tr" />
      <div className="cabinet-corner cabinet-corner-bl" />
      <div className="cabinet-corner cabinet-corner-br" />
      <div className="trophy-cabinet-inner">{children}</div>
    </div>
  );
}

// ── Hauptkomponente ───────────────────────────────────────────────────────────

const SHELF_CONFIG = [
  { key: 'Serie',    label: 'Siegesserien',  icon: '🔥' },
  { key: 'Level',    label: 'Level',         icon: '⭐' },
  { key: 'Können',   label: 'Können',        icon: '🎯' },
  { key: 'Ausdauer', label: 'Ausdauer',      icon: '🥖' },
];

export default function TrophyShowcase({
  playerName,
  avatar,
  levelLabel = 'Anfänger',
  levelEmoji = '🃏',
  trophies = [],
  showLocked = true,
  onToggleLocked,
}) {
  const visible = useMemo(
    () => showLocked ? trophies : trophies.filter(t => t.unlocked),
    [trophies, showLocked]
  );

  const unlockedCount = trophies.filter(t => t.unlocked).length;

  const shelves = useMemo(() =>
    SHELF_CONFIG
      .map(cfg => ({
        ...cfg,
        // Unlocked first, then locked — within each group sort by rarity desc
        items: visible
          .filter(t => t.category === cfg.key)
          .sort((a, b) => {
            if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
            const order = { legendary: 0, epic: 1, rare: 2, common: 3 };
            return (order[a.rarity] ?? 9) - (order[b.rarity] ?? 9);
          }),
      }))
      .filter(s => s.items.length > 0),
    [visible]
  );

  return (
    <div className="trophy-showcase-root">
      <CabinetFrame>
        <PlayerCabinetHeader
          playerName={playerName}
          avatar={avatar}
          levelLabel={levelLabel}
          levelEmoji={levelEmoji}
          unlockedCount={unlockedCount}
          totalCount={trophies.length}
          showLocked={showLocked}
          onToggleLocked={onToggleLocked}
        />

        <div className="trophy-shelves-container">
          {shelves.length === 0 ? (
            <p className="trophy-empty-state">Noch keine Trophäen freigeschaltet.</p>
          ) : (
            shelves.map(shelf => (
              <TrophyShelf key={shelf.key} items={shelf.items} label={shelf.label} icon={shelf.icon} />
            ))
          )}
        </div>

        {/* Seltenheits-Legende */}
        <div className="trophy-legend">
          {Object.entries(RARITY_CONFIG).reverse().map(([key, cfg]) => (
            <div key={key} className="trophy-legend-item">
              <span className="trophy-legend-dot" style={{ background: cfg.color }} />
              <span className="trophy-legend-label">{cfg.label}</span>
            </div>
          ))}
        </div>
      </CabinetFrame>
    </div>
  );
}
