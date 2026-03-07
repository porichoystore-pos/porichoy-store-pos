import React, { useState, useEffect } from 'react';
import { FiChevronDown, FiChevronUp, FiX } from 'react-icons/fi';
import api from '../../services/api';

const ProductFilters = ({ filters, setFilters, categories, brands }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    if (filters.category) {
      fetchSubcategories(filters.category);
    } else {
      setSubcategories([]);
    }
  }, [filters.category]);

  const fetchSubcategories = async (categoryId) => {
    try {
      const response = await api.get(`/categories/${categoryId}/subcategories`);
      setSubcategories(response.data);
    } catch (error) {
      console.error('Failed to fetch subcategories:', error);
    }
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      subcategory: '',
      brand: '',
      stock: '',
      sort: 'name'
    });
  };

  const hasActiveFilters = filters.category || filters.subcategory || filters.brand || filters.stock;

  return (
    <div className="space-y-4">
      {/* Basic Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Category Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Category
          </label>
          <select
            value={filters.category}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setFilters({ ...filters, category: e.target.value, subcategory: '' });
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat._id} value={cat._id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Subcategory Filter (shown when category selected) */}
        {filters.category && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Subcategory
            </label>
            <select
              value={filters.subcategory}
              onChange={(e) => setFilters({ ...filters, subcategory: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Subcategories</option>
              {subcategories.map(sub => (
                <option key={sub._id} value={sub._id}>{sub.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Brand Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Brand
          </label>
          <select
            value={filters.brand}
            onChange={(e) => setFilters({ ...filters, brand: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">All Brands</option>
            {brands.map(brand => (
              <option key={brand._id} value={brand._id}>{brand.name}</option>
            ))}
          </select>
        </div>

        {/* Stock Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Stock Level
          </label>
          <select
            value={filters.stock}
            onChange={(e) => setFilters({ ...filters, stock: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">All Stock Levels</option>
            <option value="in">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
        </div>

        {/* Sort By */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Sort By
          </label>
          <select
            value={filters.sort}
            onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="name">Name (A-Z)</option>
            <option value="name_desc">Name (Z-A)</option>
            <option value="price">Price (Low to High)</option>
            <option value="price_desc">Price (High to Low)</option>
            <option value="stock">Stock (Low to High)</option>
            <option value="stock_desc">Stock (High to Low)</option>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Advanced Filters Toggle */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center text-sm text-primary-600 hover:text-primary-700"
        >
          {showAdvanced ? <FiChevronUp className="mr-1" /> : <FiChevronDown className="mr-1" />}
          {showAdvanced ? 'Hide Advanced Filters' : 'Show Advanced Filters'}
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center text-sm text-red-600 hover:text-red-700"
          >
            <FiX className="mr-1" />
            Clear All Filters
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t">
          {/* Price Range */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Price Range (₹)
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                placeholder="Min"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                min="0"
              />
              <span>-</span>
              <input
                type="number"
                placeholder="Max"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                min="0"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Tags
            </label>
            <input
              type="text"
              placeholder="e.g., organic, vegan, herbal"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          {/* Featured Products */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Featured
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">All Products</option>
              <option value="true">Featured Only</option>
              <option value="false">Non-Featured</option>
            </select>
          </div>

          {/* Rating Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Minimum Rating
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">Any Rating</option>
              <option value="4">4★ & above</option>
              <option value="3">3★ & above</option>
              <option value="2">2★ & above</option>
              <option value="1">1★ & above</option>
            </select>
          </div>

          {/* Expiry Date */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Expiry Status
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">All</option>
              <option value="expiring">Expiring Soon</option>
              <option value="expired">Expired</option>
              <option value="fresh">Fresh</option>
            </select>
          </div>

          {/* Manufacturer */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Manufacturer
            </label>
            <input
              type="text"
              placeholder="Enter manufacturer"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductFilters;