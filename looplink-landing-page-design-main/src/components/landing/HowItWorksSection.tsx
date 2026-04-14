import { ClipboardEdit, LineChart, Sparkles } from "lucide-react";

const steps = [
  { icon: ClipboardEdit, title: "Enter Your Data", desc: "Enter your daily sales and expenses in seconds" },
  { icon: LineChart, title: "LoopLink Analyzes", desc: "LoopLink instantly analyzes your business performance" },
  { icon: Sparkles, title: "Get Smart Advice", desc: "Get instant advice and actionable insights" },
];

const HowItWorksSection = () => (
  <section id="how-it-works" className="py-24 bg-gradient-brand-subtle">
    <div className="container mx-auto px-4">
      <div className="text-center mb-16 space-y-4">
        <span className="text-sm font-medium text-primary">How It Works</span>
        <h2 className="font-display text-3xl md:text-4xl font-bold">
          Three simple steps to <span className="text-gradient">smarter decisions</span>
        </h2>
      </div>
      <div className="grid md:grid-cols-3 gap-8 relative">
        {/* Connecting line */}
        <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-0.5 bg-gradient-brand opacity-20" />
        {steps.map((s, i) => (
          <div key={s.title} className="text-center space-y-4 relative">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-brand flex items-center justify-center text-primary-foreground shadow-lg glow-primary-sm">
              <s.icon size={28} />
            </div>
            <div className="absolute -top-2 -right-2 md:top-0 md:right-auto md:left-1/2 md:-translate-x-1/2 md:-top-3 w-7 h-7 rounded-full bg-card border-2 border-primary flex items-center justify-center text-xs font-bold text-primary">
              {i + 1}
            </div>
            <h3 className="font-display font-semibold text-lg">{s.title}</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorksSection;
