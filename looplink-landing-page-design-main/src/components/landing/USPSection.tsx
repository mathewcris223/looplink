import { Zap, ArrowRight } from "lucide-react";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

const comparisons = [
  { label: "Accounting apps", desc: "Show you what happened", icon: "📊" },
  { label: "Aje", desc: "Tell you what to do next", icon: "🧠", highlight: true },
];

const USPSection = () => {
  const ref = useScrollReveal<HTMLDivElement>();

  return (
    <section className="py-28 relative overflow-hidden">
      {/* Full-bleed gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-secondary/8" />
      <div className="absolute inset-0 bg-gradient-brand opacity-[0.04]" />

      <div className="container relative mx-auto px-6">
        <div ref={ref} className="section-reveal max-w-4xl mx-auto text-center space-y-10">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-brand text-primary-foreground shadow-xl glow-primary-sm mx-auto">
            <Zap size={28} />
          </div>

          {/* Headline */}
          <div className="space-y-4">
            <span className="inline-block text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full tracking-wide uppercase">
              Our Difference
            </span>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
              Not an accounting app.{" "}
              <span className="text-gradient">A business decision assistant.</span>
            </h2>
          </div>

          {/* Comparison cards */}
          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {comparisons.map((c) => (
              <div
                key={c.label}
                className={`rounded-2xl p-6 text-left transition-all duration-300 ${
                  c.highlight
                    ? "bg-gradient-brand text-primary-foreground shadow-xl glow-primary scale-105"
                    : "bg-card border text-muted-foreground opacity-70"
                }`}
              >
                <span className="text-2xl mb-3 block">{c.icon}</span>
                <p className={`text-sm font-semibold mb-1 ${c.highlight ? "text-primary-foreground" : "text-foreground"}`}>
                  {c.label}
                </p>
                <p className={`text-sm ${c.highlight ? "text-primary-foreground/80" : ""}`}>
                  {c.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Pull quote */}
          <div className="relative rounded-3xl border border-primary/20 bg-card/80 backdrop-blur p-8 max-w-2xl mx-auto shadow-xl">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-brand text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
              <Zap size={11} /> The Aje Promise
            </div>
            <p className="text-xl md:text-2xl font-display font-semibold leading-snug text-foreground">
              "Aje tells you{" "}
              <span className="text-gradient font-bold">what to do</span> — not just what happened."
            </p>
            <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
              <ArrowRight size={14} className="text-primary" />
              Actionable. Clear. Instant.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default USPSection;
