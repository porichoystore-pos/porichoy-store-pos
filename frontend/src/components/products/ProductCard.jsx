import React from 'react';
import { Link } from 'react-router-dom';
import { FiEdit2, FiTrash2, FiPackage, FiEye } from 'react-icons/fi';
import { formatCurrency } from '../../utils/formatters';
import { getImageUrl } from '../../services/api'; // Import the helper

const ProductCard = ({ product, onDelete, onView }) => {
  const discount = ((product.mrp - product.price) / product.mrp * 100).toFixed(0);
  
  // Use the centralized helper for image URL
  const imageUrl = product.image ? getImageUrl(product.image) : null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      {/* Product Image - Click to view details */}
      <div 
        className="relative aspect-square bg-gray-50 cursor-pointer"
        onClick={() => onView(product)}
      >
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={product.name} 
            className="w-full h-full object-contain p-2"
            onError={(e) => {
              e.target.onerror = null;
              e.target.style.display = 'none';
              e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center"><FiPackage class="w-8 h-8 text-gray-300" /></div>';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FiPackage className="w-8 h-8 text-gray-300" />
          </div>
        )}
        
        {/* Discount Badge */}
        {discount > 0 && discount < 100 && (
          <div className="absolute top-1 left-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            {discount}% OFF
          </div>
        )}

        {/* View Details Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center">
          <FiEye className="w-6 h-6 text-white opacity-0 hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Product Details */}
      <div className="p-2">
        {/* Product Name - Click to view details */}
        <h3 
          className="text-xs font-medium text-gray-900 mb-1 line-clamp-2 min-h-[2rem] cursor-pointer hover:text-primary-600"
          onClick={() => onView(product)}
          title={product.name}
        >
          {product.name}
        </h3>
        
        {/* Category & Brand */}
        <div className="flex items-center text-[10px] text-gray-500 mb-1">
          <span className="truncate">{product.category?.name || 'Uncategorized'}</span>
          {product.brand && (
            <>
              <span className="mx-1">•</span>
              <span className="text-primary-600 truncate">{product.brand?.name}</span>
            </>
          )}
        </div>

        {/* Price */}
        <div className="flex items-baseline justify-between mb-2">
          <div>
            <p className="text-sm font-bold text-primary-600">{formatCurrency(product.price)}</p>
            <p className="text-[10px] text-gray-400 line-through">{formatCurrency(product.mrp)}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-1 pt-1 border-t border-gray-100">
          <button
            onClick={() => onView(product)}
            className="p-1.5 text-gray-600 hover:bg-gray-50 rounded-md"
            title="View Details"
          >
            <FiEye className="w-3.5 h-3.5" />
          </button>
          <Link
            to={`/products/edit/${product._id}`}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md"
            title="Edit Product"
          >
            <FiEdit2 className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={() => onDelete(product._id, product.name)}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md"
            title="Delete Product"
          >
            <FiTrash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;