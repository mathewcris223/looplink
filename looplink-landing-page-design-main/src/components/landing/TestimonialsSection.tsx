import { Star, Quote } from "lucide-react";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

const testimonials = [
  {
    quote: "This helped me understand my business better in just 3 days. I finally know where my money goes.",
    name: "Adebayo O.",
    role: "Small Business Owner",
    avatar: "AO",
    color: "from-emerald-500 to-teal-500",
  },
  {
    quote: "I didn't know where my money was going until I used Aje. Now I make ₦15k more every week.",
    name: "Chioma N.",
    role: "Shop Owner",
    avatar: "CN",
    color: "from-violet-500 to-purple-500",
  },
  {
    quote: "Simple, clean, and it actually helps me make better decisions. Best tool I've used for my business.",
    name: "Emeka A.",
    role: "Freelancer",
    avatar: "EA",
    color: "from-sky-500 to-blue-500",
  },
];

const TestimonialCard = ({ t, i }: { t: typeof testimonials[0]; i: number }) => {
  const ref = useScrollReveal<HTMLDivElement>(i * 100);
  return (
    <div ref={ref} className="section-reveal gradient-border group p-6 space-y-5 card-hover">
      <Quote size={24} className="text-primary/30" />
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, j) => (
          <Star key={j} size={13} className="fill-amber-400 text-amber-400" />
        ))}
      </div>
      <p className="text-muted-foreground text-sm leading-relaxed">"{t.quote}"</p>
      <div className="flex items-center gap-3 pt-2 border-t border-border/50">
        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
          {t.avatar}
        </div>
        <div>
          <p className="text-sm font-semibold">{t.name}</p>
          <p className="text-xs text-muted-foreground">{t.role}</p>
        </div>
      </div>
    </div>
  );
};

const TestimonialsSection = () => {
  const headRef = useScrollReveal<HTMLDivElement>();

  return (
    <section className="py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-brand-subtle" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/5 blur-[100px]" />

      <div className="container relative mx-auto px-6">
        <div ref={headRef} className="section-reveal text-center mb-16 space-y-4">
          <span className="inline-block text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full tracking-wide uppercase">
            Testimonials
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold">
            Loved by{" "}
            <span className="text-gradient">business owners</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto text-lg">
            Real results from real people growing their businesses with Aje.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.map((t, i) => (
            <TestimonialCard key={t.name} t={t} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
