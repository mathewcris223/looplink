import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { recordInventorySaleV2, InventoryItem, SaleMode, calcPackSaleProfit, calcUnitSaleProfit, calcCostPerUnit } from "@/lib/db";
import { X, Search } from "lucide-react";

interface Props {
  businessId: string;
  items: InventoryItem[];
  onClose: () => void;
  onSuccess: () => void;
}

const RecordSaleModal = ({ businessId, items, onClose, onSuccess }: Props) => {
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [saleMode, setSaleMode] = useState<SaleMode>("unit");
  const [quantity, setQuantity] = useState("1");
  const [salePrice, setSalePrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const filtered = useMemo(() =>
    items.filter(i => i.name.toLowerCase().includes(search.toLowerCase())).slice(0, 8),
    [items, search]
  );

  const selectItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setSearch(item.name);
    setShowDropdown(false);
    // Auto-fill price
    if (item.purchase_type === "pack") {
      setSaleMode("pack");
      setSalePrice(String(item.pack_selling_price ?? item.selling_price));
    } else {
      setSaleMode("unit");
      setSalePrice(String(item.selling_price));
    }
    setQuantity("1");
  };

  const isPackItem = selectedItem?.purchase_type === "pack";
  const qty = parseInt(quantity) || 0;
  const price = parseFloat(salePrice) || 0;

  const profitPreview = useMemo(() => {
    if (!selectedItem || !qty || !price) return null;
    if (isPackItem && saleMode === "pack") {
      return calcPackSaleProfit(qty, price, selectedItem.pack_cost ?? 0);
    }
    if (isPackItem && saleMode === "unit") {
      const cpu = calcCostPerUnit(selectedItem.pack_cost ?? 0, selectedItem.units_per_pack ?? 1);
      return calcUnitSaleProfit(qty, price, cpu);
    }
    return qty * (price - (selectedItem.cost_price ?? 0));
  }, [selectedItem, qty, price, saleMode, isPackItem]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!qty || qty < 1) { setError("Enter a valid quantity."); return; }
    if (!price || price < 0) { setError("Enter a valid price."); return; }

    setLoading(true);
    try {
      const packsSold = isPackItem && saleMode === "pack" ? qty : undefined;
      const unitsSold = isPackItem && saleMode === "unit" ? qty : undefined;
      const actualQty = isPackItem && saleMode === "pack" && selectedItem?.units_per_pack
        ? qty * selectedItem.units_per_pack : qty;

      await recordInventorySaleV2({
        itemId: selectedItem?.id ?? null,
        businessId,
        quantitySold: actualQty,
        salePricePerUnit: price,
        profit: profitPreview ?? undefined,
        itemType: selectedItem?.item_type ?? undefined,
        saleMode: isPackItem ? saleMode : undefined,
        unitsSold,
        packsSold,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record sale.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full rounded-xl border bg-muted/40 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl border bg-card shadow-2xl p-6 animate-fade-up max-h-[92dvh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-lg">Record Sale</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Item search */}
          <div className="relative">
            <label className="text-sm font-medium">Product / Service</label>
            <div className="relative mt-1.5">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                className={`${inputCls} pl-9`}
                placeholder="Search inventory or type manually…"
                value={search}
                onChange={e => { setSearch(e.target.value); setShowDropdown(true); setSelectedItem(null); }}
                onFocus={() => setShowDropdown(true)}
              />
            </div>
            {showDropdown && filtered.length > 0 && (
              <div className="absolute z-10 w-full mt-1 rounded-xl border bg-card shadow-lg overflow-hidden">
                {filtered.map(item => (
                  <button key={item.id} type="button" onClick={() => selectItem(item)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors flex items-center justify-between">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">{item.item_type}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Pack/Unit mode toggle */}
          {isPackItem && (
            <div>
              <label className="text-sm font-medium">Sell as</label>
              <div className="flex rounded-xl bg-muted p-1 mt-1.5">
                {(["pack", "unit"] as SaleMode[]).map(m => (
                  <button key={m} type="button" onClick={() => {
                    setSaleMode(m);
                    setSalePrice(String(m === "pack" ? (selectedItem?.pack_selling_price ?? selectedItem?.selling_price ?? "") : (selectedItem?.unit_selling_price ?? selectedItem?.selling_price ?? "")));
                  }}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize ${saleMode === m ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
                    {m === "pack" ? `Full ${selectedItem?.pack_name ?? "Pack"}` : `Individual ${selectedItem?.unit_name ?? "Units"}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Quantity</label>
              <input type="number" min="1" className={`${inputCls} mt-1.5`} value={quantity} onChange={e => setQuantity(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Price (₦)</label>
              <input type="number" min="0" step="0.01" className={`${inputCls} mt-1.5`} value={salePrice} onChange={e => setSalePrice(e.target.value)} />
            </div>
          </div>

          {/* Profit preview */}
          {profitPreview !== null && (
            <div className={`rounded-xl px-4 py-3 text-sm ${profitPreview >= 0 ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
              Estimated profit: ₦{profitPreview.toLocaleString()}
            </div>
          )}

          {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-2">{error}</p>}

          <Button type="submit" variant="hero" size="lg" disabled={loading} className="w-full rounded-xl">
            {loading ? "Saving…" : "Record Sale"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default RecordSaleModal;
