import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiSearch, FiEye, FiCalendar, FiX } from 'react-icons/fi';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import { formatCurrency, formatShortDate } from '../../utils/formatters';

const BillList = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0
  });

  const toast = useToast();

  useEffect(() => {
    fetchBills();
  }, [pagination.page, dateRange]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: 20,
        ...(dateRange.startDate && { startDate: dateRange.startDate }),
        ...(dateRange.endDate && { endDate: dateRange.endDate })
      });

      const response = await api.get(`/bills?${params}`);
      setBills(response.data.bills);
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
  };

  const handleSearch = async () => {
    if (searchQuery) {
      try {
        const response = await api.get(`/bills/number/${searchQuery}`);
        setBills([response.data]);
        setPagination({ page: 1, pages: 1, total: 1 });
      } catch {
        toast.error('Bill not found');
      }
    } else {
      fetchBills();
    }
  };

  const clearDateFilter = () => {
    setDateRange({ startDate: '', endDate: '' });
    setShowDateFilter(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-3 text-sm text-gray-600">Loading bills...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Bills</h1>
        <button
          onClick={() => setShowDateFilter(!showDateFilter)}
          className="p-2 bg-gray-100 text-gray-700 rounded-lg"
        >
          <FiCalendar className="w-4 h-4" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by bill number..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-3 py-2 bg-primary-600 text-white rounded-lg text-sm"
          >
            Search
          </button>
        </div>
      </div>

      {/* Date Filter */}
      {showDateFilter && (
        <div className="mb-3 p-3 bg-white rounded-lg border border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium">Filter by Date</h3>
            <button onClick={clearDateFilter} className="text-gray-400 hover:text-gray-600">
              <FiX className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              placeholder="Start Date"
            />
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              placeholder="End Date"
            />
          </div>
        </div>
      )}

      {/* Bills List */}
      {bills.length > 0 ? (
        <div className="space-y-2">
          {bills.map((bill) => (
            <Link
              key={bill._id}
              to={`/bills/${bill._id}`}
              className="block bg-white rounded-lg border border-gray-100 p-3 hover:shadow-sm transition-shadow"
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-sm font-medium text-primary-600">#{bill.billNumber}</span>
                <span className="text-xs text-gray-500">{formatShortDate(bill.createdAt)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-600">
                    {bill.customer?.name || bill.customerInfo?.name || 'Walk-in Customer'}
                  </p>
                  <p className="text-xs text-gray-400">{bill.items.length} items</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-primary-600">
                    {formatCurrency(bill.total)}
                  </p>
                  <span className={`inline-block px-2 py-0.5 text-[10px] font-medium rounded-full ${
                    bill.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {bill.paymentStatus}
                  </span>
                </div>
              </div>
            </Link>
          ))}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4">
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
                className="px-3 py-1 text-xs border rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-xs text-gray-600">
                {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-1 text-xs border rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg">
          <FiCalendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No bills found</p>
          <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
};

export default BillList;