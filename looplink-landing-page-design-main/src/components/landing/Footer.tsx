import { Link } from "react-router-dom";
import { Mail, Twitter, Instagram, Linkedin } from "lucide-react";

const Footer = () => (
  <footer className="border-t bg-card/50 backdrop-blur">
    <div className="container mx-auto px-6 py-14">
      <div className="grid md:grid-cols-4 gap-10 mb-10">
        {/* Brand */}
        <div className="md:col-span-2 space-y-4">
          <span className="font-display text-2xl font-bold text-gradient">LoopLink</span>
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            Your smart business assistant for daily tracking, AI-powered insights, and consistent
            profit growth.
          </p>
          <div className="flex gap-3">
            {[
              { icon: Twitter, href: "#", label: "Twitter" },
              { icon: Instagram, href: "#", label: "Instagram" },
              { icon: Linkedin, href: "#", label: "LinkedIn" },
            ].map(({ icon: Icon, href, label }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="w-9 h-9 rounded-full border bg-card flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors duration-200"
              >
                <Icon size={15} />
              </a>
            ))}
          </div>
        </div>

        {/* Product links */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold">Product</h4>
          <div className="flex flex-col gap-2.5 text-sm text-muted-foreground">
            <Link to="/faq" className="hover:text-foreground transition-colors w-fit">FAQ</Link>
            <a href="/#how-it-works" className="hover:text-foreground transition-colors w-fit">How It Works</a>
            <a href="mailto:hello@looplink.app" className="hover:text-foreground transition-colors w-fit">Contact</a>
            <a href="#" className="hover:text-foreground transition-colors w-fit">Terms</a>
          </div>
        </div>

        {/* Contact */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold">Contact</h4>
          <a
            href="mailto:hello@looplink.app"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            <Mail size={15} />
            hello@looplink.app
          </a>
        </div>
      </div>

      <div className="border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} LoopLink. All rights reserved.</span>
        <div className="flex gap-4">
          <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
          <a href="#" className="hover:text-foreground transition-colors">Terms</a>
          <Link to="/faq" className="hover:text-foreground transition-colors">FAQ</Link>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
