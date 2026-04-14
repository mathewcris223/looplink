import { Mail } from "lucide-react";

const Footer = () => (
  <footer className="border-t py-12">
    <div className="container mx-auto px-4">
      <div className="grid md:grid-cols-3 gap-8 mb-8">
        <div className="space-y-3">
          <span className="font-display text-xl font-bold text-gradient">LoopLink</span>
          <p className="text-sm text-muted-foreground">Your smart business assistant for daily tracking, insights, and growth.</p>
        </div>
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Links</h4>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
          </div>
        </div>
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Contact</h4>
          <a href="mailto:hello@looplink.app" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Mail size={16} /> hello@looplink.app
          </a>
        </div>
      </div>
      <div className="border-t pt-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} LoopLink. All rights reserved.
      </div>
    </div>
  </footer>
);

export default Footer;
