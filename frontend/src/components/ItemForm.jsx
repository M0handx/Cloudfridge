import { useState } from 'react';
import { Link } from 'react-router-dom';

const CATEGORIES = ['Dairy', 'Meat', 'Vegetables', 'Fruit', 'Bakery', 'Frozen', 'Drinks', 'Other'];

export default function ItemForm({ initial, submitLabel, onSubmit }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [expiryDate, setExpiryDate] = useState(initial?.expiryDate ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSubmit({ name: name.trim(), expiryDate, category: category || null });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label className="field">
        <span>Name</span>
        <input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          placeholder="e.g. Milk"
          required
          autoFocus
        />
      </label>
      <label className="field">
        <span>Expiry date</span>
        <input
          name="expiryDate"
          type="date"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
          required
        />
      </label>
      <label className="field">
        <span>Category <em>(optional)</em></span>
        <select name="category" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">None</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions">
        <button type="submit" className="button primary" disabled={saving}>
          {saving ? 'Saving…' : submitLabel}
        </button>
        <Link to="/" className="button quiet">Cancel</Link>
      </div>
    </form>
  );
}
