import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';

// Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Buy from './pages/Buy';
import Sell from './pages/Sell';
import TransactionHistory from './pages/TransactionHistory';
import Report from './pages/Report';
import MonthlyReport from './pages/MonthlyReport';
import Settings from './pages/Settings';
import Expenses from './pages/Expenses';
import Promotions from './pages/Promotions';
import Payments from './pages/Payments';
import LIFFProfile from './pages/LIFFProfile';
import LIFFAddEmployee from './pages/LIFFAddEmployee';
import TaxReport from './pages/TaxReport';
import DailySummaryReport from './pages/DailySummaryReport';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
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
              <RoleRoute allowedRoles={['owner']}>
                <Settings />
              </RoleRoute>
            } />
          </Route>

          {/* Public LIFF Routes */}
          <Route path="/liff/profile" element={<LIFFProfile />} />
          <Route path="/liff/add-employee" element={<LIFFAddEmployee />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
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
