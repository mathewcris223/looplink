import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";

const PhoneMockup = () => (
  <div className="animate-float relative mx-auto w-[280px] md:w-[320px]">
    <div className="rounded-[2rem] border-4 border-foreground/10 bg-card p-4 shadow-2xl glow-primary">
      <div className="rounded-xl bg-muted p-4 space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-medium text-muted-foreground">Today's Summary</span>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 rounded-lg bg-card">
            <span className="text-xs text-muted-foreground">Sales</span>
            <span className="text-sm font-bold text-primary">₦50,000</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-lg bg-card">
            <span className="text-xs text-muted-foreground">Expenses</span>
            <span className="text-sm font-bold text-destructive">₦20,000</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-lg bg-gradient-brand-subtle">
            <span className="text-xs text-muted-foreground">Profit</span>
            <span className="text-sm font-bold text-gradient">₦30,000</span>
          </div>
        </div>
        <div className="mt-3 rounded-lg border border-primary/20 bg-accent p-3">
          <p className="text-[11px] leading-relaxed text-accent-foreground">
            💡 <strong>Insight:</strong> You are overspending on transport. Reduce it to increase profit.
          </p>
        </div>
      </div>
    </div>
  </div>
);

const HeroSection = () => (
  <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
    {/* Background effects */}
    <div className="absolute inset-0 bg-gradient-brand-subtle opacity-50" />
    <div className="absolute top-20 left-1/4 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />
    <div className="absolute bottom-20 right-1/4 w-96 h-96 rounded-full bg-secondary/10 blur-3xl" />

    <div className="container relative mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center">
      <div className="text-center lg:text-left space-y-6 animate-fade-up">
        <div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          Smart Business Assistant
        </div>
        <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
          Understand Your Business.{" "}
          <span className="text-gradient">Grow Your Profit.</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0">
          LoopLink helps you track your daily business, detect problems, and gives you smart advice to increase your profit — without stress.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
          <Button variant="hero" size="lg" className="text-base">
            Get Started Free <ArrowRight size={18} />
          </Button>
          <Button variant="hero-outline" size="lg" className="text-base">
            <Play size={18} /> See How It Works
          </Button>
        </div>
      </div>
      <div className="flex justify-center" style={{ animationDelay: "0.3s" }}>
        <PhoneMockup />
      </div>
    </div>
  </section>
);

export default HeroSection;
