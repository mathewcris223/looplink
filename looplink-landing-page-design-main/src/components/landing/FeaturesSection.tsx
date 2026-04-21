import { BarChart3, Bot, Package, Flame } from "lucide-react";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

const features = [
  {
    icon: BarChart3,
    title: "Smart Accounting",
    desc: "Track income and expenses with ease and understand your business performance.",
    color: "from-emerald-500/20 to-emerald-500/5",
    iconColor: "text-emerald-500",
  },
  {
    icon: Bot,
    title: "AI Chat Assistant",
    desc: "Ask questions about your business and get instant intelligent insights.",
    color: "from-violet-500/20 to-violet-500/5",
    iconColor: "text-violet-500",
  },
  {
    icon: Package,
    title: "Inventory Management",
    desc: "Monitor stock, manage products, and avoid running out of items.",
    color: "from-blue-500/20 to-blue-500/5",
    iconColor: "text-blue-500",
  },
  {
    icon: Flame,
    title: "Daily Money Challenge",
    desc: "Improve your financial knowledge daily and build smart money habits.",
    color: "from-amber-500/20 to-amber-500/5",
    iconColor: "text-amber-500",
  },
];

const FeatureCard = ({ f, i }: { f: typeof features[0]; i: number }) => {
  const ref = useScrollReveal<HTMLDivElement>(i * 80);
  return (
    <div ref={ref} className="section-reveal gradient-border group p-6 cursor-default card-hover">
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
    <section id="features" className="py-20 relative">
      <div className="container mx-auto px-6">
        <div ref={headRef} className="section-reveal text-center mb-12 space-y-3">
          <span className="inline-block text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full tracking-wide uppercase">
            Features
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold">
            Everything you need to{" "}
            <span className="text-gradient">run your business</span>
          </h2>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Powerful tools built for real business owners — simple, mobile-friendly, and easy to use.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5 max-w-3xl mx-auto mb-10">
          {features.map((f, i) => (
            <FeatureCard key={f.title} f={f} i={i} />
          ))}
        </div>

        {/* Benefits row */}
        <div className="flex flex-wrap justify-center gap-4 max-w-2xl mx-auto">
          {["Easy to use", "Mobile friendly", "Built for real business owners"].map(b => (
            <div key={b} className="flex items-center gap-2 bg-card border rounded-full px-4 py-2 text-sm font-medium shadow-sm">
              <span className="text-emerald-500">✓</span> {b}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
