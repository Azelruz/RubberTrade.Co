import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { startBackgroundSync, hydrateLocalDB } from './services/syncService';
import { backupService } from './services/backupService';
import { supabase } from './utils/supabase';
import { Zap } from 'lucide-react';

// Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Loading Fallback Component
const PageLoader = () => (
  <div className="flex flex-col justify-center items-center h-[60vh] space-y-4 animate-in fade-in duration-500">
    <div className="relative">
      <div className="w-12 h-12 border-4 border-rubber-100 border-t-rubber-600 rounded-full animate-spin"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Zap className="text-rubber-600 animate-pulse" size={20} />
      </div>
    </div>
    <div className="text-[10px] font-black text-rubber-600 uppercase tracking-[0.3em] animate-pulse">
      Loading Experience...
    </div>
  </div>
);

// Lazy Loaded Pages
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Buy = lazy(() => import('./pages/Buy'));
const Sell = lazy(() => import('./pages/Sell'));
const TransactionHistory = lazy(() => import('./pages/TransactionHistory'));
const Report = lazy(() => import('./pages/Report'));
const MonthlyReport = lazy(() => import('./pages/MonthlyReport'));
const Settings = lazy(() => import('./pages/Settings'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Promotions = lazy(() => import('./pages/Promotions'));
const Payments = lazy(() => import('./pages/Payments'));
const LIFFProfile = lazy(() => import('./pages/LIFFProfile'));
const LIFFAddEmployee = lazy(() => import('./pages/LIFFAddEmployee'));
const TaxReport = lazy(() => import('./pages/TaxReport'));
const DailySummaryReport = lazy(() => import('./pages/DailySummaryReport'));
const DataImport = lazy(() => import('./pages/DataImport'));
const Subscription = lazy(() => import('./pages/Subscription'));
const AdminSubscriptions = lazy(() => import('./pages/AdminSubscriptions'));
const AdminSubscriptionDashboard = lazy(() => import('./pages/AdminSubscriptionDashboard'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports'));
const SyncRequired = lazy(() => import('./pages/SyncRequired'));
const Home = lazy(() => import('./pages/Home'));
const BackupManagement = lazy(() => import('./pages/admin/BackupManagement'));

// Root Index Component to handle Landing vs Dashboard
const RootIndex = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!user) return <Home />;
  
  return (
    <ProtectedRoute>
      <ErrorBoundary>
        <Layout />
      </ErrorBoundary>
    </ProtectedRoute>
  );
};

// Nested Lazy Pages
const GeneralSettings = lazy(() => import('./pages/settings/GeneralSettings').then(m => ({ default: m.GeneralSettings })));
const ActivityLog = lazy(() => import('./pages/settings/ActivityLog'));

function App() {
  useEffect(() => {
    // Start background sync listener
    startBackgroundSync();
    
    // Optionally trigger a hydrate on first load if online and authenticated
    const checkAuthAndHydrate = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (navigator.onLine && session) {
        hydrateLocalDB();
        // Trigger automated backup check
        backupService.checkAndTriggerBackup();
      }
    };

    checkAuthAndHydrate();
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />

            {/* Root Route: Dashboard if logged in, Home if guest */}
            <Route path="/" element={<RootIndex />}>
              <Route index element={<Dashboard />} />
              <Route path="buy" element={<Buy />} />
              <Route path="sell" element={<Sell />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="payments" element={<Payments />} />
              <Route path="promotions" element={
                <RoleRoute allowedRoles={['owner']}>
                  <Promotions />
                </RoleRoute>
              } />
              <Route path="report">
                <Route index element={<Navigate to="daily-forecast" replace />} />
                <Route path="daily-forecast" element={
                  <RoleRoute allowedRoles={['owner']}>
                    <Report />
                  </RoleRoute>
                } />
                <Route path="daily-summary" element={
                  <RoleRoute allowedRoles={['owner']}>
                    <DailySummaryReport />
                  </RoleRoute>
                } />
                <Route path="monthly" element={
                  <RoleRoute allowedRoles={['owner']}>
                    <MonthlyReport />
                  </RoleRoute>
                } />
                <Route path="transaction-history" element={
                  <RoleRoute allowedRoles={['owner']}>
                    <TransactionHistory />
                  </RoleRoute>
                } />
              </Route>
              <Route path="tax-report" element={
                <RoleRoute allowedRoles={['owner']}>
                  <TaxReport />
                </RoleRoute>
              } />
              <Route path="settings" element={
                <RoleRoute allowedRoles={['owner', 'super_admin']}>
                  <Settings />
                </RoleRoute>
              }>
                <Route index element={<GeneralSettings />} />
              </Route>
              <Route path="activity-log" element={
                <RoleRoute allowedRoles={['owner', 'super_admin']}>
                  <ActivityLog />
                </RoleRoute>
              } />
              <Route path="subscription" element={<Subscription />} />
              <Route path="admin/subscriptions" element={
                <RoleRoute allowedRoles={['super_admin']}>
                  <AdminSubscriptions />
                </RoleRoute>
              } />
              <Route path="admin/subscription-dashboard" element={
                <RoleRoute allowedRoles={['super_admin']}>
                  <AdminSubscriptionDashboard />
                </RoleRoute>
              } />
              <Route path="admin/reports" element={
                <RoleRoute allowedRoles={['super_admin']}>
                  <AdminReports />
                </RoleRoute>
              } />
              <Route path="admin/backups" element={
                <RoleRoute allowedRoles={['super_admin']}>
                  <BackupManagement />
                </RoleRoute>
              } />
              <Route path="import" element={
                <RoleRoute allowedRoles={['owner', 'super_admin']}>
                  <DataImport />
                </RoleRoute>
              } />
            </Route>

            {/* Public LIFF Routes */}
            <Route path="/liff/profile" element={<LIFFProfile />} />
            <Route path="/liff/add-employee" element={<LIFFAddEmployee />} />

            {/* Lock Screen */}
            <Route path="/sync-required" element={<SyncRequired />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#3d6511',
              color: '#fff',
            },
            success: {
              iconTheme: {
                primary: '#fff',
                secondary: '#3d6511',
              },
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
