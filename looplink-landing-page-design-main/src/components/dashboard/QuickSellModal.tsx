/**
 * QuickSellModal — Fast POS-style sale
 * - Search bar with instant filter + recent items first
 * - Typed quantity input (not tap-tap-tap)
 * - Pack/Piece switch for dual-unit items
 * - Auto stock deduction with live remaining display
 * - "Sale recorded ✓" instant feedback
 */

import { useState, useRef, useEffect, useMemo } from "react";
import { X, Search, CheckCircle, Loader2, Minus, Plus, ChevronLeft } from "lucide-react";
import { InventoryItem, recordInventorySaleV2 } from "@/lib/db";

interface Props {
  businessId: string;
  items: InventoryItem[];
  defaultItem?: InventoryItem;
  onClose: () => void;
  onSaved: () => void;
}

const RECENT_KEY = "aje_recent_sold";

function getRecentIds(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"); } catch { return []; }
}
function saveRecentId(id: string) {
  try {
    const ids = [id, ...getRecentIds().filter(x => x !== id)].slice(0, 6);
    localStorage.setItem(RECENT_KEY, JSON.stringify(ids));
  } catch { /* */ }
}

type SellMode = "pack" | "piece";
type Screen = "select" | "sell";

const QuickSellModal = ({ businessId, items, defaultItem, onClose, onSaved }: Props) => {
  const sellable = items.filter(i => i.item_type !== "service" && (i.quantity ?? 0) > 0);
  const [screen, setScreen] = useState<Screen>(defaultItem ? "sell" : "select");
  const [selected, setSelected] = useState<InventoryItem | null>(defaultItem ?? null);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<SellMode>("pack");
  const [qtyStr, setQtyStr] = useState("1");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);

  // Auto-focus search on open
  useEffect(() => {
    if (screen === "select") setTimeout(() => searchRef.current?.focus(), 80);
    if (screen === "sell") setTimeout(() => qtyRef.current?.focus(), 80);
  }, [screen]);

  // Reset mode when item changes
  useEffect(() => {
    if (selected) {
      setMode("pack");
      setQtyStr("1");
      setError("");
    }
  }, [selected?.id]);

  // Filtered + sorted items: recent first, then rest
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const pool = q ? sellable.filter(i => i.name.toLowerCase().includes(q)) : sellable;
    const recentIds = getRecentIds();
    const recent = pool.filter(i => recentIds.includes(i.id))
      .sort((a, b) => recentIds.indexOf(a.id) - recentIds.indexOf(b.id));
    const rest = pool.filter(i => !recentIds.includes(i.id));
    return { recent, rest };
  }, [sellable, search]);

  // Derived values
  const hasPieces = selected?.purchase_type === "pack" && (selected?.units_per_pack ?? 0) > 1;
  const unitsPerPack = selected?.units_per_pack ?? 1;
  const pricePerPack = selected?.pack_selling_price ?? selected?.selling_price ?? 0;
  const pricePerPiece = selected?.unit_selling_price ?? 0;
  const unitPrice = mode === "pack" ? pricePerPack : pricePerPiece;
  const currentQty = selected?.quantity ?? 0;
  const maxQty = mode === "pack" ? Math.floor(currentQty / unitsPerPack) : currentQty;
  const qty = Math.max(0, parseInt(qtyStr) || 0);
  const totalPrice = unitPrice * qty;
  const stockToDeduct = mode === "pack" ? qty * unitsPerPack : qty;
  const remaining = currentQty - stockToDeduct;
  const overStock = stockToDeduct > currentQty;
  const canSell = selected && qty > 0 && totalPrice > 0 && !overStock;

  const handleSelect = (item: InventoryItem) => {
    setSelected(item);
    setScreen("sell");
  };

  const handleConfirm = async () => {
    if (!selected || !canSell) return;
    setSaving(true);
    setError("");
    try {
      await recordInventorySaleV2({
        businessId,
        itemId: selected.id,
        itemName: selected.name,
        itemType: selected.item_type as "product" | "bulk" | "service",
        saleMode: mode === "pack" ? "pack" : "unit",
        quantitySold: mode === "pack" ? qty * unitsPerPack : qty,
        packsSold: mode === "pack" ? qty : undefined,
        unitsSold: mode === "piece" ? qty : undefined,
        salePricePerUnit: unitPrice,
        profit: totalPrice - (selected.cost_price ?? 0) * stockToDeduct,
      });
      saveRecentId(selected.id);
      setSaved(true);
      setTimeout(() => { onSaved(); onClose(); }, 800);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Sale failed. Try again.");
      setSaving(false);
    }
  };

  const ItemRow = ({ item, showRecent }: { item: InventoryItem; showRecent?: boolean }) => (
    <button
      key={item.id}
      onPointerDown={() => handleSelect(item)}
      className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border bg-card hover:bg-muted/40 active:bg-muted/60 transition-colors touch-manipulation text-left"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold truncate">{item.name}</p>
          {showRecent && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium shrink-0">Recent</span>}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{item.quantity} in stock</p>
      </div>
      <p className="text-sm font-bold text-emerald-600 shrink-0 ml-3">₦{item.selling_price.toLocaleString()}</p>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-t-3xl shadow-2xl animate-fade-up"
        style={{ maxHeight: "92dvh", display: "flex", flexDirection: "column" }}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted" />
        </div>

        {/* ── SCREEN 1: Item Selection ── */}
        {screen === "select" && (
          <>
            <div className="flex items-center justify-between px-5 pt-2 pb-3 shrink-0">
              <h2 className="text-base font-bold">Quick Sale</h2>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X size={18} /></button>
            </div>

            {/* Search */}
            <div className="px-5 pb-3 shrink-0">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search items..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full rounded-xl border bg-muted/30 pl-10 pr-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Item list */}
            <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-2">
              {sellable.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">No items in stock. Add items first.</p>
              ) : filtered.recent.length === 0 && filtered.rest.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">No items match "{search}"</p>
              ) : (
                <>
                  {filtered.recent.length > 0 && (
                    <div className="space-y-2">
                      {!search && <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Recently sold</p>}
                      {filtered.recent.map(item => <ItemRow key={item.id} item={item} showRecent={!search} />)}
                    </div>
                  )}
                  {filtered.rest.length > 0 && (
                    <div className="space-y-2">
                      {filtered.recent.length > 0 && !search && (
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground pt-2">All items</p>
                      )}
                      {filtered.rest.map(item => <ItemRow key={item.id} item={item} />)}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {/* ── SCREEN 2: Sell ── */}
        {screen === "sell" && selected && (
          <>
            <div className="flex items-center justify-between px-5 pt-2 pb-4 shrink-0">
              <button onClick={() => { setScreen("select"); setSaved(false); setError(""); }}
                className="flex items-center gap-1 text-sm text-primary font-medium">
                <ChevronLeft size={16} /> Back
              </button>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-5">
              {/* Item name */}
              <div>
                <p className="text-xl font-bold">{selected.name}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{currentQty} units in stock</p>
              </div>

              {/* Pack / Piece toggle */}
              {hasPieces && (
                <div className="flex rounded-2xl border overflow-hidden p-1 bg-muted/30 gap-1">
                  <button onClick={() => setMode("pack")}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${mode === "pack" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                    📦 Pack — ₦{pricePerPack.toLocaleString()}
                  </button>
                  <button onClick={() => setMode("piece")}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${mode === "piece" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                    🔹 {selected.unit_name ?? "Piece"} — ₦{pricePerPiece.toLocaleString()}
                  </button>
                </div>
              )}

              {/* Quantity — typed input + small +/- */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Quantity</p>
                <div className="flex items-center gap-3">
                  <button
                    onPointerDown={() => setQtyStr(q => String(Math.max(1, (parseInt(q) || 1) - 1)))}
                    className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center active:scale-90 transition-transform touch-manipulation shrink-0">
                    <Minus size={18} />
                  </button>
                  <input
                    ref={qtyRef}
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max={maxQty}
                    value={qtyStr}
                    onChange={e => setQtyStr(e.target.value)}
                    onFocus={e => e.target.select()}
                    className="flex-1 text-center text-3xl font-bold rounded-xl border bg-muted/30 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    onPointerDown={() => setQtyStr(q => String(Math.min(maxQty, (parseInt(q) || 0) + 1)))}
                    className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center active:scale-90 transition-transform touch-manipulation shrink-0">
                    <Plus size={18} />
                  </button>
                </div>

                {/* Live stock remaining */}
                <div className={`mt-2 text-center text-xs font-medium ${overStock ? "text-red-600" : remaining <= 3 ? "text-amber-600" : "text-muted-foreground"}`}>
                  {overStock
                    ? `⚠️ Only ${maxQty} available`
                    : `${remaining} will remain after this sale`}
                </div>
              </div>

              {/* Total */}
              <div className="bg-muted/40 rounded-2xl px-5 py-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Total</p>
                <p className="text-4xl font-bold text-emerald-600">₦{totalPrice.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">{qty} × ₦{unitPrice.toLocaleString()}</p>
              </div>

              {error && <p className="text-sm text-red-600 text-center bg-red-50 rounded-xl px-4 py-2">{error}</p>}

              {/* Confirm */}
              <button
                onPointerDown={handleConfirm}
                disabled={!canSell || saving}
                className={`w-full py-5 rounded-2xl text-lg font-bold transition-all active:scale-[0.98] disabled:opacity-40 touch-manipulation ${
                  saved ? "bg-emerald-500 text-white" : "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                }`}
              >
                {saved
                  ? <span className="flex items-center justify-center gap-2"><CheckCircle size={22} /> Sale recorded ✓</span>
                  : saving
                  ? <span className="flex items-center justify-center gap-2"><Loader2 size={20} className="animate-spin" /> Recording…</span>
                  : `Confirm Sale — ₦${totalPrice.toLocaleString()}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default QuickSellModal;
