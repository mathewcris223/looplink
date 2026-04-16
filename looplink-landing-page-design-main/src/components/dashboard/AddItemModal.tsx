import { useState } from "react";
import { Button } from "@/components/ui/button";
import { addInventoryItem } from "@/lib/db";
import { X } from "lucide-react";

interface Props {
  businessId: string;
  onClose: () => void;
  onSaved: () => void;
}

const AddItemModal = ({ businessId, onClose, onSaved }: Props) => {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Item name is required.";
    if (!quantity || parseInt(quantity) < 1) e.quantity = "Quantity must be at least 1.";
    if (!costPrice || parseFloat(costPrice) < 0) e.costPrice = "Cost price must be 0 or more.";
    if (!sellingPrice || parseFloat(sellingPrice) < 0) e.sellingPrice = "Selling price must be 0 or more.";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    try {
      await addInventoryItem(businessId, name.trim(), parseInt(quantity), parseFloat(costPrice), parseFloat(sellingPrice));
      onSaved();
      onClose();
    } catch (err: unknown) {
      setErrors({ form: err instanceof Error ? err.message : "Failed to save item." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl border bg-card shadow-2xl p-6 animate-fade-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-lg">Add Inventory Item</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Item Name</label>
            <input type="text" placeholder="e.g. Phone Case" value={name} onChange={e => setName(e.target.value)}
              className="w-full rounded-xl border bg-muted/40 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Initial Quantity</label>
            <input type="number" min="1" placeholder="e.g. 50" value={quantity} onChange={e => setQuantity(e.target.value)}
              className="w-full rounded-xl border bg-muted/40 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            {errors.quantity && <p className="text-xs text-destructive">{errors.quantity}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Cost Price (₦)</label>
              <input type="number" min="0" step="0.01" placeholder="e.g. 500" value={costPrice} onChange={e => setCostPrice(e.target.value)}
                className="w-full rounded-xl border bg-muted/40 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
              {errors.costPrice && <p className="text-xs text-destructive">{errors.costPrice}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Selling Price (₦)</label>
              <input type="number" min="0" step="0.01" placeholder="e.g. 800" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)}
                className="w-full rounded-xl border bg-muted/40 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
              {errors.sellingPrice && <p className="text-xs text-destructive">{errors.sellingPrice}</p>}
            </div>
          </div>
          {errors.form && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-2">{errors.form}</p>}
          <Button type="submit" variant="hero" size="lg" disabled={loading} className="w-full rounded-xl">
            {loading ? "Saving…" : "Add Item"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AddItemModal;
