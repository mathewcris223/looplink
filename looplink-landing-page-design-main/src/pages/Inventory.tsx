import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useBusiness } from "@/context/BusinessContext";
import { useInventory } from "@/context/InventoryContext";
import AppShell from "@/components/dashboard/AppShell";
import InventoryItemCard from "@/components/inventory/InventoryItemCard";
import AddProductModal from "@/components/inventory/AddProductModal";
import RecordSaleModal from "@/components/inventory/RecordSaleModal";
import { InventoryItem, deriveStockStatus } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { Package, Plus, ShoppingCart, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Modal = "add" | "sale" | "edit" | null;

const Inventory = () => {
  const { user, loading: authLoading } = useAuth();
  const { businesses, activeBusiness, setActiveBusiness, loading: bizLoading } = useBusiness();
  const { inventoryItems, refreshInventory, loading } = useInventory();
  const navigate = useNavigate();

  const [modal, setModal] = useState<Modal>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  useEffect(() => { if (!authLoading && !user) navigate("/login"); }, [user, authLoading, navigate]);

  if (authLoading || bizLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
  if (!user || !activeBusiness) return null;

  const openSale = (item?: InventoryItem) => { setSelectedItem(item ?? null); setModal("sale"); };
  const openEdit = (item: InventoryItem) => { setSelectedItem(item); setModal("edit"); };
  const closeModal = () => { setModal(null); setSelectedItem(null); };
  const onSuccess = () => { refreshInventory(); closeModal(); };

  const handleDelete = async (item: InventoryItem) => {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    try {
      await supabase.from("inventory_items").delete().eq("id", item.id);
      refreshInventory();
    } catch { /* silent */ }
  };

  const lowStockCount = inventoryItems.filter(i => i.status === "low_stock").length;
  const outOfStockCount = inventoryItems.filter(i => i.status === "out_of_stock").length;

  return (
    <AppShell businesses={businesses} activeBusiness={activeBusiness} onSelectBusiness={setActiveBusiness} onAddBusiness={() => navigate("/onboarding")}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">Inventory</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{activeBusiness.name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="hero-outline" size="sm" className="rounded-full gap-1.5" onClick={() => openSale()}>
            <ShoppingCart size={14} /> Record Sale
          </Button>
          <Button variant="hero" size="sm" className="rounded-full gap-1.5" onClick={() => setModal("add")}>
            <Plus size={14} /> Add Item
          </Button>
        </div>
      </div>

      {/* Summary row */}
      {inventoryItems.length > 0 && (
        <div className="flex gap-3 mb-6 flex-wrap">
          <div className="rounded-2xl border bg-card px-4 py-3 flex items-center gap-2">
            <Package size={15} className="text-blue-600" />
            <span className="text-sm font-semibold">{inventoryItems.length} items</span>
          </div>
          {lowStockCount > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-600" />
              <span className="text-sm font-semibold text-amber-700">{lowStockCount} running low</span>
            </div>
          )}
          {outOfStockCount > 0 && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 flex items-center gap-2">
              <AlertTriangle size={15} className="text-red-600" />
              <span className="text-sm font-semibold text-red-700">{outOfStockCount} out of stock</span>
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl border bg-card p-4 animate-pulse h-16" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && inventoryItems.length === 0 && (
        <div className="rounded-3xl border bg-card p-10 text-center max-w-md mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Package size={24} className="text-primary" />
          </div>
          <h2 className="font-display font-bold text-lg mb-2">No items yet</h2>
          <p className="text-muted-foreground text-sm mb-5 leading-relaxed">
            Add your first item to start tracking stock and recording sales.
          </p>
          <Button variant="hero" onClick={() => setModal("add")} className="rounded-full px-8">
            Add First Item
          </Button>
        </div>
      )}

      {/* Item list */}
      {!loading && inventoryItems.length > 0 && (
        <div className="space-y-2">
          {inventoryItems.map(item => (
            <InventoryItemCard
              key={item.id}
              item={item}
              onSale={() => openSale(item)}
              onEdit={() => openEdit(item)}
              onDelete={() => handleDelete(item)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {modal === "add" && (
        <AddProductModal businessId={activeBusiness.id} onClose={closeModal} onSuccess={onSuccess} />
      )}
      {modal === "sale" && (
        <RecordSaleModal
          businessId={activeBusiness.id}
          items={inventoryItems}
          onClose={closeModal}
          onSuccess={onSuccess}
          defaultItem={selectedItem ?? undefined}
        />
      )}
      {modal === "edit" && selectedItem && (
        <EditItemModal item={selectedItem} onClose={closeModal} onSuccess={onSuccess} />
      )}
    </AppShell>
  );
};

// Inline edit modal — simple, same fields as add
const EditItemModal = ({ item, onClose, onSuccess }: { item: InventoryItem; onClose: () => void; onSuccess: () => void }) => {
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(String(item.quantity ?? 0));
  const [costPrice, setCostPrice] = useState(String(item.cost_price ?? ""));
  const [sellingPrice, setSellingPrice] = useState(String(item.selling_price));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Enter an item name."); return; }
    if (!sellingPrice || parseFloat(sellingPrice) < 0) { setError("Enter a selling price."); return; }
    setLoading(true);
    try {
      const newQty = parseInt(quantity) || 0;
      const newStatus = deriveStockStatus({ item_type: item.item_type, quantity: newQty, low_stock_threshold: item.low_stock_threshold ?? 5 });
      await supabase.from("inventory_items").update({
        name: name.trim(),
        quantity: newQty,
        cost_price: costPrice ? parseFloat(costPrice) : null,
        selling_price: parseFloat(sellingPrice),
        status: newStatus,
      }).eq("id", item.id);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full rounded-xl border bg-muted/40 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-3xl border bg-card shadow-2xl p-6 animate-fade-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-lg">Edit Item</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X size={18} /></button>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Item Name</label>
            <input className={`${inputCls} mt-1.5`} value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Quantity</label>
            <input type="number" min="0" className={`${inputCls} mt-1.5`} value={quantity} onChange={e => setQuantity(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Cost Price (₦)</label>
              <input type="number" min="0" className={`${inputCls} mt-1.5`} value={costPrice} onChange={e => setCostPrice(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Selling Price (₦)</label>
              <input type="number" min="0" className={`${inputCls} mt-1.5`} value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-2">{error}</p>}
          <Button type="submit" variant="hero" size="lg" disabled={loading} className="w-full rounded-xl">
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Inventory;
