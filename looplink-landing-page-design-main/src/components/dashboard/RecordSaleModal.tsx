import { useState } from "react";
import { Button } from "@/components/ui/button";
import { recordInventorySale, InventoryItem } from "@/lib/db";
import { X } from "lucide-react";

interface Props {
  item: InventoryItem;
  businessId: string;
  onClose: () => void;
  onSaved: () => void;
}

const RecordSaleModal = ({ item, businessId, onClose, onSaved }: Props) => {
  const [quantity, setQuantity] = useState("1");
  const [salePrice, setSalePrice] = useState(String(item.selling_price));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const qty = parseInt(quantity);
    const price = parseFloat(salePrice);
    if (!qty || qty < 1) { setError("Quantity must be at least 1."); return; }
    if (qty > item.quantity) { setError(`Only ${item.quantity} units in stock.`); return; }
    if (!price || price < 0) { setError("Sale price must be 0 or more."); return; }
    setLoading(true);
    try {
      await recordInventorySale(item.id, businessId, qty, price);
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record sale.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-3xl border bg-card shadow-2xl p-6 animate-fade-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-lg">Record Sale</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X size={18} /></button>
        </div>
        <div className="rounded-xl bg-muted/40 px-4 py-3 mb-4">
          <p className="text-sm font-semibold">{item.name}</p>
          <p className="text-xs text-muted-foreground">{item.quantity} units in stock · ₦{item.selling_price.toLocaleString()} per unit</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Quantity Sold</label>
            <input type="number" min="1" max={item.quantity} value={quantity} onChange={e => setQuantity(e.target.value)}
              className="w-full rounded-xl border bg-muted/40 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Sale Price per Unit (₦)</label>
            <input type="number" min="0" step="0.01" value={salePrice} onChange={e => setSalePrice(e.target.value)}
              className="w-full rounded-xl border bg-muted/40 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
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
