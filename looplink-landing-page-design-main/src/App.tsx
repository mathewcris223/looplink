import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { BusinessProvider } from "@/context/BusinessContext";
import { InventoryProvider } from "@/context/InventoryContext";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import FAQ from "./pages/FAQ.tsx";
import Signup from "./pages/Signup.tsx";
import Login from "./pages/Login.tsx";
import Home from "./pages/Home.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import History from "./pages/History.tsx";
import Today from "./pages/Today.tsx";
import Stock from "./pages/Stock.tsx";
import Settings from "./pages/Settings.tsx";
import Upload from "./pages/Upload.tsx";
import Chat from "./pages/Chat.tsx";
import Analytics from "./pages/Analytics.tsx";
import Coach from "./pages/Coach.tsx";
import Learn from "./pages/Learn.tsx";
import AIHub from "./pages/AIHub.tsx";
import Inventory from "./pages/Inventory.tsx";
import ManageBusinesses from "./pages/ManageBusinesses.tsx";
import LogoPreview from "./pages/LogoPreview.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BusinessProvider>
          <InventoryProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/login" element={<Login />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/home" element={<Home />} />
                <Route path="/today" element={<Today />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/history" element={<History />} />
                <Route path="/stock" element={<Stock />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/upload" element={<Upload />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/coach" element={<Coach />} />
                <Route path="/learn" element={<Learn />} />
                <Route path="/ai-hub" element={<AIHub />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/businesses" element={<ManageBusinesses />} />
                <Route path="/logo-preview" element={<LogoPreview />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </InventoryProvider>
        </BusinessProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
