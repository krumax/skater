import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GameProvider, useGame } from './context/GameContext';
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
          </Routes>
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthGate>
      <GameProvider>
        <BrowserRouter basename="/app">
          <AppShell />
          <AchievementWatcher />
          <UpdatePrompt />
        </BrowserRouter>
      </GameProvider>
    </AuthGate>
  );
}

export default App;

