import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  { q: "Do I need accounting knowledge?", a: "Not at all! LoopLink is designed to be simple. Just enter your daily sales and expenses, and we handle the rest." },
  { q: "Is LoopLink free?", a: "Yes! You can get started completely free. We offer premium features for businesses that want deeper insights." },
  { q: "How does it help my business?", a: "LoopLink analyzes your daily business data, identifies problems like overspending, and gives you clear, actionable advice to grow your profit." },
  { q: "Can I use it for any type of business?", a: "Absolutely. Whether you run a shop, freelance, or manage a growing team — LoopLink works for any business." },
];

const FAQSection = () => (
  <section id="faq" className="py-24 bg-gradient-brand-subtle">
    <div className="container mx-auto px-4 max-w-2xl">
      <div className="text-center mb-16 space-y-4">
        <span className="text-sm font-medium text-primary">FAQ</span>
        <h2 className="font-display text-3xl md:text-4xl font-bold">
          Got <span className="text-gradient">questions?</span>
        </h2>
      </div>
      <Accordion type="single" collapsible className="space-y-3">
        {faqs.map((f, i) => (
          <AccordionItem key={i} value={`faq-${i}`} className="rounded-xl border bg-card px-6">
            <AccordionTrigger className="text-left font-medium hover:no-underline">{f.q}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  </section>
);

export default FAQSection;
