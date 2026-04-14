import { Zap } from "lucide-react";

const USPSection = () => (
  <section className="py-24 bg-gradient-brand-subtle">
    <div className="container mx-auto px-4 text-center max-w-3xl space-y-8">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-brand text-primary-foreground mx-auto">
        <Zap size={32} />
      </div>
      <h2 className="font-display text-3xl md:text-4xl font-bold">
        Not an accounting app.{" "}
        <span className="text-gradient">A business decision assistant.</span>
      </h2>
      <div className="rounded-2xl border bg-card p-8 shadow-lg max-w-lg mx-auto">
        <p className="text-lg text-muted-foreground leading-relaxed">
          LoopLink tells you <strong className="text-foreground">what to do</strong> — not just what happened.
        </p>
      </div>
    </div>
  </section>
);

export default USPSection;
