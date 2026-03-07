import React, { useRef } from 'react';
import { useReactToPrint } from 'react-print';
import { formatCurrency, formatDate } from '../../utils/formatters';

const PrintBill = ({ bill, onClose }) => {
  const componentRef = useRef();

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    onAfterPrint: onClose
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b sticky top-0 bg-white flex justify-between items-center">
          <h2 className="text-lg font-semibold">Print Preview</h2>
          <div className="space-x-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Print
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>

        <div ref={componentRef} className="p-8 bg-white">
          {/* Bill Content - Printable Version */}
          <div className="max-w-md mx-auto">
            {/* Header */}
            <div className="text-center border-b pb-4 mb-4">
              <h1 className="text-2xl font-bold text-primary-600">PORICHOY STORE</h1>
              <p className="text-sm text-gray-600">Point of Sale System</p>
              <p className="text-xs text-gray-500">123 Main Street, City - 123456</p>
              <p className="text-xs text-gray-500">Phone: +91 9876543210</p>
            </div>

            {/* Bill Info */}
            <div className="mb-4 text-sm">
              <div className="flex justify-between">
                <span>Bill No: {bill.billNumber}</span>
                <span>Date: {formatDate(bill.createdAt)}</span>
              </div>
              <div className="mt-2">
                <span>Cashier: {bill.createdBy?.username}</span>
              </div>
              <div className="mt-2">
                <span>Customer: {bill.customer?.name || bill.customerInfo?.name || 'Walk-in Customer'}</span>
                {bill.customer?.phone && <span> | Phone: {bill.customer.phone}</span>}
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="border-t border-b">
                  <th className="py-2 text-left">Item</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Price</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {bill.items.map((item, index) => (
                  <tr key={index}>
                    <td className="py-1">{item.name}</td>
                    <td className="py-1 text-right">{item.quantity}</td>
                    <td className="py-1 text-right">{formatCurrency(item.price)}</td>
                    <td className="py-1 text-right">{formatCurrency(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="border-t pt-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{formatCurrency(bill.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax:</span>
                <span>{formatCurrency(bill.taxTotal)}</span>
              </div>
              {bill.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Discount:</span>
                  <span>-{formatCurrency(bill.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold mt-2">
                <span>Total:</span>
                <span>{formatCurrency(bill.total)}</span>
              </div>
            </div>

            {/* Payment Info */}
            <div className="mt-4 text-sm border-t pt-4">
              <p>Payment Method: {bill.payments[0]?.method.toUpperCase()}</p>
              <p>Payment Status: {bill.paymentStatus.toUpperCase()}</p>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-sm">
              <p>Thank you for shopping with us!</p>
              <p>Visit again</p>
              <p className="text-xs text-gray-500 mt-4">This is a computer generated invoice</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintBill;