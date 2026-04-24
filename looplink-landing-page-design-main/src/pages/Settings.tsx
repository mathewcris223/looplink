import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useBusiness } from "@/context/BusinessContext";
import AppShell from "@/components/dashboard/AppShell";
import AddBusinessModal from "@/components/dashboard/AddBusinessModal";
import DeleteBusinessModal from "@/components/dashboard/DeleteBusinessModal";
import { Building2, Plus, Trash2, CheckCircle, LogOut } from "lucide-react";
import { Business } from "@/lib/db";

const Settings = () => {
  const { user, logout } = useAuth();
  const { businesses, activeBusiness, setActiveBusiness, refreshBusinesses, loading } = useBusiness();
  const navigate = useNavigate();
  const [showAddBiz, setShowAddBiz] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Business | null>(null);

  const handleLogout = async () => { await logout(); navigate("/"); };

  if (!user || !activeBusiness) return null;

  return (
    <AppShell businesses={businesses} activeBusiness={activeBusiness} onSelectBusiness={setActiveBusiness}>
      <h1 className="text-xl font-bold mb-6">Settings</h1>

      {/* Account */}
      <div className="bg-card border rounded-2xl p-4 mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Account</p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
            {user.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Businesses */}
      <div className="bg-card border rounded-2xl p-4 mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Your Businesses</p>
        <div className="space-y-2">
          {businesses.map(b => {
            const isActive = activeBusiness.id === b.id;
            return (
              <div key={b.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${isActive ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isActive ? "bg-primary/10" : "bg-muted"}`}>
                  <Building2 size={16} className={isActive ? "text-primary" : "text-muted-foreground"} />
                </div>
                <button className="flex-1 text-left min-w-0" onClick={() => { setActiveBusiness(b); navigate("/today"); }}>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold truncate">{b.name}</p>
                    {isActive && <CheckCircle size={13} className="text-primary shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground capitalize">{b.type}</p>
                </button>
                {isActive && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold shrink-0">Active</span>}
                <button
                  onClick={() => setDeleteTarget(b)}
                  className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 flex items-center justify-center shrink-0 transition-colors"
                >
                  <Trash2 size={14} className="text-red-600" />
                </button>
              </div>
            );
          })}
          <button
            onClick={() => setShowAddBiz(true)}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed hover:bg-muted/40 transition-colors text-sm font-medium text-muted-foreground"
          >
            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <Plus size={16} />
            </div>
            Add New Business
          </button>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center gap-3 p-4 rounded-2xl border border-red-200 bg-red-50 hover:bg-red-100 transition-colors text-sm font-semibold text-red-600"
      >
        <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
          <LogOut size={16} className="text-red-600" />
        </div>
        Log Out
      </button>

      {showAddBiz && (
        <AddBusinessModal
          onClose={() => setShowAddBiz(false)}
          onCreated={async () => { await refreshBusinesses(true); setShowAddBiz(false); }}
        />
      )}
      {deleteTarget && (
        <DeleteBusinessModal
          business={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setDeleteTarget(null);
            navigate(businesses.filter(b => b.id !== deleteTarget.id).length > 0 ? "/today" : "/onboarding");
          }}
        />
      )}
    </AppShell>
  );
};

export default Settings;
