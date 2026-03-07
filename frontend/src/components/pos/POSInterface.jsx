import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { 
  FiSearch, 
  FiCamera, 
  FiX, 
  FiShoppingBag,
  FiUser,
  FiPhone,
  FiPackage,
  FiShoppingCart,
  FiImage,
  FiLoader
} from 'react-icons/fi';
import api from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';
import Cart from './Cart';
import BarcodeScanner from './BarcodeScanner';
import VisualSearch from './VisualSearch';
import CheckoutModal from './CheckoutModal';
import { formatCurrency } from '../../utils/formatters';

const POSInterface = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [showVisualSearch, setShowVisualSearch] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  const searchInputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const debouncedSearch = useDebounce(searchQuery, 150);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (window.innerWidth >= 1024) {
        setShowCart(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 640;
  const isTablet = windowWidth >= 640 && windowWidth < 1024;
  const isDesktop = windowWidth >= 1024;

  useEffect(() => {
    loadAllProducts();
    
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadAllProducts = async () => {
    try {
      const response = await api.get('/products?limit=100');
      setAllProducts(response.data.products || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  useEffect(() => {
    if (debouncedSearch) {
      searchProducts(debouncedSearch);
      setShowSuggestions(true);
    } else {
      setSearchResults([]);
      setShowSuggestions(false);
    }
  }, [debouncedSearch]);

  const searchProducts = async (query) => {
    try {
      setLoading(true);
      const response = await api.get(`/products/search?q=${query}`);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product) => {
    setCart(prevCart => {
      const existing = prevCart.find(item => item.product._id === product._id);
      if (existing) {
        return prevCart.map(item =>
          item.product._id === product._id
            ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.price }
            : item
        );
      }
      return [...prevCart, {
        product: product,
        quantity: 1,
        price: product.price,
        subtotal: product.price
      }];
    });
    
    setSearchQuery('');
    setShowSuggestions(false);
    
    if (isMobile || isTablet) {
      setShowCart(true);
    }
    
    toast.success(`${product.name} added to cart`);
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(productId);
      return;
    }

    setCart(prevCart =>
      prevCart.map(item => {
        if (item.product._id === productId) {
          return {
            ...item,
            quantity: newQuantity,
            subtotal: newQuantity * item.price
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.product._id !== productId));
    toast.success('Item removed from cart');
    
    if ((isMobile || isTablet) && cart.length === 1) {
      setShowCart(false);
    }
  };

  const clearCart = () => {
    if (cart.length > 0 && window.confirm('Clear all items from cart?')) {
      setCart([]);
      toast.success('Cart cleared');
      if (isMobile || isTablet) {
        setShowCart(false);
      }
    }
  };

  const handleBarcodeScan = async (barcode) => {
    try {
      setLoading(true);
      const response = await api.get(`/products/search?q=${barcode}`);
      if (response.data.length > 0) {
        addToCart(response.data[0]);
      } else {
        toast.error('Product not found');
      }
    } catch (error) {
      toast.error('Error scanning product');
    } finally {
      setLoading(false);
    }
  };

  const handleVisualSearchResult = (product) => {
    addToCart(product);
    setShowVisualSearch(false);
  };

  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = cart.reduce((sum, item) => sum + (item.subtotal * (item.product.tax || 0) / 100), 0);
  const total = subtotal + tax;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setShowScanner(true);
      }
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'F3') {
        e.preventDefault();
        setShowVisualSearch(true);
      }
      if (e.key === 'F9') {
        e.preventDefault();
        if (cart.length > 0) {
          setShowCheckout(true);
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        clearCart();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart]);

  // Fix image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    const baseUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:5000' 
      : `http://${window.location.hostname}:5000`;
    return `${baseUrl}${imagePath}`;
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-t-xl">
        <div className="flex items-center justify-between">
          <h1 className="text-base sm:text-lg font-semibold flex items-center">
            <FiShoppingBag className="mr-1 sm:mr-2" />
            <span>POS</span>
          </h1>
          
          {/* Cart Toggle for Mobile/Tablet */}
          {(isMobile || isTablet) && (
            <button
              onClick={() => setShowCart(!showCart)}
              className="relative p-1.5 sm:p-2 bg-white/20 rounded-lg"
            >
              <FiShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                  {cart.length}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex bg-white rounded-b-xl shadow-lg overflow-hidden relative">
        {/* Products Section */}
        <div className={`
          ${isDesktop ? 'w-2/3' : 'w-full'}
          ${(isMobile || isTablet) && showCart ? 'hidden' : 'block'}
          overflow-y-auto p-3
        `}>
          {/* Search Section */}
          <div className="mb-4 relative" ref={suggestionsRef}>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery && setShowSuggestions(true)}
                  placeholder="Search products..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                {loading && (
                  <FiLoader className="absolute right-3 top-1/2 transform -translate-y-1/2 text-primary-600 animate-spin" />
                )}
              </div>
              <button
                onClick={() => setShowScanner(true)}
                className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center text-sm"
              >
                <FiCamera className="w-4 h-4" />
              </button>
            </div>

            {/* Search Suggestions */}
            {showSuggestions && searchResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {searchResults.map((product) => (
                  <button
                    key={product._id}
                    onClick={() => addToCart(product)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b last:border-b-0 flex items-center space-x-2"
                  >
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
                      <p className="font-medium text-gray-900 text-sm truncate">{product.name}</p>
                      <p className="text-xs text-gray-500">
                        {product.category?.name} • {formatCurrency(product.price)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* All Products Grid */}
          <div>
            <h2 className="text-sm font-semibold mb-2">All Products</h2>
            {allProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {allProducts.map((product) => (
                  <button
                    key={product._id}
                    onClick={() => addToCart(product)}
                    className="border border-gray-200 rounded-lg p-2 hover:border-primary-300 transition-all text-left"
                  >
                    {product.image ? (
                      <img 
                        src={getImageUrl(product.image)} 
                        alt={product.name} 
                        className="w-full h-16 object-contain mb-1"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-16 bg-gray-100 rounded-lg flex items-center justify-center mb-1">
                        <FiPackage className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <h3 className="font-medium text-gray-900 text-xs line-clamp-2 min-h-[2rem]">{product.name}</h3>
                    <p className="text-xs text-gray-500 mb-1 line-clamp-1">{product.category?.name}</p>
                    <p className="text-sm font-bold text-primary-600">{formatCurrency(product.price)}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FiPackage className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No products available</p>
              </div>
            )}
          </div>
        </div>

        {/* Cart Section */}
        {isDesktop ? (
          <div className="w-1/3 bg-gray-50 p-4 flex flex-col border-l border-gray-200">
            <div className="bg-white rounded-lg p-3 mb-3 shadow-sm">
              <h3 className="text-xs font-medium text-gray-700 mb-2">Customer Information</h3>
              <div className="space-y-2">
                <div className="relative">
                  <FiUser className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                  <input
                    type="text"
                    value={customer.name}
                    onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                    placeholder="Customer name (optional)"
                    className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg"
                  />
                </div>
                <div className="relative">
                  <FiPhone className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                  <input
                    type="tel"
                    value={customer.phone}
                    onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                    placeholder="Phone number (optional)"
                    className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <Cart
              cart={cart}
              updateQuantity={updateQuantity}
              removeFromCart={removeFromCart}
              clearCart={clearCart}
              subtotal={subtotal}
              tax={tax}
              total={total}
              onCheckout={() => setShowCheckout(true)}
            />
          </div>
        ) : (
          showCart && (
            <>
              <div 
                className="fixed inset-0 bg-black bg-opacity-50 z-40"
                onClick={() => setShowCart(false)}
              />
              <div className="fixed bottom-0 left-0 right-0 bg-white z-50 rounded-t-xl max-h-[80vh] overflow-y-auto">
                <div className="sticky top-0 bg-white p-3 border-b flex justify-between items-center">
                  <h2 className="text-base font-semibold">Your Cart</h2>
                  <button
                    onClick={() => setShowCart(false)}
                    className="p-1 hover:bg-gray-100 rounded-lg"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="p-3">
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <h3 className="text-xs font-medium text-gray-700 mb-2">Customer Information</h3>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={customer.name}
                        onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                        placeholder="Customer name"
                        className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg"
                      />
                      <input
                        type="tel"
                        value={customer.phone}
                        onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                        placeholder="Phone number"
                        className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg"
                      />
                    </div>
                  </div>

                  <Cart
                    cart={cart}
                    updateQuantity={updateQuantity}
                    removeFromCart={removeFromCart}
                    clearCart={clearCart}
                    subtotal={subtotal}
                    tax={tax}
                    total={total}
                    onCheckout={() => {
                      setShowCheckout(true);
                      setShowCart(false);
                    }}
                  />
                </div>
              </div>
            </>
          )
        )}
      </div>

      {/* Modals */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {showVisualSearch && (
        <VisualSearch
          onResult={handleVisualSearchResult}
          onClose={() => setShowVisualSearch(false)}
        />
      )}

      {showCheckout && (
        <CheckoutModal
          cart={cart}
          customer={customer}
          setCustomer={setCustomer}
          subtotal={subtotal}
          tax={tax}
          total={total}
          onClose={() => setShowCheckout(false)}
          onSuccess={(bill) => {
            setCart([]);
            setCustomer({ name: '', phone: '' });
            if (isMobile || isTablet) {
              setShowCart(false);
            }
            navigate(`/bills/${bill._id}`);
          }}
        />
      )}
    </div>
  );
};

export default POSInterface;