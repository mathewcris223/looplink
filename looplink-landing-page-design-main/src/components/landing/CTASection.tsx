import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

const CTASection = () => {
  const ref = useScrollReveal<HTMLDivElement>();
  const navigate = useNavigate();

  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full bg-primary/8 blur-[120px]" />

      {/* Decorative rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-primary/10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full border border-primary/5" />

      <div className="container relative mx-auto px-6">
        <div ref={ref} className="section-reveal max-w-3xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-4 py-1.5 rounded-full">
            <Sparkles size={12} />
            Free to get started — no credit card needed
          </div>

          {/* Headline */}
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
            Start Taking Control of{" "}
            <span className="text-gradient">Your Business Today</span>
          </h2>

          <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
            Join thousands of business owners who stopped guessing and started growing with Aje.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              variant="hero"
              size="lg"
              className="text-base rounded-full px-10 py-6 animate-pulse-glow hover:scale-105 transition-transform duration-200 text-lg"
              onClick={() => navigate("/signup")}
            >
              Get Started Free <ArrowRight size={20} />
            </Button>
            <p className="text-xs text-muted-foreground">
              ✓ Free forever plan &nbsp;·&nbsp; ✓ No setup required &nbsp;·&nbsp; ✓ Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
