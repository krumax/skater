import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';

const Sidebar = () => {
  const navigate = useNavigate();
  const { currentRound, resetSession } = useGame();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Veranda Table</h2>
        <p>Round {currentRound}</p>
      </div>
      
      <nav className="sidebar-nav">
        <NavLink to="/" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <span className="material-symbols-outlined">playing_cards</span>
          Current Game
        </NavLink>
        <NavLink to="/history" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <span className="material-symbols-outlined">menu_book</span>
          Score Ledger
        </NavLink>
        <NavLink to="/analytics" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <span className="material-symbols-outlined">leaderboard</span>
          Player Stats
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <button className="btn-new-round" onClick={() => navigate('/')}>
          <span className="material-symbols-outlined">add</span>
          New Round
        </button>
        <button className="btn-end-session" onClick={() => {
          if (window.confirm('End this session and reset all scores?')) {
            resetSession();
            navigate('/');
          }
        }}>
          <span className="material-symbols-outlined">exit_to_app</span>
          End Session
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
