import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { authApi, type AuthResponse, type AuthUser } from './api';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (body: {
    name: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'mpt.token';
const USER_KEY = 'mpt.user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Khi mở app: nếu có token + user đã lưu → dùng ngay, đồng thời gọi /me
  // để xác thực token còn sống (nếu hết hạn → interceptor tự xoá + về login).
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const stored = localStorage.getItem(USER_KEY);
    if (!token || !stored) {
      setLoading(false);
      return;
    }
    try {
      setUser(JSON.parse(stored) as AuthUser);
    } catch {
      /* bỏ qua */
    }
    authApi
      .me()
      .catch(() => clearSession())
      .finally(() => setLoading(false));
  }, []);

  function persist(res: AuthResponse) {
    localStorage.setItem(TOKEN_KEY, res.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    setUser(res.user);
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }

  async function login(email: string, password: string) {
    persist(await authApi.login({ email, password }));
  }

  async function register(body: {
    name: string;
    email: string;
    password: string;
  }) {
    persist(await authApi.register(body));
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout: clearSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải nằm trong <AuthProvider>');
  return ctx;
}
