import React from 'react';
import { FiX, FiPackage } from 'react-icons/fi';
import { formatCurrency } from '../../utils/formatters';

const ProductDetailsModal = ({ product, onClose }) => {
  if (!product) return null;

  // Fix image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    const baseUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:5000' 
      : `http://${window.location.hostname}:5000`;
    return `${baseUrl}${imagePath}`;
  };

  const imageUrl = product.image ? getImageUrl(product.image) : null;
  const discount = ((product.mrp - product.price) / product.mrp * 100).toFixed(0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-sm w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Product Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiX className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Product Image */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="aspect-square max-w-[200px] mx-auto">
              {imageUrl ? (
                <img 
                  src={imageUrl} 
                  alt={product.name} 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center"><FiPackage class="w-16 h-16 text-gray-300" /></div>';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FiPackage className="w-16 h-16 text-gray-300" />
                </div>
              )}
            </div>
          </div>

          {/* Product Name */}
          <div className="mb-4">
            <h3 className="text-sm text-gray-500 mb-1">Product Name</h3>
            <p className="text-base font-medium text-gray-900">{product.name}</p>
          </div>

          {/* Category & Brand */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <h3 className="text-sm text-gray-500 mb-1">Category</h3>
              <p className="text-base font-medium text-gray-900">{product.category?.name || 'Uncategorized'}</p>
            </div>
            <div>
              <h3 className="text-sm text-gray-500 mb-1">Brand</h3>
              <p className="text-base font-medium text-gray-900">{product.brand?.name || 'No Brand'}</p>
            </div>
          </div>

          {/* Price Information */}
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Selling Price</span>
              <span className="text-xl font-bold text-primary-600">{formatCurrency(product.price)}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">MRP</span>
              <span className="text-base text-gray-400 line-through">{formatCurrency(product.mrp)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">You Save</span>
                <span className="text-sm font-medium text-green-600">{discount}% ({formatCurrency(product.mrp - product.price)})</span>
              </div>
            )}
          </div>

          {/* Barcode */}
          {product.barcode && (
            <div className="mb-3">
              <h3 className="text-sm text-gray-500 mb-1">Barcode</h3>
              <p className="text-sm font-mono bg-gray-50 p-2 rounded">{product.barcode}</p>
            </div>
          )}

          {/* Description */}
          {product.description && (
            <div className="mb-3">
              <h3 className="text-sm text-gray-500 mb-1">Description</h3>
              <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{product.description}</p>
            </div>
          )}

          {/* Additional Info */}
          <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-gray-100">
            {product.tax > 0 && (
              <div>
                <h3 className="text-xs text-gray-500 mb-1">Tax</h3>
                <p className="text-sm font-medium">{product.tax}%</p>
              </div>
            )}
            {product.stock !== undefined && (
              <div>
                <h3 className="text-xs text-gray-500 mb-1">Stock</h3>
                <p className="text-sm font-medium">{product.stock} units</p>
              </div>
            )}
          </div>
        </div>

        {/* Close Button */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailsModal;