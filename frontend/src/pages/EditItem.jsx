import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import ItemForm from '../components/ItemForm.jsx';

export default function EditItem() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let current = true;
    api.getItem(id)
      .then((data) => { if (current) setItem(data); })
      .catch((err) => { if (current) setError(err.status === 404 ? "This item doesn't exist." : err.message); });
    return () => { current = false; };
  }, [id]);

  async function handleSubmit(values) {
    await api.updateItem(id, values);
    navigate('/');
  }

  return (
    <>
      <div className="page-header"><h1>Edit item</h1></div>
      {error && (
        <div className="notice" role="alert">
          <p>{error}</p>
          <Link to="/" className="button">Back to dashboard</Link>
        </div>
      )}
      {!error && !item && <p className="notice" role="status">Loading…</p>}
      {item && <ItemForm initial={item} submitLabel="Save changes" onSubmit={handleSubmit} />}
    </>
  );
}
