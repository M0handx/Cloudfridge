import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearSession, loadSavedUser, saveSession } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadSavedUser);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const startSession = useCallback((session) => {
    saveSession(session);
    setUser(session.user);
  }, []);

  const login = useCallback(
    async (email, password) => startSession(await api.login(email, password)),
    [startSession],
  );
  const register = useCallback(
    async (email, password) => startSession(await api.register(email, password)),
    [startSession],
  );

  // api.js raises this when the server rejects the token, such as after it expires.
  useEffect(() => {
    window.addEventListener('cloudfridge:unauthorized', logout);
    return () => window.removeEventListener('cloudfridge:unauthorized', logout);
  }, [logout]);

  const value = useMemo(() => ({ user, login, register, logout }), [user, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
