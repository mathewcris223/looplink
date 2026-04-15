import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => boolean;
  signup: (name: string, email: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("ll_user");
    return stored ? JSON.parse(stored) : null;
  });

  const signup = (name: string, email: string, password: string): boolean => {
    const existing = localStorage.getItem(`ll_account_${email}`);
    if (existing) return false; // email already registered
    localStorage.setItem(`ll_account_${email}`, JSON.stringify({ name, email, password }));
    const userData = { name, email };
    localStorage.setItem("ll_user", JSON.stringify(userData));
    setUser(userData);
    return true;
  };

  const login = (email: string, password: string): boolean => {
    const stored = localStorage.getItem(`ll_account_${email}`);
    if (!stored) return false;
    const account = JSON.parse(stored);
    if (account.password !== password) return false;
    const userData = { name: account.name, email };
    localStorage.setItem("ll_user", JSON.stringify(userData));
    setUser(userData);
    return true;
  };

  const logout = () => {
    localStorage.removeItem("ll_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
