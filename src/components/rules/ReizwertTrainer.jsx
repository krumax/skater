import { useState } from 'react';
import { useIconset } from '../../context/IconsetContext.jsx';
import { useSuitLabel } from '../../hooks/useSuitLabel.js';
import {
  createTrainerPuzzle,
  evaluateSelection,
  getMaxSpitzen,
} from '../../lib/reizwertTrainer.js';
import GameTypeSelector from '../scoring/GameTypeSelector.jsx';
import AnsageSelector from '../scoring/AnsageSelector.jsx';
import PlayingCard from './PlayingCard.jsx';

const COLOR_GAME_TYPES = new Set(['club', 'spade', 'heart', 'diamond']);
const SUIT_ORDER = ['club', 'spade', 'heart', 'diamond'];
const RANK_ORDER = ['seven', 'eight', 'nine', 'ten', 'jack', 'queen', 'king', 'ace'];

const GAME_TYPE_LABELS = {
  grand: 'Grand',
  null: 'Null',
};

function sortHand(hand) {
  return [...hand].sort((first, second) => {
    const suitDifference = SUIT_ORDER.indexOf(first.suit) - SUIT_ORDER.indexOf(second.suit);
    if (suitDifference !== 0) return suitDifference;

    return RANK_ORDER.indexOf(first.rank) - RANK_ORDER.indexOf(second.rank);
  });
}

function getGameTypeLabel(gameType, getSuitLabel) {
  if (COLOR_GAME_TYPES.has(gameType)) return getSuitLabel(gameType);
  return GAME_TYPE_LABELS[gameType] ?? gameType;
}

function formatSpitzen(spitzen) {
  return `${spitzen} ${spitzen === 1 ? 'Spitze' : 'Spitzen'}`;
}

function formatSelection(selection) {
  return `${selection.mitOhne} ${formatSpitzen(selection.spitzen)}`;
}

/**
 * Interactive trainer for identifying the Mit/Ohne and Spitzen result for a
 * game type selected by the learner.
 *
 * The selected game type is intentionally not graded: the same hand can be
 * played in different game types. The trainer grades the announcement that
 * belongs to the selected game type.
 */
