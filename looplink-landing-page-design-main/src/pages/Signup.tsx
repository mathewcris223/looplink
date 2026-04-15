import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import AuthLayout from "@/components/AuthLayout";
import { Eye, EyeOff, ArrowRight } from "lucide-react";

const Signup = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
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
    setTimeout(() => {
      const ok = signup(form.name.trim(), form.email.trim(), form.password);
      if (!ok) {
        setError("An account with this email already exists.");
        setLoading(false);
      } else {
        navigate("/dashboard");
      }
    }, 600);
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start growing your business today — it's free"
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="name">Full Name</label>
          <input
            id="name"
            type="text"
            placeholder="John Doe"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-xl border bg-muted/40 px-4 py-3 text-sm outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60"
          />
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-xl border bg-muted/40 px-4 py-3 text-sm outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60"
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="password">Password</label>
          <div className="relative">
            <input
              id="password"
              type={showPass ? "text" : "password"}
              placeholder="Min. 6 characters"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-xl border bg-muted/40 px-4 py-3 pr-11 text-sm outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-2.5">
            {error}
          </p>
        )}

        {/* Submit */}
        <Button
          type="submit"
          variant="hero"
          size="lg"
          disabled={loading}
          className="w-full rounded-xl text-base mt-2 hover:scale-[1.02] transition-transform duration-200"
        >
          {loading ? "Creating account…" : <>Create Account <ArrowRight size={16} /></>}
        </Button>
      </form>
    </AuthLayout>
  );
};

export default Signup;
