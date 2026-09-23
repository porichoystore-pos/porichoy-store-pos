import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const SettingsContext = createContext();

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
};

export const SettingsProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);

  const refreshSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/settings');
      setSettings(res.data);
    } catch (e) {
      console.error('Failed to load settings', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) refreshSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Sensible defaults until loaded
  const value = {
    settings: settings || {
      storeName: 'Porichoy Store',
      currencySymbol: '₹',
      defaultTaxRate: 0,
      defaultLowStockAlert: 5,
      defaultPaymentMethod: 'cash',
      enableVisualSearch: true,
      enableBarcodeScanner: true,
      theme: 'light'
    },
    loading,
    refreshSettings
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};
