import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { 
  FiX, 
  FiUser, 
  FiPhone, 
  FiMail, 
  FiDollarSign, 
  FiCreditCard, 
  FiSmartphone,
  FiPrinter,
  FiCheckCircle
} from 'react-icons/fi';
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

const CheckoutModal = ({ cart, customer, setCustomer, subtotal, tax, total, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('fixed'); // 'fixed' or 'percentage'
  const [notes, setNotes] = useState('');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [generatedBill, setGeneratedBill] = useState(null);
  
  const toast = useToast();

  const searchCustomers = async (query) => {
    if (query.length < 2) return;
    try {
      const response = await api.get(`/customers/search?q=${query}`);
      setCustomerResults(response.data);
    } catch (error) {
      console.error('Customer search error:', error);
    }
  };

  const selectCustomer = (selected) => {
    setCustomer({
      id: selected._id,
      name: selected.name,
      phone: selected.phone,
      email: selected.email
    });
    setCustomerResults([]);
    setSearchCustomer(selected.name);
  };

  // Calculate discount
  const calculateDiscount = () => {
    if (discountType === 'percentage') {
      return (total * discount) / 100;
    }
    return discount;
  };

  const discountAmount = calculateDiscount();
  const finalTotal = total - discountAmount;

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setLoading(true);
    try {
      // Prepare the bill data - REMOVED price from items
      const billData = {
        items: cart.map(item => ({
          product: item.product._id,
          quantity: item.quantity
          // PRICE IS REMOVED - backend will use database price
        })),
        payments: [{
          method: paymentMethod,
          amount: finalTotal,
          status: 'completed'
        }],
        discount: discountAmount,
        notes: notes || ''
      };

      // Add customer data if provided
      if (customer.id) {
        billData.customer = customer.id;
      } else if (customer.name || customer.phone) {
        billData.customerInfo = {
          name: customer.name || 'Walk-in Customer',
          phone: customer.phone || ''
        };
      }

      console.log('📤 Sending bill data:', JSON.stringify(billData, null, 2));

      const response = await api.post('/bills', billData);
      setGeneratedBill(response.data);
      setShowSuccess(true);
      
      toast.success('Bill generated successfully');
      
      // Wait a moment then call onSuccess
      setTimeout(() => {
        onSuccess(response.data);
        onClose();
      }, 2000);
      
    } catch (error) {
      console.error('❌ Checkout error:', error.response?.data || error);
      toast.error(error.response?.data?.message || 'Failed to generate bill');
    } finally {
      setLoading(false);
    }
  };

  const paymentMethods = [
    { id: 'cash', name: 'Cash', icon: FiDollarSign, color: 'green' },
    { id: 'card', name: 'Card', icon: FiCreditCard, color: 'blue' },
    { id: 'upi', name: 'UPI', icon: FiSmartphone, color: 'purple' }
  ];

  // Success View
  if (showSuccess && generatedBill) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiCheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Bill Generated!</h2>
          <p className="text-gray-600 mb-4">Bill No: {generatedBill.billNumber}</p>
          <p className="text-3xl font-bold text-primary-600 mb-6">
            {formatCurrency(generatedBill.total)}
          </p>
          <button
            onClick={() => {
              // Use fetch with token header instead of URL parameter
              const printBill = async () => {
                try {
                  const token = localStorage.getItem('token');
                  const response = await fetch(`http://localhost:5000/api/bills/${generatedBill._id}/print`, {
                    headers: {
                      'Authorization': `Bearer ${token}`
                    }
                  });
                  
                  if (!response.ok) throw new Error('Print failed');
                  
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  window.open(url, '_blank');
                } catch (error) {
                  toast.error('Failed to print bill');
                }
              };
              printBill();
            }}
            className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 flex items-center justify-center mb-3"
          >
            <FiPrinter className="mr-2" />
            Print Bill
          </button>
          <button
            onClick={onClose}
            className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b sticky top-0 bg-white flex justify-between items-center">
          <h2 className="text-xl font-semibold">Checkout</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Customer Section */}
          <div>
            <h3 className="text-lg font-medium mb-3">Customer Information</h3>
            
            {/* Search Customer */}
            <div className="mb-3 relative">
              <input
                type="text"
                value={searchCustomer}
                onChange={(e) => {
                  setSearchCustomer(e.target.value);
                  searchCustomers(e.target.value);
                }}
                placeholder="Search existing customer..."
                className="input-field"
              />
              {customerResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {customerResults.map(c => (
                    <button
                      key={c._id}
                      onClick={() => selectCustomer(c)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b last:border-b-0"
                    >
                      <p className="font-medium">{c.name}</p>
                      <p className="text-sm text-gray-500">{c.phone}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Customer Form */}
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                  placeholder="Customer name"
                  className="input-field pl-10"
                />
              </div>
              <div className="relative">
                <FiPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                  placeholder="Phone number"
                  className="input-field pl-10"
                />
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div>
            <h3 className="text-lg font-medium mb-3">Order Summary</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              {cart.map((item) => (
                <div key={item.product._id} className="flex justify-between text-sm">
                  <span>
                    {item.product.name} x {item.quantity}
                  </span>
                  <span className="font-medium">{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
              
              {/* Discount Section */}
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Discount</span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setDiscountType('fixed')}
                      className={`px-3 py-1 text-xs rounded-full ${
                        discountType === 'fixed' 
                          ? 'bg-primary-600 text-white' 
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      Fixed
                    </button>
                    <button
                      onClick={() => setDiscountType('percentage')}
                      className={`px-3 py-1 text-xs rounded-full ${
                        discountType === 'percentage' 
                          ? 'bg-primary-600 text-white' 
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      %
                    </button>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    min="0"
                    max={discountType === 'percentage' ? 100 : total}
                    placeholder={discountType === 'percentage' ? 'Enter %' : 'Enter amount'}
                  />
                  {discountAmount > 0 && (
                    <span className="text-sm text-green-600">
                      -{formatCurrency(discountAmount)}
                    </span>
                  )}
                </div>
              </div>

              {/* Totals */}
              <div className="border-t pt-3 mt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax:</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount:</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total:</span>
                  <span className="text-primary-600">{formatCurrency(finalTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <h3 className="text-lg font-medium mb-3">Payment Method</h3>
            <div className="grid grid-cols-3 gap-3">
              {paymentMethods.map(method => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  className={`p-4 border-2 rounded-lg flex flex-col items-center space-y-2 transition-all ${
                    paymentMethod === method.id
                      ? `border-${method.color}-500 bg-${method.color}-50 text-${method.color}-600`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <method.icon className={`w-6 h-6 ${
                    paymentMethod === method.id ? `text-${method.color}-600` : 'text-gray-500'
                  }`} />
                  <span className="text-sm font-medium">{method.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows="2"
              className="input-field"
              placeholder="Any notes for this bill..."
            ></textarea>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleCheckout}
            disabled={loading || cart.length === 0}
            className="px-6 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 flex items-center"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Processing...
              </>
            ) : (
              'Generate Bill'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;