import { useState, useEffect, useCallback } from "react";
import { login as apiLogin, logout as apiLogout, getMe, getAccessToken, clearTokens } from "../utils/api";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(!!getAccessToken());

  // Load current user on mount
  useEffect(() => {
    if (isAuthenticated) {
      loadUser();
    }
  }, [isAuthenticated]);

  const loadUser = useCallback(async () => {
    try {
      setIsLoading(true);
      const userData = await getMe();
      setUser(userData);
      setError(null);
    } catch (err) {
      clearTokens();
      setIsAuthenticated(false);
      setUser(null);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (username, password) => {
    try {
      setIsLoading(true);
      setError(null);
      await apiLogin(username, password);
      setIsAuthenticated(true);
      await loadUser();
      return true;
    } catch (err) {
      setError(err.message);
      setIsAuthenticated(false);
      setUser(null);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadUser]);

  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      await apiLogout();
      setIsAuthenticated(false);
      setUser(null);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    loadUser,
  };
}
