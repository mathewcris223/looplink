import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronDown, TrendingUp } from "lucide-react";

const stats = [
  { label: "Active Users", value: "12,000+" },
  { label: "Avg. Profit Increase", value: "28%" },
  { label: "Businesses Helped", value: "5,000+" },
];

const DashboardMockup = () => {
  const [profit, setProfit] = useState(28000);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setProfit((p) => {
        const next = p + Math.floor(Math.random() * 800 + 200);
        return next > 35000 ? 28000 : next;
      });
      setTick((t) => t + 1);
    }, 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="animate-float relative mx-auto w-full max-w-[360px]">
      {/* Glow rings */}
      <div className="absolute inset-0 rounded-3xl bg-primary/10 blur-3xl scale-110" />
      <div className="absolute inset-0 rounded-3xl bg-secondary/10 blur-2xl scale-105" />

      <div className="relative rounded-3xl border border-white/20 bg-card/90 backdrop-blur-xl p-5 shadow-2xl glow-primary">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
              Today's Summary
            </span>
          </div>
          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
            Live
          </span>
        </div>

        {/* Metrics */}
        <div className="space-y-2.5 mb-4">
          <div className="flex justify-between items-center p-3 rounded-xl bg-muted/60">
            <span className="text-xs text-muted-foreground font-medium">Sales</span>
            <span className="text-sm font-bold text-foreground">₦50,000</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-xl bg-muted/60">
            <span className="text-xs text-muted-foreground font-medium">Expenses</span>
            <span className="text-sm font-bold text-destructive">₦20,000</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-xl bg-gradient-brand-subtle border border-primary/20">
            <span className="text-xs text-muted-foreground font-medium">Profit</span>
            <span
              key={tick}
              className="text-sm font-bold text-gradient animate-number-tick"
            >
              ₦{profit.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Mini chart */}
        <div className="flex items-end gap-1 h-12 mb-4 px-1">
          {[30, 45, 38, 55, 50, 68, 60, 78, 72, 88, 82, 95].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm bg-gradient-brand animate-grow-bar"
              style={{
                height: `${h}%`,
                animationDelay: `${i * 0.06}s`,
                opacity: 0.35 + (h / 100) * 0.65,
              }}
            />
          ))}
        </div>

        {/* AI Insight */}
        <div className="rounded-xl border border-primary/25 bg-accent/60 p-3">
          <div className="flex items-start gap-2">
            <span className="text-base">💡</span>
            <div>
              <p className="text-[10px] font-semibold text-accent-foreground mb-0.5">AI Insight</p>
              <p className="text-[11px] leading-relaxed text-accent-foreground/80">
                Transport costs are 18% above average. Reducing them could add{" "}
                <strong className="text-accent-foreground">₦4,200</strong> to your profit.
              </p>
            </div>
          </div>
        </div>

        {/* Trend badge */}
        <div className="absolute -top-3 -right-3 flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg">
          <TrendingUp size={10} />
          +28% this week
        </div>
      </div>
    </div>
  );
};

const HeroSection = () => (
  <section className="relative min-h-screen flex flex-col items-center justify-center pt-16 overflow-hidden">
    {/* Background layers */}
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
    <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-primary/8 blur-[100px]" />
      <div className="absolute bottom-1/4 -right-32 w-[500px] h-[500px] rounded-full bg-secondary/8 blur-[120px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-primary/3 blur-[150px]" />
    </div>

    {/* Grid pattern overlay */}
    <div
      className="absolute inset-0 opacity-[0.025]"
      style={{
        backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
          linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
      }}
    />

    <div className="container relative mx-auto px-6 py-20">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        {/* Left — copy */}
        <div className="text-center lg:text-left space-y-7 animate-fade-up">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border bg-card/80 backdrop-blur px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping-slow absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Smart Business Assistant — Powered by AI
          </div>

          {/* Headline */}
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight">
            Understand Your Business.{" "}
            <span className="text-shimmer">Grow Your Profit.</span>
          </h1>

          {/* Sub */}
          <p className="text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0 leading-relaxed">
            LoopLink tracks your daily sales and expenses, detects hidden problems, and gives you
            clear AI-powered advice to grow your profit — without the stress.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <Button
              variant="hero"
              size="lg"
              className="text-base rounded-full px-8 animate-pulse-glow hover:scale-105 transition-transform duration-200"
            >
              Get Started Free <ArrowRight size={18} />
            </Button>
            <Button
              variant="hero-outline"
              size="lg"
              className="text-base rounded-full px-8 hover:scale-105 transition-transform duration-200"
            >
              See How It Works <ChevronDown size={18} />
            </Button>
          </div>

          {/* Social proof stats */}
          <div className="flex flex-wrap gap-6 justify-center lg:justify-start pt-2">
            {stats.map((s) => (
              <div key={s.label} className="text-center lg:text-left">
                <p className="text-xl font-bold text-gradient font-display">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right — mockup */}
        <div
          className="flex justify-center lg:justify-end animate-fade-up"
          style={{ animationDelay: "0.25s" }}
        >
          <DashboardMockup />
        </div>
      </div>
    </div>

    {/* Scroll indicator */}
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 animate-fade-in opacity-60">
      <span className="text-[10px] text-muted-foreground tracking-widest uppercase">Scroll</span>
      <ChevronDown size={16} className="text-muted-foreground animate-bounce" />
    </div>
  </section>
);

export default HeroSection;
