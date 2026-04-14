import { CheckCircle2 } from "lucide-react";

const points = [
  "Know if you're making or losing money",
  "Detect problems before they get worse",
  "Make smarter business decisions",
  "Grow your profit consistently",
];

const ValueSection = () => (
  <section className="py-24">
    <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-16 items-center">
      <div className="space-y-6">
        <span className="text-sm font-medium text-primary">Why LoopLink?</span>
        <h2 className="font-display text-3xl md:text-4xl font-bold">
          Stop Guessing.{" "}
          <span className="text-gradient">Start Growing.</span>
        </h2>
        <ul className="space-y-4">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-3">
              <CheckCircle2 className="text-primary shrink-0 mt-0.5" size={20} />
              <span className="text-muted-foreground">{p}</span>
            </li>
          ))}
        </ul>
      </div>
      {/* Animated chart mockup */}
      <div className="flex justify-center">
        <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm font-medium text-muted-foreground">Monthly Profit</span>
            <span className="text-xs text-primary font-medium">+28%</span>
          </div>
          <div className="flex items-end gap-3 h-40">
            {[35, 45, 40, 55, 65, 60, 80, 75, 90, 85, 95, 100].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-md bg-gradient-brand animate-grow-bar"
                style={{ height: `${h}%`, animationDelay: `${i * 0.08}s`, opacity: 0.4 + (h / 100) * 0.6 }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
            <span>Jan</span><span>Jun</span><span>Dec</span>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default ValueSection;
