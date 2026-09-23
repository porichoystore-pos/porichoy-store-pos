import React, { useState, useEffect } from 'react';
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
  FiCheckCircle,
  FiCheck
} from 'react-icons/fi';
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import { useSettings } from '../../context/SettingsContext';

const CheckoutModal = ({
  cart,
  customer,
  setCustomer,
  subtotal,
  tax,
  total,
  discount,
  discountType,
  onDiscountChange,
  onClose,
  onSuccess
}) => {
  const { settings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(settings.defaultPaymentMethod || 'cash');
  const [splitPayment, setSplitPayment] = useState(false);
  const [cashAmount, setCashAmount] = useState('');
  const [cardAmount, setCardAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [generatedBill, setGeneratedBill] = useState(null);

  const toast = useToast();

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const setDiscount = (value) => onDiscountChange(value, discountType);
  const setDiscountType = (type) => onDiscountChange(discount, type);

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

  // Calculate discount — rounded to 2 decimals
  const calculateDiscount = () => {
    let amt;
    if (discountType === 'percentage') {
      amt = (total * discount) / 100;
    } else {
      amt = discount;
    }
    return Math.round(amt * 100) / 100;
  };

  const discountAmount = calculateDiscount();
  const finalTotal = Math.round((total - discountAmount) * 100) / 100;

  // Build payments array — single method or split cash+card
  const buildPayments = () => {
    if (splitPayment) {
      const cash = Number(cashAmount) || 0;
      const card = Number(cardAmount) || 0;
      return [
        { method: 'cash', amount: cash, status: 'completed' },
        { method: 'card', amount: card, status: 'completed' }
      ];
    }
    return [{ method: paymentMethod, amount: finalTotal, status: 'completed' }];
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (splitPayment) {
      const cash = Number(cashAmount) || 0;
      const card = Number(cardAmount) || 0;
      if (cash <= 0 || card <= 0) {
        toast.error('Enter both cash and card amounts for split payment');
        return;
      }
      if (Math.abs(cash + card - finalTotal) > 0.01) {
        toast.error(`Split total (₹${cash + card}) must equal bill total (${formatCurrency(finalTotal)})`);
        return;
      }
    }

    setLoading(true);
    try {
      const billData = {
        items: cart.map(item => ({
          product: item.product._id,
          quantity: item.quantity
        })),
        payments: buildPayments(),
        discount: discountAmount,
        notes: notes || ''
      };

      if (customer.id) {
        billData.customer = customer.id;
      } else if (customer.name || customer.phone) {
        billData.customerInfo = {
          name: customer.name || 'Walk-in Customer',
          phone: customer.phone || '',
          email: customer.email || ''
        };
      }

      const response = await api.post('/bills', billData);
      setGeneratedBill(response.data);
      setShowSuccess(true);

      toast.success('Bill generated successfully');
    } catch (error) {
      console.error('❌ Checkout error:', error.response?.data || error);
      toast.error(error.response?.data?.message || 'Failed to generate bill');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Opens bill in a new tab AND downloads it (two separate blob URLs)
  const handlePrint = async () => {
    if (!generatedBill) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${api.defaults.baseURL}/bills/${generatedBill._id}/print`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) throw new Error('Print failed');

      const blob = await response.blob();

      // Two separate blob URLs — one for tab, one for download.
      // Prevents "Couldn't download - Network issue" that happens
      // when a single blob URL is used by both actions.
      const viewUrl = window.URL.createObjectURL(blob);
      const downloadUrl = window.URL.createObjectURL(blob);

      // 1) Open in new tab so user can view/print
      window.open(viewUrl, '_blank');

      // 2) Trigger download with correct filename
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `bill-${generatedBill.billNumber}.pdf`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cleanup both URLs after 60s
      setTimeout(() => {
        window.URL.revokeObjectURL(viewUrl);
        window.URL.revokeObjectURL(downloadUrl);
      }, 60000);
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to open bill');
    }
  };

  // Complete → clear cart, close modal, return to POS
  const handleComplete = () => {
    onSuccess(generatedBill);
    onClose();
  };

  const paymentMethods = [
    { id: 'cash', name: 'Cash', icon: FiDollarSign },
    { id: 'card', name: 'Card', icon: FiCreditCard },
    { id: 'upi', name: 'UPI', icon: FiSmartphone }
  ];

  const paymentActiveStyles = {
    cash: 'border-green-500 bg-green-50 text-green-600',
    card: 'border-blue-500 bg-blue-50 text-blue-600',
    upi: 'border-purple-500 bg-purple-50 text-purple-600'
  };

  // ============================================
  // SUCCESS VIEW
  // ============================================
  if (showSuccess && generatedBill) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 animate-backdrop">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 text-center shadow-2xl animate-modal">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiCheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Bill Generated!</h2>
          <p className="text-sm text-gray-500 mb-4">
            Print or complete the sale to continue
          </p>
          <div className="bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 mb-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Bill Number</p>
            <p className="text-lg font-bold text-gray-900 font-mono tracking-wide">
              {generatedBill.billNumber}
            </p>
          </div>
          <p className="text-3xl font-bold text-primary-600 mb-6">
            {formatCurrency(generatedBill.total)}
          </p>

          <button
            onClick={handlePrint}
            className="btn-primary w-full !py-3 mb-3"
          >
            <FiPrinter />
            Print / Save Bill
          </button>
          <button
            onClick={handleComplete}
            className="btn-secondary w-full !py-3 flex items-center justify-center gap-2"
          >
            <FiCheck className="w-4 h-4" />
            Complete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] animate-backdrop" onClick={onClose} />
      <div className="relative bg-white w-full max-w-2xl rounded-t-2xl sm:rounded-xl max-h-[92vh] overflow-y-auto shadow-2xl animate-modal pb-safe">
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
              <div className="relative md:col-span-2">
                <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={customer.email || ''}
                  onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                  placeholder="Email address (optional)"
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
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium">Payment Method</h3>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={splitPayment}
                  onChange={(e) => {
                    setSplitPayment(e.target.checked);
                    if (e.target.checked) {
                      const half = (finalTotal / 2).toFixed(2);
                      setCashAmount(half);
                      setCardAmount((finalTotal - Number(half)).toFixed(2));
                    }
                  }}
                  className="w-4 h-4 accent-primary-600"
                />
                <span className="text-xs sm:text-sm text-gray-600">Split (Cash + Card)</span>
              </label>
            </div>

            {!splitPayment ? (
              <div className="grid grid-cols-3 gap-3">
                {paymentMethods.map(method => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={`p-3 sm:p-4 border-2 rounded-lg flex flex-col items-center space-y-2 transition-all ${
                      paymentMethod === method.id
                        ? paymentActiveStyles[method.id]
                        : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <method.icon className="w-6 h-6" />
                    <span className="text-sm font-medium">{method.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <FiDollarSign className="w-5 h-5 text-green-600 shrink-0" />
                  <label className="text-sm text-gray-600 w-14">Cash</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    className="input-field flex-1"
                    placeholder="0.00"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <FiCreditCard className="w-5 h-5 text-blue-600 shrink-0" />
                  <label className="text-sm text-gray-600 w-14">Card</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={cardAmount}
                    onChange={(e) => setCardAmount(e.target.value)}
                    className="input-field flex-1"
                    placeholder="0.00"
                  />
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                  <span className="text-gray-600">Split total</span>
                  <span className={`font-semibold ${
                    Math.abs((Number(cashAmount) || 0) + (Number(cardAmount) || 0) - finalTotal) < 0.01
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {formatCurrency((Number(cashAmount) || 0) + (Number(cardAmount) || 0))}
                    {' / '}
                    {formatCurrency(finalTotal)}
                  </span>
                </div>
              </div>
            )}
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