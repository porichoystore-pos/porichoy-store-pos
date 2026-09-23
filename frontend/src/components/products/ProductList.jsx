import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
import api, { getImageUrl } from '../../services/api';
import ProductCard from './ProductCard';
import ProductDetailsModal from './ProductDetailsModal';
import ConfirmDialog from '../common/ConfirmDialog';
import PageHeader from '../common/PageHeader';
import EmptyState from '../common/EmptyState';
import { ProductGridSkeleton } from '../common/Skeletons';
import { formatCurrency } from '../../utils/formatters';
import { useDebounce } from '../../hooks/useDebounce';

const ProductList = () => {
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  // Seed from global search navigation
  const [searchQuery, setSearchQuery] = useState(location.state?.search || '');
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
      setFilteredProducts(filteredProducts.filter(p => p._id !== deleteDialog.productId));
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

  // Stable callbacks so memoized <ProductCard> skips unnecessary re-renders
  const handleViewProduct = useCallback((product) => {
    setSelectedProduct(product);
    setShowDetailsModal(true);
  }, []);

  const openDeleteDialog = useCallback((id, name) => {
    setDeleteDialog({ open: true, productId: id, productName: name });
  }, []);

  if (loading) {
    return <ProductGridSkeleton />;
  }

  return (
    <div className="px-3 py-4">
      {/* Header */}
      <PageHeader title="Products" subtitle={`${filteredProducts.length} items`}>
        <button
          onClick={() => setImportDialog(true)}
          className="btn-secondary btn-sm"
        >
          <FiUpload />
          <span className="hidden sm:inline">Import</span>
        </button>
        <Link to="/products/new" className="btn-primary btn-sm">
          <FiPlus />
          <span className="hidden sm:inline">Add</span>
        </Link>
      </PageHeader>

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
                      className="w-10 h-10 object-cover rounded"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="%239ca3af" stroke-width="2"%3E%3Cpath d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/%3E%3C/svg%3E';
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                      <FiPackage className="w-5 h-5 text-gray-400" />
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

      {/* Products Grid - Responsive: 2 cols mobile, 3 cols tablet, 4-5 cols desktop */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product._id}
              product={product}
              onView={handleViewProduct}
              onDelete={openDeleteDialog}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FiPackage}
          title="No products found"
          description="Try a different search or add a new product to get started"
          action={
            <Link to="/products/new" className="btn-primary btn-sm">
              <FiPlus /> Add Product
            </Link>
          }
        />
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
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
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