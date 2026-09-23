import React, { useState, useEffect } from 'react';
import { FiX, FiPackage } from 'react-icons/fi';
import { formatCurrency } from '../../utils/formatters';
import api, { getImageUrl } from '../../services/api';

const ProductDetailsModal = ({ product: initialProduct, onClose }) => {
  // Allow browsing related products inside the same modal
  const [product, setProduct] = useState(initialProduct);
  const [related, setRelated] = useState([]);

  useEffect(() => {
    setProduct(initialProduct);
  }, [initialProduct]);

  useEffect(() => {
    setRelated([]);
    if (!product?._id) return;
    let cancelled = false;
    api.get(`/products/${product._id}/related`)
      .then((res) => { if (!cancelled) setRelated(res.data || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [product?._id]);

  if (!product) return null;

  // Use the centralized Cloudinary-compatible helper
  const imageUrl = product.image ? getImageUrl(product.image) : null;
  const discount = product.mrp > 0 ? ((product.mrp - product.price) / product.mrp * 100).toFixed(0) : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-sm sm:max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex justify-between items-center z-10">
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
            <div className="aspect-square max-w-[220px] mx-auto bg-white rounded-lg overflow-hidden">
              {imageUrl ? (
                <img 
                  src={imageUrl} 
                  alt={product.name} 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                    if (e.target.parentElement) {
                      e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg></div>';
                    }
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
                <span className="text-sm font-medium text-green-600">
                  {discount}% ({formatCurrency(product.mrp - product.price)})
                </span>
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
          {/* Related products ("You may also like") */}
          {related.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">You may also like</h3>
              <div className="grid grid-cols-2 gap-2">
                {related.map((p) => (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => setProduct(p)}
                    className="flex items-center gap-2 p-2 rounded-lg border border-gray-100 hover:border-primary-300 hover:bg-primary-50/50 text-left transition-colors"
                  >
                    {p.image ? (
                      <img
                        src={getImageUrl(p.image)}
                        alt={p.name}
                        loading="lazy"
                        className="w-9 h-9 rounded object-cover shrink-0"
                        onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-9 h-9 bg-gray-100 rounded flex items-center justify-center shrink-0">
                        <FiPackage className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">{p.name}</p>
                      <p className="text-[10px] text-primary-600 font-semibold">{formatCurrency(p.price)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
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