import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useBusiness } from "@/context/BusinessContext";
import { useInventory } from "@/context/InventoryContext";
import AppShell from "@/components/dashboard/AppShell";
import AddProductModal from "@/components/inventory/AddProductModal";
import RestockModal from "@/components/inventory/RestockModal";
import QuickSellModal from "@/components/dashboard/QuickSellModal";
import { InventoryItem, InventorySale, getInventorySales } from "@/lib/db";
import { computeSalesVelocity, computeDepletionDays } from "@/lib/ai";
import { supabase } from "@/lib/supabase";
import { Plus, Search, X, Package, AlertTriangle, RefreshCw, Pencil, Check, Loader2 } from "lucide-react";

// ── Performance indicator ─────────────────────────────────────────────────────
function getPerformance(velocity: number): { label: string; color: string } {
  if (velocity > 2) return { label: "Selling Fast", color: "text-emerald-600 bg-emerald-50" };
  if (velocity > 0.3) return { label: "Average", color: "text-amber-600 bg-amber-50" };
  return { label: "Slow", color: "text-muted-foreground bg-muted/40" };
}

// ── Priority logic — what needs action first ──────────────────────────────────
type Priority = "critical" | "urgent" | "watch" | "ok";

interface ItemAction {
  priority: Priority;
  urgentMessage: string | null;  // shown prominently
  actionLabel: string | null;    // button text
  actionType: "restock" | "sale" | null;
  insight: string | null;        // subtle secondary message
}

function getItemAction(item: InventoryItem, velocity: number, depletionDays: number | null): ItemAction {
  if (item.item_type === "service") {
    return { priority: "ok", urgentMessage: null, actionLabel: null, actionType: null, insight: "Service — no stock needed" };
  }

  const qty = item.quantity ?? 0;

  // CRITICAL: out of stock
  if (item.status === "out_of_stock") {
    return {
      priority: "critical",
      urgentMessage: "Out of stock — you can't sell this",
      actionLabel: "Restock now",
      actionType: "restock",
      insight: null,
    };
  }

  // URGENT: will finish in ≤ 2 days based on velocity
  if (depletionDays !== null && depletionDays <= 2 && velocity > 0) {
    return {
      priority: "critical",
      urgentMessage: `Finishes in ${depletionDays === 0 ? "less than a day" : `${depletionDays} day${depletionDays > 1 ? "s" : ""}`}`,
      actionLabel: "Restock now",
      actionType: "restock",
      insight: null,
    };
  }

  // URGENT: low stock + selling fast
  if (item.status === "low_stock" && velocity > 1) {
    return {
      priority: "urgent",
      urgentMessage: `Only ${qty} left — selling fast`,
      actionLabel: "Restock soon",
      actionType: "restock",
      insight: null,
    };
  }

  // WATCH: low stock
  if (item.status === "low_stock") {
    return {
      priority: "watch",
      urgentMessage: `Running low — ${qty} left`,
      actionLabel: "Restock",
      actionType: "restock",
      insight: null,
    };
  }

  // WATCH: will finish in 3–5 days
  if (depletionDays !== null && depletionDays <= 5 && velocity > 0) {
    return {
      priority: "watch",
      urgentMessage: `Finishes in ${depletionDays} days`,
      actionLabel: "Plan restock",
      actionType: "restock",
      insight: null,
    };
  }

  // OK: selling well
  if (velocity > 2) {
    return { priority: "ok", urgentMessage: null, actionLabel: "Record sale", actionType: "sale", insight: "Selling fast 🔥" };
  }

  // OK: not moving
  if (velocity === 0 && qty > 10) {
    return { priority: "ok", urgentMessage: null, actionLabel: null, actionType: null, insight: "Not selling — consider a price drop" };
  }

  return { priority: "ok", urgentMessage: null, actionLabel: "Record sale", actionType: "sale", insight: null };
}

const PRIORITY_ORDER: Priority[] = ["critical", "urgent", "watch", "ok"];

const PRIORITY_STYLES = {
  critical: { border: "border-red-300 bg-red-50",   dot: "bg-red-500",   badge: "bg-red-100 text-red-700",   btn: "bg-red-500 text-white" },
  urgent:   { border: "border-amber-300 bg-amber-50", dot: "bg-amber-400", badge: "bg-amber-100 text-amber-700", btn: "bg-amber-500 text-white" },
  watch:    { border: "border-amber-200 bg-amber-50/50", dot: "bg-amber-300", badge: "bg-amber-50 text-amber-600", btn: "bg-amber-100 text-amber-800" },
  ok:       { border: "border-border bg-card",       dot: "bg-emerald-500", badge: "bg-muted text-muted-foreground", btn: "bg-muted text-foreground" },
};

