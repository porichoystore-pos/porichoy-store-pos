import React, { useState, useEffect, useRef, useCallback, Suspense, lazy, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { useSettings } from '../../context/SettingsContext';
import {
  FiSearch,
  FiCamera,
  FiX,
  FiShoppingBag,
  FiUser,
  FiPhone,
  FiPackage,
  FiShoppingCart,
  FiLoader,
  FiClock,
  FiImage
} from 'react-icons/fi';
import api, { getImageUrl } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';
import Cart from './Cart';
import ConfirmDialog from '../common/ConfirmDialog';
import EmptyState from '../common/EmptyState';
import { formatCurrency } from '../../utils/formatters';

// Heavy modals are lazy-loaded — only downloaded when the user opens them
const BarcodeScanner = lazy(() => import('./BarcodeScanner'));
const VisualSearch = lazy(() => import('./VisualSearch'));
const CheckoutModal = lazy(() => import('./CheckoutModal'));

// Minimal fallback while a modal chunk loads
const ModalFallback = () => (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
    <div className="bg-white rounded-xl p-8">
      <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
    </div>
  </div>
);

const RECENT_KEY = 'porichoy_recent_products';
const MAX_RECENT = 6;

const loadRecent = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// Highlights the matched portion of a product name in search results
const Highlight = ({ text = '', query = '' }) => {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 text-inherit rounded px-0">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
};

const POSInterface = () => {
  // ---------- Search ----------
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [searching, setSearching] = useState(false);

  // ---------- Catalog ----------
  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [recentProducts, setRecentProducts] = useState(loadRecent);

  // ---------- Cart / sale ----------
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '' });
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('fixed');

  // ---------- UI / modals ----------
  const [boughtTogether, setBoughtTogether] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [showVisualSearch, setShowVisualSearch] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, type: null, product: null });
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const searchInputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const suggestionsListRef = useRef(null);
  const debouncedSearch = useDebounce(searchQuery, 150);
  const toast = useToast();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const barcodeEnabled = settings.enableBarcodeScanner !== false;
  const visualEnabled = settings.enableVisualSearch !== false;

  // ---------- Responsive ----------
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (window.innerWidth >= 1024) setShowCart(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 640;
  const isTablet = windowWidth >= 640 && windowWidth < 1024;
  const isDesktop = windowWidth >= 1024;

  // ---------- Initial load ----------
  useEffect(() => {
    loadAllProducts();
    loadCategories();

    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAllProducts = async () => {
    try {
      const response = await api.get('/products?limit=100');
      setAllProducts(response.data.products || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await api.get('/categories?type=main');
      setCategories(Array.isArray(response.data) ? response.data : []);
    } catch {
      // Category tabs are optional — ignore failures silently
    }
  };

  // ---------- Debounced search ----------
  useEffect(() => {
    if (debouncedSearch.trim()) {
      searchProducts(debouncedSearch);
    } else {
      setSearchResults([]);
      setHighlightIndex(-1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const searchProducts = async (query) => {
    try {
      setSearching(true);
      const response = await api.get(`/products/search?q=${encodeURIComponent(query)}`);
      const results = response.data || [];
      setSearchResults(results);
      setHighlightIndex(results.length > 0 ? 0 : -1);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  // Scroll highlighted suggestion into view
  useEffect(() => {
    if (highlightIndex >= 0 && suggestionsListRef.current) {
      const el = suggestionsListRef.current.children[highlightIndex];
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIndex]);

  // ---------- Recently used products (cached in localStorage) ----------
  const addToRecent = useCallback((product) => {
    setRecentProducts((prev) => {
      const minimal = {
        _id: product._id,
        name: product.name,
        price: product.price,
        image: product.image,
        category: product.category,
        brand: product.brand,
        tax: product.tax
      };
      const next = [minimal, ...prev.filter((p) => p._id !== product._id)].slice(0, MAX_RECENT);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        // storage full / blocked — non-critical
      }
      return next;
    });
  }, []);

  // ---------- Cart actions (no stock checks) ----------
  const addToCart = useCallback((product) => {
    setCart((prevCart) => {
      const found = prevCart.find((item) => item.product._id === product._id);
      if (found) {
        return prevCart.map((item) =>
          item.product._id === product._id
            ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.price }
            : item
        );
      }
      return [...prevCart, { product, quantity: 1, price: product.price, subtotal: product.price }];
    });

    addToRecent(product);
    setSearchQuery('');
    setShowSuggestions(false);
    setHighlightIndex(-1);

    if (isMobile || isTablet) setShowCart(true);
    toast.success(`${product.name} added to cart`);
  }, [isMobile, isTablet, toast, addToRecent]);

  const updateQuantity = useCallback((productId, newQuantity) => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.product._id !== productId) return item;
        const quantity = Math.max(1, newQuantity);
        return { ...item, quantity, subtotal: quantity * item.price };
      })
    );
  }, []);

  const removeItem = useCallback((productId) => {
    setCart((prevCart) => prevCart.filter((item) => item.product._id !== productId));
    toast.success('Item removed from cart');
    setShowCart((prev) => (cart.length === 1 && prev ? false : prev));
  }, [cart.length, toast]);

  const clearCartNow = useCallback(() => {
    setCart([]);
    setDiscount(0);
    setDiscountType('fixed');
    toast.success('Cart cleared');
    if (isMobile || isTablet) setShowCart(false);
  }, [isMobile, isTablet, toast]);

  // ---------- Confirmation dialogs ----------
  const requestRemove = useCallback((productId) => {
    const product = cart.find((item) => item.product._id === productId)?.product;
    setConfirmDialog({ open: true, type: 'remove', product: { id: productId, name: product?.name || 'this item' } });
  }, [cart]);

  const requestClear = useCallback(() => {
    if (cart.length === 0) return;
    setConfirmDialog({ open: true, type: 'clear', product: null });
  }, [cart.length]);

  const handleConfirm = useCallback(() => {
    if (confirmDialog.type === 'remove' && confirmDialog.product) {
      removeItem(confirmDialog.product.id);
    } else if (confirmDialog.type === 'clear') {
      clearCartNow();
    }
    setConfirmDialog({ open: false, type: null, product: null });
  }, [confirmDialog, removeItem, clearCartNow]);

  // ---------- Checkout / scanners ----------
  const openCheckout = useCallback(() => setShowCheckout(true), []);
  const openCheckoutMobile = useCallback(() => {
    setShowCheckout(true);
    setShowCart(false);
  }, []);

  const handleBarcodeScan = useCallback(async (barcode) => {
    try {
      const response = await api.get(`/products/search?q=${encodeURIComponent(barcode)}`);
      if (response.data.length > 0) {
        addToCart(response.data[0]);
        setShowScanner(false);
      } else {
        toast.error(`No product found for barcode "${barcode}"`);
      }
    } catch {
      toast.error('Error scanning product');
    }
  }, [addToCart, toast]);

  const handleVisualSearchResult = useCallback((product) => {
    addToCart(product);
    setShowVisualSearch(false);
  }, [addToCart]);

  // ---------- "Bought together" recommendations ----------
  const cartIdKey = cart.map((i) => i.product._id).join(',');
  useEffect(() => {
    if (!cartIdKey) {
      setBoughtTogether([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const res = await api.get(`/products/frequently-bought?productIds=${cartIdKey}`);
        if (!cancelled) {
          setBoughtTogether((res.data || []).slice(0, 4));
        }
      } catch {
        if (!cancelled) setBoughtTogether([]);
      }
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartIdKey]);

  // ---------- Discount ----------
  const handleDiscountChange = useCallback((value, type) => {
    setDiscount(typeof value === 'number' && !isNaN(value) ? Math.max(0, value) : 0);
    setDiscountType(type === 'percentage' ? 'percentage' : 'fixed');
  }, []);

  // ---------- Totals ----------
  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = cart.reduce((sum, item) => sum + (item.subtotal * (item.product.tax || 0) / 100), 0);
  const grossTotal = subtotal + tax;
  const discountAmount =
    discountType === 'percentage'
      ? Math.min((grossTotal * discount) / 100, grossTotal)
      : Math.min(discount, grossTotal);
  const total = grossTotal - discountAmount;

  // ---------- Category-filtered grid ----------
  const visibleProducts = useMemo(() => {
    if (activeCategory === 'all') return allProducts;
    return allProducts.filter(
      (p) => p.category?._id === activeCategory || p.category === activeCategory
    );
  }, [allProducts, activeCategory]);

  // ---------- Checkout success (stay on POS) ----------
  const handleSaleSuccess = useCallback(
    () => {
      setCart([]);
      setCustomer({ name: '', phone: '', email: '' });
      setDiscount(0);
      setDiscountType('fixed');
      if (isMobile || isTablet) setShowCart(false);
      // ✅ Stay on POS — user is back to a fresh cart
    },
    [isMobile, isTablet]
  );

  // ---------- Keyboard shortcuts ----------
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target === searchInputRef.current) return;

      if (e.key === 'F1' && barcodeEnabled) {
        e.preventDefault();
        setShowScanner(true);
      } else if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F3' && visualEnabled) {
        e.preventDefault();
        setShowVisualSearch(true);
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (cart.length > 0) setShowCheckout(true);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (showScanner) setShowScanner(false);
        else if (showVisualSearch) setShowVisualSearch(false);
        else if (showCheckout) setShowCheckout(false);
        else if (confirmDialog.open) setConfirmDialog({ open: false, type: null, product: null });
        else if (showSuggestions) setShowSuggestions(false);
        else requestClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart.length, showScanner, showVisualSearch, showCheckout, showSuggestions, confirmDialog.open, requestClear, barcodeEnabled, visualEnabled]);

  // ---------- Keyboard navigation inside search suggestions ----------
  const activeList = searchQuery.trim() ? searchResults : recentProducts;

  const handleSearchKeyDown = (e) => {
    if (!showSuggestions || activeList.length === 0) {
      if (e.key === 'Escape') setShowSuggestions(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => (i + 1) % activeList.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => (i - 1 + activeList.length) % activeList.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = highlightIndex >= 0 ? activeList[highlightIndex] : activeList[0];
      if (target) addToCart(target);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowSuggestions(false);
      setHighlightIndex(-1);
    }
  };

  // ---------- Suggestion row (no stock checks) ----------
  const renderSuggestion = (product, index) => {
    return (
      <button
        key={product._id}
        type="button"
        onClick={() => addToCart(product)}
        onMouseEnter={() => setHighlightIndex(index)}
        className={`w-full px-3 py-2.5 text-left flex items-center gap-2.5 border-b border-gray-50 last:border-b-0 transition-colors ${
          index === highlightIndex ? 'bg-primary-50' : 'hover:bg-gray-50'
        }`}
      >
        {product.image ? (
          <img
            src={getImageUrl(product.image)}
            alt={product.name}
            loading="lazy"
            className="w-9 h-9 object-cover rounded shrink-0"
            onError={(e) => {
              e.target.onerror = null;
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-9 h-9 bg-gray-100 rounded flex items-center justify-center shrink-0">
            <FiPackage className="w-4 h-4 text-gray-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 text-sm truncate">
            <Highlight text={product.name} query={searchQuery.trim()} />
          </p>
          <p className="text-xs text-gray-500 truncate">
            {product.category?.name || 'Uncategorized'}
          </p>
        </div>
        <p className="text-sm font-bold text-primary-600 shrink-0">{formatCurrency(product.price)}</p>
      </button>
    );
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-t-xl">
        <div className="flex items-center justify-between">
          <h1 className="text-base sm:text-lg font-semibold flex items-center">
            <FiShoppingBag className="mr-1.5 sm:mr-2" />
            <span>Point of Sale</span>
          </h1>

          {!isDesktop && (
            <button
              onClick={() => setShowCart(!showCart)}
              className="relative p-2 bg-white/20 rounded-lg"
              aria-label="Toggle cart"
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

      {/* Main content */}
      <div className="flex-1 flex bg-white rounded-b-xl shadow-lg overflow-hidden relative min-h-0">
        {/* ================= Products section ================= */}
        <div
          className={`${
            isDesktop ? 'w-2/3' : 'w-full'
          } ${!isDesktop && showCart ? 'hidden' : 'block'} p-3 flex flex-col min-h-0`}
        >
          {/* Search bar */}
          <div className="mb-3 relative shrink-0" ref={suggestionsRef}>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search products or scan barcode..."
                  aria-label="Search products"
                  className="input-field pl-9 pr-8"
                />
                {searching ? (
                  <FiLoader className="absolute right-3 top-1/2 transform -translate-y-1/2 text-primary-600 animate-spin" />
                ) : searchQuery ? (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setShowSuggestions(false);
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label="Clear search"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                ) : null}
              </div>
              {barcodeEnabled && (
                <button
                  onClick={() => setShowScanner(true)}
                  className="btn-primary !px-3"
                  aria-label="Scan barcode (F1)"
                  title="Scan barcode (F1)"
                >
                  <FiCamera className="w-4 h-4" />
                </button>
              )}
              {visualEnabled && (
                <button
                  onClick={() => setShowVisualSearch(true)}
                  className="btn-secondary !px-3 hidden sm:inline-flex"
                  aria-label="Visual search (F3)"
                  title="Visual search (F3)"
                >
                  <FiImage className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && (
              <div className="absolute z-20 mt-1.5 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-72 overflow-y-auto animate-fade-in">
                {searchQuery.trim() ? (
                  searchResults.length > 0 ? (
                    <div ref={suggestionsListRef}>
                      {searchResults.map((product, index) => renderSuggestion(product, index))}
                    </div>
                  ) : !searching ? (
                    <div className="px-4 py-6 text-center">
                      <FiPackage className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">
                        No results for <span className="font-medium">"{searchQuery}"</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Try a different name or scan the barcode
                      </p>
                    </div>
                  ) : null
                ) : recentProducts.length > 0 ? (
                  <div ref={suggestionsListRef}>
                    <div className="px-3 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5 bg-gray-50 sticky top-0">
                      <FiClock className="w-3.5 h-3.5" />
                      Recently used
                    </div>
                    {recentProducts.map((product, index) => renderSuggestion(product, index))}
                  </div>
                ) : (
                  <div className="px-4 py-6 text-center">
                    <p className="text-xs text-gray-400">Start typing to search products</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Category filter tabs */}
          {categories.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 shrink-0 -mx-1 px-1">
              <button
                onClick={() => setActiveCategory('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  activeCategory === 'all'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat._id}
                  onClick={() => setActiveCategory(cat._id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    activeCategory === cat._id
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Bought-together strip */}
          {boughtTogether.length > 0 && (
            <div className="mb-2 shrink-0">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                Often bought with this
              </p>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {boughtTogether.map((p) => (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => addToCart(p)}
                    className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 bg-primary-50 border border-primary-100 rounded-full text-xs text-primary-700 hover:bg-primary-100 transition-colors"
                  >
                    <FiPackage className="w-3 h-3" />
                    <span className="max-w-[120px] truncate font-medium">{p.name}</span>
                    <span className="font-bold">{formatCurrency(p.price)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Product grid (no stock indicators) */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {visibleProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
                {visibleProducts.map((product) => (
                  <button
                    key={product._id}
                    type="button"
                    onClick={() => addToCart(product)}
                    className="relative border border-gray-200 bg-white rounded-xl p-2 text-left transition-all hover:border-primary-400 hover:shadow-md active:scale-[0.98]"
                  >
                    <div className="relative">
                      {product.image ? (
                        <img
                          src={getImageUrl(product.image)}
                          alt={product.name}
                          loading="lazy"
                          className="w-full h-20 sm:h-24 object-contain mb-1.5"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-20 sm:h-24 bg-gray-100 rounded-lg flex items-center justify-center mb-1.5">
                          <FiPackage className="w-7 h-7 text-gray-400" />
                        </div>
                      )}
                    </div>

                    <h3 className="font-medium text-gray-900 text-xs line-clamp-2 min-h-[2rem]">
                      {product.name}
                    </h3>
                    <p className="text-[10px] text-gray-500 mb-0.5 line-clamp-1">
                      {product.category?.name}
                    </p>
                    <p className="text-sm font-bold text-primary-600">
                      {formatCurrency(product.price)}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={FiPackage}
                title="No products available"
                description={
                  activeCategory === 'all'
                    ? 'Add products to start selling'
                    : 'No products in this category'
                }
              />
            )}
          </div>

          {/* Keyboard shortcut hints */}
          <div className="hidden lg:flex items-center justify-center gap-3 pt-2 text-[10px] text-gray-400 shrink-0">
            {barcodeEnabled && <span><kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200 font-mono">F1</kbd> Scan</span>}
            <span><kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200 font-mono">F2</kbd> Search</span>
            {visualEnabled && <span><kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200 font-mono">F3</kbd> Visual</span>}
            <span><kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200 font-mono">F9</kbd> Checkout</span>
            <span><kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200 font-mono">Esc</kbd> Clear cart</span>
          </div>
        </div>

        {/* ================= Cart: desktop sidebar ================= */}
        {isDesktop && (
          <div className="w-1/3 bg-gray-50 p-4 flex flex-col border-l border-gray-200">
            <div className="bg-white rounded-xl p-3 mb-3 shadow-sm border border-gray-100">
              <h3 className="text-xs font-medium text-gray-700 mb-2">Customer (optional)</h3>
              <div className="space-y-2">
                <div className="relative">
                  <FiUser className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                  <input
                    type="text"
                    value={customer.name}
                    onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                    placeholder="Customer name"
                    className="input-field !py-2 pl-8 !text-xs"
                  />
                </div>
                <div className="relative">
                  <FiPhone className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                  <input
                    type="tel"
                    value={customer.phone}
                    onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                    placeholder="Phone number"
                    className="input-field !py-2 pl-8 !text-xs"
                  />
                </div>
              </div>
            </div>

            <Cart
              cart={cart}
              updateQuantity={updateQuantity}
              onRequestRemove={requestRemove}
              onRequestClear={requestClear}
              subtotal={subtotal}
              tax={tax}
              discount={discount}
              discountType={discountType}
              onDiscountChange={handleDiscountChange}
              discountAmount={discountAmount}
              total={total}
              onCheckout={openCheckout}
            />
          </div>
        )}

        {/* ================= Cart: mobile/tablet bottom sheet ================= */}
        {!isDesktop && showCart && (
          <>
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40 animate-backdrop"
              onClick={() => setShowCart(false)}
            />
            <div className="fixed bottom-0 left-0 right-0 bg-white z-50 rounded-t-2xl max-h-[85vh] overflow-y-auto animate-slide-up pb-safe">
              <div className="sticky top-0 bg-white p-3 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-base font-semibold">Your Cart</h2>
                <button
                  onClick={() => setShowCart(false)}
                  className="btn-icon"
                  aria-label="Close cart"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3">
                <div className="bg-gray-50 rounded-xl p-3 mb-3 border border-gray-100">
                  <h3 className="text-xs font-medium text-gray-700 mb-2">Customer (optional)</h3>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={customer.name}
                      onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                      placeholder="Customer name"
                      className="input-field !text-xs"
                    />
                    <input
                      type="tel"
                      value={customer.phone}
                      onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                      placeholder="Phone number"
                      className="input-field !text-xs"
                    />
                  </div>
                </div>

                <Cart
                  cart={cart}
                  updateQuantity={updateQuantity}
                  onRequestRemove={requestRemove}
                  onRequestClear={requestClear}
                  subtotal={subtotal}
                  tax={tax}
                  discount={discount}
                  discountType={discountType}
                  onDiscountChange={handleDiscountChange}
                  discountAmount={discountAmount}
                  total={total}
                  onCheckout={openCheckoutMobile}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* ================= Confirmation dialog ================= */}
      <ConfirmDialog
        isOpen={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, type: null, product: null })}
        onConfirm={handleConfirm}
        title={confirmDialog.type === 'remove' ? 'Remove Item' : 'Clear Cart'}
        message={
          confirmDialog.type === 'remove'
            ? `Remove "${confirmDialog.product?.name}" from the cart?`
            : 'Remove all items from the cart?'
        }
        confirmText={confirmDialog.type === 'remove' ? 'Remove' : 'Clear All'}
        cancelText="Keep"
      />

      {/* ================= Lazy modals ================= */}
      {showScanner && (
        <Suspense fallback={<ModalFallback />}>
          <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setShowScanner(false)} />
        </Suspense>
      )}

      {showVisualSearch && (
        <Suspense fallback={<ModalFallback />}>
          <VisualSearch
            onResult={handleVisualSearchResult}
            onClose={() => setShowVisualSearch(false)}
          />
        </Suspense>
      )}

      {showCheckout && (
        <Suspense fallback={<ModalFallback />}>
          <CheckoutModal
            cart={cart}
            customer={customer}
            setCustomer={setCustomer}
            subtotal={subtotal}
            tax={tax}
            total={grossTotal}
            discount={discount}
            discountType={discountType}
            onDiscountChange={handleDiscountChange}
            onClose={() => setShowCheckout(false)}
            onSuccess={handleSaleSuccess}
          />
        </Suspense>
      )}
    </div>
  );
};

export default POSInterface;