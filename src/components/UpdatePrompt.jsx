import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="update-prompt-container">
      <div className="update-prompt-message">
        <span className="material-symbols-outlined">system_update_alt</span>
        <div>
          <strong>Neue Version verfügbar!</strong>
          <p>Lade die App neu, um die neuesten Features und Bugfixes zu erhalten.</p>
        </div>
      </div>
      <div className="update-prompt-actions">
        <button className="btn-dismiss" onClick={() => setNeedRefresh(false)}>
          Später
        </button>
        <button className="btn-update" onClick={() => updateServiceWorker(true)}>
          Jetzt neuladen
        </button>
      </div>
    </div>
  );
}
