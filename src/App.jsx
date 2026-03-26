import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GameProvider } from './context/GameContext';
import Sidebar from './components/Sidebar';
import PasswordGate from './components/PasswordGate';
import GameScoringEntry from './pages/GameScoringEntry';
import PlayerAnalytics from './pages/PlayerAnalytics';
import SkatScoreList from './pages/SkatScoreList';
import PlayerSettings from './pages/PlayerSettings';

function App() {
  return (
    <PasswordGate>
      <GameProvider>
        <BrowserRouter>
          <div className="app-container">
            <Sidebar />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<GameScoringEntry />} />
                <Route path="/analytics" element={<PlayerAnalytics />} />
                <Route path="/history" element={<SkatScoreList />} />
                <Route path="/players" element={<PlayerSettings />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </GameProvider>
    </PasswordGate>
  );
}

export default App;
