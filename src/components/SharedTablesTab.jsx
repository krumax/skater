import { useProfileData } from '../hooks/useProfileData';
import {
  LinkedSessionCard,
  ReadOnlySessionDetail,
  SessionCard,
} from '../pages/MeinProfil';

/**
 * Shows sessions linked to the current user inside the Skatliste.
 * The same read-only detail flow is used by the profile page, so shared
 * tables stay available on mobile without duplicating session access logic.
 */
const SharedTablesTab = () => {
  const {
    sessionSummaries,
    currentUserId,
    linkedSessions,
    linkedSessionsLoading,
    linkedSessionsError,
    refetchLinkedSessions,
    sessionDetail,
    sessionDetailLoading,
    sessionDetailError,
    loadSessionDetail,
    clearSessionDetail,
  } = useProfileData();

  if (sessionDetail || sessionDetailLoading || sessionDetailError) {
    return (
      <ReadOnlySessionDetail
        sessionDetail={sessionDetail}
        loading={sessionDetailLoading}
        error={sessionDetailError}
        onBack={clearSessionDetail}
        heading="Geteilte Tische"
      />
    );
  }

  if (linkedSessionsLoading) {
    return (
      <div className="card" style={{ backgroundColor: 'var(--surface-low)', padding: '2rem', textAlign: 'center' }}>
        <span style={{ fontSize: '1.5rem', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
        <p style={{ color: 'var(--outline)', marginTop: '0.5rem' }}>Geteilte Tische werden geladen …</p>
      </div>
    );
  }

  if (linkedSessionsError) {
    return (
      <div className="card" style={{ backgroundColor: 'var(--error-container, #fdecea)', padding: '1.5rem' }}>
        <p style={{ color: 'var(--on-error-container, #d32f2f)', marginBottom: '1rem' }}>
          Fehler beim Laden der geteilten Tische.
        </p>
        <button
          onClick={refetchLinkedSessions}
          className="chip active"
          style={{ fontSize: '0.9rem', padding: '0.6rem 1.25rem' }}
        >
          Erneut versuchen
        </button>
      </div>
    );
  }

  const summaryIds = new Set((sessionSummaries || []).map(summary => summary.sessionId));
  const linkedOnly = (linkedSessions || []).filter(session => !summaryIds.has(session.sessionId));
  const ownSummaries = (sessionSummaries || []).filter(session => session.createdBy === currentUserId);
  const invitedSummaries = (sessionSummaries || []).filter(session => session.createdBy !== currentUserId);
  const ownLinked = linkedOnly.filter(session => session.createdBy === currentUserId);
  const invitedLinked = linkedOnly.filter(session => session.createdBy !== currentUserId);
  const tables = [
    ...ownSummaries.map(data => ({ type: 'summary', data })),
    ...ownLinked.map(data => ({ type: 'linked', data })),
    ...invitedSummaries.map(data => ({ type: 'summary', data })),
    ...invitedLinked.map(data => ({ type: 'linked', data })),
  ];

  return (
    <section>
      <header style={{ marginBottom: '1rem' }}>
        <h2 className="headline" style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>
          Geteilte Tische
        </h2>
        <p style={{ fontSize: '0.8125rem', color: 'var(--outline)' }}>
          Tische, mit denen dein Benutzerkonto verknüpft ist.
        </p>
      </header>

      {tables.length === 0 ? (
        <div className="card" style={{ backgroundColor: 'var(--surface-low)', padding: '2rem', textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: 'var(--outline)', marginBottom: '0.75rem', display: 'block' }}>
            link_off
          </span>
          <p style={{ color: 'var(--on-surface-variant)', marginBottom: '0.5rem', fontWeight: 600 }}>
            Noch keine geteilten Tische.
          </p>
          <p style={{ color: 'var(--outline)', fontSize: '0.875rem', maxWidth: '28rem', margin: '0 auto' }}>
            Bitte den Tischersteller um einen Einladungslink, um deinen Spielerslot zu verknüpfen.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {tables.map((table, index) => {
            const isOwnTable = table.data.createdBy === currentUserId;
            if (table.type === 'summary') {
              return (
                <SessionCard
                  key={table.data.sessionId}
                  summary={table.data}
                  index={index}
                  onSessionClick={loadSessionDetail}
                  isOwnTable={isOwnTable}
                />
              );
            }

            return (
              <LinkedSessionCard
                key={table.data.sessionId}
                session={table.data}
                index={index}
                onClick={() => loadSessionDetail(table.data.sessionId)}
                isOwnTable={isOwnTable}
              />
            );
          })}
        </div>
      )}
    </section>
  );
};

export default SharedTablesTab;
