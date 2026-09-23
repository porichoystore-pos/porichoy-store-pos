import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FiSearch, FiFilter, FiX, FiFileText } from 'react-icons/fi';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import { formatCurrency, formatShortDate } from '../../utils/formatters';
import { ListSkeleton } from '../common/Skeletons';
import PageHeader from '../common/PageHeader';
import EmptyState from '../common/EmptyState';
import Badge from '../common/Badge';
import { useDebounce } from '../../hooks/useDebounce';

const BillBadges = ({ bill }) => (
  <span className="flex items-center gap-1.5 flex-wrap">
    {bill.isVoided ? (
      <Badge variant="danger">Voided</Badge>
    ) : (
      <Badge variant={bill.paymentStatus === 'paid' ? 'success' : 'warning'}>
        {bill.paymentStatus}
      </Badge>
    )}
    {bill.isManual && <Badge variant="info">Manual</Badge>}
  </span>
);

const customerName = (bill) =>
  bill.customer?.name || bill.customerInfo?.name || 'Walk-in Customer';

const BillList = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    paymentMethod: '',
    status: 'active',
    customer: ''
  });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const toast = useToast();
  const debouncedCustomer = useDebounce(filters.customer, 400);

  const fetchBills = useCallback(async (page = 1, f = filters) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 20,
        ...(f.startDate && { startDate: f.startDate }),
        ...(f.endDate && { endDate: f.endDate }),
        ...(f.paymentMethod && { paymentMethod: f.paymentMethod }),
        ...(f.status && f.status !== 'active' && { status: f.status }),
        ...(f.customer && { customer: f.customer })
      });

      const response = await api.get(`/bills?${params}`);
      setBills(response.data.bills || []);
      setPagination({
        page: response.data.page,
        pages: response.data.pages,
        total: response.data.total
      });
    } catch (error) {
      toast.error('Failed to fetch bills');
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  // Refetch when filters change (reset to page 1)
  useEffect(() => {
    fetchBills(1, { ...filters, customer: debouncedCustomer });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.startDate, filters.endDate, filters.paymentMethod, filters.status, debouncedCustomer]);

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) {
      fetchBills(1);
      return;
    }
    try {
      const response = await api.get(`/bills/number/${encodeURIComponent(q)}`);
      setBills([response.data]);
      setPagination({ page: 1, pages: 1, total: 1 });
    } catch {
      toast.error('Bill not found');
      setBills([]);
      setPagination({ page: 1, pages: 1, total: 0 });
    }
  };

  const setFilter = (key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const clearFilters = () => {
    setFilters({ startDate: '', endDate: '', paymentMethod: '', status: 'active', customer: '' });
    setSearchQuery('');
  };

  const hasActiveFilters =
    filters.startDate || filters.endDate || filters.paymentMethod ||
    filters.customer || filters.status !== 'active';

  if (loading && bills.length === 0) {
    return <ListSkeleton rows={8} />;
  }

  return (
    <div className="px-3 py-4">
      <PageHeader title="Bills" subtitle={`${pagination.total} bills`}>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn-icon ${showFilters || hasActiveFilters ? 'bg-primary-100 text-primary-600' : ''}`}
          aria-label="Toggle filters"
        >
          <FiFilter className="w-4 h-4" />
        </button>
      </PageHeader>

      {/* Bill-number search */}
      <div className="mb-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by bill number (BILL-… or MAN-…)"
              className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
              aria-label="Search by bill number"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); fetchBills(1); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <FiX className="w-4 h-4" />
              </button>
            )}
          </div>
          <button onClick={handleSearch} className="btn-primary btn-sm self-center">Search</button>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="mb-3 p-3 bg-white rounded-xl border border-gray-100 animate-fade-in space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className="input-label !text-xs">From</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilter('startDate', e.target.value)}
                className="input-field !py-2 !text-xs"
              />
            </div>
            <div>
              <label className="input-label !text-xs">To</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilter('endDate', e.target.value)}
                className="input-field !py-2 !text-xs"
              />
            </div>
            <div>
              <label className="input-label !text-xs">Payment</label>
              <select
                value={filters.paymentMethod}
                onChange={(e) => setFilter('paymentMethod', e.target.value)}
                className="input-field !py-2 !text-xs"
              >
                <option value="">All methods</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="upi">UPI</option>
                <option value="mixed">Split / Mixed</option>
              </select>
            </div>
            <div>
              <label className="input-label !text-xs">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilter('status', e.target.value)}
                className="input-field !py-2 !text-xs"
              >
                <option value="active">Active</option>
                <option value="voided">Voided</option>
                <option value="all">All</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="text"
                value={filters.customer}
                onChange={(e) => setFilter('customer', e.target.value)}
                placeholder="Filter by customer name or phone..."
                className="input-field !py-2 !text-xs"
              />
            </div>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="btn-ghost btn-sm text-red-600">
                <FiX className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* List / table / empty */}
      {bills.length === 0 ? (
        <EmptyState
          icon={FiFileText}
          title="No bills found"
          description={hasActiveFilters ? 'Try adjusting your filters' : 'Bills will appear here after checkout'}
        />
      ) : (
        <>
          {/* 📱 Mobile: cards */}
          <div className="space-y-2 md:hidden">
            {bills.map((bill) => (
              <Link
                key={bill._id}
                to={`/bills/${bill._id}`}
                className={`block bg-white rounded-xl border p-3 hover:shadow-sm transition-shadow ${
                  bill.isVoided ? 'border-red-100 opacity-75' : 'border-gray-100'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-medium text-primary-600 flex items-center gap-1.5">
                    #{bill.billNumber}
                    {bill.isManual && <Badge variant="info">Manual</Badge>}
                  </span>
                  <span className="text-xs text-gray-500">{formatShortDate(bill.createdAt)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-600 truncate">{customerName(bill)}</p>
                    <p className="text-[10px] text-gray-400">{bill.items.length} items</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-primary-600">{formatCurrency(bill.total)}</p>
                    <BillBadges bill={bill} />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* 🖥️ Desktop: table */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs text-gray-500 border-b border-gray-100">
                    <th className="px-4 py-3 font-medium">Bill No</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Items</th>
                    <th className="px-4 py-3 font-medium">Payment</th>
                    <th className="px-4 py-3 font-medium text-right">Total</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {bills.map((bill) => (
                    <tr key={bill._id} className={`hover:bg-gray-50 transition-colors ${bill.isVoided ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-3">
                        <Link to={`/bills/${bill._id}`} className="font-medium text-primary-600 hover:underline flex items-center gap-1.5">
                          #{bill.billNumber}
                          {bill.isManual && <Badge variant="info">Manual</Badge>}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatShortDate(bill.createdAt)}</td>
                      <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate">{customerName(bill)}</td>
                      <td className="px-4 py-3 text-gray-500">{bill.items.length}</td>
                      <td className="px-4 py-3 capitalize text-gray-600">
                        {bill.payments.length > 1 ? 'split' : bill.payments[0]?.method || '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(bill.total)}</td>
                      <td className="px-4 py-3"><BillBadges bill={bill} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-4">
              <button
                onClick={() => fetchBills(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="btn-secondary btn-sm"
              >
                Previous
              </button>
              <span className="text-xs text-gray-600">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => fetchBills(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="btn-secondary btn-sm"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BillList;
