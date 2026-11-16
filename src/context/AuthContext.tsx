import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  apiRequest,
  clearStoredToken,
  getStoredToken,
  registerUnauthorizedHandler,
  setStoredToken,
} from '../lib/api.ts';
import type { User } from '../types/index.ts';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (nextUser: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const handleForceLogout = useCallback(() => {
    clearStoredToken();
    setUser(null);
  }, []);

  useEffect(() => {
    registerUnauthorizedHandler(handleForceLogout);
  }, [handleForceLogout]);

  useEffect(() => {
    let active = true;
    const token = getStoredToken();

    if (!token) {
      setLoading(false);
      return;
    }

    apiRequest<{ user: User }>('/api/auth/me')
      .then((res) => {
        if (active) {
          setUser(res.user);
        }
      })
      .catch(() => {
        if (active) {
          clearStoredToken();
          setUser(null);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiRequest<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(res.token);
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (getStoredToken()) {
        await apiRequest('/api/auth/logout', { method: 'POST' });
      }
    } catch {
      // Tetap lanjutkan pembersihan sesi lokal
    } finally {
      clearStoredToken();
      setUser(null);
    }
  }, []);

  const updateUser = useCallback((nextUser: User) => {
    setUser(nextUser);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider.');
  }
  return ctx;
}
