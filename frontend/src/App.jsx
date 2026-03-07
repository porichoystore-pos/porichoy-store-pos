import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import PrivateRoute from './components/common/PrivateRoute';
import Login from './components/auth/Login';
import Dashboard from './components/dashboard/Dashboard';
import POSInterface from './components/pos/POSInterface';
import ProductList from './components/products/ProductList';
import ProductForm from './components/products/ProductForm';
import BillList from './components/bills/BillList';
import BillDetails from './components/bills/BillDetails';
import CategoryList from './components/categories/CategoryList';
import CustomerList from './components/customers/CustomerList';
import Reports from './components/reports/Reports';
import Layout from './components/common/Layout';


function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
              
              {/* Settings Route - You can add this later */}
              <Route path="settings" element={
                <div className="bg-white rounded-xl shadow-md p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Settings</h2>
                  <p className="text-gray-600">Settings page coming soon...</p>
                </div>
              } />
            </Route>

            {/* Catch all unmatched routes */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
       
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;