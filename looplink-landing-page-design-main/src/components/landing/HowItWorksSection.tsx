import { ClipboardEdit, LineChart, Sparkles } from "lucide-react";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

const steps = [
  {
    icon: ClipboardEdit,
    title: "Enter Your Data",
    desc: "Log your daily sales and expenses in under 30 seconds. No forms, no complexity.",
    number: "01",
  },
  {
    icon: LineChart,
    title: "LoopLink Analyzes",
    desc: "Our AI instantly processes your data and identifies patterns, trends, and problems.",
    number: "02",
  },
  {
    icon: Sparkles,
    title: "Get Smart Advice",
    desc: "Receive clear, actionable recommendations to cut costs and grow your profit.",
    number: "03",
  },
];

const StepCard = ({ s, i }: { s: typeof steps[0]; i: number }) => {
  const ref = useScrollReveal<HTMLDivElement>(i * 150);
  return (
    <div ref={ref} className="section-reveal relative text-center space-y-5">
      <div className="relative mx-auto w-fit">
        <div className="w-28 h-28 rounded-3xl bg-gradient-brand flex items-center justify-center shadow-xl glow-primary-sm mx-auto transition-transform duration-300 hover:scale-105">
          <s.icon size={36} className="text-primary-foreground" />
        </div>
        <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-card border-2 border-primary flex items-center justify-center text-xs font-bold text-primary shadow-md">
          {i + 1}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-[10px] font-bold tracking-[0.2em] text-primary/60 uppercase">
          Step {s.number}
        </p>
        <h3 className="font-display font-bold text-xl">{s.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{s.desc}</p>
      </div>
    </div>
  );
};

const HowItWorksSection = () => {
  const headRef = useScrollReveal<HTMLDivElement>();

  return (
    <section id="how-it-works" className="py-20 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-brand-subtle" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/8 rounded-full blur-[100px]" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/8 rounded-full blur-[100px]" />

      <div className="container relative mx-auto px-6">
        <div ref={headRef} className="section-reveal text-center mb-20 space-y-4">
          <span className="inline-block text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full tracking-wide uppercase">
            How It Works
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold">
            Three steps to{" "}
            <span className="text-gradient">smarter decisions</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto text-lg">
            From data entry to actionable insight in seconds.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connecting line — desktop only */}
          <div className="hidden md:block absolute top-14 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-px">
            <div className="h-full step-line opacity-30" />
            {/* Animated dot */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary shadow-lg glow-primary-sm"
              style={{ animation: "shimmer 3s linear infinite", left: "0%" }}
            />
          </div>

          {steps.map((s, i) => (
            <StepCard key={s.title} s={s} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
