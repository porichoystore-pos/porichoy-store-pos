import React, { useState, useEffect, useCallback } from 'react';
import {
  FiCalendar,
  FiCreditCard,
  FiSave,
  FiEdit2,
  FiTrash2,
  FiX,
  FiRefreshCw,
  FiChevronLeft,
  FiChevronRight,
  FiTrendingUp,
  FiHash
} from 'react-icons/fi';
import { BiRupee } from 'react-icons/bi';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../common/PageHeader';
import ConfirmDialog from '../common/ConfirmDialog';
import { formatCurrency } from '../../utils/formatters';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ✅ FIX: Get today's date in LOCAL timezone (not UTC)
const getLocalDateString = (date = new Date()) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const todayStr = () => getLocalDateString(new Date());

const getDayOfWeek = (dateStr) => {
  if (!dateStr) return '';
  // Parse as local date to avoid timezone shift
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  if (isNaN(d.getTime())) return '';
  return DAY_NAMES[d.getDay()];
};

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const ManualSale = () => {
  const toast = useToast();

  // Form state
  const [editingId, setEditingId] = useState(null);
  const [date, setDate] = useState(todayStr());
  const [cash, setCash] = useState('');
  const [online, setOnline] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // List state
  const [sales, setSales] = useState([]);
  const [summary, setSummary] = useState({
    totalCash: 0,
    totalOnline: 0,
    totalAmount: 0,
    count: 0
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  // Filter state
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');

  // Confirm dialog state
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, date: '' });

  const total = (Number(cash) || 0) + (Number(online) || 0);
  const dayOfWeek = getDayOfWeek(date);

  // Load sales list
  const fetchSales = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: 30 });
      if (filterStart) params.append('startDate', filterStart);
      if (filterEnd) params.append('endDate', filterEnd);

      const res = await api.get(`/daily-sales?${params}`);
      setSales(res.data.sales || []);
      setSummary(res.data.summary || {
        totalCash: 0,
        totalOnline: 0,
        totalAmount: 0,
        count: 0
      });
      setPages(res.data.pages || 1);
    } catch (error) {
      console.error('Failed to load daily sales:', error);
      toast.error('Failed to load daily sales');
    } finally {
      setLoading(false);
    }
  }, [page, filterStart, filterEnd, toast]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  // Reset form
  const resetForm = () => {
    setEditingId(null);
    setDate(todayStr());
    setCash('');
    setOnline('');
    setNotes('');
  };

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!date) {
      toast.error('Please select a date');
      return;
    }

    const cashAmount = Number(cash) || 0;
    const onlineAmount = Number(online) || 0;

    if (cashAmount === 0 && onlineAmount === 0) {
      toast.error('Please enter at least one amount');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        date,
        cash: cashAmount,
        online: onlineAmount,
        notes: notes.trim()
      };

      if (editingId) {
        await api.put(`/daily-sales/${editingId}`, payload);
        toast.success('Entry updated');
      } else {
        await api.post('/daily-sales', payload);
        toast.success('Entry saved');
      }

      resetForm();
      fetchSales();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  // Edit handler — ✅ FIX: use local date string
  const handleEdit = (sale) => {
    setEditingId(sale._id);
    setDate(getLocalDateString(sale.date));
    setCash(sale.cash ? sale.cash.toString() : '');
    setOnline(sale.online ? sale.online.toString() : '');
    setNotes(sale.notes || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Delete handler
  const handleDelete = async () => {
    try {
      await api.delete(`/daily-sales/${deleteDialog.id}`);
      toast.success('Entry deleted');
      if (editingId === deleteDialog.id) resetForm();
      fetchSales();
    } catch (error) {
      toast.error('Failed to delete entry');
    } finally {
      setDeleteDialog({ open: false, id: null, date: '' });
    }
  };

  // Clear filters
  const clearFilters = () => {
    setFilterStart('');
    setFilterEnd('');
    setPage(1);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <PageHeader
        title="Daily Sales Tracker"
        subtitle="Track your daily cash and online sales"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card !p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
              {/* ✅ FIX: Rupee icon instead of Dollar */}
              <BiRupee className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-xs text-gray-500">Total Cash</span>
          </div>
          <p className="text-lg font-bold text-gray-900">
            {formatCurrency(summary.totalCash)}
          </p>
        </div>

        <div className="card !p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <FiCreditCard className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-xs text-gray-500">Total Online</span>
          </div>
          <p className="text-lg font-bold text-gray-900">
            {formatCurrency(summary.totalOnline)}
          </p>
        </div>

        <div className="card !p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
              {/* ✅ FIX: Rupee icon instead of Dollar */}
              <BiRupee className="w-5 h-5 text-primary-600" />
            </div>
            <span className="text-xs text-gray-500">Grand Total</span>
          </div>
          <p className="text-lg font-bold text-primary-600">
            {formatCurrency(summary.totalAmount)}
          </p>
        </div>

        <div className="card !p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <FiHash className="w-4 h-4 text-purple-600" />
            </div>
            <span className="text-xs text-gray-500">Entries</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{summary.count}</p>
        </div>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="section-title mb-0">
            {editingId ? 'Edit Entry' : 'Add New Entry'}
          </h3>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <FiX className="w-3 h-3" />
              Cancel Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Date */}
          <div>
            <label className="input-label">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              max={todayStr()}
              onChange={(e) => setDate(e.target.value)}
              className="input-field"
              required
            />
          </div>

          {/* Day of week (auto) */}
          <div>
            <label className="input-label">Day</label>
            <div className="input-field !bg-gray-50 flex items-center">
              <FiCalendar className="w-4 h-4 text-gray-400 mr-2" />
              <span className={dayOfWeek ? 'text-gray-900' : 'text-gray-400'}>
                {dayOfWeek || 'Auto-filled'}
              </span>
            </div>
          </div>

          {/* Total (auto) */}
          <div>
            <label className="input-label">Total</label>
            <div className="input-field !bg-primary-50 flex items-center justify-between">
              <span className="text-xs text-gray-500">Auto</span>
              <span className="font-bold text-primary-600">
                {formatCurrency(total)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Cash */}
          <div>
            <label className="input-label">Cash Amount (₹)</label>
            <div className="relative">
              {/* ✅ FIX: Rupee icon instead of Dollar */}
              <BiRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="number"
                value={cash}
                onChange={(e) => setCash(e.target.value)}
                min="0"
                step="0.01"
                placeholder="0.00"
                className="input-field pl-9"
              />
            </div>
          </div>

          {/* Online */}
          <div>
            <label className="input-label">Online Amount (₹)</label>
            <div className="relative">
              <BiRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="number"
                value={online}
                onChange={(e) => setOnline(e.target.value)}
                min="0"
                step="0.01"
                placeholder="0.00"
                className="input-field pl-9"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="input-label">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows="2"
            placeholder="Optional notes..."
            className="input-field"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={resetForm}
            className="btn-secondary"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <FiSave />
                {editingId ? 'Update Entry' : 'Save Entry'}
              </>
            )}
          </button>
        </div>
      </form>

      {/* Filter + List */}
      <div className="card">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <h3 className="section-title mb-0">Entries History</h3>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={filterStart}
              onChange={(e) => { setFilterStart(e.target.value); setPage(1); }}
              className="input-field !py-1.5 !text-xs !w-36"
              placeholder="From"
            />
            <span className="text-xs text-gray-400">to</span>
            <input
              type="date"
              value={filterEnd}
              onChange={(e) => { setFilterEnd(e.target.value); setPage(1); }}
              className="input-field !py-1.5 !text-xs !w-36"
              placeholder="To"
            />
            {(filterStart || filterEnd) && (
              <button
                onClick={clearFilters}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                Clear
              </button>
            )}
            <button
              onClick={fetchSales}
              className="btn-icon !w-8 !h-8"
              aria-label="Refresh"
            >
              <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Desktop Table */}
        {sales.length > 0 ? (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide py-3 px-3">
                      Date
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide py-3 px-3">
                      Day
                    </th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide py-3 px-3">
                      Cash
                    </th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide py-3 px-3">
                      Online
                    </th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide py-3 px-3">
                      Total
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide py-3 px-3">
                      Notes
                    </th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide py-3 px-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr
                      key={sale._id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                        {formatDateDisplay(sale.date)}
                      </td>
                      <td className="py-3 px-3 text-sm text-gray-600">
                        {sale.dayOfWeek}
                      </td>
                      <td className="py-3 px-3 text-sm text-right text-green-600 font-medium whitespace-nowrap">
                        {formatCurrency(sale.cash)}
                      </td>
                      <td className="py-3 px-3 text-sm text-right text-blue-600 font-medium whitespace-nowrap">
                        {formatCurrency(sale.online)}
                      </td>
                      <td className="py-3 px-3 text-sm text-right font-bold text-primary-600 whitespace-nowrap">
                        {formatCurrency(sale.total)}
                      </td>
                      <td className="py-3 px-3 text-xs text-gray-500 max-w-[200px] truncate">
                        {sale.notes || '—'}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleEdit(sale)}
                            className="btn-icon !w-8 !h-8 text-blue-600 hover:bg-blue-50"
                            aria-label="Edit"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteDialog({
                                open: true,
                                id: sale._id,
                                date: formatDateDisplay(sale.date)
                              })
                            }
                            className="btn-icon !w-8 !h-8 text-red-500 hover:bg-red-50"
                            aria-label="Delete"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {sales.map((sale) => (
                <div
                  key={sale._id}
                  className="border border-gray-200 rounded-xl p-3 space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatDateDisplay(sale.date)}
                      </p>
                      <p className="text-xs text-gray-500">{sale.dayOfWeek}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(sale)}
                        className="btn-icon !w-8 !h-8 text-blue-600 hover:bg-blue-50"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          setDeleteDialog({
                            open: true,
                            id: sale._id,
                            date: formatDateDisplay(sale.date)
                          })
                        }
                        className="btn-icon !w-8 !h-8 text-red-500 hover:bg-red-50"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-gray-500">Cash</p>
                      <p className="font-semibold text-green-600">
                        {formatCurrency(sale.cash)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Online</p>
                      <p className="font-semibold text-blue-600">
                        {formatCurrency(sale.online)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Total</p>
                      <p className="font-bold text-primary-600">
                        {formatCurrency(sale.total)}
                      </p>
                    </div>
                  </div>

                  {sale.notes && (
                    <p className="text-xs text-gray-500 pt-1 border-t border-gray-100">
                      {sale.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-icon !w-8 !h-8 disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <FiChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-gray-600">
                  Page {page} of {pages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page === pages}
                  className="btn-icon !w-8 !h-8 disabled:opacity-40"
                  aria-label="Next page"
                >
                  <FiChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <FiCalendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm">No entries yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Add your first entry using the form above
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, id: null, date: '' })}
        onConfirm={handleDelete}
        title="Delete Entry"
        message={`Are you sure you want to delete the entry for "${deleteDialog.date}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default ManualSale;