import { CheckCircle2, TrendingUp } from "lucide-react";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

const points = [
  { text: "Know instantly if you're making or losing money", highlight: "instantly" },
  { text: "Detect problems before they become expensive", highlight: "before" },
  { text: "Make smarter decisions with AI-backed data", highlight: "smarter" },
  { text: "Grow your profit consistently, month over month", highlight: "consistently" },
];

const bars = [35, 45, 40, 55, 65, 60, 80, 75, 90, 85, 95, 100];

const ValueSection = () => {
  const leftRef = useScrollReveal<HTMLDivElement>();
  const rightRef = useScrollReveal<HTMLDivElement>(150);

  return (
    <section className="py-20 relative overflow-hidden">
      <div className="absolute top-1/2 -right-48 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] -translate-y-1/2" />

      <div className="container mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
        {/* Left */}
        <div ref={leftRef} className="section-reveal space-y-7">
          <span className="inline-block text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full tracking-wide uppercase">
            Why Aje?
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
            Stop Guessing.{" "}
            <span className="text-gradient">Start Growing.</span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Most business owners don't know why they're not making more money. Aje shows you
            exactly what's happening and what to do about it.
          </p>
          <ul className="space-y-4">
            {points.map((p) => (
              <li key={p.text} className="flex items-start gap-3 group">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <CheckCircle2 className="text-primary" size={14} />
                </div>
                <span className="text-muted-foreground text-sm leading-relaxed">{p.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right — animated chart card */}
        <div ref={rightRef} className="section-reveal flex justify-center lg:justify-end">
          <div className="w-full max-w-sm rounded-3xl border bg-card p-6 shadow-2xl glow-primary">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Monthly Profit</p>
                <p className="text-2xl font-bold font-display text-gradient mt-0.5">₦284,000</p>
              </div>
              <div className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-bold px-3 py-1.5 rounded-full">
                <TrendingUp size={12} />
                +28%
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground mb-5">vs last month</p>

            {/* Bar chart */}
            <div className="flex items-end gap-1.5 h-36 mb-3">
              {bars.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-md bg-gradient-brand animate-grow-bar"
                  style={{
                    height: `${h}%`,
                    animationDelay: `${i * 0.07}s`,
                    opacity: 0.3 + (h / 100) * 0.7,
                  }}
                />
              ))}
            </div>

            <div className="flex justify-between text-[10px] text-muted-foreground mb-5">
              <span>Jan</span>
              <span>Apr</span>
              <span>Jul</span>
              <span>Oct</span>
              <span>Dec</span>
            </div>

            {/* Insight row */}
            <div className="rounded-xl bg-accent/60 border border-primary/15 p-3 flex items-start gap-2">
              <span className="text-sm">📈</span>
              <p className="text-[11px] text-accent-foreground leading-relaxed">
                Your best month yet. Q4 sales are up{" "}
                <strong className="text-foreground">41%</strong> compared to Q3.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ValueSection;
