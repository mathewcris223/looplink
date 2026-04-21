import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useBusiness } from "@/context/BusinessContext";
import AddBusinessModal from "@/components/dashboard/AddBusinessModal";
import SmartAddModal from "@/components/dashboard/SmartAddModal";
import {
  LayoutDashboard, BarChart3, Brain, History,
  LogOut, Menu, X, ChevronDown, Plus, Building2, MessageSquare, Package, Zap, MoreHorizontal
} from "lucide-react";
import { Business } from "@/lib/db";
import { useInventory } from "@/context/InventoryContext";

interface AppShellProps {
  children: React.ReactNode;
  businesses: Business[];
  activeBusiness: Business | null;
  onSelectBusiness: (b: Business) => void;
}

const navItems = [
  { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/analytics", icon: BarChart3, label: "Analytics" },
  { path: "/inventory", icon: Package, label: "Inventory" },
  { path: "/coach", icon: Brain, label: "AI Coach" },
  { path: "/chat", icon: MessageSquare, label: "AI Chat" },
  { path: "/history", icon: History, label: "History" },
];

const AppShell = ({ children, businesses, activeBusiness, onSelectBusiness }: AppShellProps) => {
  const { user, logout } = useAuth();
  const { refreshBusinesses } = useBusiness();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bizDropdown, setBizDropdown] = useState(false);
  const [showAddBiz, setShowAddBiz] = useState(false);
  const [showSmartAdd, setShowSmartAdd] = useState(false);
  const [showMoreSheet, setShowMoreSheet] = useState(false);

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
            <button onClick={() => { setShowAddBiz(true); setBizDropdown(false); }}
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
        {/* Mobile topbar — no hamburger, just logo */}
        <header className="md:hidden border-b bg-card/95 backdrop-blur sticky top-0 z-40 px-4 h-14 flex items-center justify-center shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-brand flex items-center justify-center">
              <Zap size={12} className="text-white" />
            </div>
            <span className="font-display font-bold text-sm">LoopLink</span>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 w-full max-w-6xl mx-auto overflow-x-hidden pb-28 md:pb-0">
          {children}
        </main>

        {/* Bottom Nav — mobile only, always visible */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border/60 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          <div className="flex items-center justify-around px-1 pt-1 pb-1.5">

            {/* Home */}
            <Link to="/dashboard"
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-all duration-150 min-w-[56px] min-h-[52px] justify-center ${
                location.pathname === "/dashboard"
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground active:bg-muted"
              }`}>
              <LayoutDashboard size={22} strokeWidth={location.pathname === "/dashboard" ? 2.5 : 1.8} />
              <span className="text-[10px] font-semibold tracking-tight">Home</span>
            </Link>

            {/* Inventory */}
            <Link to="/inventory"
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-all duration-150 min-w-[56px] min-h-[52px] justify-center ${
                location.pathname === "/inventory"
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground active:bg-muted"
              }`}>
              <Package size={22} strokeWidth={location.pathname === "/inventory" ? 2.5 : 1.8} />
              <span className="text-[10px] font-semibold tracking-tight">Inventory</span>
            </Link>

            {/* Center Add button — prominent */}
            <button onClick={() => setShowSmartAdd(true)}
              className="flex flex-col items-center gap-0.5 -mt-4 min-w-[56px] min-h-[56px] justify-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-brand flex items-center justify-center shadow-lg shadow-primary/30 active:scale-95 transition-transform">
                <Plus size={26} className="text-white" strokeWidth={2.5} />
              </div>
              <span className="text-[10px] font-semibold tracking-tight text-muted-foreground mt-0.5">Add</span>
            </button>

            {/* Chat */}
            <Link to="/chat"
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-all duration-150 min-w-[56px] min-h-[52px] justify-center ${
                location.pathname === "/chat"
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground active:bg-muted"
              }`}>
              <MessageSquare size={22} strokeWidth={location.pathname === "/chat" ? 2.5 : 1.8} />
              <span className="text-[10px] font-semibold tracking-tight">AI Chat</span>
            </Link>

            {/* More */}
            <button onClick={() => setShowMoreSheet(true)}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-all duration-150 min-w-[56px] min-h-[52px] justify-center ${
                ["/analytics", "/history", "/coach"].includes(location.pathname)
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground active:bg-muted"
              }`}>
              <MoreHorizontal size={22} strokeWidth={1.8} />
              <span className="text-[10px] font-semibold tracking-tight">More</span>
            </button>
          </div>
        </nav>

        {/* More sheet — slides up from bottom */}
        {showMoreSheet && (
          <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowMoreSheet(false)} />
            <div className="relative bg-card rounded-t-3xl shadow-2xl animate-fade-up pb-safe">
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-muted" />
              </div>
              <div className="px-5 py-3 border-b">
                <p className="font-display font-bold text-base">More</p>
              </div>

              {/* Nav links */}
              <div className="p-4 grid grid-cols-3 gap-3">
                {[
                  { path: "/analytics", icon: BarChart3, label: "Analytics", color: "bg-blue-50 text-blue-600" },
                  { path: "/history", icon: History, label: "History", color: "bg-purple-50 text-purple-600" },
                  { path: "/coach", icon: Brain, label: "AI Coach", color: "bg-emerald-50 text-emerald-600" },
                ].map(({ path, icon: Icon, label, color }) => (
                  <Link key={path} to={path} onClick={() => setShowMoreSheet(false)}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl border bg-card hover:bg-muted transition-colors">
                    <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
                      <Icon size={20} />
                    </div>
                    <span className="text-xs font-semibold">{label}</span>
                  </Link>
                ))}
              </div>

              {/* Business switcher */}
              <div className="px-4 pb-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Your Businesses</p>
                <div className="space-y-1.5">
                  {businesses.map(b => (
                    <button key={b.id}
                      onClick={() => { onSelectBusiness(b); setShowMoreSheet(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-colors text-sm font-medium ${
                        activeBusiness?.id === b.id
                          ? "border-primary bg-primary/5 text-primary"
                          : "hover:bg-muted"
                      }`}>
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${activeBusiness?.id === b.id ? "bg-primary/10" : "bg-muted"}`}>
                        <Building2 size={15} className={activeBusiness?.id === b.id ? "text-primary" : "text-muted-foreground"} />
                      </div>
                      <span className="truncate flex-1 text-left">{b.name}</span>
                      {activeBusiness?.id === b.id && (
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold shrink-0">Active</span>
                      )}
                    </button>
                  ))}
                  <button onClick={() => { setShowAddBiz(true); setShowMoreSheet(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-dashed hover:bg-muted transition-colors text-sm font-medium text-muted-foreground">
                    <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <Plus size={15} />
                    </div>
                    Add New Business
                  </button>
                </div>
              </div>

              {/* Logout */}
              <div className="px-4 pb-8 pt-2">
                <button
                  onClick={() => { setShowMoreSheet(false); handleLogout(); }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-red-200 bg-red-50 hover:bg-red-100 transition-colors text-sm font-semibold text-red-600">
                  <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
                    <LogOut size={17} className="text-red-600" />
                  </div>
                  Log Out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Business Modal */}
      {showAddBiz && (
        <AddBusinessModal
          onClose={() => setShowAddBiz(false)}
          onCreated={async () => {
            await refreshBusinesses(true); // select the newly created business
            setShowAddBiz(false);
          }}
        />
      )}

      {/* Smart Add Modal from bottom nav */}
      {showSmartAdd && activeBusiness && (
        <SmartAddModal
          businessId={activeBusiness.id}
          onClose={() => setShowSmartAdd(false)}
          onSaved={() => setShowSmartAdd(false)}
        />
      )}
    </div>
  );
};

export default AppShell;
