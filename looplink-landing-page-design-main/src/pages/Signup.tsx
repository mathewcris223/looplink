import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useBusiness } from "@/context/BusinessContext";
import { createBusiness } from "@/lib/db";
import AuthLayout from "@/components/AuthLayout";
import { Eye, EyeOff, ArrowRight, Store, Utensils, Shirt, Globe, Briefcase, MoreHorizontal } from "lucide-react";

const bizTypes = [
  { id: "retail", label: "Retail Shop", icon: Store },
  { id: "food", label: "Food Business", icon: Utensils },
  { id: "fashion", label: "Fashion Store", icon: Shirt },
  { id: "online", label: "Online Business", icon: Globe },
  { id: "service", label: "Service Business", icon: Briefcase },
  { id: "other", label: "Other", icon: MoreHorizontal },
];

type Step = "account" | "business";

const Signup = () => {
  const { signup } = useAuth();
  const { refreshBusinesses } = useBusiness();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("account");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [bizName, setBizName] = useState("");
  const [bizType, setBizType] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setError("All fields are required.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await signup(form.name.trim(), form.email.trim(), form.password);
      // Pre-fill business name from user's name
      setBizName(`${form.name.trim().split(" ")[0]}'s Business`);
      setStep("business");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Signup failed.";
      setError(msg.includes("already registered") ? "An account with this email already exists." : msg);
    } finally {
      setLoading(false);
    }
  };

  const handleBusinessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!bizName.trim()) { setError("Enter a business name."); return; }
    if (!bizType) { setError("Select a business type."); return; }
    setLoading(true);
    try {
      await createBusiness(bizName.trim(), bizType);
      await refreshBusinesses();
      navigate("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create business.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full rounded-xl border bg-muted/40 px-4 py-3 text-sm outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60";

  if (step === "business") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center px-4">
        <div className="w-full max-w-lg animate-fade-up">
          <div className="text-center mb-8">
            <span className="font-display text-2xl font-bold text-gradient">Aje</span>
            <h1 className="font-display text-2xl font-bold mt-4 mb-1">Set up your business</h1>
            <p className="text-muted-foreground text-sm">This only takes a moment — you won't be asked again.</p>
            <div className="flex items-center justify-center gap-2 mt-3">
              <div className="w-8 h-1.5 rounded-full bg-primary" />
              <div className="w-8 h-1.5 rounded-full bg-primary" />
            </div>
          </div>

          <div className="rounded-3xl border bg-card/90 backdrop-blur p-6 md:p-8">
            <form onSubmit={handleBusinessSubmit} className="space-y-5">
              {/* Business type grid */}
              <div>
                <label className="text-sm font-medium mb-3 block">Business Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {bizTypes.map(({ id, label, icon: Icon }) => (
                    <button key={id} type="button" onClick={() => setBizType(id)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                        bizType === id
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card hover:border-primary/50 hover:bg-primary/5"
                      }`}>
                      <Icon size={15} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Business name */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Business Name</label>
                <input type="text" placeholder="e.g. My Shop" value={bizName}
                  onChange={e => setBizName(e.target.value)}
                  className={inputCls} />
              </div>

              {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-2.5">{error}</p>}

              <Button type="submit" variant="hero" size="lg" disabled={loading} className="w-full rounded-xl text-base">
                {loading ? "Setting up…" : <>Go to Dashboard <ArrowRight size={16} /></>}
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start growing your business today — it's free"
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">Log in</Link>
        </>
      }
    >
      <form onSubmit={handleAccountSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="name">Full Name</label>
          <input id="name" type="text" placeholder="John Doe" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="email">Email</label>
          <input id="email" type="email" placeholder="you@example.com" value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })} className={inputCls} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="password">Password</label>
          <div className="relative">
            <input id="password" type={showPass ? "text" : "password"} placeholder="Min. 6 characters"
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              className={`${inputCls} pr-11`} />
            <button type="button" onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-2.5">{error}</p>}
        <Button type="submit" variant="hero" size="lg" disabled={loading}
          className="w-full rounded-xl text-base mt-2 hover:scale-[1.02] transition-transform duration-200">
          {loading ? "Creating account…" : <>Continue <ArrowRight size={16} /></>}
        </Button>
      </form>
    </AuthLayout>
  );
};

export default Signup;
