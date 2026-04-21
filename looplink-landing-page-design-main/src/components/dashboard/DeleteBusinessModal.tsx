import { useState } from "react";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Business } from "@/lib/db";
import { useBusiness } from "@/context/BusinessContext";

interface Props {
  business: Business;
  onClose: () => void;
  onDeleted: () => void;
}

const DeleteBusinessModal = ({ business, onClose, onDeleted }: Props) => {
  const { deleteBusiness } = useBusiness();
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const isConfirmed = inputValue === business.name;

  const handleDelete = async () => {
    if (!isConfirmed || isLoading) return;
    setIsLoading(true);
    setError("");
    try {
      await deleteBusiness(business.id);
      onDeleted();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete business. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border bg-card shadow-2xl animate-fade-up max-h-[92dvh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
              <Trash2 size={18} className="text-red-600" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-red-600">Delete Business?</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{business.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors mt-0.5">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Warning */}
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-red-700">This action cannot be undone.</p>
              <p className="text-xs text-red-600 leading-relaxed">
                Permanently deleting <span className="font-bold">"{business.name}"</span> will remove:
              </p>
              <ul className="text-xs text-red-600 space-y-0.5 list-disc list-inside">
                <li>All transactions and financial records</li>
                <li>All inventory items and stock data</li>
                <li>All sales and loss records</li>
                <li>The business profile itself</li>
              </ul>
            </div>
          </div>

          {/* Name confirmation */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Type <span className="font-bold text-foreground">"{business.name}"</span> to confirm
            </label>
            <input
              type="text"
              autoComplete="off"
              placeholder={business.name}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onPaste={e => e.preventDefault()} // force manual typing
              className="w-full rounded-xl border bg-muted/40 px-4 py-3 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200 transition-colors"
            />
            {inputValue.length > 0 && !isConfirmed && (
              <p className="text-xs text-red-500">Name doesn't match. Check capitalisation and spacing.</p>
            )}
            {isConfirmed && (
              <p className="text-xs text-emerald-600 font-medium">✓ Name confirmed</p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2.5 pt-1">
            <Button
              variant="destructive"
              size="lg"
              disabled={!isConfirmed || isLoading}
              onClick={handleDelete}
              className="w-full rounded-xl gap-2 text-sm font-semibold"
            >
              {isLoading
                ? <><Loader2 size={16} className="animate-spin" /> Deleting…</>
                : <><Trash2 size={16} /> Yes, Delete This Business</>}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={onClose}
              disabled={isLoading}
              className="w-full rounded-xl text-sm"
            >
              Cancel — Keep Business
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteBusinessModal;
