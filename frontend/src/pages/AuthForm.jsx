import { useState } from 'react';
import { Link } from 'react-router-dom';

// Shared by Login and Register, which differ only in wording and action.
export default function AuthForm({ title, submitLabel, minPassword, onSubmit, footer }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await onSubmit(email, password);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <p className="brand auth-brand">CloudFridge</p>
        <p className="auth-tagline">Eat it before it expires.</p>
        <h1>{title}</h1>
        <form className="form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label className="field">
            <span>Password{minPassword ? ` (at least ${minPassword} characters)` : ''}</span>
            <input
              name="password"
              type="password"
              autoComplete={minPassword ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={minPassword}
              maxLength={72}
              required
            />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="button primary wide" disabled={busy}>
            {busy ? 'Please wait…' : submitLabel}
          </button>
        </form>
        <p className="auth-footer">{footer.text} <Link to={footer.to}>{footer.link}</Link></p>
      </div>
    </main>
  );
}
