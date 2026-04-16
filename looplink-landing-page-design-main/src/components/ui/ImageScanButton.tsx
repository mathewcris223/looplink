// ── ImageScanButton — upload/camera scan → extract fields via AI ─────────────
import { useState, useRef } from "react";
import { Camera, Loader2, X, Check } from "lucide-react";
import { scanImageForTransaction, ScannedData } from "@/lib/imageScan";

interface Props {
  onResult: (data: ScannedData) => void;
}

const ImageScanButton = ({ onResult }: Props) => {
  const [scanning, setScanning] = useState(false);
  const [preview, setPreview] = useState<ScannedData | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) { setError("Please select an image file."); return; }
    setError(""); setScanning(true); setPreview(null);
    try {
      const result = await scanImageForTransaction(file);
      setPreview(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Scan failed. Enter details manually.");
    } finally {
      setScanning(false);
    }
  };

  const confirm = () => {
    if (preview) { onResult(preview); setPreview(null); }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={scanning}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-dashed border-muted-foreground/30 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all duration-200 disabled:opacity-50"
      >
        {scanning
          ? <><Loader2 size={15} className="animate-spin" /> Scanning image…</>
          : <><Camera size={15} /> Scan receipt or image</>
        }
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />

      {/* Preview panel */}
      {preview && (
        <div className="rounded-2xl border bg-muted/30 p-4 space-y-3 animate-fade-up">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Found in image</p>
            <button type="button" onClick={() => setPreview(null)} className="text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          </div>

          {preview.rawText && !preview.amount ? (
            <p className="text-xs text-amber-600 leading-relaxed">{preview.rawText}</p>
          ) : (
            <div className="space-y-1.5 text-sm">
              {preview.itemName && <div className="flex justify-between"><span className="text-muted-foreground">Item</span><span className="font-medium">{preview.itemName}</span></div>}
              {preview.quantity !== undefined && <div className="flex justify-between"><span className="text-muted-foreground">Quantity</span><span className="font-medium">{preview.quantity}</span></div>}
              {preview.amount !== undefined && <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-medium text-emerald-600">₦{preview.amount.toLocaleString()}</span></div>}
              {preview.type && <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className={`font-medium capitalize ${preview.type === "income" ? "text-emerald-600" : "text-red-500"}`}>{preview.type}</span></div>}
            </div>
          )}

          {preview.amount && (
            <div className="flex gap-2">
              <button type="button" onClick={confirm}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity">
                <Check size={13} /> Use this
              </button>
              <button type="button" onClick={() => setPreview(null)}
                className="px-4 py-2 rounded-xl border text-xs font-medium hover:bg-muted transition-colors">
                Ignore
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};

export default ImageScanButton;
