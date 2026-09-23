import React, { useState } from 'react';
import { FiHome, FiSliders, FiUsers, FiDatabase, FiUpload, FiLoader, FiSave, FiImage } from 'react-icons/fi';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import PageHeader from '../common/PageHeader';
import { getImageUrl } from '../../services/api';
import UserManagement from './UserManagement';
import BackupSection from './BackupSection';

const Settings = () => {
  const { user } = useAuth();
  const { settings, refreshSettings, loading } = useSettings();
  const toast = useToast();
  const isAdmin = user?.role === 'admin';

  const [activeTab, setActiveTab] = useState('store');
  const [storeForm, setStoreForm] = useState(null);
  const [prefsForm, setPrefsForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Lazily initialize forms from loaded settings (avoid setState in render)
  const storeValues = storeForm || {
    storeName: settings.storeName || '',
    address: settings.address || '',
    phone: settings.phone || '',
    email: settings.email || '',
    receiptFooter: settings.receiptFooter || ''
  };
  const prefsValues = prefsForm || {
    currencySymbol: settings.currencySymbol || '₹',
    defaultTaxRate: settings.defaultTaxRate ?? 0,
    defaultLowStockAlert: settings.defaultLowStockAlert ?? 5,
    defaultPaymentMethod: settings.defaultPaymentMethod || 'cash',
    enableVisualSearch: settings.enableVisualSearch !== false,
    enableBarcodeScanner: settings.enableBarcodeScanner !== false,
    theme: settings.theme || 'light'
  };

  const saveSection = async (payload) => {
    try {
      setSaving(true);
      await api.put('/settings', payload);
      await refreshSettings();
      toast.success('Settings saved');
      setStoreForm(null);
      setPrefsForm(null);
      if (payload.theme) document.documentElement.classList.toggle('dark', payload.theme === 'dark');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save settings');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingLogo(true);
      const fd = new FormData();
      fd.append('logo', file);
      await api.post('/settings/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await refreshSettings();
      toast.success('Logo updated — it will appear on receipts');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Logo upload failed');
    } finally {
      setUploadingLogo(false);
    }
  };

  const TABS = [
    { id: 'store', label: 'Store Profile', icon: FiHome },
    { id: 'preferences', label: 'Preferences', icon: FiSliders },
    ...(isAdmin ? [
      { id: 'users', label: 'Users', icon: FiUsers },
      { id: 'backup', label: 'Backup', icon: FiDatabase }
    ] : [])
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader title="Settings" subtitle="Configure your store, preferences and users" />

      {/* Section tabs */}
      <div className="flex gap-1.5 overflow-x-auto mb-4 bg-gray-100 p-1 rounded-xl w-fit max-w-full">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === t.id ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {loading && !settings ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse bg-gray-200 rounded-xl" />)}
        </div>
      ) : (
        <>
          {/* ================= STORE ================= */}
          {activeTab === 'store' && (
            <div className="card space-y-4">
              <h3 className="section-title">Store Profile</h3>
              <p className="text-xs text-gray-500 -mt-2">Shown on printed receipts and the app header.</p>

              {/* Logo */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                  {settings.logo ? (
                    <img src={getImageUrl(settings.logo)} alt="Store logo" className="w-full h-full object-contain" />
                  ) : (
                    <FiImage className="w-6 h-6 text-gray-300" />
                  )}
                </div>
                <div>
                  <label className="btn-secondary btn-sm cursor-pointer inline-flex items-center gap-2">
                    {uploadingLogo ? <FiLoader className="animate-spin" /> : <FiUpload />}
                    {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploadingLogo} />
                  </label>
                  <p className="text-[10px] text-gray-400 mt-1">PNG/JPG up to 5MB (Cloudinary)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Store Name</label>
                  <input
                    type="text"
                    value={storeValues.storeName}
                    onChange={(e) => setStoreForm({ ...storeValues, storeName: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="input-label">Phone</label>
                  <input
                    type="tel"
                    value={storeValues.phone}
                    onChange={(e) => setStoreForm({ ...storeValues, phone: e.target.value })}
                    className="input-field"
                    placeholder="e.g. 9876543210"
                  />
                </div>
                <div>
                  <label className="input-label">Email</label>
                  <input
                    type="email"
                    value={storeValues.email}
                    onChange={(e) => setStoreForm({ ...storeValues, email: e.target.value })}
                    className="input-field"
                    placeholder="store@example.com"
                  />
                </div>
                <div>
                  <label className="input-label">Address</label>
                  <input
                    type="text"
                    value={storeValues.address}
                    onChange={(e) => setStoreForm({ ...storeValues, address: e.target.value })}
                    className="input-field"
                    placeholder="Street, City, PIN"
                  />
                </div>
              </div>

              <div>
                <label className="input-label">Receipt Footer Message</label>
                <textarea
                  rows="2"
                  value={storeValues.receiptFooter}
                  onChange={(e) => setStoreForm({ ...storeValues, receiptFooter: e.target.value })}
                  className="input-field"
                  placeholder="Thank you for shopping with us!"
                />
              </div>

              <div className="flex justify-end pt-2 border-t border-gray-100">
                <button
                  onClick={() => saveSection(storeValues)}
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? <FiLoader className="animate-spin" /> : <FiSave />}
                  Save Store Settings
                </button>
              </div>
            </div>
          )}

          {/* ================= PREFERENCES ================= */}
          {activeTab === 'preferences' && (
            <div className="card space-y-5">
              <h3 className="section-title">Preferences</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Currency Symbol</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={prefsValues.currencySymbol}
                    onChange={(e) => setPrefsForm({ ...prefsValues, currencySymbol: e.target.value })}
                    className="input-field !w-24"
                  />
                </div>
                <div>
                  <label className="input-label">Default Tax Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={prefsValues.defaultTaxRate}
                    onChange={(e) => setPrefsForm({ ...prefsValues, defaultTaxRate: Number(e.target.value) })}
                    className="input-field"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Pre-filled when adding new products</p>
                </div>
                <div>
                  <label className="input-label">Default Payment Method</label>
                  <select
                    value={prefsValues.defaultPaymentMethod}
                    onChange={(e) => setPrefsForm({ ...prefsValues, defaultPaymentMethod: e.target.value })}
                    className="input-field"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">Pre-selected at POS checkout</p>
                </div>
                <div>
                  <label className="input-label">Theme</label>
                  <select
                    value={prefsValues.theme}
                    onChange={(e) => setPrefsForm({ ...prefsValues, theme: e.target.value })}
                    className="input-field"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-gray-100">
                {[
                  {
                    key: 'enableBarcodeScanner',
                    label: 'Barcode Scanner',
                    desc: 'Show camera barcode scanning in POS'
                  },
                  {
                    key: 'enableVisualSearch',
                    label: 'Visual Search (AI)',
                    desc: 'Image-based product recognition in POS'
                  }
                ].map((opt) => (
                  <label key={opt.key} className="flex items-start justify-between gap-3 cursor-pointer">
                    <span>
                      <span className="block text-sm font-medium text-gray-800">{opt.label}</span>
                      <span className="block text-xs text-gray-500">{opt.desc}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={Boolean(prefsValues[opt.key])}
                      onChange={(e) => setPrefsForm({ ...prefsValues, [opt.key]: e.target.checked })}
                      className="mt-1 w-5 h-5 accent-primary-600 shrink-0"
                    />
                  </label>
                ))}
              </div>

              <div className="flex justify-end pt-2 border-t border-gray-100">
                <button onClick={() => saveSection(prefsValues)} disabled={saving} className="btn-primary">
                  {saving ? <FiLoader className="animate-spin" /> : <FiSave />}
                  Save Preferences
                </button>
              </div>
            </div>
          )}

          {/* ================= USERS (admin) ================= */}
          {activeTab === 'users' && isAdmin && <UserManagement />}

          {/* ================= BACKUP (admin) ================= */}
          {activeTab === 'backup' && isAdmin && <BackupSection />}
        </>
      )}
    </div>
  );
};

export default Settings;
