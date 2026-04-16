import { useState } from 'react';
import './AchievementMatrixPanel.css';

/**
 * AchievementMatrixPanel — Kompakte Dot-Matrix für Angriff oder Abwehr.
 * Jede Zeile = ein Spieltyp, jede Zelle = eine Kombination (Dot).
 * Hover zeigt den Namen der Kombination.
 */
export default function AchievementMatrixPanel({ matrix, title, icon, unlocked, total, accentColor }) {
  const pct = total > 0 ? Math.round((unlocked / total) * 100) : 0;

  return (
    <div className="amp-root">
      {/* Header */}
      <div className="amp-header">
        <span className="amp-icon">{icon}</span>
        <div className="amp-title-group">
          <h3 className="amp-title">{title}</h3>
          <p className="amp-subtitle">{unlocked} / {total} freigeschaltet</p>
        </div>
        <div className="amp-pct" style={{ color: accentColor }}>{pct}%</div>
      </div>

      {/* Fortschrittsbalken */}
      <div className="amp-progress-track">
        <div
          className="amp-progress-fill"
          style={{ width: `${pct}%`, background: accentColor }}
        />
      </div>

      {/* Matrix */}
      <div className="amp-matrix">
        {matrix.map(row => (
          <MatrixRow key={row.key} row={row} accentColor={accentColor} />
        ))}
      </div>
    </div>
  );
}

function MatrixRow({ row, accentColor }) {
  const unlockedCount = row.cols.filter(c => c.unlocked).length;
  const total = row.cols.length;

  return (
    <div className="amp-row">
      {/* Spieltyp-Label */}
      <div
        className="amp-row-label"
        style={{ background: row.color, color: row.textColor }}
        title={row.name}
      >
        {row.suit ?? row.name.slice(0, 2)}
      </div>

      {/* Dots */}
      <div className="amp-dots">
        {row.cols.map(col => (
          <MatrixDot key={col.id} col={col} accentColor={accentColor} isSpecial={col.isSpecial} />
        ))}
      </div>

      {/* Zähler */}
      <div className="amp-row-count">
        <span style={{ color: unlockedCount > 0 ? accentColor : '#b0a898' }}>
          {unlockedCount}
        </span>
        <span className="amp-row-count-total">/{total}</span>
      </div>
    </div>
  );
}

function MatrixDot({ col, accentColor, isSpecial }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div className="amp-dot-wrap">
      <div
        className={`amp-dot ${col.unlocked ? 'unlocked' : ''} ${isSpecial ? 'special' : ''}`}
        style={col.unlocked ? { background: accentColor, boxShadow: `0 0 5px ${accentColor}88` } : {}}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title={col.label}
      />
      {hovered && (
        <div className="amp-dot-tooltip">
          {col.unlocked ? '✓ ' : ''}{col.label}
        </div>
      )}
    </div>
  );
}
