import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiPrinter, FiArrowLeft, FiXCircle, FiDownload } from 'react-icons/fi';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import ConfirmDialog from '../common/ConfirmDialog';

const BillDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [voidDialog, setVoidDialog] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  useEffect(() => {
    fetchBill();
  }, [id]);

  const fetchBill = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/bills/${id}`);
      setBill(response.data);
    } catch (error) {
      toast.error('Failed to fetch bill');
      navigate('/bills');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printBill = async () => {
      try {
        const token = localStorage.getItem('token');
        
        // Get the base URL dynamically
        const baseUrl = window.location.hostname === 'localhost' 
          ? 'http://localhost:5000' 
          : `http://${window.location.hostname}:5000`;
        
        console.log('Printing from:', baseUrl); // For debugging
        
        const response = await fetch(`${baseUrl}/api/bills/${id}/print`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Print error response:', errorText);
          throw new Error(`Print failed: ${response.status}`);
        }
        
        const blob = await response.blob();
        
        // Check if blob is PDF
        if (blob.type !== 'application/pdf') {
          console.error('Received non-PDF response:', blob.type);
          throw new Error('Invalid response format');
        }
        
        const url = window.URL.createObjectURL(blob);
        
        // Try to open in new window
        const printWindow = window.open(url, '_blank');
        
        if (!printWindow) {
          // If popup blocked, create a download link
          const link = document.createElement('a');
          link.href = url;
          link.download = `bill-${bill?.billNumber || id}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => window.URL.revokeObjectURL(url), 100);
        } else {
          // Auto-trigger print when window loads
          printWindow.onload = () => {
            printWindow.print();
          };
        }
      } catch (error) {
        console.error('Print error:', error);
        toast.error('Failed to print bill. Please check your connection.');
      }
    };
    
    printBill();
  };

  const handleVoid = async () => {
    if (!voidReason) {
      toast.error('Please provide a reason for voiding');
      return;
    }

    try {
      await api.put(`/bills/${id}/void`, { reason: voidReason });
      toast.success('Bill voided successfully');
      fetchBill();
      setVoidDialog(false);
      setVoidReason('');
    } catch (error) {
      toast.error('Failed to void bill');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-3 text-sm text-gray-600">Loading bill details...</p>
        </div>
      </div>
    );
  }

  if (!bill) return null;

  // Get customer name and phone from either customer object or customerInfo
  const customerName = bill.customer?.name || bill.customerInfo?.name || 'Walk-in Customer';
  const customerPhone = bill.customer?.phone || bill.customerInfo?.phone || '';
  const customerEmail = bill.customer?.email || bill.customerInfo?.email || '';

  return (
    <div className="px-3 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/bills')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <FiArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Bill Details</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="px-3 py-2 bg-primary-600 text-white rounded-lg text-sm flex items-center"
          >
            <FiPrinter className="mr-1 w-3.5 h-3.5" />
            Print
          </button>
          {!bill.isVoided && (
            <button
              onClick={() => setVoidDialog(true)}
              className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm flex items-center"
            >
              <FiXCircle className="mr-1 w-3.5 h-3.5" />
              Void
            </button>
          )}
        </div>
      </div>

      {/* Bill Status */}
      {bill.isVoided && (
        <div className="bg-red-50 border-l-4 border-red-400 p-3">
          <p className="text-xs text-red-700">
            This bill has been voided. Reason: {bill.voidReason}
          </p>
        </div>
      )}

      {/* Bill Info Cards */}
      <div className="space-y-3">
        {/* Bill Information */}
        <div className="bg-white rounded-lg border border-gray-100 p-3">
          <h3 className="text-xs font-medium text-gray-500 mb-2">Bill Information</h3>
          <div className="space-y-1.5">
            <p className="text-xs">
              <span className="text-gray-500">Bill No:</span>
              <span className="ml-2 font-medium">{bill.billNumber}</span>
            </p>
            <p className="text-xs">
              <span className="text-gray-500">Date:</span>
              <span className="ml-2">{formatDate(bill.createdAt)}</span>
            </p>
            <p className="text-xs">
              <span className="text-gray-500">Cashier:</span>
              <span className="ml-2">{bill.createdBy?.username}</span>
            </p>
            <p className="text-xs">
              <span className="text-gray-500">Status:</span>
              <span className={`ml-2 px-2 py-0.5 text-[10px] font-medium rounded-full ${
                bill.isVoided ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
              }`}>
                {bill.isVoided ? 'Voided' : 'Active'}
              </span>
            </p>
          </div>
        </div>

        {/* Customer Information */}
        <div className="bg-white rounded-lg border border-gray-100 p-3">
          <h3 className="text-xs font-medium text-gray-500 mb-2">Customer Information</h3>
          <div className="space-y-1.5">
            <p className="text-xs">
              <span className="text-gray-500">Name:</span>
              <span className="ml-2 font-medium">{customerName}</span>
            </p>
            {customerPhone && (
              <p className="text-xs">
                <span className="text-gray-500">Phone:</span>
                <span className="ml-2">{customerPhone}</span>
              </p>
            )}
          </div>
        </div>

        {/* Payment Summary */}
        <div className="bg-white rounded-lg border border-gray-100 p-3">
          <h3 className="text-xs font-medium text-gray-500 mb-2">Payment Summary</h3>
          <div className="space-y-1.5">
            <p className="text-xs">
              <span className="text-gray-500">Method:</span>
              <span className="ml-2 font-medium capitalize">{bill.payments[0]?.method}</span>
            </p>
            <p className="text-xs">
              <span className="text-gray-500">Status:</span>
              <span className={`ml-2 px-2 py-0.5 text-[10px] font-medium rounded-full ${
                bill.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {bill.paymentStatus}
              </span>
            </p>
            {bill.notes && (
              <p className="text-xs">
                <span className="text-gray-500">Notes:</span>
                <span className="ml-2">{bill.notes}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        <div className="px-3 py-2 border-b bg-gray-50">
          <h3 className="text-xs font-semibold">Items</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {bill.items.map((item, index) => (
            <div key={index} className="p-3">
              <div className="flex justify-between items-start mb-1">
                <p className="text-xs font-medium text-gray-900 flex-1">{item.name}</p>
                <p className="text-xs font-semibold text-primary-600">{formatCurrency(item.subtotal)}</p>
              </div>
              <div className="flex justify-between text-[10px] text-gray-500">
                <span>Qty: {item.quantity} × {formatCurrency(item.price)}</span>
                {item.barcode && <span>#{item.barcode}</span>}
              </div>
            </div>
          ))}
        </div>
        
        {/* Totals */}
        <div className="border-t bg-gray-50 p-3 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Subtotal:</span>
            <span className="font-medium">{formatCurrency(bill.subtotal)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Tax:</span>
            <span className="font-medium">{formatCurrency(bill.taxTotal)}</span>
          </div>
          {bill.discount > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Discount:</span>
              <span className="font-medium text-green-600">-{formatCurrency(bill.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold pt-1.5 border-t">
            <span>Total:</span>
            <span className="text-primary-600">{formatCurrency(bill.total)}</span>
          </div>
        </div>
      </div>

      {/* Void Confirmation Dialog */}
      <ConfirmDialog
        isOpen={voidDialog}
        onClose={() => {
          setVoidDialog(false);
          setVoidReason('');
        }}
        onConfirm={handleVoid}
        title="Void Bill"
        message={
          <div>
            <p className="text-xs text-gray-500 mb-3">
              Are you sure you want to void this bill? This action cannot be undone.
            </p>
            <input
              type="text"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Enter reason for voiding"
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg"
              autoFocus
            />
          </div>
        }
        confirmText="Void Bill"
        cancelText="Cancel"
      />
    </div>
  );
};

export default BillDetails;