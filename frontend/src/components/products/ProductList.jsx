import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiPlus, 
  FiSearch, 
  FiEdit2, 
  FiTrash2, 
  FiUpload,
  FiPackage,
  FiX
} from 'react-icons/fi';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import ProductCard from './ProductCard';
import ProductDetailsModal from './ProductDetailsModal';
import ConfirmDialog from '../common/ConfirmDialog';
import { formatCurrency } from '../../utils/formatters';
import { useDebounce } from '../../hooks/useDebounce';

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, productId: null, productName: '' });
  const [importDialog, setImportDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  const debouncedSearch = useDebounce(searchQuery, 300);
  const toast = useToast();

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (debouncedSearch) {
      searchProducts(debouncedSearch);
      setShowSuggestions(true);
    } else {
      setSearchResults([]);
      setShowSuggestions(false);
      setFilteredProducts(products);
    }
  }, [debouncedSearch, products]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/products?limit=100');
      setProducts(response.data.products || []);
      setFilteredProducts(response.data.products || []);
    } catch (error) {
      toast.error('Failed to fetch products');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const searchProducts = async (query) => {
    try {
      const response = await api.get(`/products/search?q=${query}`);
      setSearchResults(response.data);
      
      // Also filter local products for instant results
      const filtered = products.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.category?.name?.toLowerCase().includes(query.toLowerCase()) ||
        p.brand?.name?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredProducts(filtered);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/products/${deleteDialog.productId}`);
      setProducts(products.filter(p => p._id !== deleteDialog.productId));
      toast.success('Product deleted successfully');
    } catch (error) {
      toast.error('Failed to delete product');
    } finally {
      setDeleteDialog({ open: false, productId: null, productName: '' });
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      toast.info('Importing products...');
      const response = await api.post('/products/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.results) {
        toast.success(`Imported ${response.data.results.success} products. Failed: ${response.data.results.failed}`);
      }
      
      fetchProducts();
    } catch (error) {
      toast.error('Failed to import products');
    } finally {
      setImportDialog(false);
    }
  };

  const handleViewProduct = (product) => {
    setSelectedProduct(product);
    setShowDetailsModal(true);
  };

  // Fix image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    const baseUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:5000' 
      : `http://${window.location.hostname}:5000`;
    return `${baseUrl}${imagePath}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-3 text-sm text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Products</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setImportDialog(true)}
            className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm flex items-center"
          >
            <FiUpload className="mr-1" />
            <span>Import</span>
          </button>
          <Link
            to="/products/new"
            className="px-3 py-2 bg-primary-600 text-white rounded-lg text-sm flex items-center"
          >
            <FiPlus className="mr-1" />
            <span>Add</span>
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products by name, category, brand..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <FiX className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search Suggestions */}
        {showSuggestions && searchResults.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {searchResults.map((product) => (
              <div
                key={product._id}
                className="block px-3 py-2 hover:bg-gray-50 border-b last:border-b-0 cursor-pointer"
                onClick={() => {
                  handleViewProduct(product);
                  setShowSuggestions(false);
                  setSearchQuery('');
                }}
              >
                <div className="flex items-center gap-2">
                  {product.image ? (
                    <img 
                      src={getImageUrl(product.image)} 
                      alt={product.name} 
                      className="w-8 h-8 object-cover rounded"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                      <FiPackage className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                    <p className="text-xs text-gray-500">
                      {product.category?.name} • {formatCurrency(product.price)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Products Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product._id}
              product={product}
              onView={handleViewProduct}
              onDelete={(id, name) => setDeleteDialog({ open: true, productId: id, productName: name })}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg">
          <FiPackage className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No products found</p>
          <p className="text-xs text-gray-400 mt-1">Try a different search or add a new product</p>
          <Link
            to="/products/new"
            className="inline-block mt-3 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg"
          >
            Add Product
          </Link>
        </div>
      )}

      {/* Product Details Modal */}
      {showDetailsModal && selectedProduct && (
        <ProductDetailsModal
          product={selectedProduct}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedProduct(null);
          }}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, productId: null, productName: '' })}
        onConfirm={handleDelete}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteDialog.productName}"?`}
        confirmText="Delete"
        cancelText="Cancel"
      />

      {/* Import Dialog */}
      {importDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-4">
            <h3 className="text-base font-semibold mb-3">Import Products</h3>
            <p className="text-xs text-gray-600 mb-3">
              Upload a CSV or Excel file with columns: name, category, brand, mrp, price, barcode
            </p>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleImport}
              className="mb-3 w-full text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setImportDialog(false)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductList;