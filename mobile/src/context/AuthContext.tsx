import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState } from '../types';
import { storage } from '../services/storage';
import { setAuthToken } from '../api/client';
import { authApi } from '../api/auth';

interface AuthContextType extends AuthState {
  login: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    error: null,
  });

  const checkAuth = async () => {
    const startTime = Date.now();
    const ensureMinDisplay = async () => {
      const elapsed = Date.now() - startTime;
      const minDuration = 1000;
      if (elapsed < minDuration) {
        await new Promise((resolve) => setTimeout(resolve, minDuration - elapsed));
      }
    };

    try {
      const storedToken = await storage.getToken();
      const cachedUser = await storage.getUser();

      // Restore the last known session immediately
      if (storedToken && cachedUser) {
        setAuthToken(storedToken);
        await ensureMinDisplay();
        setState({ user: cachedUser, token: storedToken, isLoading: false, error: null });

        // Refresh profile data in the background
        void authApi.getMe().then(async (response) => {
          if (response.success && response.user) {
            await storage.setUser(response.user);
            setState({ user: response.user, token: storedToken, isLoading: false, error: null });
          } else if (response.status === 401 || response.status === 403) {
            await storage.removeToken();
            setAuthToken(null);
            setState({ user: null, token: null, isLoading: false, error: null });
          }
        });
        return;
      }

      if (storedToken) {
        setAuthToken(storedToken);
        await ensureMinDisplay();
        setState({ user: null, token: null, isLoading: false, error: null });
        void authApi.getMe().then(async (response) => {
          if (response.success && response.user) {
            await storage.setUser(response.user);
            setState({ user: response.user, token: storedToken, isLoading: false, error: null });
          } else if (response.status === 401 || response.status === 403) {
            await storage.removeToken();
            setAuthToken(null);
          }
        });
        return;
      }
    } catch (e) {
      console.log('No active auth session found');
    }

    await ensureMinDisplay();
    setState({ user: null, token: null, isLoading: false, error: null });
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (user: User, token: string) => {
    await storage.setToken(token);
    await storage.setUser(user);
    setAuthToken(token);
    setState({ user, token, isLoading: false, error: null });
  };

  const logout = async () => {
    await storage.removeToken();
    setAuthToken(null);
    setState({ user: null, token: null, isLoading: false, error: null });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
