import { Star } from "lucide-react";

const testimonials = [
  { quote: "This helped me understand my business better in just 3 days.", name: "Adebayo O.", role: "Small Business Owner" },
  { quote: "I didn't know where my money was going until I used LoopLink.", name: "Chioma N.", role: "Shop Owner" },
  { quote: "Simple, clean, and it actually helps me make better decisions.", name: "Emeka A.", role: "Freelancer" },
];

const TestimonialsSection = () => (
  <section className="py-24">
    <div className="container mx-auto px-4">
      <div className="text-center mb-16 space-y-4">
        <span className="text-sm font-medium text-primary">What People Say</span>
        <h2 className="font-display text-3xl md:text-4xl font-bold">
          Loved by <span className="text-gradient">business owners</span>
        </h2>
      </div>
      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {testimonials.map((t) => (
          <div key={t.name} className="rounded-2xl border bg-card p-6 space-y-4 hover:shadow-lg transition-shadow duration-300">
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={14} className="fill-primary text-primary" />
              ))}
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">"{t.quote}"</p>
            <div>
              <p className="text-sm font-semibold">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.role}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default TestimonialsSection;
