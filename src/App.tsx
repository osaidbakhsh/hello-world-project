import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Layout from "@/components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import DomainSummary from "./pages/DomainSummary";
import Servers from "./pages/Servers";
import Employees from "./pages/Employees";
import EmployeePermissions from "./pages/EmployeePermissions";
import Vacations from "./pages/Vacations";
import Licenses from "./pages/Licenses";
import Tasks from "./pages/Tasks";
import Networks from "./pages/Networks";
import EmployeeReports from "./pages/EmployeeReports";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import AuditLog from "./pages/AuditLog";
import WebApps from "./pages/WebApps";
import NetworkScan from "./pages/NetworkScan";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Vault from "./pages/Vault";
import ITTools from "./pages/ITTools";
import OnCallSchedule from "./pages/OnCallSchedule";
import MaintenanceWindows from "./pages/MaintenanceWindows";
import LifecycleCenter from "./pages/LifecycleCenter";
import FileShares from "./pages/FileShares";
import FileShareDetails from "./pages/FileShareDetails";
import ScanAgents from "./pages/ScanAgents";
import Datacenter from "./pages/Datacenter";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              {/* Redirect /register to /login - self-registration disabled */}
              <Route path="/register" element={<Navigate to="/login" replace />} />
              
              {/* Protected routes */}
              <Route element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
              <Route path="/" element={<Dashboard />} />
                <Route path="/domain-summary" element={<DomainSummary />} />
                <Route path="/servers" element={<Servers />} />
                <Route path="/employees" element={<Employees />} />
                <Route path="/employee-permissions" element={<EmployeePermissions />} />
                <Route path="/vacations" element={<Vacations />} />
                <Route path="/licenses" element={<Licenses />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/networks" element={<Networks />} />
                <Route path="/employee-reports" element={<EmployeeReports />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/audit-log" element={<AuditLog />} />
                <Route path="/web-apps" element={<WebApps />} />
                <Route path="/network-scan" element={<NetworkScan />} />
                <Route path="/vault" element={<Vault />} />
                <Route path="/it-tools" element={<ITTools />} />
                <Route path="/on-call" element={<OnCallSchedule />} />
                <Route path="/maintenance" element={<MaintenanceWindows />} />
                <Route path="/lifecycle" element={<LifecycleCenter />} />
                <Route path="/file-shares" element={<FileShares />} />
                <Route path="/file-shares/:id" element={<FileShareDetails />} />
                <Route path="/scan-agents" element={<ScanAgents />} />
                <Route path="/datacenter" element={<Datacenter />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
              
              <Route path="*" element={<NotFound />} />
            </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
