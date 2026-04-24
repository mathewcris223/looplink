// ── Alert Banner Component ────────────────────────────────────────────────────
// Displays color-coded alerts on the Today screen
// Dismissible per day via localStorage

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, AlertTriangle, CheckCircle, Info, TrendingDown } from "lucide-react";
import { AppAlert, AlertLevel, dismissAlert } from "@/lib/alerts";

interface Props {
  alerts: AppAlert[];
}

const LEVEL_STYLES: Record<AlertLevel, {
  bg: string; border: string; icon: React.ElementType; iconColor: string; titleColor: string; msgColor: string; btnBg: string;
}> = {
  danger:  { bg: "bg-red-50",     border: "border-red-200",   icon: AlertTriangle, iconColor: "text-red-500",   titleColor: "text-red-800",   msgColor: "text-red-700",   btnBg: "bg-red-100 hover:bg-red-200 text-red-800" },
  warning: { bg: "bg-amber-50",   border: "border-amber-200", icon: TrendingDown,  iconColor: "text-amber-500", titleColor: "text-amber-800", msgColor: "text-amber-700", btnBg: "bg-amber-100 hover:bg-amber-200 text-amber-800" },
  good:    { bg: "bg-emerald-50", border: "border-emerald-200", icon: CheckCircle, iconColor: "text-emerald-500", titleColor: "text-emerald-800", msgColor: "text-emerald-700", btnBg: "bg-emerald-100 hover:bg-emerald-200 text-emerald-800" },
  info:    { bg: "bg-blue-50",    border: "border-blue-200",  icon: Info,          iconColor: "text-blue-500",   titleColor: "text-blue-800",   msgColor: "text-blue-700",   btnBg: "bg-blue-100 hover:bg-blue-200 text-blue-800" },
};

const AlertBanner = ({ alerts }: Props) => {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = alerts.filter(a => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  const handleDismiss = (alert: AppAlert) => {
    if (alert.dismissKey) dismissAlert(alert.dismissKey);
    setDismissed(prev => new Set([...prev, alert.id]));
  };

  return (
    <div className="space-y-2 mb-5">
      {visible.map(alert => {
        const cfg = LEVEL_STYLES[alert.level];
        const Icon = cfg.icon;
        return (
          <div key={alert.id} className={`rounded-2xl border ${cfg.bg} ${cfg.border} px-4 py-3.5`}>
            <div className="flex items-start gap-3">
              <Icon size={17} className={`${cfg.iconColor} shrink-0 mt-0.5`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${cfg.titleColor}`}>{alert.title}</p>
                <p className={`text-xs mt-0.5 leading-relaxed ${cfg.msgColor}`}>{alert.message}</p>
                {alert.action && (
                  <button
                    onClick={() => navigate(alert.action!.path)}
                    className={`mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${cfg.btnBg}`}
                  >
                    {alert.action.label} →
                  </button>
                )}
              </div>
              {alert.dismissKey && (
                <button
                  onClick={() => handleDismiss(alert)}
                  className={`p-1 rounded-lg ${cfg.btnBg} shrink-0`}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AlertBanner;
