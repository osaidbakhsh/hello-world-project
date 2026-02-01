import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Layout from "@/components/layout/Layout";
import Dashboard from "./pages/Dashboard";
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
import Register from "./pages/Register";
import Vault from "./pages/Vault";
import ITTools from "./pages/ITTools";
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
              <Route path="/register" element={<Register />} />
              
              {/* Protected routes */}
              <Route element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route path="/" element={<Dashboard />} />
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
