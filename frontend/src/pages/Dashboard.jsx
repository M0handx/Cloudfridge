import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import ItemCard from '../components/ItemCard.jsx';

export default function Dashboard() {
  const [items, setItems] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoadError('');
    try {
      setItems(await api.listItems());
    } catch (err) {
      setLoadError(err.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function act(item, action) {
    setActionError('');
    setBusyId(item.id);
    try {
      await action();
      setItems((current) => current.filter((i) => i.id !== item.id));
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const markStatus = (item, status) => act(item, () => api.updateItem(item.id, { status }));
  const remove = (item) => act(item, () => api.deleteItem(item.id));

  return (
    <>
      <div className="page-header">
        <h1>Your fridge</h1>
        <Link to="/items/new" className="button primary">+ Add item</Link>
      </div>

      {actionError && <p className="form-error" role="alert">{actionError}</p>}

      {loadError && (
        <div className="notice" role="alert">
          <p>{loadError}</p>
          <button type="button" className="button" onClick={load}>Try again</button>
        </div>
      )}

      {!loadError && items === null && <p className="notice" role="status">Loading your items…</p>}

      {items?.length === 0 && (
        <div className="notice">
          <p><strong>Nothing here yet.</strong></p>
          <p>Add your first item, and we'll tell you before it goes bad.</p>
        </div>
      )}

      {items?.length > 0 && (
        <ul className="item-list">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              busy={busyId === item.id}
              onStatus={markStatus}
              onDelete={remove}
            />
          ))}
        </ul>
      )}
    </>
  );
}
