import React, { useState, useRef } from 'react';
import { FiDownload, FiUpload, FiDatabase, FiAlertTriangle } from 'react-icons/fi';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const BackupSection = () => {
  const toast = useToast();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);

  const handleExport = async () => {
    try {
      setExporting(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${api.defaults.baseURL}/backup/export`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `porichoy-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Backup downloaded');
    } catch {
      toast.error('Backup export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm(`Import "${file.name}"? Existing records with the same IDs will be overwritten (data is upserted, like a git merge).`)) {
      e.target.value = '';
      return;
    }

    try {
      setImporting(true);
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed.data) throw new Error('Invalid backup format');

      await api.post('/backup/import', { data: parsed.data, collections: parsed.collections });
      toast.success('Backup imported successfully');
    } catch (error) {
      toast.error(error.message === 'Invalid backup format' ? 'Invalid backup file format' : (error.response?.data?.message || 'Import failed'));
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <h3 className="section-title flex items-center gap-2">
          <FiDatabase className="text-primary-600" /> Data Backup
        </h3>
        <p className="text-xs text-gray-500">
          Download a full JSON snapshot of your store data (products, categories, customers, bills, sales, settings). Passwords are never exported.
        </p>
        <button onClick={handleExport} disabled={exporting} className="btn-primary">
          {exporting ? (
            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Exporting...</>
          ) : (
            <><FiDownload /> Export Backup (JSON)</>
          )}
        </button>
      </div>

      <div className="card space-y-3">
        <h3 className="section-title flex items-center gap-2">
          <FiUpload className="text-amber-600" /> Restore from Backup
        </h3>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
          <FiAlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800">
            Importing merges data by record ID. Existing records are updated; new ones are added. Nothing is deleted. Passwords are not restored from backup files.
          </p>
        </div>
        <label className="btn-secondary cursor-pointer inline-flex items-center gap-2 w-fit">
          {importing ? (
            <><span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> Importing...</>
          ) : (
            <><FiUpload /> Choose Backup File</>
          )}
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleImport} className="hidden" disabled={importing} />
        </label>
      </div>
    </div>
  );
};

export default BackupSection;
