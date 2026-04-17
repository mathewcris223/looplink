import { useState } from "react";
import { Button } from "@/components/ui/button";
import { addInventoryItemV2 } from "@/lib/db";
import { X, ChevronDown } from "lucide-react";
import VoiceMicButton from "@/components/ui/VoiceMicButton";
import ImageScanButton from "@/components/ui/ImageScanButton";
import { extractNumber } from "@/hooks/useVoiceInput";

interface Props {
  businessId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const AddProductModal = ({ businessId, onClose, onSuccess }: Props) => {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  // Optional pack feature
  const [sellInPieces, setSellInPieces] = useState(false);
  const [unitsPerPack, setUnitsPerPack] = useState("");
  const [unitName, setUnitName] = useState("pieces");
  const [pieceSellingPrice, setPieceSellingPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Auto-calculate cost per piece
  const costPerPiece = costPrice && unitsPerPack && parseFloat(costPrice) > 0 && parseInt(unitsPerPack) > 0
    ? (parseFloat(costPrice) / parseInt(unitsPerPack)).toFixed(2) : null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Enter an item name."); return; }
    if (!sellingPrice || parseFloat(sellingPrice) < 0) { setError("Enter a selling price."); return; }
    if (sellInPieces && (!unitsPerPack || parseInt(unitsPerPack) < 2)) {
      setError("Enter how many pieces are in one pack (at least 2)."); return;
    }
    setLoading(true);
    try {
      // Store total pieces in quantity: packs × units_per_pack
      const packs = quantity ? parseInt(quantity) : 0;
      const uPP = sellInPieces && unitsPerPack ? parseInt(unitsPerPack) : 1;
      const totalUnits = packs * uPP;

      await addInventoryItemV2({
        businessId,
        name: name.trim(),
        itemType: "product",
        quantity: totalUnits,
        costPrice: costPrice ? parseFloat(costPrice) : undefined,
        sellingPrice: parseFloat(sellingPrice),
        lowStockThreshold: sellInPieces ? uPP : 5, // warn when less than 1 pack left
        purchaseType: sellInPieces ? "pack" : "single",
        unitsPerPack: sellInPieces ? uPP : undefined,
        packCost: costPrice ? parseFloat(costPrice) : undefined,
        unitName: sellInPieces ? unitName : undefined,
        packName: sellInPieces ? "pack" : undefined,
        unitSellingPrice: sellInPieces && pieceSellingPrice
          ? parseFloat(pieceSellingPrice) : undefined,
        packSellingPrice: sellInPieces ? parseFloat(sellingPrice) : undefined,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save.");
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
          <h2 className="font-display font-bold text-lg">Add Item</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X size={18} /></button>
        </div>

        <div className="mb-4">
          <ImageScanButton onResult={data => {
            if (data.itemName) setName(data.itemName);
            if (data.quantity) setQuantity(String(data.quantity));
            if (data.amount) { data.type === "expense" ? setCostPrice(String(data.amount)) : setSellingPrice(String(data.amount)); }
          }} />
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-sm font-medium">Item Name</label>
            <div className="relative mt-1.5">
              <input autoFocus className={`${inputCls} pr-9`} placeholder="e.g. Coca-Cola, Shoes, Rice"
                value={name} onChange={e => setName(e.target.value)} />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <VoiceMicButton onResult={v => setName(v)} />
              </div>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="text-sm font-medium">
              {sellInPieces ? "How many packs do you have?" : "How many do you have?"}
            </label>
            <div className="relative mt-1.5">
              <input type="number" min="0" className={`${inputCls} pr-9`} placeholder="e.g. 10"
                value={quantity} onChange={e => setQuantity(e.target.value)} />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <VoiceMicButton onResult={v => setQuantity(extractNumber(v))} transform={extractNumber} />
              </div>
            </div>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">
                {sellInPieces ? "Cost per pack (₦)" : "Cost Price (₦)"}
              </label>
              <p className="text-xs text-muted-foreground mb-1.5">What you paid</p>
              <div className="relative">
                <input type="number" min="0" className={`${inputCls} pr-9`} placeholder="e.g. 2400"
                  value={costPrice} onChange={e => setCostPrice(e.target.value)} />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <VoiceMicButton onResult={v => setCostPrice(extractNumber(v))} transform={extractNumber} />
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">
                {sellInPieces ? "Selling price per pack (₦)" : "Selling Price (₦)"}
              </label>
              <p className="text-xs text-muted-foreground mb-1.5">What you charge</p>
              <div className="relative">
                <input type="number" min="0" className={`${inputCls} pr-9`} placeholder="e.g. 3000"
                  value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <VoiceMicButton onResult={v => setSellingPrice(extractNumber(v))} transform={extractNumber} />
                </div>
              </div>
            </div>
          </div>

          {/* Optional: sell in smaller units */}
          <div className="rounded-2xl border bg-muted/30 p-4">
            <button type="button" onClick={() => setSellInPieces(!sellInPieces)}
              className="w-full flex items-center justify-between text-sm font-medium">
              <span>Sell in smaller units? <span className="text-xs text-muted-foreground font-normal">(optional)</span></span>
              <ChevronDown size={16} className={`text-muted-foreground transition-transform ${sellInPieces ? "rotate-180" : ""}`} />
            </button>
            <p className="text-xs text-muted-foreground mt-1">
              e.g. buy a crate of 24 bottles, sell per bottle
            </p>

            {sellInPieces && (
              <div className="mt-3 space-y-3 pt-3 border-t">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium">Units per pack</label>
                    <input type="number" min="2" className={`${inputCls} mt-1 text-sm py-2`} placeholder="e.g. 24"
                      value={unitsPerPack} onChange={e => setUnitsPerPack(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Unit name</label>
                    <input className={`${inputCls} mt-1 text-sm py-2`} placeholder="e.g. bottle, piece"
                      value={unitName} onChange={e => setUnitName(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium">Selling price per {unitName || "piece"} (₦)</label>
                  <input type="number" min="0" step="0.01" className={`${inputCls} mt-1 text-sm py-2`}
                    placeholder="e.g. 200 — set your own price"
                    value={pieceSellingPrice} onChange={e => setPieceSellingPrice(e.target.value)} />
                  <p className="text-[10px] text-muted-foreground mt-1">You control this — not auto-calculated</p>
                </div>
                {/* Live preview */}
                {unitsPerPack && parseInt(unitsPerPack) >= 2 && (
                  <div className="rounded-xl bg-primary/8 border border-primary/20 px-3 py-2.5 text-xs space-y-1">
                    <p className="font-semibold text-primary">1 pack = {unitsPerPack} {unitName}</p>
                    {quantity && <p className="text-muted-foreground">{quantity} packs = {parseInt(quantity) * parseInt(unitsPerPack)} {unitName} total</p>}
                    {costPerPiece && <p className="text-muted-foreground">Cost per {unitName}: ₦{costPerPiece}</p>}
                  </div>
                )}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-2">{error}</p>}
          <Button type="submit" variant="hero" size="lg" disabled={loading} className="w-full rounded-xl">
            {loading ? "Saving..." : "Add Item"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AddProductModal;
