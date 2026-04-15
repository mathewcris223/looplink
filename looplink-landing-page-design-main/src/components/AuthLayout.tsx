import { Link } from "react-router-dom";
import { ReactNode } from "react";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

const AuthLayout = ({ title, subtitle, children, footer }: AuthLayoutProps) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 px-4 relative overflow-hidden">
    {/* Background blobs */}
    <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-primary/8 blur-[100px] pointer-events-none" />
    <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-secondary/8 blur-[100px] pointer-events-none" />

    <div className="w-full max-w-md animate-fade-up">
      {/* Logo */}
      <div className="text-center mb-8">
        <Link to="/" className="font-display text-2xl font-bold text-gradient inline-block">
          LoopLink
        </Link>
      </div>

      {/* Card */}
      <div className="rounded-3xl border bg-card/90 backdrop-blur-xl shadow-2xl p-8 space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="font-display text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        {children}
      </div>

      {/* Footer link */}
      <div className="text-center mt-5 text-sm text-muted-foreground">{footer}</div>
    </div>
  </div>
);

export default AuthLayout;
