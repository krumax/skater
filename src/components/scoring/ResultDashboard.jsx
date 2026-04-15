/**
 * ResultDashboard — zeigt das berechnete Rundenergebnis mit Aufschlüsselung
 * sowie den aktuellen Tischstand und den Speichern-Button.
 */
import { SUIT_LABELS, SUIT_SYMBOLS } from '../../lib/skatScoring';
import SuitBadge from '../SuitBadge';

export function formatScore(gameValue, isBock) {
  const value = isBock ? gameValue * 2 : gameValue;
  return (value > 0 ? '+' : '') + value;
}

// ── Letzte Runde ──────────────────────────────────────────────────────────────
function LastRoundCard({ round }) {
  if (!round) return null;

  const modifiers = [
    round.hand      && 'Hand',
    round.schneider && 'Schneider',
    round.schwarz   && 'Schwarz',
    round.ouvert    && 'Ouvert',
    round.isBock    && 'Bock',
  ].filter(Boolean);

  const scoreColor = round.gameValue >= 0 ? 'var(--primary)' : 'var(--secondary)';

  return (
    <div className="card" style={{ padding: '0.875rem 1rem' }}>
      <p className="stat-label" style={{ marginBottom: '0.5rem' }}>
        Letzte Runde #{round.id}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Spieltyp-Badge */}
        <SuitBadge gameType={round.gameType} size="sm" />

        {/* Spieler + Typ */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {round.player === '-' ? 'Eingepasst' : round.player}
          </p>
          <p style={{ fontSize: '0.7rem', color: 'var(--outline)' }}>
            {['grand', 'null', 'passed'].includes(round.gameType)
              ? <span className="material-symbols-outlined" style={{ fontSize: '0.7rem', lineHeight: 1, verticalAlign: 'middle' }}>
                  {round.gameType === 'grand' ? 'stars' : round.gameType === 'null' ? 'block' : 'skip_next'}
                </span>
              : SUIT_SYMBOLS[round.gameType]
            }{' '}{SUIT_LABELS[round.gameType] ?? round.gameType}
            {modifiers.length > 0 && <span style={{ marginLeft: '0.4rem', opacity: 0.75 }}>· {modifiers.join(' · ')}</span>}
          </p>
        </div>

        {/* Punktwert */}
        <p style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: scoreColor, flexShrink: 0 }}>
          {round.gameValue >= 0 ? '+' : ''}{round.gameValue}
        </p>
      </div>
    </div>
  );
}

export default function ResultDashboard({ result, outcomeLabel, gameType, isBock, rankings, onCommit, lastRound, sticky }) {
  return (
    <div className={sticky ? 'result-dashboard-sticky' : undefined} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {result && (
        <div
          className="result-dashboard"
          style={result.won ? {} : { background: 'linear-gradient(135deg, var(--secondary), var(--secondary-container))' }}
        >
          <div className="result-content">
            <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.8, display: 'block', lineHeight: 1.4 }}>
              Rundenergebnis<br />{outcomeLabel}
            </span>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="result-value" style={{ color: result.won ? 'var(--on-surface)' : 'var(--on-secondary)' }}>
                {formatScore(result.gameValue, isBock)}
              </span>
              <span style={{ fontWeight: 600, opacity: 0.9, fontSize: '0.9rem' }}>Punkte</span>
            </div>

            <div className="result-breakdown">
              <div className="breakdown-row">
                <span style={{ opacity: 0.8, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  Grundwert <SuitBadge gameType={gameType} size="sm" />
                </span>
                <span style={{ fontWeight: 800 }}>{result.baseValue}</span>
              </div>
              <div className="breakdown-row">
                <span style={{ opacity: 0.8 }}>Multiplikator</span>
                <span style={{ fontWeight: 800 }}>× {result.multiplier}</span>
              </div>
              {!result.won && (
                <div className="breakdown-row">
                  <span style={{ opacity: 0.8 }}>Verlust-Strafe</span>
                  <span style={{ fontWeight: 800 }}>×2</span>
                </div>
              )}
              {isBock && (
                <div className="breakdown-row">
                  <span style={{ opacity: 0.8 }}>Bockrunde</span>
                  <span style={{ fontWeight: 800 }}>×2</span>
                </div>
              )}
              <div className="breakdown-row breakdown-total" style={{ gridColumn: '1 / -1', borderTop: '1px solid rgba(27,28,28,0.15)', marginTop: '0.5rem', paddingTop: '0.75rem' }}>
                <span>Gesamt</span>
                <span>{formatScore(result.gameValue, isBock)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        className="btn-primary btn-commit"
        style={{ width: '100%', padding: '1.25rem', fontSize: '1.125rem', letterSpacing: '0.1em' }}
        onClick={onCommit}
      >
        ERGEBNIS SPEICHERN
      </button>
      <p className="btn-commit-hint" style={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--outline)' }}>
        Bitte alle Werte vor dem Speichern überprüfen
      </p>

      <LastRoundCard round={lastRound} />

      {/* Aktueller Stand */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ backgroundColor: 'var(--surface-high)', padding: '1rem', borderRadius: '1rem', color: 'var(--primary)' }}>
          <span className="material-symbols-outlined">trending_up</span>
        </div>
        <div>
          <p className="stat-label">
            Aktueller Stand
          </p>
          {rankings.length > 0 && (
            <p style={{ fontSize: '1.125rem', fontWeight: 700 }}>
              {rankings[0].name} führt ({rankings[0].score >= 0 ? '+' : ''}{rankings[0].score})
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
