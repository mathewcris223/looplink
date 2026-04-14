import { BarChart3, Brain, HeartPulse, Lightbulb, Smile, Store } from "lucide-react";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

const features = [
  {
    icon: BarChart3,
    title: "Smart Daily Tracking",
    desc: "Record sales and expenses in seconds. No spreadsheets, no stress.",
    color: "from-emerald-500/20 to-emerald-500/5",
    iconColor: "text-emerald-500",
  },
  {
    icon: Lightbulb,
    title: "Instant Business Insights",
    desc: "Get clear, plain-language advice on how to improve your business every day.",
    color: "from-amber-500/20 to-amber-500/5",
    iconColor: "text-amber-500",
  },
  {
    icon: HeartPulse,
    title: "Business Health Score",
    desc: "See your business performance at a glance with a simple health score.",
    color: "from-rose-500/20 to-rose-500/5",
    iconColor: "text-rose-500",
  },
  {
    icon: Brain,
    title: "AI-Powered Suggestions",
    desc: "Know exactly what to do next to increase profit — powered by AI.",
    color: "from-violet-500/20 to-violet-500/5",
    iconColor: "text-violet-500",
  },
  {
    icon: Smile,
    title: "Simple & Stress-Free",
    desc: "No accounting degree needed. Just clear results you can act on.",
    color: "from-sky-500/20 to-sky-500/5",
    iconColor: "text-sky-500",
  },
  {
    icon: Store,
    title: "Works for Any Business",
    desc: "From market traders to growing teams — LoopLink adapts to you.",
    color: "from-primary/20 to-primary/5",
    iconColor: "text-primary",
  },
];

const FeatureCard = ({ f, i }: { f: typeof features[0]; i: number }) => {
  const ref = useScrollReveal<HTMLDivElement>(i * 80);
  return (
    <div
      ref={ref}
      className="section-reveal gradient-border group p-6 cursor-default card-hover"
    >
      <div
        className={`mb-5 inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br ${f.color} transition-transform duration-300 group-hover:scale-110`}
      >
        <f.icon size={22} className={f.iconColor} />
      </div>
      <h3 className="font-display font-semibold text-lg mb-2">{f.title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
    </div>
  );
};

const FeaturesSection = () => {
  const headRef = useScrollReveal<HTMLDivElement>();

  return (
    <section id="features" className="py-28 relative">
      <div className="container mx-auto px-6">
        <div ref={headRef} className="section-reveal text-center mb-16 space-y-4">
          <span className="inline-block text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full tracking-wide uppercase">
            Features
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold">
            Everything you need to{" "}
            <span className="text-gradient">grow smarter</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto text-lg">
            Powerful tools designed to make business management effortless.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <FeatureCard key={f.title} f={f} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
