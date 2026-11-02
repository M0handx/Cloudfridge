import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import ItemForm from '../components/ItemForm.jsx';

export default function AddItem() {
  const navigate = useNavigate();

  async function handleSubmit(values) {
    await api.createItem(values);
    navigate('/');
  }

  return (
    <>
      <div className="page-header"><h1>Add item</h1></div>
      <ItemForm submitLabel="Add item" onSubmit={handleSubmit} />
    </>
  );
}
