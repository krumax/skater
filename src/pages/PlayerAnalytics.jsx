import React from 'react';

const PlayerAnalytics = () => {
  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Player Analytics</h1>
        <p className="page-subtitle">Lukas V. Schmidt</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: '3rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          
          <section className="form-section">
            <h3 className="headline" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Win Rate Consistency</h3>
            <div className="card" style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--surface-low)' }}>
              <p style={{ color: 'var(--outline)' }}>[ Chart Placeholder: Average monthly winning percentage ]</p>
            </div>
          </section>

          <section className="form-section">
            <h3 className="headline" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Analytical Summary</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>check_circle</span>
                <div>
                  <h4 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>End-game Calculation</h4>
                  <p style={{ color: 'var(--on-surface-variant)' }}>Consistently recovers points in the final three tricks.</p>
                </div>
              </div>
              
              <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>check_circle</span>
                <div>
                  <h4 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Bidding Precision</h4>
                  <p style={{ color: 'var(--on-surface-variant)' }}>Rare instances of overbidding based on probability models.</p>
                </div>
              </div>
              
              <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--secondary)' }}>error</span>
                <div>
                  <h4 style={{ fontWeight: 700, marginBottom: '0.25rem', color: 'var(--secondary)' }}>Karo Vulnerability</h4>
                  <p style={{ color: 'var(--on-surface-variant)' }}>Defensive play during Karo suit games drops win rate by 14%.</p>
                </div>
              </div>

              <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--secondary)' }}>error</span>
                <div>
                  <h4 style={{ fontWeight: 700, marginBottom: '0.25rem', color: 'var(--secondary)' }}>Passive Defense</h4>
                  <p style={{ color: 'var(--on-surface-variant)' }}>Player tends to hold trump too long in middle position.</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          <section className="form-section">
            <h3 className="headline" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Avg. Points / Game</h3>
            <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
              <div className="result-value" style={{ margin: 0, color: 'var(--primary)' }}>38.4</div>
            </div>
          </section>

          <section className="form-section">
            <h3 className="headline" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Game Type Distribution</h3>
            <div className="card">
              <p style={{ fontStyle: 'italic', marginBottom: '1.5rem', color: 'var(--outline-variant)' }}>"Player favors high-value 'Grand' declarations with an aggressive bidding style."</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>Grand</span>
                  <span style={{ fontWeight: 800 }}>45%</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--surface-high)', borderRadius: '4px' }}>
                  <div style={{ width: '45%', height: '100%', backgroundColor: 'var(--primary)', borderRadius: '4px' }}></div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                  <span style={{ fontWeight: 600 }}>Kreuz</span>
                  <span style={{ fontWeight: 800 }}>25%</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--surface-high)', borderRadius: '4px' }}>
                  <div style={{ width: '25%', height: '100%', backgroundColor: 'var(--on-surface-variant)', borderRadius: '4px' }}></div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                  <span style={{ fontWeight: 600 }}>Pik</span>
                  <span style={{ fontWeight: 800 }}>15%</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--surface-high)', borderRadius: '4px' }}>
                  <div style={{ width: '15%', height: '100%', backgroundColor: 'var(--outline)', borderRadius: '4px' }}></div>
                </div>
              </div>
            </div>
          </section>
          
          <section className="form-section">
            <h3 className="headline" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Recent Honors</h3>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div className="card" style={{ flex: 1, textAlign: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: 'var(--tertiary)' }}>workspace_premium</span>
                <p style={{ marginTop: '0.5rem', fontWeight: 700, fontSize: '0.875rem' }}>Grand Ouvert</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PlayerAnalytics;
