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
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeBusiness, setActiveBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshBusinesses = async () => {
    if (!user) { setLoading(false); return; }
    try {
      const list = await getBusinesses();
      setBusinesses(list);
      // Restore last active or default to first
      const savedId = localStorage.getItem("ll_active_biz");
      const found = list.find(b => b.id === savedId) ?? list[0] ?? null;
      setActiveBusiness(found);
    } catch {
      // Supabase not ready yet
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refreshBusinesses(); }, [user]);

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
