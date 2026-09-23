import React, { useState, useEffect } from 'react';
import { FiX, FiSave } from 'react-icons/fi';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

/**
 * Edit non-item fields of a bill: customer info, notes, discount, payment method.
 * Items are NEVER editable here — for item changes, create a new bill.
 */
const EditBillModal = ({ bill, onClose, onSuccess }) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    customerName: bill?.customer?.name || bill?.customerInfo?.name || '',
    customerPhone: bill?.customer?.phone || bill?.customerInfo?.phone || '',
    customerEmail: bill?.customer?.email || bill?.customerInfo?.email || '',
    discount: bill?.discount || 0,
    paymentMethod: bill?.payments?.[0]?.method || 'cash',
    notes: bill?.notes || ''
  });

  const maxDiscount = (bill?.subtotal || 0) + (bill?.taxTotal || 0);
  const discount = Number(form.discount) || 0;
  const discountInvalid = discount < 0 || discount > maxDiscount;
  const previewTotal = maxDiscount - Math.max(0, Math.min(discount, maxDiscount));

  useEffect(() => {
    const handleKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (discountInvalid) {
      toast.error(`Discount must be between 0 and ${formatCurrency(maxDiscount)}`);
      return;
    }

    try {
      setLoading(true);
      const res = await api.put(`/bills/${bill._id}`, {
        customerInfo: {
          name: form.customerName.trim(),
          phone: form.customerPhone.trim(),
          email: form.customerEmail.trim()
        },
        discount,
        paymentMethod: form.paymentMethod,
        notes: form.notes
      });
      toast.success('Bill updated');
      onSuccess(res.data);
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update bill');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] animate-backdrop" onClick={onClose} />

      <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-xl shadow-2xl animate-modal max-h-[92vh] overflow-y-auto pb-safe">
        <div className="sticky top-0 bg-white z-10 flex justify-between items-center px-4 sm:px-6 py-3.5 border-b border-gray-100 rounded-t-2xl sm:rounded-t-xl">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Edit Bill</h2>
          <button onClick={onClose} className="btn-icon" aria-label="Close">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-4 sm:px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="input-label">Customer Name</label>
              <input type="text" value={form.customerName} onChange={set('customerName')} className="input-field" placeholder="Walk-in Customer" />
            </div>
            <div>
              <label className="input-label">Phone</label>
              <input type="tel" value={form.customerPhone} onChange={set('customerPhone')} className="input-field" placeholder="Optional" />
            </div>
          </div>
          <div>
            <label className="input-label">Email</label>
            <input type="email" value={form.customerEmail} onChange={set('customerEmail')} className="input-field" placeholder="Optional" />
          </div>

          <div>
            <label className="input-label">
              Discount (₹) — <span className="text-gray-400 font-normal">max {formatCurrency(maxDiscount)}</span>
            </label>
            <input
              type="number"
              min="0"
              max={maxDiscount}
              step="0.01"
              value={form.discount}
              onChange={set('discount')}
              className={`input-field ${discountInvalid ? 'input-error' : ''}`}
            />
            {discountInvalid && (
              <p className="mt-1 text-xs text-red-600">Discount must be between 0 and {formatCurrency(maxDiscount)}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              New total: <span className="font-semibold text-primary-600">{formatCurrency(previewTotal)}</span>
            </p>
          </div>

          <div>
            <label className="input-label">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              {['cash', 'card', 'upi'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, paymentMethod: m }))}
                  className={`py-2 rounded-lg border-2 text-sm font-medium capitalize transition-all ${
                    form.paymentMethod === m
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="input-label">Notes</label>
            <textarea rows="2" value={form.notes} onChange={set('notes')} className="input-field" placeholder="Optional notes" />
          </div>

          <div className="flex gap-3 pt-3 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading || discountInvalid} className="btn-primary flex-1">
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <FiSave />
              )}
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditBillModal;
