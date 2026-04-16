import { useState } from "react";
import { Button } from "@/components/ui/button";
import { addInventoryLoss, InventoryItem } from "@/lib/db";
import { X, AlertTriangle } from "lucide-react";

interface Props {
  businessId: string;
  items: InventoryItem[];
  onClose: () => void;
  onSuccess: () => void;
  defaultItem?: InventoryItem;
}

const RecordLossModal = ({ businessId, items, onClose, onSuccess, defaultItem }: Props) => {
  const [selectedItemId, setSelectedItemId] = useState(defaultItem?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const stockItems = items.filter(i => i.item_type !== "service");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!selectedItemId) { setError("Select an item."); return; }
    if (!quantity || parseFloat(quantity) < 0.01) { setError("Enter a valid quantity."); return; }
    setLoading(true);
    try {
      await addInventoryLoss(selectedItemId, businessId, parseFloat(quantity), reason.trim() || undefined);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record loss.");
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
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center">
              <AlertTriangle size={15} className="text-red-600" />
            </div>
            <h2 className="font-display font-bold text-lg">Record Loss</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Item</label>
            <select className={`${inputCls} mt-1.5`} value={selectedItemId} onChange={e => setSelectedItemId(e.target.value)}>
              <option value="">Select item…</option>
              {stockItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Quantity Lost</label>
            <input type="number" min="0.01" step="0.01" className={`${inputCls} mt-1.5`} value={quantity} onChange={e => setQuantity(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Reason (optional)</label>
            <input className={`${inputCls} mt-1.5`} placeholder="e.g. Damaged, Expired, Stolen" value={reason} onChange={e => setReason(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-2">{error}</p>}
          <Button type="submit" variant="hero" size="lg" disabled={loading} className="w-full rounded-xl bg-red-600 hover:bg-red-700">
            {loading ? "Saving…" : "Record Loss"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default RecordLossModal;
