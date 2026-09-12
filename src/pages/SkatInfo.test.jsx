// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { render, within } from '@testing-library/react';
import { IconsetProvider } from '../context/IconsetContext';
import SkatInfo from './SkatInfo';

describe('SkatInfo – Reizen-Integration', () => {
  it('zeigt Erklärung, Ermittler und Reiztabelle in der vorgesehenen Reihenfolge', () => {
    const { container } = render(
      <IconsetProvider>
        <SkatInfo />
      </IconsetProvider>,
    );

    const reizenSection = container.querySelector('#reizen');
    const trainerSection = container.querySelector('#reizen-uebung');
    const tableHeading = within(container).getByRole('heading', { name: 'Reiztabelle' });
    const tableSection = tableHeading.closest('section');

    expect(reizenSection).not.toBeNull();
    expect(trainerSection).not.toBeNull();
    expect(tableSection).not.toBeNull();

    if (!reizenSection || !trainerSection || !tableSection) return;

    expect(within(reizenSection).getByRole('heading', { name: 'Reizen verstehen' })).toBeInTheDocument();
    const reizenGraphic = within(reizenSection).getByRole('img', { name: /Infografik zum Skat-Reizen/ });
    expect(reizenGraphic).toHaveAttribute('loading', 'lazy');
    expect(reizenGraphic).toHaveAttribute('width', '1280');
    expect(reizenSection).toHaveTextContent(/Reizwert/);
    expect(reizenSection).toHaveTextContent(/Spielwert/);
    expect(reizenSection).toHaveTextContent(/Sager/);
    expect(reizenSection).toHaveTextContent(/Hörer/);
    expect(reizenSection).toHaveTextContent(/Ja/);
    expect(reizenSection).toHaveTextContent(/Weg/);
    expect(reizenSection).toHaveTextContent(/nächste Spieler.*weiter reizen/);
    expect(reizenSection).toHaveTextContent(/Alleinspieler/);

    const steps = within(reizenSection).getByRole('list');
    expect(within(steps).getAllByRole('listitem')).toHaveLength(4);
    expect(within(reizenSection).queryByRole('link', { name: /Zur Übung/ })).not.toBeInTheDocument();

    expect(within(trainerSection).getByRole('heading', { name: 'Reizwert-Trainer' })).toBeInTheDocument();
    expect(within(tableSection).getByRole('table')).toBeInTheDocument();

    const sections = Array.from(container.querySelectorAll('section'));
    expect(sections.indexOf(reizenSection)).toBeLessThan(sections.indexOf(trainerSection));
    expect(sections.indexOf(trainerSection)).toBeLessThan(sections.indexOf(tableSection));
  });
});
