// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { IconsetProvider } from '../../context/IconsetContext.jsx';
import { SUIT_ICON_COLORS } from '../../lib/tokens.js';
import {
  calculateTrainerGameValue,
  createTrainerPuzzle,
  getSpitzenForGame,
} from '../../lib/reizwertTrainer.js';
import ReizwertTrainer from './ReizwertTrainer.jsx';

function renderTrainer({ iconset = 'french' } = {}) {
  localStorage.setItem('skatIconset', iconset);
  const random = () => 0;
  const view = render(
    <IconsetProvider>
      <ReizwertTrainer random={random} />
    </IconsetProvider>,
  );

  return { ...view, puzzle: createTrainerPuzzle({ random }) };
}

const EXPECTED_SUIT_LABELS = {
  french: { club: 'Kreuz', spade: 'Pik', heart: 'Herz', diamond: 'Karo' },
  altenburg: { club: 'Eichel', spade: 'Grün', heart: 'Rot', diamond: 'Schellen' },
};

const EXPECTED_RANK_LABELS = {
  french: { seven: '7', eight: '8', nine: '9', ten: '10', jack: 'Bube', queen: 'Dame', king: 'König', ace: 'Ass' },
  altenburg: { seven: '7', eight: '8', nine: '9', ten: '10', jack: 'Unter', queen: 'Ober', king: 'König', ace: 'Ass' },
};

function expectVisibleCardLabels(puzzle, iconset) {
  puzzle.hand.forEach((card) => {
    const expectedName = `${EXPECTED_SUIT_LABELS[iconset][card.suit]}-${EXPECTED_RANK_LABELS[iconset][card.rank]}`;
    expect(screen.getByRole('img', { name: expectedName, exact: true })).toBeInTheDocument();
  });
}

function selectGameType(gameType) {
  const labels = {
    club: /Kreuz|Eichel/,
    spade: /Pik|Grün/,
    heart: /Herz|Rot/,
    diamond: /Karo|Schellen/,
    grand: 'Grand',
    null: 'Null',
  };
  fireEvent.click(screen.getByRole('button', { name: labels[gameType] }));
}

function selectExpectedAnnouncement(puzzle, gameType) {
  const expected = getSpitzenForGame(puzzle.hand, gameType);
  fireEvent.click(screen.getByRole('button', { name: expected.mitOhne === 'mit' ? 'Mit' : 'Ohne', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: String(expected.spitzen), exact: true }));
  return expected;
}

function enterReizwert(value) {
  fireEvent.change(screen.getByLabelText('Dein Reizwert'), {
    target: { value: String(value) },
  });
}

