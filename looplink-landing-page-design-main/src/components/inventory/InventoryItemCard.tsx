import { InventoryItem } from "@/lib/db";
import { ShoppingCart, Pencil, Trash2, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface Props {
  item: InventoryItem;
  onSale: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const InventoryItemCard = ({ item, onSale, onEdit, onDelete }: Props) => {
  const qty = item.quantity ?? 0;
  const isOut = item.status === "out_of_stock";
  const isLow = item.status === "low_stock";
  const profit = item.selling_price && item.cost_price
    ? item.selling_price - item.cost_price : null;

  return (
    <div className={`rounded-2xl border bg-card p-4 flex items-center justify-between gap-3 hover:shadow-sm transition-all duration-200 ${isOut ? "opacity-60" : ""}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <p className="font-semibold text-sm truncate">{item.name}</p>
          {isOut && (
            <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full shrink-0">
              <XCircle size={10} /> Out of stock
            </span>
          )}
          {isLow && !isOut && (
            <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
              <AlertTriangle size={10} /> Running low
            </span>
          )}
          {!isOut && !isLow && item.status && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
              <CheckCircle size={10} /> In stock
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {item.item_type !== "service" && <span>{qty} remaining</span>}
          <span>₦{item.selling_price.toLocaleString()} each</span>
          {profit !== null && profit > 0 && (
            <span className="text-emerald-600">+₦{profit.toLocaleString()} profit</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button onClick={onSale} disabled={isOut}
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed min-h-[36px]">
          <ShoppingCart size={13} /> Sell
        </button>
        <button onClick={onEdit}
          className="p-2 rounded-xl border hover:bg-muted transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center">
          <Pencil size={13} className="text-muted-foreground" />
        </button>
        <button onClick={onDelete}
          className="p-2 rounded-xl border border-red-200 hover:bg-red-50 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center">
          <Trash2 size={13} className="text-red-500" />
        </button>
      </div>
    </div>
  );
};

export default InventoryItemCard;
