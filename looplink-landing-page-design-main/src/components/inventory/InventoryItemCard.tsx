import { InventoryItem, formatStockDisplay } from "@/lib/db";
import { ShoppingCart, Pencil, Trash2, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface Props {
  item: InventoryItem;
  onSale: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const InventoryItemCard = ({ item, onSale, onEdit, onDelete }: Props) => {
  const isOut = item.status === "out_of_stock";
  const isLow = item.status === "low_stock";
  const isPackItem = item.purchase_type === "pack" && (item.units_per_pack ?? 0) > 1;

  const profitPerUnit = item.selling_price && item.cost_price
    ? item.selling_price - item.cost_price : null;

  const stockDisplay = formatStockDisplay(item);

  return (
    <div className={`rounded-2xl border bg-card p-4 transition-all duration-200 hover:shadow-sm ${isOut ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <p className="font-semibold text-sm">{item.name}</p>
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
            <span className="font-medium text-foreground">{stockDisplay}</span>
            <span>Sell ₦{item.selling_price.toLocaleString()}</span>
            {profitPerUnit !== null && profitPerUnit > 0 && (
              <span className="text-emerald-600 font-medium">+₦{profitPerUnit.toLocaleString()} profit</span>
            )}
          </div>

          {isPackItem && item.units_per_pack && (
            <p className="text-xs text-primary/70 mt-1">
              1 {item.pack_name ?? "pack"} = {item.units_per_pack} {item.unit_name ?? "pieces"}
              {item.unit_selling_price && (
                <span className="text-muted-foreground"> · ₦{item.unit_selling_price.toLocaleString()} per {item.unit_name ?? "piece"}</span>
              )}
            </p>
          )}
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
    </div>
  );
};

export default InventoryItemCard;
