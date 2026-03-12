import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { loginUser, registerUser, logoutUser, fetchCurrentUser } from '../api/auth';

const AuthContext = createContext(null);

function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkAuth = useCallback(async () => {
    try {
      const userData = await fetchCurrentUser();
      setUser(userData);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(async (credentials) => {
    setError(null);
    await loginUser(credentials);
    const userData = await fetchCurrentUser();
    setUser(userData);
  }, []);

  const register = useCallback(async (data) => {
    setError(null);
    await registerUser(data);
    const userData = await fetchCurrentUser();
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    await logoutUser();
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    error,
    isAuthenticated: user !== null,
    userInitials: getInitials(user?.name),
    login,
    register,
    logout,
  }), [user, loading, error, login, register, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
