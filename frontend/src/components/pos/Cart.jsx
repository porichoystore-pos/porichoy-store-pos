import React from 'react';
import { FiPlus, FiMinus, FiTrash2, FiShoppingBag, FiTag } from 'react-icons/fi';
import { formatCurrency } from '../../utils/formatters';
import { getImageUrl } from '../../services/api';

const QtyButton = ({ onClick, disabled, children, label }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    className="w-11 h-11 flex items-center justify-center hover:bg-gray-100 disabled:opacity-40 transition-colors"
  >
    {children}
  </button>
);

const CartItem = ({ item, updateQuantity, onRequestRemove }) => {
  const imageUrl = item.product.image ? getImageUrl(item.product.image) : null;

  return (
    <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
      <div className="flex gap-3">
        {/* Image */}
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={item.product.name}
            loading="lazy"
            className="w-12 h-12 rounded-lg object-cover bg-gray-50 border border-gray-100 shrink-0"
            onError={(e) => {
              e.target.onerror = null;
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
            <FiShoppingBag className="w-5 h-5 text-gray-300" />
          </div>
        )}

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-gray-900 line-clamp-1">{item.product.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {formatCurrency(item.price)} each
                {item.product.tax > 0 && ` · +${item.product.tax}% tax`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onRequestRemove(item.product._id)}
              className="p-2 -m-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
              aria-label={`Remove ${item.product.name}`}
            >
              <FiTrash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Quantity + subtotal */}
          <div className="flex justify-between items-center mt-2">
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white">
              <QtyButton
                onClick={() => updateQuantity(item.product._id, item.quantity - 1)}
                disabled={item.quantity <= 1}
                label="Decrease quantity"
              >
                <FiMinus className="w-4 h-4 text-gray-600" />
              </QtyButton>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                value={item.quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) {
                    updateQuantity(item.product._id, Math.max(1, val));
                  }
                }}
                aria-label="Quantity"
                className="w-12 text-center text-sm font-semibold py-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <QtyButton
                onClick={() => updateQuantity(item.product._id, item.quantity + 1)}
                label="Increase quantity"
              >
                <FiPlus className="w-4 h-4 text-gray-600" />
              </QtyButton>
            </div>
            <p className="text-sm font-bold text-primary-600">{formatCurrency(item.subtotal)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};


const Cart = ({
  cart,
  updateQuantity,
  onRequestRemove,
  onRequestClear,
  subtotal,
  tax,
  discount,
  discountType,
  onDiscountChange,
  discountAmount,
  total,
  onCheckout
}) => {
  return (
    <>
      {/* Cart Header */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="section-title flex items-center">
          <FiShoppingBag className="mr-2 text-primary-600" />
          Cart {cart.length > 0 && <span className="text-gray-400 font-normal">({cart.length})</span>}
        </h2>
        {cart.length > 0 && (
          <button
            type="button"
            onClick={onRequestClear}
            className="btn-ghost btn-sm text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto space-y-2 mb-3">
        {cart.length > 0 ? (
          cart.map((item) => (
            <CartItem
              key={item.product._id}
              item={item}
              updateQuantity={updateQuantity}
              onRequestRemove={onRequestRemove}
            />
          ))
        ) : (
          <div className="text-center py-10">
            <FiShoppingBag className="w-14 h-14 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 text-sm font-medium">Cart is empty</p>
            <p className="text-xs text-gray-400 mt-1">
              Search, tap a product, or scan a barcode
            </p>
          </div>
        )}
      </div>

      {/* Totals + Discount + Checkout */}
      {cart.length > 0 && (
        <div className="border-t border-gray-100 pt-3 space-y-2.5">
          {/* Discount control */}
          <div className="flex items-center gap-2">
            <FiTag className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-xs font-medium text-gray-600 shrink-0">Discount</span>
            <div className="flex-1 flex items-center gap-2">
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => onDiscountChange(discount, 'fixed')}
                  className={`px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                    discountType === 'fixed'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  ₹
                </button>
                <button
                  type="button"
                  onClick={() => onDiscountChange(discount, 'percentage')}
                  className={`px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                    discountType === 'percentage'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  %
                </button>
              </div>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                max={discountType === 'percentage' ? 100 : undefined}
                value={discount || ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onDiscountChange(isNaN(val) ? 0 : Math.max(0, val), discountType);
                }}
                placeholder="0"
                aria-label="Discount amount"
                className="w-20 px-2 py-1.5 text-xs border border-gray-300 rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-right"
              />
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tax</span>
            <span className="font-medium">{formatCurrency(tax)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-green-600">Discount</span>
              <span className="font-medium text-green-600">-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-100">
            <span>Total</span>
            <span className="text-primary-600">{formatCurrency(total)}</span>
          </div>

          <button
            type="button"
            onClick={onCheckout}
            className="btn-primary w-full !py-3 mt-1 text-base"
          >
            Generate Bill (F9)
          </button>
        </div>
      )}
    </>
  );
};

// Memoized — cart only re-renders when its props change,
// not on every keystroke in the POS search box
export default React.memo(Cart);