import React, { createContext, useContext, useEffect, useState } from "react";
import { api, setAuthToken } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Clear any previous persistent tokens on initial load / reload
    sessionStorage.removeItem("cp-token");
    localStorage.removeItem("cp-token");
    setAuthToken(null);
    setUser(null);
    setLoading(false);
  }, []);

  async function register(payload) {
    const { token, user } = await api.register(payload);
    setAuthToken(token);
    setUser(user);
    return user;
  }

  async function login(payload) {
    const { token, user } = await api.login(payload);
    setAuthToken(token);
    setUser(user);
    return user;
  }

  function logout() {
    setAuthToken(null);
    sessionStorage.removeItem("cp-token");
    localStorage.removeItem("cp-token");
    setUser(null);
  }


  async function refresh() {
    if (!api.getToken()) return null;
    const me = await api.me();
    setUser((prev) => ({ ...prev, ...me }));
    return me;
  }



  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