export default function ReizwertTrainer({ random = Math.random }) {
  const { iconset } = useIconset();
  const getSuitLabel = useSuitLabel();
  const jackRankLabel = iconset === 'altenburg' ? 'Unter' : 'Bube';
  const jackGroupLabel = iconset === 'altenburg' ? 'Unter' : 'Buben';
  const [puzzle, setPuzzle] = useState(() => createTrainerPuzzle({ random }));
  const [gameType, setGameType] = useState('');
  const [mitOhne, setMitOhne] = useState('mit');
  const [spitzen, setSpitzen] = useState(null);
  const [reizwert, setReizwert] = useState('');
  const [validationError, setValidationError] = useState('');
  const [status, setStatus] = useState('idle');
  const [evaluation, setEvaluation] = useState(null);
  const [showSolution, setShowSolution] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  const sortedHand = sortHand(puzzle.hand);
  const jackCards = new Map(
    sortedHand
      .filter((card) => card.rank === 'jack')
      .map((card) => [card.suit, card]),
  );
  const jackSlots = SUIT_ORDER.map((suit) => ({
    suit,
    card: jackCards.get(suit) ?? null,
  }));
  const otherCards = sortedHand.filter((card) => card.rank !== 'jack');
  const maxSpitzen = gameType ? getMaxSpitzen(gameType) : 0;
  const hasBeenEvaluated = hasSubmitted;
  const shouldShowSolution = showSolution || status === 'correct';

  const clearEvaluation = () => {
    setEvaluation(null);
    setStatus('idle');
    setShowSolution(false);
  };

  const handleMitOhneChange = (nextMitOhne) => {
    setMitOhne(nextMitOhne);
    clearEvaluation();
  };

  const handleSpitzenChange = (nextSpitzen) => {
    setSpitzen(nextSpitzen);
    clearEvaluation();
  };

  const handleGameTypeChange = (nextGameType) => {
    setGameType(nextGameType);
    setSpitzen(null);
    setReizwert('');
    setValidationError('');
    setEvaluation(null);
    setShowSolution(false);
    setStatus('idle');

    if (nextGameType === 'null') {
      setMitOhne('mit');
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (hasSubmitted) return;

    if (!gameType) {
      setValidationError('Bitte wähle zuerst eine Spielart aus.');
      return;
    }

    if (gameType !== 'null' && !Number.isInteger(spitzen)) {
      setValidationError('Bitte wähle zuerst die Anzahl der Spitzen aus.');
      return;
    }

    if (reizwert.trim() === '') {
      setValidationError('Bitte gib den Reizwert ein.');
      return;
    }

    const submittedReizwert = Number(reizwert);
    if (!Number.isInteger(submittedReizwert)) {
      setValidationError('Der Reizwert muss eine ganze Zahl sein.');
      return;
    }

    const result = evaluateSelection(
      { gameType, mitOhne, spitzen, reizwert: submittedReizwert },
      puzzle,
    );
    setEvaluation(result);
    setHasChecked(true);
    setStatus(result.status);
    setHasSubmitted(result.status === 'correct');
    setShowSolution(false);
    setValidationError('');
  };

  const handleNewPuzzle = () => {
    setPuzzle(createTrainerPuzzle({ random }));
    setGameType('');
    setMitOhne('mit');
    setSpitzen(null);
    setReizwert('');
    setValidationError('');
    setEvaluation(null);
    setShowSolution(false);
    setStatus('idle');
    setHasSubmitted(false);
    setHasChecked(false);
  };

  return (
    <section
      className="card reizwert-trainer"
      data-status={status}
      aria-labelledby="reizwert-trainer-title"
    >
      <header className="reizwert-trainer-header">
        <p className="section-label">Übung</p>
        <h2 id="reizwert-trainer-title">Reizwert-Trainer</h2>
        <p className="reizwert-trainer-mode">
          <strong>Auswahlmodus:</strong> 10 Karten · Farbspiele, Grand und Null
        </p>
        <p className="reizwert-trainer-scope">
          Wähle eine Spielart und prüfe deren Mit/Ohne-, Spitzen- und Reizwertberechnung. Der Einfachheit halber bewertet dieser Trainer bei Farbspielen und Grand ausschließlich 1 bis 4 Spitzen. Die eigentlich korrekte Berechnung höherer Spitzen bleibt bewusst außerhalb des Trainers: Hände mit tatsächlichen Spitzen über 4 werden nicht als Aufgabe verwendet und nicht auf 4 gekappt. Der Trainer gibt keine taktische Reizempfehlung. Hand, unbekannter Skat sowie Schneider, Schwarz, Ouvert, Bock und Seeger-Fabian sind nicht enthalten.
        </p>
      </header>

      <div className="reizwert-hand-section">
        <div className="reizwert-hand-toolbar">
          <p className="reizwert-hand-label">Deine Handkarten</p>
          <button
            type="button"
            className="reizwert-refresh touch-target"
            onClick={handleNewPuzzle}
            aria-label="Neue Handkarten anzeigen"
            title="Neue Handkarten anzeigen"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              refresh
            </span>
            <span>Neue Handkarten</span>
          </button>
        </div>

        <div
          className="reizwert-trainer-hand"
          aria-label={`Kartenblatt mit vier ${jackGroupLabel}-Feldern und weiteren Karten`}
        >
          <div className="reizwert-hand-group reizwert-jack-area" aria-label={`${jackGroupLabel} nach Farbe`}>
            <p className="reizwert-hand-group-label">{jackGroupLabel}</p>
            <div className="reizwert-jack-slots">
              {jackSlots.map(({ suit, card }) => (
                <div
                  key={suit}
                  className={`reizwert-jack-slot${card ? ' reizwert-jack-slot--filled' : ''}`}
                  data-suit={suit}
                  role="group"
                  aria-label={`${getSuitLabel(suit)}: ${card ? `${jackRankLabel} vorhanden` : `kein ${jackRankLabel}`}`}
                >
                  {card ? (
                    <PlayingCard card={card} size="sm" />
                  ) : (
                    <div className="reizwert-jack-placeholder" aria-hidden="true">
                      <span className="reizwert-jack-placeholder-mark">—</span>
                      <span>{`kein ${jackRankLabel}`}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="reizwert-hand-group reizwert-other-cards" aria-label="Weitere Karten">
            <p className="reizwert-hand-group-label">Weitere Karten</p>
            <div
              className="reizwert-other-card-list"
              style={{ '--reizwert-other-card-count': Math.max(otherCards.length, 1) }}
            >
              {otherCards.map((card) => (
                <PlayingCard key={card.id} card={card} size="sm" />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="reizwert-trainer-question">
        <h3>Welche Spielart, Ansage und welcher Reizwert passen zu diesem Blatt?</h3>
        <p>
          Wähle eine Spielart. Bestimme danach, ob du Mit oder Ohne spielst,
          wie viele Spitzen lückenlos vorhanden oder fehlend sind und berechne
          den passenden Reizwert.
        </p>
      </div>

      <form
        className="reizwert-selection-form"
        onSubmit={handleSubmit}
        noValidate
      >
        <GameTypeSelector
          gameType={gameType}
          onSelect={handleGameTypeChange}
          includePassed={false}
          disabled={hasBeenEvaluated}
        />

        <div className="reizwert-ansage-spitzen-grid">
          <AnsageSelector
            mitOhne={mitOhne}
            setMitOhne={handleMitOhneChange}
            spitzen={spitzen}
            setSpitzen={handleSpitzenChange}
            maxSpitzen={maxSpitzen}
            disabled={hasBeenEvaluated || !gameType}
          />
        </div>

        <div className="reizwert-value-row">
          <div className="reizwert-value-entry">
            <div className="reizwert-answer-field">
              <label htmlFor="reizwert-input">Dein Reizwert</label>
              <input
                id="reizwert-input"
                className="reizwert-answer-input"
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                value={reizwert}
                onChange={(event) => {
                  setReizwert(event.target.value);
                  setValidationError('');
                  clearEvaluation();
                }}
                placeholder="z. B. 60"
                disabled={hasBeenEvaluated || !gameType}
                aria-invalid={validationError ? 'true' : 'false'}
              />
              <p className="reizwert-value-hint">
                Grundwert × (Spitzen + 1)
              </p>
            </div>
          </div>
          <button
            type="submit"
            className="btn-primary touch-target reizwert-submit reizwert-selection-submit reizwert-action-button"
            disabled={hasBeenEvaluated}
          >
            Prüfen
          </button>
        </div>

        {validationError && (
          <p className="reizwert-selection-error" role="alert">
            {validationError}
          </p>
        )}
      </form>

      <div className="reizwert-feedback-row">
        <div
          className="reizwert-feedback"
          data-feedback-state={evaluation ? 'result' : 'placeholder'}
          role={evaluation ? 'status' : undefined}
          aria-live={evaluation ? 'polite' : undefined}
          aria-atomic={evaluation ? 'true' : undefined}
        >
        {evaluation ? (
          <>
            <p className="reizwert-feedback-title">
              <span className="reizwert-feedback-icon" aria-hidden="true">
                {status === 'correct' ? '✓' : '✗'}
              </span>
              {status === 'correct'
                ? `Richtig! Die Prüfung für ${getGameTypeLabel(evaluation.gameType, getSuitLabel)} ist vollständig richtig.`
                : 'Noch nicht. Prüfe Spielwert und Spitzen unten getrennt.'}
            </p>

            <div className="reizwert-feedback-checks">
              <p
                className={`reizwert-feedback-check ${evaluation.gameValueCorrect ? 'is-correct' : 'is-incorrect'}`}
              >
                <strong>Spielwert:</strong>{' '}
                {evaluation.gameValueCorrect
                  ? `✓ ${evaluation.submitted.reizwert} passt zu deiner Auswahl.`
                  : `✗ Deine Auswahl ergibt ${evaluation.calculatedGameValue}; eingegeben: ${evaluation.submitted.reizwert}.`}
              </p>
              <p
                className={`reizwert-feedback-check ${evaluation.spitzenCorrect === null
                  ? 'is-neutral'
                  : evaluation.spitzenCorrect ? 'is-correct' : 'is-incorrect'}`}
              >
                <strong>Spitzen:</strong>{' '}
                {evaluation.spitzenCorrect === null
                  ? '— Beim Nullspiel gibt es keine Spitzen.'
                  : evaluation.spitzenCorrect
                    ? `✓ ${formatSelection(evaluation.expected)} ist richtig.`
                    : `✗ Deine Auswahl: ${formatSelection(evaluation.submitted)} · richtig: ${formatSelection(evaluation.expected)}.`}
              </p>
            </div>

            <div className="reizwert-feedback-actions">
              {!shouldShowSolution && (
                <button
                  type="button"
                  className="reizwert-show-solution touch-target"
                  onClick={() => setShowSolution(true)}
                >
                  Richtige Lösung anzeigen
                </button>
              )}
              {shouldShowSolution && (
                <div className="reizwert-feedback-explanation">
                  <p className="reizwert-feedback-label">Richtige Lösung</p>
                  <p className="reizwert-feedback-formula">
                    {getGameTypeLabel(evaluation.gameType, getSuitLabel)}
                    {evaluation.expected && ` · ${formatSelection(evaluation.expected)}`}
                    {` · Reizwert ${evaluation.expectedGameValue}`}
                  </p>
                </div>
              )}

            </div>
          </>
        ) : (
          <div className="reizwert-feedback-placeholder">
            <span className="material-symbols-outlined reizwert-feedback-placeholder-icon" aria-hidden="true">
              analytics
            </span>
            <p className="reizwert-feedback-placeholder-title">Analyse</p>
            <p className="reizwert-feedback-placeholder-text">
              Deine Analyse erscheint hier nach dem Prüfen.
            </p>
          </div>
        )}
        </div>
        <button
          type="button"
          className="reizwert-new-puzzle touch-target reizwert-action-button"
          onClick={handleNewPuzzle}
          disabled={!hasChecked}
        >
          Neue Aufgabe
        </button>
      </div>
    </section>
  );
}
