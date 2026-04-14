import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const CTASection = () => (
  <section className="py-24 relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-brand opacity-5" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
    <div className="container relative mx-auto px-4 text-center space-y-8 max-w-2xl">
      <h2 className="font-display text-3xl md:text-4xl font-bold">
        Start Taking Control of{" "}
        <span className="text-gradient">Your Business Today</span>
      </h2>
      <p className="text-muted-foreground">
        Join thousands of business owners who are growing smarter with LoopLink.
      </p>
      <Button variant="hero" size="lg" className="text-base animate-pulse-glow">
        Get Started Free <ArrowRight size={18} />
      </Button>
    </div>
  </section>
);

export default CTASection;
