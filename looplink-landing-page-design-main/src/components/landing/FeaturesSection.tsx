import { BarChart3, Brain, HeartPulse, Lightbulb, Smile, Store } from "lucide-react";

const features = [
  { icon: BarChart3, title: "Smart Daily Tracking", desc: "Quickly record your sales and expenses in seconds" },
  { icon: Lightbulb, title: "Instant Business Insights", desc: "Get clear advice on how to improve your business daily" },
  { icon: HeartPulse, title: "Business Health Score", desc: "See how your business is performing at a glance" },
  { icon: Brain, title: "AI-Powered Suggestions", desc: "Know exactly what to do to increase profit" },
  { icon: Smile, title: "Simple & Stress-Free", desc: "No complex accounting — just clear results" },
  { icon: Store, title: "Works for Any Business", desc: "From small traders to growing businesses" },
];

const FeaturesSection = () => (
  <section id="features" className="py-24 relative">
    <div className="container mx-auto px-4">
      <div className="text-center mb-16 space-y-4">
        <span className="text-sm font-medium text-primary">Features</span>
        <h2 className="font-display text-3xl md:text-4xl font-bold">
          Everything you need to <span className="text-gradient">grow smarter</span>
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Powerful tools designed to make business management effortless.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f, i) => (
          <div
            key={f.title}
            className="group rounded-2xl border bg-card p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-brand-subtle text-primary group-hover:bg-gradient-brand group-hover:text-primary-foreground transition-all duration-300">
              <f.icon size={24} />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2">{f.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection;
