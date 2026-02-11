import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth as authApi } from '../utils/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authApi.me()
        .then(data => setUser(data.user))
        .catch(() => {
          localStorage.removeItem('token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authApi.login(email, password);
    localStorage.setItem('token', data.token);
    setUser(data.user);

    // Claim any anonymous books
    const anonBookIds = JSON.parse(localStorage.getItem('anonBookIds') || '[]');
    if (anonBookIds.length > 0) {
      await authApi.claimBooks(anonBookIds);
      localStorage.removeItem('anonBookIds');
    }

    return data;
  }, []);

  const register = useCallback(async (email, password, name) => {
    const data = await authApi.register(email, password, name);
    localStorage.setItem('token', data.token);
    setUser(data.user);

    // Claim any anonymous books
    const anonBookIds = JSON.parse(localStorage.getItem('anonBookIds') || '[]');
    if (anonBookIds.length > 0) {
      await authApi.claimBooks(anonBookIds);
      localStorage.removeItem('anonBookIds');
    }

    return data;
  }, []);

  const googleSignIn = useCallback(async (credential) => {
    const data = await authApi.googleSignIn(credential);
    localStorage.setItem('token', data.token);
    setUser(data.user);

    // Claim any anonymous books
    const anonBookIds = JSON.parse(localStorage.getItem('anonBookIds') || '[]');
    if (anonBookIds.length > 0) {
      await authApi.claimBooks(anonBookIds);
      localStorage.removeItem('anonBookIds');
    }

    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  const value = {
    user,
    loading,
    login,
    register,
    googleSignIn,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
