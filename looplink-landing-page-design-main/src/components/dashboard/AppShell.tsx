import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, BarChart3, Brain, History,
  LogOut, Menu, X, ChevronDown, Plus, Building2, MessageSquare
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
  { path: "/chat", icon: MessageSquare, label: "AI Chat" },
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
      <div className="px-5 py-4 border-b flex items-center justify-between">
        <span className="font-display text-xl font-bold text-gradient">LoopLink</span>
        {/* Close button — mobile only */}
        <button
          className="md:hidden p-1.5 rounded-lg hover:bg-muted transition-colors"
          onClick={() => setSidebarOpen(false)}
        >
          <X size={18} />
        </button>
      </div>

      {/* Business switcher */}
      <div className="px-4 py-3 border-b">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Active Business</p>
        <button
          onClick={() => setBizDropdown(!bizDropdown)}
          className="w-full flex items-center justify-between gap-2 rounded-xl bg-muted/60 px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors min-h-[44px]"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Building2 size={14} className="text-primary shrink-0" />
            <span className="truncate">{activeBusiness?.name ?? "Select business"}</span>
          </div>
          <ChevronDown size={14} className={`shrink-0 transition-transform ${bizDropdown ? "rotate-180" : ""}`} />
        </button>

        {bizDropdown && (
          <div className="mt-1 rounded-xl border bg-card shadow-lg overflow-hidden z-50">
            {businesses.map(b => (
              <button
                key={b.id}
                onClick={() => { onSelectBusiness(b); setBizDropdown(false); }}
                className={`w-full text-left px-3 py-3 text-sm hover:bg-muted transition-colors flex items-center gap-2 min-h-[44px] ${activeBusiness?.id === b.id ? "text-primary font-medium" : ""}`}
              >
                <Building2 size={13} />
                <span className="truncate">{b.name}</span>
              </button>
            ))}
            <button
              onClick={() => { onAddBusiness(); setBizDropdown(false); }}
              className="w-full text-left px-3 py-3 text-sm text-primary hover:bg-primary/5 transition-colors flex items-center gap-2 border-t min-h-[44px]"
            >
              <Plus size={13} />
              Add new business
            </button>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 min-h-[44px] ${
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
          <div className="w-9 h-9 rounded-full bg-gradient-brand flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
            {user?.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full justify-start gap-2 text-muted-foreground min-h-[44px]">
          <LogOut size={14} /> Log out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/3 via-background to-secondary/3 flex overflow-x-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 lg:w-64 border-r bg-card/80 backdrop-blur shrink-0 sticky top-0 h-screen overflow-y-auto">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-72 max-w-[85vw] bg-card h-full shadow-2xl overflow-y-auto">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Mobile topbar */}
        <header className="md:hidden border-b glass sticky top-0 z-40 px-4 h-14 flex items-center justify-between shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-muted min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <Menu size={20} />
          </button>
          <span className="font-display font-bold text-gradient">LoopLink</span>
          <div className="w-10" />
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 w-full max-w-6xl mx-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppShell;
