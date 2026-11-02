import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider.jsx';

export default function NavBar() {
  const { logout } = useAuth();
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand">CloudFridge</Link>
        <nav className="nav-links">
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/stats">Statistics</NavLink>
          <button type="button" className="link-button" onClick={logout}>Log out</button>
        </nav>
      </div>
    </header>
  );
}
