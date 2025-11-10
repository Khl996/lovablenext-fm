import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./components/AppSidebar";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useCurrentUser } from "./hooks/useCurrentUser";
import { Languages, LogOut } from "lucide-react";
import { Button } from "./components/ui/button";
import { useLanguage } from "./contexts/LanguageContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Install from "./pages/Install";
import NotificationsSettings from "./pages/NotificationsSettings";
import Facilities from "./pages/Facilities";
import Settings from "./pages/Settings";
import Hospitals from "./pages/admin/Hospitals";
import Users from "./pages/admin/Users";
import RolePermissions from "./pages/admin/RolePermissions";
import Locations from "./pages/admin/Locations";
import Assets from "./pages/admin/Assets";
import WorkOrders from './pages/admin/WorkOrders';
import Teams from './pages/admin/Teams';
import OperationsLog from './pages/OperationsLog';
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { language, setLanguage, direction } = useLanguage();
  const { signOut, user } = useAuth();
  const { profile } = useCurrentUser();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar side={direction === 'rtl' ? 'right' : 'left'} />
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-14 border-b flex items-center px-4 bg-card sticky top-0 z-10 gap-4">
            <SidebarTrigger />
            <div className="flex-1"></div>
            
            {/* User Info */}
            {profile && (
              <div className="text-sm text-muted-foreground hidden sm:block">
                {language === 'ar' ? 'مرحباً' : 'Welcome'}, {profile.full_name}
              </div>
            )}

            {/* Language Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="gap-2"
            >
              <Languages className="h-4 w-4" />
              {language === 'ar' ? 'EN' : 'ع'}
            </Button>

            {/* Logout Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">
                {language === 'ar' ? 'تسجيل الخروج' : 'Logout'}
              </span>
            </Button>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/install" element={<Install />} />
              <Route 
                path="/notifications-settings" 
                element={
                  <ProtectedRoute>
                    <NotificationsSettings />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Dashboard />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/facilities"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Facilities />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/settings"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Settings />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/hospitals" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Hospitals />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/users" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Users />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/permissions" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <RolePermissions />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/locations" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Locations />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/assets" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Assets />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/work-orders" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <WorkOrders />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/teams" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Teams />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/operations-log" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <OperationsLog />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
