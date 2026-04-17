import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '../utils/api';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem('caseops_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('caseops_token');
    if (token && !user) {
      api.auth.me().then(u => {
        setUser(u);
        localStorage.setItem('caseops_user', JSON.stringify(u));
      }).catch(() => {
        localStorage.removeItem('caseops_token');
        localStorage.removeItem('caseops_user');
      });
    }
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.auth.login(email, password);
      localStorage.setItem('caseops_token', res.accessToken);
      localStorage.setItem('caseops_user', JSON.stringify(res.user));
      setUser(res.user);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('caseops_token');
    localStorage.removeItem('caseops_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
