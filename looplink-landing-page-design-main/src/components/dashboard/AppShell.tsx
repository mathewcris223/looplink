import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useBusiness } from "@/context/BusinessContext";
import FastAddModal from "@/components/dashboard/FastAddModal";
import SmartAddModal from "@/components/dashboard/SmartAddModal";
import QuickSellModal from "@/components/dashboard/QuickSellModal";
import AddBusinessModal from "@/components/dashboard/AddBusinessModal";
import AjeLogo from "@/components/ui/AjeLogo";
import {
  Home, History, Package, Plus,
  LogOut, X, ChevronDown, Building2, Settings, User
} from "lucide-react";
import { Business } from "@/lib/db";

interface AppShellProps {
  children: React.ReactNode;
  businesses: Business[];
  activeBusiness: Business | null;
  onSelectBusiness: (b: Business) => void;
}

const navItems = [
  { path: "/today", icon: Home, label: "Money" },
  { path: "/stock", icon: Package, label: "Stock" },
  { path: "/history", icon: History, label: "History" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

interface SidebarContentProps {
  user: { name?: string; email?: string } | null;
  businesses: Business[];
  activeBusiness: Business | null;
  onSelectBusiness: (b: Business) => void;
  bizDropdown: boolean;
  setBizDropdown: (v: boolean) => void;
  setSidebarOpen: (v: boolean) => void;
  setShowAddBiz: (v: boolean) => void;
  handleLogout: () => void;
}

// Defined OUTSIDE AppShell to prevent remount on every render
const SidebarContent = ({
  user, businesses, activeBusiness, onSelectBusiness,
  bizDropdown, setBizDropdown, setSidebarOpen, setShowAddBiz, handleLogout
}: SidebarContentProps) => {
  const location = useLocation();
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-6 pb-5 flex items-center justify-between">
        <AjeLogo variant="light" size={28} />
        <button className="md:hidden p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
          onClick={() => setSidebarOpen(false)}>
          <X size={16} />
        </button>
      </div>

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
            <button onClick={() => { setShowAddBiz(true); setBizDropdown(false); }}
              className="w-full text-left px-3 py-2.5 text-sm text-[hsl(var(--sidebar-primary))] hover:bg-white/8 transition-colors flex items-center gap-2 border-t border-white/8 min-h-[40px]">
              <Plus size={12} /> Add business
            </button>
          </div>
        )}
      </div>

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
};

const AppShell = ({ children, businesses, activeBusiness, onSelectBusiness }: AppShellProps) => {
  const { user, logout } = useAuth();
  const { refreshBusinesses } = useBusiness();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bizDropdown, setBizDropdown] = useState(false);
  const [showSmartAdd, setShowSmartAdd] = useState(false);
  const [showAddBiz, setShowAddBiz] = useState(false);
  const [showQuickSell, setShowQuickSell] = useState(false);

  const handleLogout = async () => { await logout(); navigate("/"); };

  const sidebarProps: SidebarContentProps = {
    user,
    businesses,
    activeBusiness,
    onSelectBusiness,
    bizDropdown,
    setBizDropdown,
    setSidebarOpen,
    setShowAddBiz,
    handleLogout,
  };

  return (
    <div className="min-h-screen bg-background flex overflow-x-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 lg:w-60 shrink-0 sticky top-0 h-screen overflow-y-auto sidebar-surface">
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 max-w-[82vw] h-full shadow-2xl overflow-y-auto sidebar-surface">
            <SidebarContent {...sidebarProps} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Mobile topbar */}
        <header className="md:hidden border-b bg-card/95 backdrop-blur sticky top-0 z-40 px-4 h-14 flex items-center justify-between shrink-0">
          <div className="w-10" />
          <AjeLogo variant="dark" size={26} />
          <button
            onClick={() => navigate("/businesses")}
            className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center active:bg-muted/80 transition-colors"
            title="Manage Businesses"
          >
            <Building2 size={18} className="text-foreground" />
          </button>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 w-full max-w-6xl mx-auto overflow-x-hidden pb-28 md:pb-0">
          {children}
        </main>

        {/* Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border/60 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          <div className="flex items-center justify-around px-2 pt-1 pb-1.5">
            <Link to="/today"
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-all min-w-[56px] min-h-[52px] justify-center ${location.pathname === "/today" ? "text-primary bg-primary/10" : "text-muted-foreground"}`}>
              <Home size={22} strokeWidth={location.pathname === "/today" ? 2.5 : 1.8} />
              <span className="text-[10px] font-semibold">Money</span>
            </Link>

            <Link to="/stock"
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-all min-w-[56px] min-h-[52px] justify-center ${location.pathname === "/stock" ? "text-primary bg-primary/10" : "text-muted-foreground"}`}>
              <Package size={22} strokeWidth={location.pathname === "/stock" ? 2.5 : 1.8} />
              <span className="text-[10px] font-semibold">Stock</span>
            </Link>

            <button onClick={() => setShowSmartAdd(true)}
              className="flex flex-col items-center gap-0.5 -mt-5 min-w-[60px] justify-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-brand flex items-center justify-center shadow-lg shadow-primary/30 active:scale-95 transition-transform">
                <Plus size={28} className="text-white" strokeWidth={2.5} />
              </div>
              <span className="text-[10px] font-semibold text-muted-foreground mt-0.5">Add</span>
            </button>

            <Link to="/history"
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-all min-w-[56px] min-h-[52px] justify-center ${location.pathname === "/history" ? "text-primary bg-primary/10" : "text-muted-foreground"}`}>
              <History size={22} strokeWidth={location.pathname === "/history" ? 2.5 : 1.8} />
              <span className="text-[10px] font-semibold">History</span>
            </Link>

            <Link to="/settings"
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-all min-w-[56px] min-h-[52px] justify-center ${location.pathname === "/settings" ? "text-primary bg-primary/10" : "text-muted-foreground"}`}>
              <User size={22} strokeWidth={location.pathname === "/settings" ? 2.5 : 1.8} />
              <span className="text-[10px] font-semibold">Profile</span>
            </Link>
          </div>
        </nav>
      </div>

      {showSmartAdd && activeBusiness && (
        <SmartAddModal
          businessId={activeBusiness.id}
          onClose={() => setShowSmartAdd(false)}
          onSaved={() => setShowSmartAdd(false)}
        />
      )}

      {showAddBiz && (
        <AddBusinessModal
          onClose={() => setShowAddBiz(false)}
          onCreated={async () => { await refreshBusinesses(true); setShowAddBiz(false); }}
        />
      )}
    </div>
  );
};

export default AppShell;
