import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createBusiness } from "@/lib/db";
import { X, Store, Utensils, Shirt, Globe, Briefcase, MoreHorizontal } from "lucide-react";

const bizTypes = [
  { id: "retail",  label: "Retail Shop",       icon: Store,          desc: "Physical store selling products" },
  { id: "food",    label: "Food Business",      icon: Utensils,       desc: "Restaurant, catering, food sales" },
  { id: "fashion", label: "Fashion Store",      icon: Shirt,          desc: "Clothing, accessories, beauty" },
  { id: "online",  label: "Online Business",    icon: Globe,          desc: "E-commerce or digital products" },
  { id: "service", label: "Service Business",   icon: Briefcase,      desc: "Consulting, repairs, freelance" },
  { id: "other",   label: "Other",              icon: MoreHorizontal, desc: "Any other type of business" },
];

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

const AddBusinessModal = ({ onClose, onCreated }: Props) => {
  const [step, setStep] = useState<"type" | "name">("type");
  const [selectedType, setSelectedType] = useState("");
  const [bizName, setBizName] = useState("");
  const [customType, setCustomType] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!bizName.trim()) { setError("Enter a business name."); return; }
    setLoading(true);
    setError("");
    try {
      const type = selectedType === "other" ? (customType.trim() || "other") : selectedType;
      await createBusiness(bizName.trim(), type);
      onCreated();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create business.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full rounded-xl border bg-muted/40 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-3xl border bg-card shadow-2xl p-6 animate-fade-up max-h-[92dvh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-display font-bold text-lg">Add New Business</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {step === "type" ? "What type of business?" : "Give it a name"}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X size={18} />
          </button>
        </div>

        {step === "type" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {bizTypes.map(({ id, label, icon: Icon, desc }) => (
              <button key={id} onClick={() => { setSelectedType(id); setStep("name"); }}
                className="group flex flex-col items-start gap-2 p-4 rounded-2xl border hover:border-primary hover:bg-primary/5 transition-all duration-200 text-left">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Icon size={17} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="text-xs text-muted-foreground leading-tight mt-0.5">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {step === "name" && (
          <div className="space-y-4">
            <button onClick={() => setStep("type")} className="text-xs text-primary hover:underline">
              ← Change type
            </button>

            <div>
              <label className="text-sm font-medium">Business Name</label>
              <input autoFocus type="text"
                placeholder={selectedType === "food" ? "e.g. Mama's Kitchen" : selectedType === "fashion" ? "e.g. Style Hub" : "e.g. My Business"}
                value={bizName}
                onChange={e => setBizName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreate()}
                className={`${inputCls} mt-1.5`}
              />
            </div>

            {selectedType === "other" && (
              <div>
                <label className="text-sm font-medium">Business Type <span className="text-muted-foreground font-normal">(optional)</span></label>
                <input type="text" placeholder="e.g. Photography, Logistics..."
                  value={customType} onChange={e => setCustomType(e.target.value)}
                  className={`${inputCls} mt-1.5`} />
              </div>
            )}

            {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-2">{error}</p>}

            <Button variant="hero" size="lg" onClick={handleCreate} disabled={loading} className="w-full rounded-xl">
              {loading ? "Creating…" : "Create Business"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddBusinessModal;
