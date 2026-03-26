import React, { useState, useEffect } from 'react';

const STORAGE_KEY = 'skatAppAuth';
const PASSWORD_HASH_ENV = import.meta.env.VITE_APP_PASSWORD_HASH ?? '';

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function useAuth() {
  // If no password is configured, always grant access
  if (!PASSWORD_HASH_ENV) return { authed: true, unlock: () => {} };

  const stored = localStorage.getItem(STORAGE_KEY);
  return { authed: stored === PASSWORD_HASH_ENV, unlock: () => {} };
}

export default function PasswordGate({ children }) {
  const [authed, setAuthed] = useState(false);
  const [input, setInput]   = useState('');
  const [error, setError]   = useState(false);
  const [checking, setChecking] = useState(true);

  // No password configured → open access
  const noPassword = !PASSWORD_HASH_ENV;

  useEffect(() => {
    if (noPassword) { setAuthed(true); setChecking(false); return; }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === PASSWORD_HASH_ENV) setAuthed(true);
    setChecking(false);
  }, [noPassword]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const hash = await sha256(input.trim());
    if (hash === PASSWORD_HASH_ENV) {
      localStorage.setItem(STORAGE_KEY, hash);
      setAuthed(true);
      setError(false);
    } else {
      setError(true);
      setInput('');
    }
  };

  if (checking) return null;
  if (authed) return children;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'var(--bg, #1a1a2e)',
    }}>
      <div style={{
        backgroundColor: 'var(--surface, #16213e)',
        borderRadius: '1rem', padding: '2.5rem 2rem',
        width: '100%', maxWidth: '360px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        textAlign: 'center',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: 'var(--primary, #7c9cbf)', marginBottom: '1rem', display: 'block' }}>
          playing_cards
        </span>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.375rem' }}>Skat Scorer</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--outline, #888)', marginBottom: '2rem' }}>
          Bitte Passwort eingeben
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="password"
            value={input}
            onChange={e => { setInput(e.target.value); setError(false); }}
            placeholder="Passwort…"
            autoFocus
            style={{
              backgroundColor: 'var(--surface-high, #0f3460)',
              border: `1px solid ${error ? 'var(--secondary, #e74c3c)' : 'transparent'}`,
              borderRadius: '0.5rem', padding: '0.875rem 1rem',
              fontFamily: 'inherit', fontSize: '1rem',
              color: 'var(--on-surface, #fff)', textAlign: 'center',
              letterSpacing: '0.15em',
            }}
          />
          {error && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--secondary, #e74c3c)', margin: 0 }}>
              Falsches Passwort
            </p>
          )}
          <button type="submit" className="btn-primary" style={{ padding: '0.875rem' }}>
            Einloggen
          </button>
        </form>
      </div>
    </div>
  );
}
