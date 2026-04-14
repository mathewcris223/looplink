import { Link } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft } from "lucide-react";

const faqs = [
  {
    q: "Do I need accounting knowledge to use LoopLink?",
    a: "Not at all. LoopLink is built for everyday business owners, not accountants. Just enter your daily sales and expenses — we handle all the analysis and give you plain-language advice.",
  },
  {
    q: "Is LoopLink free?",
    a: "Yes! You can get started completely free. We offer a generous free plan, and premium features are available for businesses that want deeper insights and advanced AI recommendations.",
  },
  {
    q: "How exactly does LoopLink help my business?",
    a: "LoopLink analyzes your daily data, spots problems like overspending or declining sales, and gives you specific, actionable steps to improve. Think of it as a business advisor in your pocket.",
  },
  {
    q: "Can I use it for any type of business?",
    a: "Absolutely. Whether you run a market stall, a shop, freelance, or manage a growing team — LoopLink adapts to your business type and size.",
  },
  {
    q: "How is LoopLink different from a spreadsheet or accounting app?",
    a: "Spreadsheets and accounting apps show you numbers. LoopLink tells you what those numbers mean and what to do about them. It's the difference between data and decisions.",
  },
  {
    q: "Is my business data safe?",
    a: "Yes. Your data is encrypted and never shared with third parties. We take privacy seriously — your business information belongs to you.",
  },
];

const FAQ = () => (
  <div className="min-h-screen bg-background">
    {/* Simple top bar */}
    <header className="border-b glass sticky top-0 z-50">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="font-display text-xl font-bold text-gradient">
          LoopLink
        </Link>
        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={15} />
          Back to Home
        </Link>
      </div>
    </header>

    <main className="container mx-auto px-6 py-20 max-w-2xl">
      {/* Header */}
      <div className="text-center mb-14 space-y-4 animate-fade-up">
        <span className="inline-block text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full tracking-wide uppercase">
          FAQ
        </span>
        <h1 className="font-display text-4xl md:text-5xl font-bold">
          Got <span className="text-gradient">questions?</span>
        </h1>
        <p className="text-muted-foreground text-lg">
          Everything you need to know about LoopLink.
        </p>
      </div>

      {/* Accordion */}
      <Accordion type="single" collapsible className="space-y-3">
        {faqs.map((f, i) => (
          <AccordionItem
            key={i}
            value={`faq-${i}`}
            className="rounded-2xl border bg-card px-6 shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <AccordionTrigger className="text-left font-semibold hover:no-underline py-5 text-sm md:text-base">
              {f.q}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground text-sm leading-relaxed pb-5">
              {f.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Back CTA */}
      <div className="mt-14 text-center">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft size={14} />
          Back to LoopLink
        </Link>
      </div>
    </main>
  </div>
);

export default FAQ;
