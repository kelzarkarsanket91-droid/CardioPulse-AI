import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // sessionStorage automatically clears when the browser window/tab is closed
    const token = sessionStorage.getItem("cp-token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then(setUser)
      .catch(() => sessionStorage.removeItem("cp-token"))
      .finally(() => setLoading(false));
  }, []);

  async function register(payload) {
    const { token, user } = await api.register(payload);
    sessionStorage.setItem("cp-token", token);
    setUser(user);
    return user;
  }

  async function login(payload) {
    const { token, user } = await api.login(payload);
    sessionStorage.setItem("cp-token", token);
    setUser(user);
    return user;
  }

  function logout() {
    sessionStorage.removeItem("cp-token");
    localStorage.removeItem("cp-token"); // clean legacy token if any
    setUser(null);
  }


  async function refresh() {
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
