import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiPlus, 
  FiSearch, 
  FiEdit2, 
  FiTrash2, 
  FiPhone, 
  FiMail, 
  FiX,
  FiUsers  // 👈 Added missing import
} from 'react-icons/fi';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import CustomerForm from './CustomerForm';
import ConfirmDialog from '../common/ConfirmDialog';
import { formatCurrency, formatShortDate } from '../../utils/formatters';

const CustomerList = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, customerId: null, customerName: '' });
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0
  });

  const toast = useToast();

  useEffect(() => {
    fetchCustomers();
  }, [pagination.page]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: 20,
        ...(searchQuery && { search: searchQuery })
      });

      const response = await api.get(`/customers?${params}`);
      setCustomers(response.data.customers);
      setPagination({
        page: response.data.page,
        pages: response.data.pages,
        total: response.data.total
      });
    } catch (error) {
      toast.error('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination({ ...pagination, page: 1 });
    fetchCustomers();
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setShowForm(true);
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/customers/${deleteDialog.customerId}`);
      setCustomers(customers.filter(c => c._id !== deleteDialog.customerId));
      toast.success('Customer deleted successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete customer');
    } finally {
      setDeleteDialog({ open: false, customerId: null, customerName: '' });
    }
  };

  const handleFormSuccess = (savedCustomer) => {
    if (editingCustomer) {
      setCustomers(customers.map(c => c._id === savedCustomer._id ? savedCustomer : c));
    } else {
      fetchCustomers();
    }
    setShowForm(false);
    setEditingCustomer(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-3 text-sm text-gray-600">Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Customers</h1>
        <button
          onClick={() => {
            setEditingCustomer(null);
            setShowForm(true);
          }}
          className="px-3 py-2 bg-primary-600 text-white rounded-lg text-sm flex items-center"
        >
          <FiPlus className="mr-1" />
          Add
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by name, phone, email..."
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

      {/* Customers List */}
      {customers.length > 0 ? (
        <div className="space-y-2">
          {customers.map((customer) => (
            <div
              key={customer._id}
              className="bg-white rounded-lg border border-gray-100 p-3"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-sm font-medium text-gray-900">{customer.name}</h3>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(customer)}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <FiEdit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteDialog({ 
                      open: true, 
                      customerId: customer._id,
                      customerName: customer.name 
                    })}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1 mb-2">
                {customer.phone && (
                  <p className="text-xs text-gray-600 flex items-center">
                    <FiPhone className="w-3 h-3 mr-1" />
                    {customer.phone}
                  </p>
                )}
                {customer.email && (
                  <p className="text-xs text-gray-600 flex items-center">
                    <FiMail className="w-3 h-3 mr-1" />
                    {customer.email}
                  </p>
                )}
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">
                  Total: {formatCurrency(customer.totalPurchases || 0)}
                </span>
                <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-[10px]">
                  {customer.loyaltyPoints || 0} pts
                </span>
              </div>

              {customer.lastPurchase && (
                <p className="text-[10px] text-gray-400 mt-1">
                  Last purchase: {formatShortDate(customer.lastPurchase)}
                </p>
              )}
            </div>
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
          <FiUsers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No customers found</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-3 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg"
          >
            Add Customer
          </button>
        </div>
      )}

      {/* Customer Form Modal */}
      {showForm && (
        <CustomerForm
          customer={editingCustomer}
          onClose={() => {
            setShowForm(false);
            setEditingCustomer(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, customerId: null, customerName: '' })}
        onConfirm={handleDelete}
        title="Delete Customer"
        message={`Are you sure you want to delete "${deleteDialog.customerName}"?`}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default CustomerList;