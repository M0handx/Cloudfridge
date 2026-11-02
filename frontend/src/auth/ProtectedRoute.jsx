import { Navigate, Outlet } from 'react-router-dom';
import NavBar from '../components/NavBar.jsx';
import { useAuth } from './AuthProvider.jsx';

export function ProtectedRoute() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <>
      <NavBar />
      <main className="page">
        <Outlet />
      </main>
    </>
  );
}

// Login and Register send a logged-in user straight to the dashboard.
export function PublicOnlyRoute() {
  const { user } = useAuth();
  return user ? <Navigate to="/" replace /> : <Outlet />;
}
