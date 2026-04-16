import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard, BarChart3, Brain, History,
  LogOut, Menu, X, ChevronDown, Plus, Building2, MessageSquare, Package, Zap
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
  { path: "/inventory", icon: Package, label: "Inventory" },
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

  const handleLogout = async () => { await logout(); navigate("/"); };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-brand flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-display text-lg font-bold text-white tracking-tight">LoopLink</span>
        </div>
        <button className="md:hidden p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
          onClick={() => setSidebarOpen(false)}>
          <X size={16} />
        </button>
      </div>

      {/* Business switcher */}
      <div className="px-4 pb-4 border-b border-white/8">
        <button onClick={() => setBizDropdown(!bizDropdown)}
          className="w-full flex items-center justify-between gap-2 rounded-xl bg-white/8 hover:bg-white/12 px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px] text-white/80 hover:text-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-gradient-brand flex items-center justify-center shrink-0">
              <Building2 size={12} className="text-white" />
            </div>
            <span className="truncate text-sm">{activeBusiness?.name ?? "Select business"}</span>
          </div>
          <ChevronDown size={13} className={`shrink-0 transition-transform text-white/40 ${bizDropdown ? "rotate-180" : ""}`} />
        </button>

        {bizDropdown && (
          <div className="mt-1.5 rounded-xl border border-white/10 bg-[hsl(222,47%,12%)] shadow-2xl overflow-hidden">
            {businesses.map(b => (
              <button key={b.id} onClick={() => { onSelectBusiness(b); setBizDropdown(false); }}
                className={`w-full text-left px-3 py-2.5 text-sm hover:bg-white/8 transition-colors flex items-center gap-2 min-h-[40px] ${activeBusiness?.id === b.id ? "text-[hsl(var(--sidebar-primary))] font-semibold" : "text-white/70"}`}>
                <Building2 size={12} />
                <span className="truncate">{b.name}</span>
              </button>
            ))}
            <button onClick={() => { onAddBusiness(); setBizDropdown(false); }}
              className="w-full text-left px-3 py-2.5 text-sm text-[hsl(var(--sidebar-primary))] hover:bg-white/8 transition-colors flex items-center gap-2 border-t border-white/8 min-h-[40px]">
              <Plus size={12} /> Add business
            </button>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25 px-3 mb-2">Menu</p>
        {navItems.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path;
          return (
            <Link key={path} to={path} onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 min-h-[44px] ${
                active
                  ? "bg-[hsl(var(--sidebar-primary)/0.18)] text-[hsl(var(--sidebar-primary))] font-semibold"
                  : "text-white/50 hover:text-white/90 hover:bg-white/6"
              }`}>
              <Icon size={16} className={active ? "text-[hsl(var(--sidebar-primary))]" : "text-white/40"} />
              {label}
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[hsl(var(--sidebar-primary))]" />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-white/8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-brand flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user?.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white/90 truncate">{user?.name}</p>
            <p className="text-[11px] text-white/35 truncate">{user?.email}</p>
          </div>
          <button onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-white/10 text-white/35 hover:text-white/70 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
            title="Log out">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex overflow-x-hidden">
      {/* Desktop sidebar — dark navy */}
      <aside className="hidden md:flex flex-col w-56 lg:w-60 shrink-0 sticky top-0 h-screen overflow-y-auto sidebar-surface">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 max-w-[82vw] h-full shadow-2xl overflow-y-auto sidebar-surface">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Mobile topbar */}
        <header className="md:hidden border-b bg-card/95 backdrop-blur sticky top-0 z-40 px-4 h-14 flex items-center justify-between shrink-0">
          <button onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
            <Menu size={19} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-brand flex items-center justify-center">
              <Zap size={12} className="text-white" />
            </div>
            <span className="font-display font-bold text-sm">LoopLink</span>
          </div>
          <div className="w-10" />
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 w-full max-w-6xl mx-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppShell;
