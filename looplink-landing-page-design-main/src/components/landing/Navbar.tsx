import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <a href="#" className="font-display text-xl font-bold text-gradient">LoopLink</a>
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
          <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
          <Button variant="hero" size="sm">Get Started Free</Button>
        </div>
        <button className="md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      {open && (
        <div className="md:hidden glass border-t px-4 pb-4 flex flex-col gap-3 animate-fade-up">
          <a href="#features" className="py-2 text-sm text-muted-foreground" onClick={() => setOpen(false)}>Features</a>
          <a href="#how-it-works" className="py-2 text-sm text-muted-foreground" onClick={() => setOpen(false)}>How It Works</a>
          <a href="#faq" className="py-2 text-sm text-muted-foreground" onClick={() => setOpen(false)}>FAQ</a>
          <Button variant="hero" size="sm" className="w-full">Get Started Free</Button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
