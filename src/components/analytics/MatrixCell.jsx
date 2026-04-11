import React from 'react';

/**
 * Wiederverwendbare Zelle für Achievement- und Defense-Matrix.
 * Zeigt entweder einen freigeschalteten Wert oder ein leeres Schloss.
 */
export function MatrixCell({ val, isSpecial, isDefense = false }) {
  const unlockedBg    = isDefense ? 'rgba(181,38,25,0.12)' : (isSpecial ? 'var(--tertiary-container)' : 'var(--primary-container)');
  const unlockedColor = isDefense ? '#7a1a10'              : (isSpecial ? '#000'                       : '#fff');
  const lockedBorder  = isSpecial ? 'rgba(116,91,0,0.3)'  : 'var(--outline-variant)';
  const tooltip       = val
    ? isDefense
      ? `${val.count}× abgewehrt${val.date ? ` · Erstmals: ${val.date}` : ''}`
      : `${val.count}× gewonnen · Bestes Ergebnis: ${val.value}${val.date ? ` · Erstmals: ${val.date}` : ''}`
    : undefined;

  const baseStyle = {
    width: '2rem', height: '2rem', margin: '0 auto',
    borderRadius: '0.375rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.7rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif",
    transition: 'transform 0.2s',
  };

  if (val) {
    return (
      <div
        title={tooltip}
        style={{ ...baseStyle, backgroundColor: unlockedBg, color: unlockedColor }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        {val.count}
      </div>
    );
  }

  return (
    <div style={{ ...baseStyle, border: `1px dashed ${lockedBorder}`, opacity: isDefense ? 0.35 : 0.5 }}>
      {!isSpecial && !isDefense && (
        <span className="material-symbols-outlined" style={{ fontSize: '0.875rem', opacity: 0.4 }}>lock</span>
      )}
    </div>
  );
}

/** Spalten-Header-Zelle */
export function ColHeader({ col }) {
  return (
    <div style={{
      fontSize: '0.6rem', fontWeight: 700,
      color: col.isSpecial ? 'var(--tertiary)' : 'var(--on-surface-variant)',
      textTransform: 'uppercase', letterSpacing: '0.05em',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.1rem',
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
        {col.label}
        {col.icon && !col.label2 && <span className="material-symbols-outlined" style={{ fontSize: '0.85rem' }}>{col.icon}</span>}
        {col.label2 && (
          <>
            <span className="material-symbols-outlined" style={{ fontSize: '0.7rem' }}>add</span>
            {col.label2}
          </>
        )}
      </span>
    </div>
  );
}

/** Zeilen-Label-Zelle für Farb-/Trumpf-Spieltypen */
export function RowLabel({ row }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{
        width: '1.75rem', height: '1.75rem', borderRadius: '0.375rem',
        backgroundColor: row.color, display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0,
      }}>
        {row.matIcon
          ? <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: row.textColor }}>{row.matIcon}</span>
          : <span style={{ fontSize: '1rem', fontWeight: 700, color: row.textColor }}>{row.suit}</span>
        }
      </div>
      <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, color: 'var(--on-surface)', fontSize: '0.8125rem', whiteSpace: 'normal', wordBreak: 'break-word' }}>
        {row.name}
      </div>
    </div>
  );
}

/** Zeilen-Label-Zelle für Null-Varianten */
export function NullRowLabel({ name }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '0.375rem', backgroundColor: '#717974', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: '#fff' }}>block</span>
      </div>
      <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, color: 'var(--on-surface)', fontSize: '0.8125rem', whiteSpace: 'normal', wordBreak: 'break-word' }}>
        {name}
      </div>
    </div>
  );
}
