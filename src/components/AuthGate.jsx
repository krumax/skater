/**
 * AuthGate — Supabase Auth with GSI (Google Identity Services).
 *
 * Zeigt Login-Screen wenn kein User eingeloggt ist.
 * Unterstützt: E-Mail/Passwort, Google GSI (signInWithIdToken), Registrierung.
 *
 * Google Sign-In läuft über den GSI-Flow (kein OAuth-Redirect):
 *   1. GSI-Script initialisiert sich mit der Client-ID
 *   2. User klickt Button → google.accounts.id.prompt() öffnet Popup
 *   3. Callback erhält credential-Token → supabase.auth.signInWithIdToken()
 * Das funktioniert sowohl im Browser als auch in einer TWA (Android).
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import logoUrl from '/skatastrophe_logo_2.png';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Nonce-Generierung für GSI (SHA-256 gehasht für Google, plain für Supabase)
async function generateNonce() {
  const raw = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(raw));
  const hashed = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  return { raw, hashed };
}

let gsiInitialized = false;

export default function AuthGate({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode]       = useState('login'); // 'login' | 'signup'
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]     = useState('');
  const [info, setInfo]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const nonceRef = useState(null); // [0] = { raw, hashed }

  // GSI Callback: wird von Google aufgerufen mit einem credential-Token
  const handleGsiCredential = useCallback(async (response) => {
    setError('');
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: response.credential,
      nonce: nonceRef[0]?.raw,
    });
    if (error) setError(error.message);
  }, [nonceRef]);

  // Session beim Start laden + auf Auth-Änderungen hören + GSI initialisieren
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    const initGsi = async () => {
      if (!window.google?.accounts?.id || !GOOGLE_CLIENT_ID || gsiInitialized) return;
      gsiInitialized = true;

      const nonce = await generateNonce();
      nonceRef[0] = nonce;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGsiCredential,
        nonce: nonce.hashed,
        use_fedcm_for_prompt: true,
      });
    };

    if (window.google?.accounts?.id) {
      initGsi();
    } else {
      const script = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
      if (script) script.addEventListener('load', initGsi);
    }

    return () => subscription.unsubscribe();
  }, [handleGsiCredential, nonceRef]);

  if (loading) return null;
  if (user) return children;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError(''); setInfo(''); setSubmitting(true);
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setInfo('Bestätigungs-E-Mail gesendet. Bitte prüfe dein Postfach.');
    }
    setSubmitting(false);
  };

  const handleGoogle = () => {
    setError('');
    if (!window.google?.accounts?.id) {
      setError('Google Sign-In konnte nicht geladen werden. Bitte Seite neu laden.');
      return;
    }
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        setError('Google-Anmeldung wurde abgebrochen oder blockiert.');
      }
    });
  };

  // ── UI ────────────────────────────────────────────────────────────────────

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'var(--primary)',
      backgroundImage: 'radial-gradient(ellipse at 60% 20%, #1a5c44 0%, #0b3d2e 60%)',
    }}>
      <div style={{
        backgroundColor: 'var(--surface)',
        borderRadius: '1.5rem', padding: '2.5rem 2rem',
        width: '100%', maxWidth: '380px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
        textAlign: 'center',
      }}>
        {/* Logo */}
        <img
          src={logoUrl}
          alt="SKATASTROPHE"
          style={{ width: '140px', marginBottom: '0.5rem', display: 'block', marginLeft: 'auto', marginRight: 'auto' }}
        />
        <p style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.15em', color: '#d0a600', textTransform: 'uppercase', marginBottom: '1.75rem' }}>
          SKATASTROPHE
        </p>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.25rem' }}>
          {mode === 'login' ? 'Willkommen zurück' : 'Account erstellen'}
        </h2>
        <p style={{ fontSize: '0.8125rem', color: 'var(--outline)', marginBottom: '1.75rem' }}>
          {mode === 'login' ? 'Melde dich an, um weiterzuspielen.' : 'Erstelle deinen kostenlosen Account.'}
        </p>

        {/* Google */}
        <button
          onClick={handleGoogle}
          style={{
            width: '100%', padding: '0.75rem',
            border: '1px solid var(--outline-variant)',
            borderRadius: '0.75rem', backgroundColor: 'var(--surface-low)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
            fontSize: '0.9375rem', fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit', marginBottom: '1.25rem',
            transition: 'background 0.15s',
          }}
          onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--surface-high)'}
          onMouseOut={e => e.currentTarget.style.backgroundColor = 'var(--surface-low)'}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          Mit Google anmelden
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--outline-variant)' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--outline)', fontWeight: 600 }}>oder</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--outline-variant)' }} />
        </div>

        {/* E-Mail Form */}
        <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(''); }}
            placeholder="E-Mail"
            required
            style={{
              padding: '0.75rem 1rem', borderRadius: '0.75rem',
              border: '1px solid var(--outline-variant)',
              backgroundColor: 'var(--surface-low)',
              fontFamily: 'inherit', fontSize: '0.9375rem',
              color: 'var(--on-surface)', outline: 'none',
            }}
          />
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            placeholder="Passwort"
            required
            style={{
              padding: '0.75rem 1rem', borderRadius: '0.75rem',
              border: '1px solid var(--outline-variant)',
              backgroundColor: 'var(--surface-low)',
              fontFamily: 'inherit', fontSize: '0.9375rem',
              color: 'var(--on-surface)', outline: 'none',
            }}
          />

          {error && (
            <p style={{ fontSize: '0.8rem', color: 'var(--secondary)', textAlign: 'left', margin: 0 }}>{error}</p>
          )}
          {info && (
            <p style={{ fontSize: '0.8rem', color: 'var(--primary)', textAlign: 'left', margin: 0 }}>{info}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary"
            style={{ padding: '0.875rem', opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? '…' : mode === 'login' ? 'Anmelden' : 'Account erstellen'}
          </button>
        </form>

        {/* Mode toggle */}
        <p style={{ marginTop: '1.25rem', fontSize: '0.8125rem', color: 'var(--outline)' }}>
          {mode === 'login' ? 'Noch kein Account?' : 'Bereits registriert?'}{' '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setInfo(''); }}
            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}
          >
            {mode === 'login' ? 'Registrieren' : 'Anmelden'}
          </button>
        </p>
      </div>
    </div>
  );
}