describe('ReizwertTrainer', () => {
  it('zeigt den Auswahlmodus, zehn Karten und die Auswahlbereiche', () => {
    const { container } = renderTrainer();

    expect(screen.getByText(/Auswahlmodus:/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Reizwert-Trainer' })).toBeInTheDocument();
    expect(screen.getByText(/10 Karten · Farbspiele, Grand und Null/)).toBeInTheDocument();
    expect(screen.getByText(/Wähle eine Spielart\./)).toBeInTheDocument();
    expect(screen.getByText(/Mit\/Ohne-, Spitzen- und Reizwertberechnung/)).toBeInTheDocument();
    expect(screen.getByText(/ausschließlich 1 bis 4 Spitzen/)).toBeInTheDocument();
    expect(screen.getByText(/eigentlich korrekte Berechnung höherer Spitzen bleibt bewusst außerhalb/)).toBeInTheDocument();
    expect(screen.getByText(/keine taktische Reizempfehlung/)).toBeInTheDocument();
    expect(screen.getByText(/Hand, unbekannter Skat sowie Schneider, Schwarz, Ouvert, Bock und Seeger-Fabian/)).toBeInTheDocument();
    expect(screen.getByText(/berechne den passenden Reizwert/)).toBeInTheDocument();
    expect(container.querySelectorAll('[data-card-id]')).toHaveLength(10);
    const otherCardList = container.querySelector('.reizwert-other-card-list');
    expect(otherCardList?.style.getPropertyValue('--reizwert-other-card-count')).toBe('9');
    const valueEntry = container.querySelector('.reizwert-value-entry');
    const valueRow = container.querySelector('.reizwert-value-row');
    expect(valueRow).toContainElement(screen.getByRole('button', { name: 'Prüfen' }));
    expect(valueEntry).not.toContainElement(screen.getByRole('button', { name: 'Prüfen' }));
    expect(screen.getByText('Spielart')).toBeInTheDocument();
    expect(screen.getByText('Ansage')).toBeInTheDocument();
    expect(screen.getByLabelText('Dein Reizwert')).toBeDisabled();
    expect(screen.getByText('Deine Analyse erscheint hier nach dem Prüfen.')).toBeInTheDocument();
    const initialNewPuzzleButton = screen.getByRole('button', { name: 'Neue Aufgabe' });
    expect(initialNewPuzzleButton).toBeDisabled();
    expect(initialNewPuzzleButton).toHaveClass('reizwert-action-button');
    expect(screen.queryByLabelText('Temporäre Übungssitzung')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Prüfen' })).toBeEnabled();
    [1, 2, 3, 4].forEach((number) => {
      expect(screen.getByRole('button', { name: String(number), exact: true })).toBeDisabled();
    });
    [5, 6, 7, 8, 9, 10, 11].forEach((number) => {
      expect(screen.queryByRole('button', { name: String(number), exact: true })).not.toBeInTheDocument();
    });
  });

  it('verwendet die französischen Bezeichnungen für ein französisches Blatt', () => {
    const { puzzle } = renderTrainer({ iconset: 'french' });

    expectVisibleCardLabels(puzzle, 'french');
    expect(screen.getByText('Buben', { exact: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kreuz/ })).toBeInTheDocument();
  });

  it('färbt die französischen Kartenicons wie die Spielartauswahl', () => {
    const { container, puzzle } = renderTrainer({ iconset: 'french' });

    puzzle.hand.forEach((card) => {
      const cardElement = container.querySelector(`[data-card-id="${card.id}"]`);
      const suitIcon = cardElement?.querySelector('.playing-card__suit-icon > span');

      expect(suitIcon).not.toBeNull();
      if (suitIcon) {
        expect(suitIcon).toHaveStyle({ color: SUIT_ICON_COLORS[card.suit] });
      }
    });
  });

  it('verwendet Altenburger-Bezeichnungen für ein deutsches Blatt', () => {
    const { puzzle } = renderTrainer({ iconset: 'altenburg' });

    expectVisibleCardLabels(puzzle, 'altenburg');
    expect(screen.getByRole('group', { name: /Eichel: Unter vorhanden/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Eichel/ })).toBeInTheDocument();

    selectGameType('club');
    const expected = selectExpectedAnnouncement(puzzle, 'club');
    enterReizwert(calculateTrainerGameValue('club', expected.spitzen));
    fireEvent.click(screen.getByRole('button', { name: 'Prüfen' }));

    expect(screen.getByRole('status')).toHaveTextContent(
      'Richtig! Die Prüfung für Eichel ist vollständig richtig.',
    );
  });

  it('fordert vor der Prüfung eine Spielart an', () => {
    renderTrainer();

    fireEvent.click(screen.getByRole('button', { name: 'Prüfen' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Bitte wähle zuerst eine Spielart aus.');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('setzt nach der Spielartwahl keine Spitzen voraus', () => {
    renderTrainer();

    selectGameType('spade');

    [1, 2, 3, 4].forEach((number) => {
      expect(screen.getByRole('button', { name: String(number), exact: true }))
        .toHaveAttribute('aria-pressed', 'false');
    });
    [5, 6, 7, 8, 9, 10, 11].forEach((number) => {
      expect(screen.queryByRole('button', { name: String(number), exact: true })).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Prüfen' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Bitte wähle zuerst die Anzahl der Spitzen aus.',
    );
  });

  it('prüft die richtige Ansage für die ausgewählte Spielart', () => {
    const { puzzle } = renderTrainer();

    selectGameType('club');
    const expected = selectExpectedAnnouncement(puzzle, 'club');
    enterReizwert(calculateTrainerGameValue('club', expected.spitzen));
    fireEvent.click(screen.getByRole('button', { name: 'Prüfen' }));

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(
      'Richtig! Die Prüfung für Kreuz ist vollständig richtig.',
    );
    expect(status).toHaveTextContent('Spielwert: ✓');
    expect(status).toHaveTextContent(`Spitzen: ✓ ${expected.mitOhne} ${expected.spitzen}`);
    expect(screen.getByRole('button', { name: /Kreuz|Eichel/ })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Richtige Lösung anzeigen' })).not.toBeInTheDocument();
    expect(screen.getByText('Richtige Lösung', { exact: true })).toBeInTheDocument();
    const feedback = screen.getByRole('status');
    const newPuzzleButton = screen.getByRole('button', { name: 'Neue Aufgabe' });
    expect(newPuzzleButton.parentElement).toBe(feedback.parentElement);
    expect(newPuzzleButton).toBeEnabled();
    expect(newPuzzleButton).toHaveClass('reizwert-action-button');
    expect(feedback).not.toContainElement(newPuzzleButton);
  });

  it('lässt falsche Antworten korrigieren und hält die Lösung verborgen', () => {
    const { puzzle } = renderTrainer();

    selectGameType('grand');
    const expected = getSpitzenForGame(puzzle.hand, 'grand');
    const wrongSpitzen = expected.spitzen === 1 ? 2 : 1;
    fireEvent.click(screen.getByRole('button', { name: expected.mitOhne === 'mit' ? 'Mit' : 'Ohne', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: String(wrongSpitzen), exact: true }));
    enterReizwert(calculateTrainerGameValue('grand', wrongSpitzen));
    fireEvent.click(screen.getByRole('button', { name: 'Prüfen' }));

    expect(screen.getByRole('status')).toHaveTextContent(
      'Noch nicht. Prüfe Spielwert und Spitzen unten getrennt.',
    );
    expect(screen.getByRole('status')).toHaveTextContent('Spielwert: ✓');
    expect(screen.getByRole('status')).toHaveTextContent(
      `Spitzen: ✗ Deine Auswahl: ${expected.mitOhne} ${wrongSpitzen}`,
    );
    expect(screen.getByRole('button', { name: 'Prüfen' })).toBeEnabled();
    expect(screen.getByLabelText('Dein Reizwert')).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Grand' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Neue Aufgabe' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Richtige Lösung anzeigen' })).toBeInTheDocument();
    expect(screen.queryByText('Richtige Lösung', { exact: true })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Richtige Lösung anzeigen' }));
    expect(screen.getByText('Richtige Lösung', { exact: true })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: String(expected.spitzen), exact: true }));
    enterReizwert(calculateTrainerGameValue('grand', expected.spitzen));
    fireEvent.click(screen.getByRole('button', { name: 'Prüfen' }));

    expect(screen.getByRole('status')).toHaveTextContent(
      'Richtig! Die Prüfung für Grand ist vollständig richtig.',
    );
    expect(screen.getByRole('button', { name: 'Grand' })).toBeDisabled();
  });

  it('behandelt Null als Spielart ohne Spitzen', () => {
    renderTrainer();

    selectGameType('null');
    expect(screen.getByRole('button', { name: 'Mit', exact: true })).toBeDisabled();
    expect(screen.getByRole('button', { name: '1', exact: true })).toBeDisabled();
    enterReizwert(23);
    fireEvent.click(screen.getByRole('button', { name: 'Prüfen' }));

    expect(screen.getByRole('status')).toHaveTextContent(
      'Richtig! Die Prüfung für Null ist vollständig richtig.',
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Spitzen: — Beim Nullspiel gibt es keine Spitzen.',
    );
  });

  it('gibt jeder Karte einen zugänglichen Namen und hält die Bedienung tastatur- sowie touch-tauglich', () => {
    const { container } = renderTrainer();
    const cards = Array.from(container.querySelectorAll('[data-card-id]'));
    const checkButton = screen.getByRole('button', { name: 'Prüfen' });
    const refreshButton = screen.getByRole('button', { name: 'Neue Handkarten anzeigen' });

    expect(cards).toHaveLength(10);
    cards.forEach((card) => {
      expect(card).toHaveAccessibleName(/.+-.+/);
    });
    expect(checkButton).toHaveAttribute('type', 'submit');
    expect(checkButton).toHaveClass('touch-target');
    expect(checkButton).toHaveClass('reizwert-action-button');
    expect(refreshButton).toHaveAttribute('type', 'button');
    expect(refreshButton).toHaveClass('touch-target');

    fireEvent.submit(container.querySelector('form'));
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('kündigt die Auflösung als einen Status mit Text und Symbol an', () => {
    const { puzzle } = renderTrainer();

    selectGameType('club');
    const expected = selectExpectedAnnouncement(puzzle, 'club');
    enterReizwert(calculateTrainerGameValue('club', expected.spitzen));
    fireEvent.click(screen.getByRole('button', { name: 'Prüfen' }));

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-atomic', 'true');
    expect(status).toHaveTextContent('Richtig');
    expect(status).toHaveTextContent('✓');
  });
});
