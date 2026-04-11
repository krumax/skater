import { useState, useMemo } from 'react';
import { calculateGameValue, getOutcomeLabel, SUIT_LABELS } from '../lib/skatScoring';

const DEFAULT_GAME_TYPE = 'spade';

/**
 * useGameForm — encapsulates all form state and derived values
 * for the GameScoringEntry page.
 *
 * Returns state, setters, derived values, and action handlers.
 */
export function useGameForm(initialPlayer = '') {
  const [activePlayer, setActivePlayer] = useState(initialPlayer);
  const [gameType, setGameTypeRaw]      = useState(DEFAULT_GAME_TYPE);
  const [hand, setHand]                 = useState(false);
  const [schneider, setSchneider]       = useState(false);
  const [schneiderAnnounced, setSchneiderAnnounced] = useState(false);
  const [schwarz, setSchwarz]           = useState(false);
  const [schwarzAnnounced, setSchwartzAnnounced]    = useState(false);
  const [ouvert, setOuvert]             = useState(false);
  const [mitOhne, setMitOhne]           = useState('mit');
  const [spitzen, setSpitzen]           = useState(1);
  const [eyeCount, setEyeCount]         = useState(61);
  const [isBock, setIsBock]             = useState(false);

  // Derived
  const maxSpitzen = ['club', 'spade', 'heart', 'diamond'].includes(gameType)
    ? 11
    : gameType === 'grand' ? 4 : 0;

  const result = useMemo(() => {
    try {
      return calculateGameValue({
        gameType,
        spitzen,
        hand,
        schneider,
        schneiderAnnounced,
        schwarz,
        schwarzAnnounced,
        ouvert,
        eyeCount: gameType === 'null' ? (eyeCount === 0 ? 0 : 1) : eyeCount,
      });
    } catch {
      return null;
    }
  }, [gameType, spitzen, hand, schneider, schwarz, ouvert, eyeCount]);

  const outcomeLabel = useMemo(() => {
    if (gameType === 'passed') return 'Eingepasst';
    if (gameType === 'null') return eyeCount === 0 ? 'Null gewonnen' : 'Null verloren';
    return getOutcomeLabel(eyeCount);
  }, [gameType, eyeCount]);

  // Handles game type change with side effects (reset eyeCount, clamp spitzen)
  const setGameType = (type) => {
    setGameTypeRaw(type);
    if (type === 'null') { setSpitzen(1); setMitOhne('mit'); setEyeCount(0); }
    else { setEyeCount(61); }
    if (type === 'grand' && spitzen > 4) setSpitzen(4);
  };

  const resetForm = () => {
    setGameTypeRaw(DEFAULT_GAME_TYPE);
    setHand(false);
    setSchneider(false);
    setSchneiderAnnounced(false);
    setSchwarz(false);
    setSchwartzAnnounced(false);
    setOuvert(false);
    setMitOhne('mit');
    setSpitzen(1);
    setEyeCount(61);
    setIsBock(false);
  };

  // Builds the round payload for addRound()
  const buildRoundPayload = () => {
    if (!result) return null;
    const typeLabel = gameType === 'passed'
      ? 'Eingepasst'
      : (SUIT_LABELS[gameType]
        + (hand ? ' Hand' : '')
        + (schneiderAnnounced ? ' Schneider angesagt' : schneider ? ' Schneider' : '')
        + (schwarzAnnounced ? ' Schwarz angesagt' : schwarz ? ' Schwarz' : '')
        + (ouvert ? ' Ouvert' : ''));

    return {
      player: gameType === 'passed' ? '-' : activePlayer,
      gameType,
      typeLabel,
      gameValue: result.gameValue,
      baseValue: result.baseValue,
      multiplier: result.multiplier,
      won: result.won,
      eyeCount,
      spitzen,
      hand,
      schneider,
      schneiderAnnounced,
      schwarz,
      schwarzAnnounced,
      ouvert,
      isBock,
      mitOhne,
    };
  };

  return {
    // State
    activePlayer, setActivePlayer,
    gameType, setGameType,
    hand, setHand,
    schneider, setSchneider,
    schneiderAnnounced, setSchneiderAnnounced,
    schwarz, setSchwarz,
    schwarzAnnounced, setSchwartzAnnounced,
    ouvert, setOuvert,
    mitOhne, setMitOhne,
    spitzen, setSpitzen,
    eyeCount, setEyeCount,
    isBock, setIsBock,
    // Derived
    maxSpitzen,
    result,
    outcomeLabel,
    // Actions
    resetForm,
    buildRoundPayload,
  };
}
