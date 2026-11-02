import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Statistics() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setStats(await api.getStats());
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <div className="page-header"><h1>Statistics</h1></div>

      {error && (
        <div className="notice" role="alert">
          <p>{error}</p>
          <button type="button" className="button" onClick={load}>Try again</button>
        </div>
      )}
      {!error && !stats && <p className="notice" role="status">Loading…</p>}

      {stats && stats.used + stats.wasted === 0 && (
        <div className="notice">
          <p><strong>No statistics yet.</strong></p>
          <p>Mark items as used or wasted on the dashboard to see them counted here.</p>
        </div>
      )}

      {stats && stats.used + stats.wasted > 0 && (
        <div className="stats-grid">
          <div className="stat"><span className="stat-value" data-stat="used">{stats.used}</span><span className="stat-label">Used</span></div>
          <div className="stat"><span className="stat-value" data-stat="wasted">{stats.wasted}</span><span className="stat-label">Wasted</span></div>
          <div className="stat"><span className="stat-value" data-stat="wastePercent">{stats.wastePercent}%</span><span className="stat-label">Wasted overall</span></div>
        </div>
      )}
    </>
  );
}
