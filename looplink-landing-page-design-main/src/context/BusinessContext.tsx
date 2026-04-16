import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Business, getBusinesses } from "@/lib/db";
import { useAuth } from "./AuthContext";

interface BusinessContextType {
  businesses: Business[];
  activeBusiness: Business | null;
  setActiveBusiness: (b: Business) => void;
  refreshBusinesses: () => Promise<void>;
  loading: boolean;
}

const BusinessContext = createContext<BusinessContextType | null>(null);

export const BusinessProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeBusiness, setActiveBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshBusinesses = async () => {
    if (!user) {
      setBusinesses([]);
      setActiveBusiness(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await getBusinesses();
      setBusinesses(list);
      const savedId = localStorage.getItem("ll_active_biz");
      const found = list.find(b => b.id === savedId) ?? list[0] ?? null;
      setActiveBusiness(found);
    } catch {
      // Supabase not ready yet
    } finally {
      setLoading(false);
    }
  };

  // Don't run until auth is resolved — prevents false "no business" flash
  useEffect(() => {
    if (!authLoading) refreshBusinesses();
  }, [user, authLoading]);

  const handleSetActive = (b: Business) => {
    setActiveBusiness(b);
    localStorage.setItem("ll_active_biz", b.id);
  };

  return (
    <BusinessContext.Provider value={{ businesses, activeBusiness, setActiveBusiness: handleSetActive, refreshBusinesses, loading }}>
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = () => {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error("useBusiness must be inside BusinessProvider");
  return ctx;
};
