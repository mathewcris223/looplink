import { useNavigate } from "react-router-dom";
import { LayoutDashboard, MessageSquare, Receipt, Package, ArrowRight, X } from "lucide-react";
import AjeLogo from "@/components/ui/AjeLogo";

interface Props {
  userName: string;
  onDismiss: () => void;
}

const STORAGE_KEY = "ll_daily_welcome";

// Returns true if the welcome screen should show today
export function shouldShowDailyWelcome(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return true;
    const today = new Date().toISOString().split("T")[0];
    return stored !== today;
  } catch {
    return true;
  }
}

// Call this when the user dismisses or navigates away
export function markDailyWelcomeSeen(): void {
  try {
    const today = new Date().toISOString().split("T")[0];
    localStorage.setItem(STORAGE_KEY, today);
  } catch { /* silent */ }
}

const features = [
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    description: "Your main control center where you can view all your business summaries, performance, income, expenses, and insights in one place.",
    action: "Go to Dashboard",
    path: "/dashboard",
    gradient: "from-blue-500 to-indigo-600",
    bg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    icon: MessageSquare,
    title: "AI Chat",
    description: "An intelligent assistant that helps you understand your business, answer questions, and guide your financial decisions in real time.",
    action: "Start AI Chat",
    path: "/chat",
    gradient: "from-violet-500 to-purple-600",
    bg: "bg-violet-50",
    iconColor: "text-violet-600",
  },
  {
    icon: Receipt,
    title: "Income & Expenses",
    description: "Record and track all your business income and expenses automatically to understand profit, loss, and cash flow.",
    action: "Manage Finances",
    path: "/history",
    gradient: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  {
    icon: Package,
    title: "Inventory",
    description: "Track your products, stock levels, sales, and inventory movement in real time to manage your business efficiently.",
    action: "Open Inventory",
    path: "/inventory",
    gradient: "from-amber-500 to-orange-600",
    bg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
];

const DailyWelcome = ({ userName, onDismiss }: Props) => {
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    markDailyWelcomeSeen();
    onDismiss();
    navigate(path);
  };

  const handleSkip = () => {
    markDailyWelcomeSeen();
    onDismiss();
  };

  const firstName = userName.split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AjeLogo variant="dark" size={24} />
          </div>
          <button onClick={handleSkip}
            className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
          {/* Greeting */}
          <div className="text-center mb-8">
            <p className="text-muted-foreground text-sm mb-1">{greeting},</p>
            <h1 className="font-display text-2xl md:text-3xl font-bold mb-2">
              Welcome back, <span className="text-gradient">{firstName}</span> 👋
            </h1>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed">
              Where would you like to start today? Pick a section below or go straight to your dashboard.
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {features.map(({ icon: Icon, title, description, action, path, bg, iconColor }) => (
              <div key={path}
                className="group rounded-2xl border bg-card p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col"
                onClick={() => handleNavigate(path)}>
                {/* Icon */}
                <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
                  <Icon size={22} className={iconColor} />
                </div>

                {/* Text */}
                <h3 className="font-display font-bold text-base mb-2">{title}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed flex-1 mb-4">
                  {description}
                </p>

                {/* Action */}
                <div className={`flex items-center gap-1.5 text-sm font-semibold ${iconColor} group-hover:gap-2.5 transition-all duration-200`}>
                  {action}
                  <ArrowRight size={15} />
                </div>
              </div>
            ))}
          </div>

          {/* Skip button */}
          <div className="text-center pb-8">
            <button onClick={handleSkip}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4">
              Skip — Go straight to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyWelcome;
