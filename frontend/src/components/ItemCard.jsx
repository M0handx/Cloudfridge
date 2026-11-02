import { Link } from 'react-router-dom';
import { daysLeft, describeExpiry, urgencyColor } from '../utils/urgency.js';

export default function ItemCard({ item, busy, onStatus, onDelete }) {
  const days = daysLeft(item.expiryDate);
  const color = urgencyColor(days);

  return (
    <li className={`item-card urgency-${color}`} data-urgency={color}>
      <div className="item-main">
        <h2 className="item-name">{item.name}</h2>
        <p className="item-meta">
          {item.category && <span className="item-category">{item.category}</span>}
          <span className="item-expiry">{describeExpiry(days)}</span>
        </p>
      </div>
      <div className="item-actions">
        <button type="button" className="button small" disabled={busy} onClick={() => onStatus(item, 'used')}>
          Used
        </button>
        <button type="button" className="button small" disabled={busy} onClick={() => onStatus(item, 'wasted')}>
          Wasted
        </button>
        <Link className="button small quiet" to={`/items/${item.id}/edit`}>Edit</Link>
        <button type="button" className="button small quiet" disabled={busy} onClick={() => onDelete(item)}>
          Delete
        </button>
      </div>
    </li>
  );
}
