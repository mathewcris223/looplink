import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { InventoryItem, InventorySale, InventoryLoss, getInventoryItems, getInventorySales, getInventoryLosses } from "@/lib/db";
import { useAuth } from "./AuthContext";
import { useBusiness } from "./BusinessContext";

interface InventoryContextType {
  inventoryItems: InventoryItem[];
  inventorySales: InventorySale[];
  inventoryLosses: InventoryLoss[];
  refreshInventory: () => Promise<void>;
  loading: boolean;
}

const InventoryContext = createContext<InventoryContextType | null>(null);

export const InventoryProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { activeBusiness } = useBusiness();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventorySales, setInventorySales] = useState<InventorySale[]>([]);
  const [inventoryLosses, setInventoryLosses] = useState<InventoryLoss[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshInventory = useCallback(async () => {
    if (!activeBusiness || !user) {
      setInventoryItems([]); setInventorySales([]); setInventoryLosses([]);
      return;
    }
    setLoading(true);
    try {
      const [items, sales, losses] = await Promise.all([
        getInventoryItems(activeBusiness.id),
        getInventorySales(activeBusiness.id),
        getInventoryLosses(activeBusiness.id),
      ]);
      setInventoryItems(items);
      setInventorySales(sales);
      setInventoryLosses(losses);
    } catch {
      setInventoryItems([]); setInventorySales([]); setInventoryLosses([]);
    } finally {
      setLoading(false);
    }
  }, [activeBusiness, user]);

  useEffect(() => { refreshInventory(); }, [refreshInventory]);

  return (
    <InventoryContext.Provider value={{ inventoryItems, inventorySales, inventoryLosses, refreshInventory, loading }}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be inside InventoryProvider");
  return ctx;
};
