import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import * as syncService from '../lib/syncService';

/**
 * /claim?token=xxx — Allows a player to claim their slot at a table via an invite link.
 */
export default function ClaimSlot() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Kein Token in der URL gefunden.');
      return;
    }

    async function claim() {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId) {
        setStatus('error');
        setMessage('Du musst eingeloggt sein, um einen Slot zu claimen.');
        return;
      }

      const { error } = await syncService.claimSlot(token, userId);

      if (error) {
        setStatus('error');
        setMessage(error.message ?? 'Unbekannter Fehler beim Claimen.');
      } else {
        setStatus('success');
        setMessage('Dein Platz wurde erfolgreich verknüpft! Deine Runden erscheinen jetzt in „Mein Profil".');
      }
    }

    claim();
  }, [token]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div className="card" style={{ maxWidth: '420px', width: '100%', padding: '2rem', textAlign: 'center' }}>
        {status === 'loading' && (
          <>
            <span style={{ fontSize: '2rem', animation: 'spin 1s linear infinite', display: 'block', marginBottom: '1rem' }}>⟳</span>
            <p>Slot wird verknüpft…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: 'var(--primary)', marginBottom: '1rem', display: 'block' }}>
              check_circle
            </span>
            <p style={{ fontWeight: 600, marginBottom: '1rem' }}>{message}</p>
            <button
              onClick={() => navigate('/mein-profil')}
              className="btn-primary"
              style={{ padding: '0.75rem 1.5rem' }}
            >
              Zu Mein Profil
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: 'var(--secondary)', marginBottom: '1rem', display: 'block' }}>
              error
            </span>
            <p style={{ fontWeight: 600, color: 'var(--secondary)', marginBottom: '1rem' }}>{message}</p>
            <button
              onClick={() => navigate('/')}
              style={{ padding: '0.75rem 1.5rem', borderRadius: '0.5rem', background: 'none', border: '1px solid var(--outline-variant)', color: 'var(--on-surface)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '1rem' }}
            >
              Zur Startseite
            </button>
          </>
        )}
      </div>
    </div>
  );
}
