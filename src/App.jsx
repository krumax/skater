import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GameProvider } from './context/GameContext';
import Sidebar from './components/Sidebar';
import AuthGate from './components/AuthGate';
import AchievementWatcher from './components/AchievementWatcher';
import GameScoringEntry from './pages/GameScoringEntry';
import PlayerAnalytics from './pages/PlayerAnalytics';
import SkatScoreList from './pages/SkatScoreList';
import PlayerSettings from './pages/PlayerSettings';
import StatistikenCharts from './pages/StatistikenCharts';
import SkatInfo from './pages/SkatInfo';

function App() {
  return (
    <AuthGate>
      <GameProvider>
        <BrowserRouter basename="/app">
          <div className="app-container">
            <Sidebar />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<GameScoringEntry />} />
                <Route path="/analytics" element={<PlayerAnalytics />} />
                <Route path="/history" element={<SkatScoreList />} />
                <Route path="/statistiken" element={<StatistikenCharts />} />
                <Route path="/players" element={<PlayerSettings />} />
                <Route path="/info" element={<SkatInfo />} />
              </Routes>
            </main>
          </div>
          <AchievementWatcher />
        </BrowserRouter>
      </GameProvider>
    </AuthGate>
  );
}

export default App;

