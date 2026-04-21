import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useBusiness } from "@/context/BusinessContext";
import AppShell from "@/components/dashboard/AppShell";
import AddBusinessModal from "@/components/dashboard/AddBusinessModal";
import DeleteBusinessModal from "@/components/dashboard/DeleteBusinessModal";
import { Building2, Plus, Trash2, CheckCircle } from "lucide-react";
import { Business } from "@/lib/db";

const ManageBusinesses = () => {
  const { user } = useAuth();
  const { businesses, activeBusiness, setActiveBusiness, refreshBusinesses, loading } = useBusiness();
  const navigate = useNavigate();
  const [showAddBiz, setShowAddBiz] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Business | null>(null);

  if (!user || !activeBusiness) return null;

  return (
    <AppShell businesses={businesses} activeBusiness={activeBusiness} onSelectBusiness={setActiveBusiness}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">My Businesses</h1>
        <p className="text-muted-foreground text-sm mt-1">Switch, add, or delete your businesses</p>
      </div>

      {/* Business list */}
      <div className="space-y-3 mb-6">
        {businesses.map(b => {
          const isActive = activeBusiness.id === b.id;
          return (
            <div key={b.id}
              className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${isActive ? "border-primary bg-primary/5" : "bg-card hover:bg-muted/40"}`}>
              {/* Business icon */}
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${isActive ? "bg-primary/10" : "bg-muted"}`}>
                <Building2 size={20} className={isActive ? "text-primary" : "text-muted-foreground"} />
              </div>

              {/* Info — tap to switch */}
              <button className="flex-1 text-left min-w-0" onClick={() => { setActiveBusiness(b); navigate("/home"); }}>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold truncate">{b.name}</p>
                  {isActive && <CheckCircle size={14} className="text-primary shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground capitalize mt-0.5">{b.type}</p>
              </button>

              {/* Active badge */}
              {isActive && (
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold shrink-0">Active</span>
              )}

              {/* Delete button — always visible */}
              <button
                onClick={() => setDeleteTarget(b)}
                className="w-9 h-9 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 flex items-center justify-center shrink-0 transition-colors active:scale-95"
                title={`Delete ${b.name}`}
              >
                <Trash2 size={16} className="text-red-600" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Add new business */}
      <button
        onClick={() => setShowAddBiz(true)}
        className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl border-2 border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 transition-all text-sm font-semibold text-primary active:scale-[0.98]"
      >
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Plus size={18} className="text-primary" />
        </div>
        Add New Business
      </button>

      {/* Modals */}
      {showAddBiz && (
        <AddBusinessModal
          onClose={() => setShowAddBiz(false)}
          onCreated={async () => {
            await refreshBusinesses(true);
            setShowAddBiz(false);
          }}
        />
      )}

      {deleteTarget && (
        <DeleteBusinessModal
          business={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setDeleteTarget(null);
            // If deleted business was active, context already switched; navigate accordingly
            navigate(businesses.filter(b => b.id !== deleteTarget.id).length > 0 ? "/home" : "/onboarding");
          }}
        />
      )}
    </AppShell>
  );
};

export default ManageBusinesses;
