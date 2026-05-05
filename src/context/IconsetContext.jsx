import { createContext, useContext, useState } from 'react';

const IconsetContext = createContext(null);

export function IconsetProvider({ children }) {
  const [iconset, setIconsetState] = useState(() => {
    try {
      return localStorage.getItem('skatIconset') || 'altenburg';
    } catch {
      return 'french';
    }
  });

  const setIconset = (value) => {
    setIconsetState(value);
    try {
      localStorage.setItem('skatIconset', value);
    } catch {
      // Silently fail if localStorage is unavailable
    }
  };

  return (
    <IconsetContext.Provider value={{ iconset, setIconset }}>
      {children}
    </IconsetContext.Provider>
  );
}

export function useIconset() {
  const context = useContext(IconsetContext);
  if (!context) {
    throw new Error('useIconset must be used within IconsetProvider');
  }
  return context;
}
