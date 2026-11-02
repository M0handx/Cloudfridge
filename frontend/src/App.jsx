import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider.jsx';
import { ProtectedRoute, PublicOnlyRoute } from './auth/ProtectedRoute.jsx';
import AddItem from './pages/AddItem.jsx';
import Dashboard from './pages/Dashboard.jsx';
import EditItem from './pages/EditItem.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Statistics from './pages/Statistics.jsx';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/items/new" element={<AddItem />} />
            <Route path="/items/:id/edit" element={<EditItem />} />
            <Route path="/stats" element={<Statistics />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