const Stock = () => {
  const { user, loading: authLoading } = useAuth();
  const { businesses, activeBusiness, setActiveBusiness, loading: bizLoading } = useBusiness();
  const { inventoryItems, refreshInventory, loading } = useInventory();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showSale, setShowSale] = useState(false);
  const [showRestock, setShowRestock] = useState(false);
  const [actionItem, setActionItem] = useState<InventoryItem | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [sales, setSales] = useState<InventorySale[]>([]);

  useEffect(() => { if (!authLoading && !user) navigate("/login"); }, [user, authLoading, navigate]);
  useEffect(() => {
    if (activeBusiness) getInventorySales(activeBusiness.id).then(setSales).catch(() => {});
  }, [activeBusiness, loading]);

  if (authLoading || bizLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
  if (!user || !activeBusiness) return null;

  // Enrich items with action data
  const enriched = useMemo(() => inventoryItems.map(item => {
    const velocity = computeSalesVelocity(sales, item.id);
    const depletionDays = item.quantity != null && velocity > 0
      ? computeDepletionDays(item.quantity, velocity)
      : null;
    const action = getItemAction(item, velocity, depletionDays);
    return { item, velocity, depletionDays, action };
  }), [inventoryItems, sales]);

  // Sort by priority, then filter by search
  const sorted = useMemo(() => {
    const filtered = search.trim()
      ? enriched.filter(e => e.item.name.toLowerCase().includes(search.toLowerCase()))
      : enriched;
    return [...filtered].sort((a, b) =>
      PRIORITY_ORDER.indexOf(a.action.priority) - PRIORITY_ORDER.indexOf(b.action.priority)
    );
  }, [enriched, search]);

  // Attention items — critical + urgent only
  const needsAttention = sorted.filter(e => e.action.priority === "critical" || e.action.priority === "urgent");

  const handleAction = (item: InventoryItem, type: "restock" | "sale") => {
    setActionItem(item);
    if (type === "restock") setShowRestock(true);
    else setShowSale(true);
  };

  return (
    <AppShell businesses={businesses} activeBusiness={activeBusiness} onSelectBusiness={setActiveBusiness}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">Stock</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSale(true)}
            className="flex items-center gap-1.5 text-sm font-bold bg-emerald-500 text-white px-3 py-2 rounded-xl active:scale-95 transition-transform shadow-sm shadow-emerald-500/30"
          >
            ⚡ Quick Sale
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 text-sm font-semibold bg-primary text-primary-foreground px-3 py-2 rounded-xl active:scale-95 transition-transform"
          >
            <Plus size={15} /> Add
          </button>
        </div>
      </div>

      {/* ── PRIORITY QUEUE — needs attention first ── */}
      {needsAttention.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={15} className="text-red-500" />
            <p className="text-sm font-bold text-red-700">Needs attention ({needsAttention.length})</p>
          </div>
          <div className="space-y-2">
            {needsAttention.map(({ item, action }) => {
              const cfg = PRIORITY_STYLES[action.priority];
              return (
                <div key={item.id} className={`rounded-2xl border ${cfg.border} px-4 py-3.5 flex items-center justify-between gap-3`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-3 h-3 rounded-full shrink-0 ${cfg.dot}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{item.name}</p>
                      {action.urgentMessage && (
                        <p className={`text-xs font-semibold mt-0.5 ${action.priority === "critical" ? "text-red-700" : "text-amber-700"}`}>
                          {action.urgentMessage}
                        </p>
                      )}
                    </div>
                  </div>
                  {action.actionLabel && action.actionType && (
                    <button
                      onClick={() => handleAction(item, action.actionType!)}
                      className={`shrink-0 text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform ${cfg.btn}`}
                    >
                      {action.actionLabel}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search */}
      {inventoryItems.length > 0 && (
        <div className="relative mb-4">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search stock..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border bg-card pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-14 rounded-xl bg-muted/30 animate-pulse" />)}
        </div>
      )}

      {/* Empty */}
      {!loading && inventoryItems.length === 0 && (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Package size={24} className="text-muted-foreground" />
          </div>
          <p className="text-base font-semibold mb-1">No stock yet</p>
          <p className="text-sm text-muted-foreground mb-5">Add your first item to start tracking.</p>
          <button onClick={() => setShowAdd(true)}
            className="bg-primary text-primary-foreground text-sm font-semibold px-6 py-3 rounded-xl active:scale-95 transition-transform">
            Add First Item
          </button>
        </div>
      )}

      {/* All items — sorted by priority */}
      {!loading && sorted.length > 0 && (
        <div>
          {needsAttention.length > 0 && (
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">All items</p>
          )}
          <div className="space-y-2">
            {sorted.map(({ item, action }) => {
              const cfg = PRIORITY_STYLES[action.priority];
              const velocity = computeSalesVelocity(sales, item.id);
              const perf = item.item_type !== "service" ? getPerformance(velocity) : null;
              return (
                <div key={item.id} className={`rounded-xl border ${cfg.border} px-4 py-3 flex items-center justify-between gap-3`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dot}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <p className="text-xs text-muted-foreground">
                          {item.item_type === "service" ? "Service" : `${item.quantity ?? 0} left`}
                          {action.insight && ` · ${action.insight}`}
                        </p>
                        {perf && (
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${perf.color}`}>
                            {perf.label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <p className="text-xs text-muted-foreground">₦{item.selling_price.toLocaleString()}</p>
                    <button
                      onClick={() => setEditingItem(item)}
                      className="w-8 h-8 rounded-lg bg-muted/60 hover:bg-muted flex items-center justify-center transition-colors"
                      title="Edit stock"
                    >
                      <Pencil size={13} className="text-muted-foreground" />
                    </button>
                    {action.actionLabel && action.actionType && action.actionType === "restock" && (
                      <button
                        onClick={() => handleAction(item, action.actionType!)}
                        className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg active:scale-95 transition-transform ${cfg.btn}`}
                      >
                        <RefreshCw size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && search && sorted.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">No items match "{search}"</p>
      )}

      {showAdd && (
        <AddProductModal
          businessId={activeBusiness.id}
          onClose={() => setShowAdd(false)}
          onSuccess={() => { refreshInventory(); setShowAdd(false); }}
        />
      )}
      {showSale && (
        <QuickSellModal
          businessId={activeBusiness.id}
          items={inventoryItems}
          defaultItem={actionItem ?? undefined}
          onClose={() => { setShowSale(false); setActionItem(null); }}
          onSaved={() => { refreshInventory(); setShowSale(false); setActionItem(null); }}
        />
      )}
      {showRestock && actionItem && (
        <RestockModal
          businessId={activeBusiness.id}
          items={inventoryItems}
          defaultItem={actionItem}
          onClose={() => { setShowRestock(false); setActionItem(null); }}
          onSuccess={() => { refreshInventory(); setShowRestock(false); setActionItem(null); }}
        />
      )}
      {editingItem && (
        <EditStockModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={() => { refreshInventory(); setEditingItem(null); }}
        />
      )}
    </AppShell>
  );
};

// ── EditStockModal — quick inline edit for quantity, price, name ──────────────
const EditStockModal = ({ item, onClose, onSaved }: { item: InventoryItem; onClose: () => void; onSaved: () => void }) => {
  const [name, setName] = useState(item.name);
  const [qty, setQty] = useState(String(item.quantity ?? 0));
  const [price, setPrice] = useState(String(item.selling_price));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!name.trim()) { setError("Enter a name."); return; }
    if (parseFloat(price) < 0) { setError("Enter a valid price."); return; }
    setSaving(true);
    setError("");
    try {
      const newQty = parseInt(qty) || 0;
      const newStatus = newQty <= 0 ? "out_of_stock" : newQty <= (item.low_stock_threshold ?? 5) ? "low_stock" : "in_stock";
      await supabase.from("inventory_items").update({
        name: name.trim(),
        quantity: newQty,
        selling_price: parseFloat(price) || item.selling_price,
        status: newStatus,
      }).eq("id", item.id);
      setSaved(true);
      setTimeout(() => onSaved(), 600);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save.");
      setSaving(false);
    }
  };

  const inputCls = "w-full rounded-xl border bg-muted/40 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-t-3xl shadow-2xl animate-fade-up">
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-muted" /></div>
        <div className="flex items-center justify-between px-5 pt-2 pb-4">
          <h2 className="text-base font-bold">Edit Stock</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X size={18} /></button>
        </div>
        <div className="px-5 pb-8 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Product Name</label>
            <input className={`${inputCls} mt-1.5`} value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Quantity</label>
              <input type="number" min="0" className={`${inputCls} mt-1.5`} value={qty} onChange={e => setQty(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Selling Price (₦)</label>
              <input type="number" min="0" className={`${inputCls} mt-1.5`} value={price} onChange={e => setPrice(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">{error}</p>}
          <button
            onClick={handleSave}
            disabled={saving}
            className={`w-full py-4 rounded-2xl text-base font-bold transition-all active:scale-[0.98] disabled:opacity-40 ${saved ? "bg-emerald-500 text-white" : "bg-primary text-primary-foreground"}`}
          >
            {saved
              ? <span className="flex items-center justify-center gap-2"><Check size={18} /> Saved!</span>
              : saving
              ? <span className="flex items-center justify-center gap-2"><Loader2 size={18} className="animate-spin" /> Saving…</span>
              : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Stock;
