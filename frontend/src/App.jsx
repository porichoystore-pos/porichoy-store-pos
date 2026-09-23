import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { SettingsProvider } from './context/SettingsContext';
import PrivateRoute from './components/common/PrivateRoute';
import Layout from './components/common/Layout';
import Login from './components/auth/Login'; // eager: needed for first paint
import { PageSkeleton } from './components/common/Skeletons';

// Code-split each page — only downloaded when the route is visited
const Dashboard = lazy(() => import('./components/dashboard/Dashboard'));
const POSInterface = lazy(() => import('./components/pos/POSInterface'));
const ProductList = lazy(() => import('./components/products/ProductList'));
const ProductForm = lazy(() => import('./components/products/ProductForm'));
const BillList = lazy(() => import('./components/bills/BillList'));
const BillDetails = lazy(() => import('./components/bills/BillDetails'));
const CategoryList = lazy(() => import('./components/categories/CategoryList'));
const CustomerList = lazy(() => import('./components/customers/CustomerList'));
const Reports = lazy(() => import('./components/reports/Reports'));
const ManualSale = lazy(() => import('./components/sales/ManualSale'));
const Settings = lazy(() => import('./components/settings/Settings'));


function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <ToastProvider>
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 4000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
          <Suspense fallback={<PageSkeleton />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            
            {/* Protected Routes */}
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="pos" element={<POSInterface />} />
              <Route path="products" element={<ProductList />} />
              <Route path="products/new" element={<ProductForm />} />
              <Route path="products/edit/:id" element={<ProductForm />} />
              <Route path="bills" element={<BillList />} />
              <Route path="bills/:id" element={<BillDetails />} />
              <Route path="categories" element={<CategoryList />} />
              <Route path="customers" element={<CustomerList />} />
              <Route path="reports" element={<Reports />} />
              <Route path="sales/manual" element={<ManualSale />} />
              <Route path="sales/manual/:id" element={<ManualSale />} />
              
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Catch all unmatched routes */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          </Suspense>

          </ToastProvider>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;