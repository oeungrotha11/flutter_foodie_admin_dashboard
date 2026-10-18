import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api, { data, tokens } from './api.js';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(!!tokens.access);

  const logoutLocal = useCallback(() => { tokens.clear(); setUser(null); }, []);

  useEffect(() => {
    window.addEventListener('foodie:logout', logoutLocal);
    return () => window.removeEventListener('foodie:logout', logoutLocal);
  }, [logoutLocal]);

  useEffect(() => {
    if (!tokens.access) return;
    api.get('/user/current')
      .then((r) => {
        const u = data(r);
        if (u.role === 'ADMIN') setUser(u); else logoutLocal();
      })
      .catch(logoutLocal)
      .finally(() => setBooting(false));
  }, [logoutLocal]);

  const login = async (email, password) => {
    const r = await api.post('/auth/login', { email, password });
    tokens.set(data(r));
    const me = data(await api.get('/user/current'));
    if (me.role !== 'ADMIN') {
      tokens.clear();
      throw new Error('This account is not an admin.');
    }
    setUser(me);
  };

  const logout = async () => {
    try { await api.post('/user/logout'); } catch { /* token may already be invalid */ }
    logoutLocal();
  };

  return <AuthCtx.Provider value={{ user, booting, login, logout }}>{children}</AuthCtx.Provider>;
}
