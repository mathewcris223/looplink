import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { recordInventorySaleV2, InventoryItem, SaleMode, calcCostPerUnit } from "@/lib/db";
import { X, Search } from "lucide-react";
import VoiceMicButton from "@/components/ui/VoiceMicButton";
import QuickVoiceEntry from "@/components/ui/QuickVoiceEntry";
import ImageScanButton from "@/components/ui/ImageScanButton";
import { extractNumber } from "@/hooks/useVoiceInput";
import { ScannedData } from "@/lib/imageScan";

interface Props {
  businessId: string;
  items: InventoryItem[];
  onClose: () => void;
  onSuccess: () => void;
  defaultItem?: InventoryItem;
}

const RecordSaleModal = ({ businessId, items, onClose, onSuccess, defaultItem }: Props) => {
  const [search, setSearch] = useState(defaultItem?.name ?? "");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(defaultItem ?? null);
  const [saleMode, setSaleMode] = useState<SaleMode>("unit");
  const [quantity, setQuantity] = useState("1");
  const [salePrice, setSalePrice] = useState(defaultItem ? String(defaultItem.selling_price) : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDropdown, setShowDropdown] = useState(!defaultItem);

  const filtered = useMemo(() =>
    items.filter(i => i.name.toLowerCase().includes(search.toLowerCase())).slice(0, 8),
    [items, search]
  );

  const isPackItem = selectedItem?.purchase_type === "pack" && (selectedItem?.units_per_pack ?? 0) > 1;

  const selectItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setSearch(item.name);
    setShowDropdown(false);
    setQuantity("1");
    // Default to pack mode if item has packs
    const isPack = item.purchase_type === "pack" && (item.units_per_pack ?? 0) > 1;
    setSaleMode(isPack ? "pack" : "unit");
    setSalePrice(String(isPack ? (item.pack_selling_price ?? item.selling_price) : item.selling_price));
  };

  const qty = parseInt(quantity) || 0;
  const price = parseFloat(salePrice) || 0;

  // Calculate profit based on mode
  const profit = useMemo(() => {
    if (!selectedItem || !qty || !price) return null;
    if (isPackItem && saleMode === "pack") {
      return qty * (price - (selectedItem.pack_cost ?? selectedItem.cost_price ?? 0));
    }
    if (isPackItem && saleMode === "unit") {
      const cpu = calcCostPerUnit(selectedItem.pack_cost ?? 0, selectedItem.units_per_pack ?? 1);
      return qty * ((selectedItem.unit_selling_price ?? price) - cpu);
    }
    return qty * (price - (selectedItem.cost_price ?? 0));
  }, [selectedItem, qty, price, saleMode, isPackItem]);

  // Stock info display
  const stockInfo = useMemo(() => {
    if (!selectedItem) return null;
    const totalUnits = selectedItem.quantity ?? 0;
    if (isPackItem && selectedItem.units_per_pack) {
      const packs = Math.floor(totalUnits / selectedItem.units_per_pack);
      const loose = totalUnits % selectedItem.units_per_pack;
      const packName = selectedItem.pack_name ?? "packs";
      const unitName = selectedItem.unit_name ?? "pieces";
      if (packs > 0 && loose > 0) return `${packs} ${packName} + ${loose} ${unitName} in stock`;
      if (packs > 0) return `${packs} ${packName} in stock`;
      return `${loose} ${unitName} in stock`;
    }
    return `${totalUnits} in stock`;
  }, [selectedItem, isPackItem]);

  const handleVoiceFields = ({ itemName, quantity: q, amount }: { itemName?: string; quantity?: number; amount?: number }) => {
    if (itemName) {
      setSearch(itemName);
      setShowDropdown(true);
      const match = items.find(i => i.name.toLowerCase().includes(itemName.toLowerCase()));
      if (match) { selectItem(match); return; }
    }
    if (q) setQuantity(String(q));
    if (amount) setSalePrice(String(amount));
  };

  const handleScanResult = (data: ScannedData) => {
    if (data.itemName) {
      setSearch(data.itemName);
      const match = items.find(i => i.name.toLowerCase().includes(data.itemName!.toLowerCase()));
      if (match) selectItem(match);
    }
    if (data.quantity) setQuantity(String(data.quantity));
    if (data.amount) setSalePrice(String(data.amount));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!qty || qty < 1) { setError("Enter how many you sold."); return; }
    if (!price || price < 0) { setError("Enter the selling price."); return; }

    // Validate stock
    if (selectedItem && selectedItem.item_type !== "service") {
      const totalUnits = selectedItem.quantity ?? 0;
      const unitsNeeded = isPackItem && saleMode === "pack"
        ? qty * (selectedItem.units_per_pack ?? 1)
        : qty;
      if (unitsNeeded > totalUnits) {
        setError(`Not enough stock. Only ${stockInfo}.`);
        return;
      }
    }

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
        profit: profit ?? undefined,
        itemType: selectedItem?.item_type ?? "product",
        saleMode: isPackItem ? saleMode : undefined,
        unitsSold,
        packsSold,
        itemName: selectedItem?.name ?? (search.trim() || undefined),
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
      <div className="relative w-full max-w-sm rounded-3xl border bg-card shadow-2xl p-6 animate-fade-up max-h-[92dvh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-lg">Record Sale</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X size={18} /></button>
        </div>

        <div className="space-y-3 mb-4">
          <QuickVoiceEntry onResult={handleVoiceFields} placeholder='e.g. "sold 5 shirts for 2000"' />
          <ImageScanButton onResult={handleScanResult} />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Item search */}
          <div className="relative">
            <label className="text-sm font-medium">What did you sell?</label>
            <div className="relative mt-1.5">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input className={`${inputCls} pl-9 pr-9`} placeholder="Search your items..."
                value={search}
                onChange={e => { setSearch(e.target.value); setShowDropdown(true); setSelectedItem(null); setSalePrice(""); }}
                onFocus={() => setShowDropdown(true)} />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <VoiceMicButton onResult={v => { setSearch(v); setShowDropdown(true); }} />
              </div>
            </div>
            {showDropdown && filtered.length > 0 && (
              <div className="absolute z-10 w-full mt-1 rounded-xl border bg-card shadow-lg overflow-hidden">
                {filtered.map(item => (
                  <button key={item.id} type="button" onClick={() => selectItem(item)}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-muted transition-colors flex items-center justify-between">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-xs text-muted-foreground">₦{item.selling_price.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Stock info */}
          {stockInfo && (
            <p className="text-xs text-muted-foreground -mt-1">{stockInfo}</p>
          )}

          {/* Pack / Piece toggle — only shown when item has pack config */}
          {isPackItem && selectedItem && (
            <div>
              <label className="text-sm font-medium mb-2 block">Sell as</label>
              <div className="flex rounded-xl bg-muted p-1">
                <button type="button" onClick={() => {
                  setSaleMode("pack");
                  setSalePrice(String(selectedItem.pack_selling_price ?? selectedItem.selling_price));
                }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${saleMode === "pack" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
                  Full {selectedItem.pack_name ?? "Pack"}
                </button>
                <button type="button" onClick={() => {
                  setSaleMode("unit");
                  setSalePrice(String(selectedItem.unit_selling_price ?? (selectedItem.selling_price / (selectedItem.units_per_pack ?? 1))));
                }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${saleMode === "unit" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
                  Per {selectedItem.unit_name ?? "Piece"}
                </button>
              </div>
              {saleMode === "unit" && selectedItem.units_per_pack && (
                <p className="text-xs text-muted-foreground mt-1">
                  1 {selectedItem.pack_name ?? "pack"} = {selectedItem.units_per_pack} {selectedItem.unit_name ?? "pieces"}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">
                {isPackItem && saleMode === "pack" ? "Packs sold" : isPackItem ? `${selectedItem?.unit_name ?? "Pieces"} sold` : "How many sold?"}
              </label>
              <div className="relative mt-1.5">
                <input type="number" min="1" className={`${inputCls} pr-9`}
                  value={quantity} onChange={e => setQuantity(e.target.value)} />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <VoiceMicButton onResult={v => setQuantity(extractNumber(v))} transform={extractNumber} />
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Price (₦)</label>
              <div className="relative mt-1.5">
                <input type="number" min="0" step="0.01" className={`${inputCls} pr-9`}
                  value={salePrice} onChange={e => setSalePrice(e.target.value)} />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <VoiceMicButton onResult={v => setSalePrice(extractNumber(v))} transform={extractNumber} />
                </div>
              </div>
            </div>
          </div>

          {profit !== null && (
            <div className={`rounded-xl px-4 py-3 text-sm font-medium ${profit >= 0 ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
              Profit: ₦{profit.toLocaleString()}
            </div>
          )}

          {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-2">{error}</p>}

          <Button type="submit" variant="hero" size="lg" disabled={loading} className="w-full rounded-xl">
            {loading ? "Saving..." : "Record Sale"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default RecordSaleModal;
