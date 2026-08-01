import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import ProtectedRoute from './auth/ProtectedRoute';

import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import CustomerListPage from './pages/customers/CustomerListPage';
import CustomerCreatePage from './pages/customers/CustomerCreatePage';
import CustomerDetailPage from './pages/customers/CustomerDetailPage';
import GenerateBillPage from './pages/billing/GenerateBillPage';
import BillListPage from './pages/billing/BillListPage';

import MyCustomersPage from './pages/collector/MyCustomersPage';
import CollectBillPage from './pages/collector/CollectBillPage';
import QuickCollectionPage from './pages/collector/QuickCollectionPage';
import MyCollectionsPage from './pages/collector/MyCollectionsPage';

import CollectionReportPage from './pages/reports/CollectionReportPage';
import DueReportPage from './pages/reports/DueReportPage';
import DepositLedgerPage from './pages/reports/DepositLedgerPage';
import CustomerStatementPage from './pages/reports/CustomerStatementPage';
import UserManagementPage from './pages/users/UserManagementPage';
import AreaManagementPage from './pages/areas/AreaManagementPage';

const AppLayout = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100">
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Navbar
          isMobileMenuOpen={mobileMenuOpen}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        />
        <main className="p-4 sm:p-6 flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Main Layout Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'accounts']}>
                <AppLayout><DashboardPage /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'accounts']}>
                <AppLayout><CustomerListPage /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers/new"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'accounts']}>
                <AppLayout><CustomerCreatePage /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers/:id"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'accounts', 'collector']}>
                <AppLayout><CustomerDetailPage /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing/generate"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'accounts']}>
                <AppLayout><GenerateBillPage /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing/list"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'accounts']}>
                <AppLayout><BillListPage /></AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Collector Routes */}
          <Route
            path="/billing/quick-collect"
            element={
              <ProtectedRoute allowedRoles={['collector', 'super_admin', 'accounts']}>
                <AppLayout><QuickCollectionPage /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/collector/my-customers"
            element={
              <ProtectedRoute allowedRoles={['collector', 'super_admin', 'accounts']}>
                <AppLayout><MyCustomersPage /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/collector/collect/:customerId"
            element={
              <ProtectedRoute allowedRoles={['collector', 'super_admin', 'accounts']}>
                <AppLayout><CollectBillPage /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/collector/my-collections"
            element={
              <ProtectedRoute allowedRoles={['collector', 'super_admin', 'accounts']}>
                <AppLayout><MyCollectionsPage /></AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Reports */}
          <Route
            path="/reports/collection-summary"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'accounts']}>
                <AppLayout><CollectionReportPage /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/due-list"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'accounts']}>
                <AppLayout><DueReportPage /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/deposit-ledger"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'accounts']}>
                <AppLayout><DepositLedgerPage /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/customer-statement"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'accounts', 'collector']}>
                <AppLayout><CustomerStatementPage /></AppLayout>
              </ProtectedRoute>
            }
          />

          {/* User & Area Setup */}
          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <AppLayout><UserManagementPage /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/areas"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <AppLayout><AreaManagementPage /></AppLayout>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
