import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, BarChart3, Brain, History,
  LogOut, Menu, X, ChevronDown, Plus, Building2
} from "lucide-react";
import { Business } from "@/lib/db";

interface AppShellProps {
  children: React.ReactNode;
  businesses: Business[];
  activeBusiness: Business | null;
  onSelectBusiness: (b: Business) => void;
  onAddBusiness: () => void;
}

const navItems = [
  { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/analytics", icon: BarChart3, label: "Analytics" },
  { path: "/coach", icon: Brain, label: "AI Coach" },
  { path: "/history", icon: History, label: "History" },
];

const AppShell = ({ children, businesses, activeBusiness, onSelectBusiness, onAddBusiness }: AppShellProps) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bizDropdown, setBizDropdown] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b">
        <span className="font-display text-xl font-bold text-gradient">LoopLink</span>
      </div>

      {/* Business switcher */}
      <div className="px-4 py-4 border-b">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Active Business</p>
        <button
          onClick={() => setBizDropdown(!bizDropdown)}
          className="w-full flex items-center justify-between gap-2 rounded-xl bg-muted/60 px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Building2 size={14} className="text-primary shrink-0" />
            <span className="truncate">{activeBusiness?.name ?? "Select business"}</span>
          </div>
          <ChevronDown size={14} className={`shrink-0 transition-transform ${bizDropdown ? "rotate-180" : ""}`} />
        </button>

        {bizDropdown && (
          <div className="mt-1 rounded-xl border bg-card shadow-lg overflow-hidden">
            {businesses.map(b => (
              <button
                key={b.id}
                onClick={() => { onSelectBusiness(b); setBizDropdown(false); }}
                className={`w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors flex items-center gap-2 ${activeBusiness?.id === b.id ? "text-primary font-medium" : ""}`}
              >
                <Building2 size={13} />
                <span className="truncate">{b.name}</span>
              </button>
            ))}
            <button
              onClick={() => { onAddBusiness(); setBizDropdown(false); }}
              className="w-full text-left px-3 py-2.5 text-sm text-primary hover:bg-primary/5 transition-colors flex items-center gap-2 border-t"
            >
              <Plus size={13} />
              Add new business
            </button>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {navItems.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Icon size={17} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
            {user?.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full justify-start gap-2 text-muted-foreground">
          <LogOut size={14} /> Log out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/3 via-background to-secondary/3 flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r bg-card/80 backdrop-blur shrink-0 sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-72 bg-card h-full shadow-2xl">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <header className="md:hidden border-b glass sticky top-0 z-40 px-4 h-14 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-muted">
            <Menu size={20} />
          </button>
          <span className="font-display font-bold text-gradient">LoopLink</span>
          <div className="w-8" />
        </header>

        <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppShell;
