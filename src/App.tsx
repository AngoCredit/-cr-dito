import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/client/Login";
import Register from "./pages/client/Register";
import Dashboard from "./pages/client/Dashboard";
import CreditRequest from "./pages/client/CreditRequest";
import WalletPage from "./pages/client/WalletPage";
import Referrals from "./pages/client/Referrals";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminLoans from "./pages/admin/AdminLoans";
import AdminManagers from "./pages/admin/AdminManagers";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminCreateUser from "./pages/admin/AdminCreateUser";
import AdminAuditLogs from "./pages/admin/AdminAuditLogs";
import KYCVerification from "./pages/client/KYCVerification";
import ChatPage from "./pages/client/ChatPage";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminSetupPassword from "./pages/admin/AdminSetupPassword";
import ForgotPassword from "./pages/client/ForgotPassword";
import ResetPassword from "./pages/client/ResetPassword";
import AdminUserDetails from "./pages/admin/AdminUserDetails";
import NotFound from "./pages/NotFound";
import { ThemeProvider } from "./components/ThemeProvider";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/cadastro" element={<Register />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/setup-password" element={<ProtectedRoute><AdminSetupPassword /></ProtectedRoute>} />

            {/* Client Protected Routes */}
            <Route path="/app" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/app/credito" element={<ProtectedRoute><CreditRequest /></ProtectedRoute>} />
            <Route path="/app/kyc" element={<ProtectedRoute><KYCVerification /></ProtectedRoute>} />
            <Route path="/app/carteira" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
            <Route path="/app/indicacoes" element={<ProtectedRoute><Referrals /></ProtectedRoute>} />
            <Route path="/app/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />

            {/* Admin Protected Routes */}
            <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/usuarios" element={<ProtectedRoute requireAdmin><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/usuarios/novo" element={<ProtectedRoute requireAdmin><AdminCreateUser /></ProtectedRoute>} />
            <Route path="/admin/usuarios/:id" element={<ProtectedRoute requireAdmin><AdminUserDetails /></ProtectedRoute>} />
            <Route path="/admin/emprestimos" element={<ProtectedRoute requireAdmin><AdminLoans /></ProtectedRoute>} />
            <Route path="/admin/gestores" element={<ProtectedRoute requireAdmin><AdminManagers /></ProtectedRoute>} />
            <Route path="/admin/configuracoes" element={<ProtectedRoute requireAdmin><AdminSettings /></ProtectedRoute>} />
            <Route path="/admin/logs" element={<ProtectedRoute requireAdmin><AdminAuditLogs /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
