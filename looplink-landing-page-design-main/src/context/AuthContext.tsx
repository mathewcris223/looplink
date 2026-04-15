import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { signUp, logIn, logOut } from "@/lib/auth";

interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signup: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const toAuthUser = (user: User): AuthUser => ({
  id: user.id,
  name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User",
  email: user.email ?? "",
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Hydrate session on mount
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ? toAuthUser(data.session.user) : null);
      setLoading(false);
    }).catch(() => {
      // Supabase not configured or network error — fail gracefully
      setLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ? toAuthUser(session.user) : null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signup = async (name: string, email: string, password: string) => {
    await signUp(name, email, password);
    // session is set automatically via onAuthStateChange
  };

  const login = async (email: string, password: string) => {
    await logIn(email, password);
  };

  const logout = async () => {
    await logOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
