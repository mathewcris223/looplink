import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { createBusiness } from "@/lib/db";
import { useBusiness } from "@/context/BusinessContext";
import { useAuth } from "@/context/AuthContext";
import { ArrowRight, Store, Utensils, Shirt, Globe, Briefcase, MoreHorizontal } from "lucide-react";

const bizTypes = [
  { id: "retail", label: "Retail Shop", icon: Store, desc: "Physical store selling products" },
  { id: "food", label: "Food Business", icon: Utensils, desc: "Restaurant, catering, or food sales" },
  { id: "fashion", label: "Fashion Store", icon: Shirt, desc: "Clothing, accessories, or beauty" },
  { id: "online", label: "Online Business", icon: Globe, desc: "E-commerce or digital products" },
  { id: "service", label: "Service Business", icon: Briefcase, desc: "Consulting, repairs, or freelance" },
  { id: "other", label: "Other", icon: MoreHorizontal, desc: "Any other type of business" },
];

const Onboarding = () => {
  const { user } = useAuth();
  const { refreshBusinesses, businesses, loading: bizLoading } = useBusiness();
  const navigate = useNavigate();

  // If user already has a business, skip onboarding entirely
  useEffect(() => {
    if (!bizLoading && businesses.length > 0) {
      navigate("/dashboard", { replace: true });
    }
  }, [bizLoading, businesses, navigate]);

  const [step, setStep] = useState<"type" | "name">("type");
  const [selectedType, setSelectedType] = useState("");
  const [customType, setCustomType] = useState("");
  const [bizName, setBizName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTypeSelect = (id: string) => {
    setSelectedType(id);
    setStep("name");
  };

  const handleCreate = async () => {
    if (!bizName.trim()) { setError("Please enter a business name."); return; }
    setLoading(true);
    setError("");
    try {
      const type = selectedType === "other" ? (customType || "other") : selectedType;
      await createBusiness(bizName.trim(), type);
      await refreshBusinesses();
      navigate("/dashboard");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create business.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center px-4">
      <div className="w-full max-w-2xl animate-fade-up">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="font-display text-2xl font-bold text-gradient">Aje</span>
          <h1 className="font-display text-3xl font-bold mt-4 mb-2">
            Welcome, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-muted-foreground">
            {step === "type" ? "What type of business do you run?" : "Give your business a name"}
          </p>
          {/* Progress */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="w-8 h-1.5 rounded-full bg-primary" />
            <div className={`w-8 h-1.5 rounded-full transition-colors ${step === "name" ? "bg-primary" : "bg-muted"}`} />
          </div>
        </div>

        {step === "type" && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bizTypes.map(({ id, label, icon: Icon, desc }) => (
              <button
                key={id}
                onClick={() => handleTypeSelect(id)}
                className="group rounded-2xl border bg-card p-5 text-left hover:border-primary hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-brand-subtle flex items-center justify-center mb-3 group-hover:bg-gradient-brand transition-all duration-200">
                  <Icon size={20} className="text-primary group-hover:text-primary-foreground transition-colors" />
                </div>
                <p className="font-semibold text-sm mb-1">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </button>
            ))}
          </div>
        )}

        {step === "name" && (
          <div className="max-w-md mx-auto rounded-3xl border bg-card/90 backdrop-blur p-8 space-y-5">
            <button onClick={() => setStep("type")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Back
            </button>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Business Name</label>
              <input
                type="text"
                placeholder={`e.g. ${selectedType === "food" ? "Mama's Kitchen" : selectedType === "fashion" ? "Style Hub" : "My Business"}`}
                value={bizName}
                onChange={e => setBizName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreate()}
                autoFocus
                className="w-full rounded-xl border bg-muted/40 px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {selectedType === "other" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Business Type (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Photography, Logistics..."
                  value={customType}
                  onChange={e => setCustomType(e.target.value)}
                  className="w-full rounded-xl border bg-muted/40 px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            )}

            {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-2">{error}</p>}

            <Button
              variant="hero"
              size="lg"
              onClick={handleCreate}
              disabled={loading}
              className="w-full rounded-xl"
            >
              {loading ? "Creating…" : <>Create Business <ArrowRight size={16} /></>}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
