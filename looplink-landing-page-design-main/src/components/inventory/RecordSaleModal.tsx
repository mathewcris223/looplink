import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { recordInventorySaleV2, InventoryItem } from "@/lib/db";
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
  const [quantity, setQuantity] = useState("1");
  const [salePrice, setSalePrice] = useState(defaultItem ? String(defaultItem.selling_price) : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDropdown, setShowDropdown] = useState(!defaultItem);

  const filtered = useMemo(() =>
    items.filter(i => i.name.toLowerCase().includes(search.toLowerCase())).slice(0, 8),
    [items, search]
  );

  const selectItem = (item: InventoryItem) => {
    setSelectedItem(item); setSearch(item.name); setShowDropdown(false);
    setSalePrice(String(item.selling_price)); setQuantity("1");
  };

  const qty = parseInt(quantity) || 0;
  const price = parseFloat(salePrice) || 0;
  const profit = selectedItem && qty && price ? qty * (price - (selectedItem.cost_price ?? 0)) : null;

  // Quick voice fills multiple fields at once
  const handleVoiceFields = ({ itemName, quantity: q, amount }: { itemName?: string; quantity?: number; amount?: number }) => {
    if (itemName) {
      setSearch(itemName);
      setShowDropdown(true);
      // Try to match with existing inventory
      const match = items.find(i => i.name.toLowerCase().includes(itemName.toLowerCase()));
      if (match) { selectItem(match); return; }
    }
    if (q) setQuantity(String(q));
    if (amount) setSalePrice(String(amount));
  };

  // Image scan fills fields from receipt
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
    setLoading(true);
    try {
      await recordInventorySaleV2({
        itemId: selectedItem?.id ?? null,
        businessId,
        quantitySold: qty,
        salePricePerUnit: price,
        profit: profit ?? undefined,
        itemType: selectedItem?.item_type ?? "product",
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">How many sold?</label>
              <div className="relative mt-1.5">
                <input type="number" min="1" className={`${inputCls} pr-9`}
                  value={quantity} onChange={e => setQuantity(e.target.value)} />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <VoiceMicButton onResult={v => setQuantity(extractNumber(v))} transform={extractNumber} />
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Price each (₦)</label>
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
