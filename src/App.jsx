import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { GameProvider, useGame } from './context/GameContext';
import { IconsetProvider } from './context/IconsetContext';
import Sidebar from './components/Sidebar';
import AuthGate from './components/AuthGate';
import AchievementWatcher from './components/AchievementWatcher';
import UpdatePrompt from './components/UpdatePrompt';
import GameScoringEntry from './pages/GameScoringEntry';
import PlayerAnalytics from './pages/PlayerAnalytics';
import SkatScoreList from './pages/SkatScoreList';
import PlayerSettings from './pages/PlayerSettings';
import StatistikenCharts from './pages/StatistikenCharts';
import SkatInfo from './pages/SkatInfo';
import TrophyShowcasePage from './pages/TrophyShowcasePage';
import MeinProfil from './pages/MeinProfil';
import ClaimSlot from './pages/ClaimSlot';

function HashScrollRestoration() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash || hash === '#') return undefined;

    let targetId;
    try {
      targetId = decodeURIComponent(hash.slice(1));
    } catch {
      targetId = hash.slice(1);
    }
    if (!targetId) return undefined;

    let cancelled = false;
    let observer = null;
    let stopTimeout = null;

    const scrollToTarget = () => {
      const target = document.getElementById(targetId);
      if (!target || cancelled) return false;

      if (typeof target.scrollIntoView === 'function') {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      observer?.disconnect();
      if (stopTimeout !== null) window.clearTimeout(stopTimeout);
      return true;
    };

    if (!scrollToTarget()) {
      observer = new MutationObserver(scrollToTarget);
      observer.observe(document.body, { childList: true, subtree: true });
      stopTimeout = window.setTimeout(() => observer?.disconnect(), 10000);
    }

    return () => {
      cancelled = true;
      observer?.disconnect();
      if (stopTimeout !== null) window.clearTimeout(stopTimeout);
    };
  }, [pathname, hash]);

  return null;
}

function AppShell() {
  const { sessionLoaded } = useGame();

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        {!sessionLoaded ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100%', minHeight: '60vh',
          }}>
            <span style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }}>⟳</span>
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<GameScoringEntry />} />
            <Route path="/analytics" element={<PlayerAnalytics />} />
            <Route path="/history" element={<SkatScoreList />} />
            <Route path="/statistiken" element={<StatistikenCharts />} />
            <Route path="/players" element={<PlayerSettings />} />
            <Route path="/info" element={<SkatInfo />} />
            <Route path="/vitrine" element={<TrophyShowcasePage />} />
            <Route path="/mein-profil" element={<MeinProfil />} />
            <Route path="/claim" element={<ClaimSlot />} />
          </Routes>
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <IconsetProvider>
      <AuthGate>
        <GameProvider>
          <BrowserRouter basename="/app">
            <HashScrollRestoration />
            <AppShell />
            <AchievementWatcher />
            <UpdatePrompt />
          </BrowserRouter>
        </GameProvider>
      </AuthGate>
    </IconsetProvider>
  );
}

export default App;

