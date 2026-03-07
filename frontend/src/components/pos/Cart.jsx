import React from 'react';
import { FiPlus, FiMinus, FiTrash2, FiShoppingBag } from 'react-icons/fi';
import { formatCurrency } from '../../utils/formatters';

const Cart = ({ cart, updateQuantity, removeFromCart, clearCart, subtotal, tax, total, onCheckout }) => {
  return (
    <>
      {/* Cart Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold flex items-center">
          <FiShoppingBag className="mr-2 text-primary-600" />
          Cart ({cart.length} items)
        </h2>
        {cart.length > 0 && (
          <button
            onClick={clearCart}
            className="text-sm text-red-600 hover:text-red-700 px-3 py-1 bg-red-50 rounded-full"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {cart.length > 0 ? (
          cart.map((item) => (
            <div key={item.product._id} className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{item.product.name}</h3>
                  <p className="text-sm text-gray-500">{item.product.category?.name}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatCurrency(item.price)} each
                  </p>
                </div>
                <button
                  onClick={() => removeFromCart(item.product._id)}
                  className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex justify-between items-center mt-3">
                <div className="flex items-center border border-gray-200 rounded-lg">
                  <button
                    onClick={() => updateQuantity(item.product._id, item.quantity - 1)}
                    className="p-2 hover:bg-gray-100 rounded-l-lg transition-colors"
                    disabled={item.quantity <= 1}
                  >
                    <FiMinus className={`w-4 h-4 ${item.quantity <= 1 ? 'text-gray-300' : 'text-gray-600'}`} />
                  </button>
                  <span className="w-12 text-center font-medium">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.product._id, item.quantity + 1)}
                    className="p-2 hover:bg-gray-100 rounded-r-lg transition-colors"
                  >
                    <FiPlus className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
                <p className="font-bold text-primary-600">
                  {formatCurrency(item.subtotal)}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <FiShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Cart is empty</p>
            <p className="text-sm text-gray-400 mt-2">Search products to get started</p>
            <div className="mt-6 flex justify-center space-x-2 text-xs text-gray-400">
              <span className="px-2 py-1 bg-gray-100 rounded">F1: Scan</span>
              <span className="px-2 py-1 bg-gray-100 rounded">F2: Search</span>
              <span className="px-2 py-1 bg-gray-100 rounded">F3: Visual</span>
            </div>
          </div>
        )}
      </div>

      {/* Cart Summary */}
      {cart.length > 0 && (
        <div className="border-t pt-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal:</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tax:</span>
            <span className="font-medium">{formatCurrency(tax)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-2 border-t">
            <span>Total:</span>
            <span className="text-primary-600">{formatCurrency(total)}</span>
          </div>

          <button
            onClick={onCheckout}
            className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-3 rounded-lg font-medium hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg hover:shadow-xl mt-4"
          >
            Generate Bill (F9)
          </button>
        </div>
      )}
    </>
  );
};

export default Cart;