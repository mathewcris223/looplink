import { useState } from "react";
import { Button } from "@/components/ui/button";
import { updateInventorySale, deleteInventorySale, InventorySale, InventoryItem } from "@/lib/db";
import { X, Trash2, AlertTriangle } from "lucide-react";

interface Props {
  sale: InventorySale;
  item: InventoryItem;
  onClose: () => void;
  onSaved: () => void;
}

const EditSaleModal = ({ sale, item, onClose, onSaved }: Props) => {
  const [quantitySold, setQuantitySold] = useState(String(sale.quantity_sold));
  const [salePrice, setSalePrice] = useState(String(sale.sale_price_per_unit));
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const profit = parseFloat(salePrice) && parseInt(quantitySold)
    ? parseInt(quantitySold) * (parseFloat(salePrice) - (item.cost_price ?? 0))
    : null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const qty = parseInt(quantitySold);
    const price = parseFloat(salePrice);
    if (!qty || qty < 1) { setError("Enter a valid quantity."); return; }
    if (!price || price < 0) { setError("Enter a valid price."); return; }
    setLoading(true);
    try {
      await updateInventorySale(sale.id, { quantity_sold: qty, sale_price_per_unit: price, profit: profit ?? undefined });
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteInventorySale(sale.id, item.id, sale.quantity_sold);
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete.");
      setDeleting(false);
    }
  };

  const inputCls = "w-full rounded-xl border bg-muted/40 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-3xl border bg-card shadow-2xl p-6 animate-fade-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-lg">Edit Sale</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X size={18} /></button>
        </div>

        <div className="rounded-xl bg-muted/40 px-4 py-3 mb-4 text-xs text-muted-foreground">
          Item: <span className="font-semibold text-foreground">{item.name}</span>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Quantity Sold</label>
              <input type="number" min="1" className={`${inputCls} mt-1.5`}
                value={quantitySold} onChange={e => setQuantitySold(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Price per unit (N)</label>
              <input type="number" min="0" step="0.01" className={`${inputCls} mt-1.5`}
                value={salePrice} onChange={e => setSalePrice(e.target.value)} />
            </div>
          </div>

          {profit !== null && (
            <div className={`rounded-xl px-4 py-3 text-sm font-medium ${profit >= 0 ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
              Profit: N{profit.toLocaleString()}
            </div>
          )}

          {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-2">{error}</p>}

          <Button type="submit" variant="hero" size="lg" disabled={loading} className="w-full rounded-xl">
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </form>

        <div className="mt-3 pt-3 border-t">
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors">
              <Trash2 size={14} /> Delete Sale
            </button>
          ) : (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 space-y-2">
              <div className="flex items-center gap-2 text-red-700 text-xs font-medium">
                <AlertTriangle size={13} /> This will restore {sale.quantity_sold} units to stock
              </div>
              <div className="flex gap-2">
                <Button variant="hero-outline" size="sm" onClick={() => setConfirmDelete(false)} className="flex-1 rounded-xl">Cancel</Button>
                <button onClick={handleDelete} disabled={deleting}
                  className="flex-1 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors disabled:opacity-50">
                  {deleting ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditSaleModal;
