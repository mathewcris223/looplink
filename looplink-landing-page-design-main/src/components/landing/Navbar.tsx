import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "glass shadow-sm border-b" : "bg-transparent border-transparent"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between h-16 px-6">
        <a href="#" className="font-display text-xl font-bold text-gradient">
          LoopLink
        </a>

        <div className="hidden md:flex items-center gap-8">
          {["Features", "How It Works"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/ /g, "-")}`}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 relative group"
            >
              {item}
              <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-gradient-brand transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
          <button
            onClick={() => navigate("/login")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            Log in
          </button>
          <Button
            variant="hero"
            size="sm"
            className="rounded-full px-5"
            onClick={() => navigate("/signup")}
          >
            Get Started Free
          </Button>
        </div>

        <button
          className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden glass border-t px-6 pb-5 pt-3 flex flex-col gap-1 animate-fade-up">
          {["Features", "How It Works"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/ /g, "-")}`}
              className="py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setOpen(false)}
            >
              {item}
            </a>
          ))}
          <button
            onClick={() => { setOpen(false); navigate("/login"); }}
            className="py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors text-left"
          >
            Log in
          </button>
          <Button variant="hero" size="sm" className="w-full mt-2 rounded-full" onClick={() => navigate("/signup")}>
            Get Started Free
          </Button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
