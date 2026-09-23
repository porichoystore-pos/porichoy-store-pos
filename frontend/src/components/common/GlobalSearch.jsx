import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiPackage, FiTag, FiUsers, FiFileText, FiX, FiClock, FiLoader } from 'react-icons/fi';
import api from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';
import { formatCurrency, formatShortDate } from '../../utils/formatters';

const RECENT_KEY = 'porichoy_recent_searches';
const MAX_RECENT = 5;

const loadRecentSearches = () => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
  } catch {
    return [];
  }
};

const SECTIONS = {
  products: { label: 'Products', icon: FiPackage },
  categories: { label: 'Categories', icon: FiTag },
  customers: { label: 'Customers', icon: FiUsers },
  bills: { label: 'Bills', icon: FiFileText }
};

const GlobalSearch = ({ isMobileSearchOpen, onCloseMobile }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [searching, setSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState(loadRecentSearches);

  const inputRef = useRef(null);
  const boxRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();
  const debouncedQuery = useDebounce(query, 250);

  // Grouped results → flat list for keyboard navigation
  const flatResults = useMemo(() => {
    if (!results) return [];
    const flat = [];
    if (results.products?.length) results.products.forEach((p) => flat.push({ type: 'products', item: p }));
    if (results.categories?.length) results.categories.forEach((c) => flat.push({ type: 'categories', item: c }));
    if (results.customers?.length) results.customers.forEach((c) => flat.push({ type: 'customers', item: c }));
    if (results.bills?.length) results.bills.forEach((b) => flat.push({ type: 'bills', item: b }));
    return flat;
  }, [results]);

  const totalResults = flatResults.length;
  const hasQuery = query.trim().length > 0;

  useEffect(() => {
    if (!hasQuery) {
      setResults(null);
      setHighlight(-1);
      return;
    }
    const doSearch = async () => {
      try {
        setSearching(true);
        const res = await api.get(`/search?q=${encodeURIComponent(debouncedQuery)}`);
        setResults(res.data);
        setHighlight(res.data && Object.values(res.data).some((g) => g.length > 0) ? 0 : -1);
      } catch {
        setResults({ products: [], categories: [], customers: [], bills: [] });
      } finally {
        setSearching(false);
      }
    };
    doSearch();
  }, [debouncedQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Outside click
  useEffect(() => {
    const close = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const saveRecent = (term) => {
    const t = term.trim();
    if (!t) return;
    const next = [t, ...recentSearches.filter((r) => r.toLowerCase() !== t.toLowerCase())].slice(0, MAX_RECENT);
    setRecentSearches(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch { /* ignore */ }
  };

  const goTo = (entry) => {
    saveRecent(query || entry.item.name || entry.item.billNumber || '');
    setOpen(false);
    setQuery('');
    onCloseMobile?.();
    if (entry.type === 'products') navigate('/products', { state: { search: entry.item.name } });
    else if (entry.type === 'categories') navigate('/categories');
    else if (entry.type === 'customers') navigate('/customers');
    else if (entry.type === 'bills') navigate(`/bills/${entry.item._id}`);
  };

  const handleKey = (e) => {
    if (e.key === 'Escape') {
      setOpen(false);
      onCloseMobile?.();
      return;
    }
    const count = hasQuery ? totalResults : recentSearches.length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((i) => (i + 1) % Math.max(count, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((i) => (i - 1 + Math.max(count, 1)) % Math.max(count, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!hasQuery && recentSearches[highlight]) {
        setQuery(recentSearches[highlight]);
        return;
      }
      if (flatResults[highlight]) goTo(flatResults[highlight]);
    }
    setTimeout(() => {
      listRef.current?.children[highlight]?.scrollIntoView({ block: 'nearest' });
    }, 0);
  };

  // Render one result row by section type
  const renderRow = (entry, index) => {
    const active = index === highlight;
    const base = `w-full px-3 py-2.5 flex items-center gap-2.5 text-left transition-colors ${
      active ? 'bg-primary-50' : 'hover:bg-gray-50'
    }`;

    if (entry.type === 'products') {
      const p = entry.item;
      return (
        <button key={`p-${p._id}`} type="button" onClick={() => goTo(entry)} className={base}>
          <FiPackage className="w-4 h-4 text-gray-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
            <p className="text-[11px] text-gray-500 truncate">
              {p.category?.name}{p.brand?.name ? ` · ${p.brand.name}` : ''} · {p.stock} in stock
            </p>
          </div>
          <span className="text-xs font-semibold text-primary-600 shrink-0">{formatCurrency(p.price)}</span>
        </button>
      );
    }
    if (entry.type === 'categories') {
      const c = entry.item;
      return (
        <button key={`c-${c._id}`} type="button" onClick={() => goTo(entry)} className={base}>
          <FiTag className="w-4 h-4 shrink-0" style={{ color: c.color || '#9ca3af' }} />
          <span className="text-sm text-gray-900 truncate">{c.name}</span>
          <span className="ml-auto text-[10px] text-gray-400 capitalize">{c.type}</span>
        </button>
      );
    }
    if (entry.type === 'customers') {
      const c = entry.item;
      return (
        <button key={`x-${c._id}`} type="button" onClick={() => goTo(entry)} className={base}>
          <FiUsers className="w-4 h-4 text-gray-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm text-gray-900 truncate">{c.name}</p>
            <p className="text-[11px] text-gray-500">{c.phone}</p>
          </div>
        </button>
      );
    }
    const b = entry.item;
    return (
      <button key={`b-${b._id}`} type="button" onClick={() => goTo(entry)} className={base}>
        <FiFileText className="w-4 h-4 text-gray-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 truncate">#{b.billNumber}</p>
          <p className="text-[11px] text-gray-500">{formatShortDate(b.createdAt)}</p>
        </div>
        <span className="text-xs font-semibold text-primary-600 shrink-0">{formatCurrency(b.total)}</span>
      </button>
    );
  };

  const searchInput = (
    <div className="relative">
      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKey}
        placeholder="Search products, bills, customers..."
        aria-label="Global search"
        className="w-full pl-9 pr-8 py-2 text-sm bg-gray-100 border border-transparent rounded-lg focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-colors"
      />
      {searching ? (
        <FiLoader className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-600 animate-spin" />
      ) : query ? (
        <button
          onClick={() => { setQuery(''); setResults(null); }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          aria-label="Clear search"
        >
          <FiX className="w-4 h-4" />
        </button>
      ) : null}
    </div>
  );

  const dropdown = open && (
    <div
      ref={listRef}
      className="bg-white border border-gray-200 rounded-xl shadow-xl max-h-[60vh] overflow-y-auto animate-fade-in"
    >
      {/* Results */}
      {hasQuery && totalResults > 0 && (
        Object.keys(SECTIONS).map((section) => {
          const items = results?.[section] || [];
          if (items.length === 0) return null;
          return (
            <div key={section}>
              <p className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 sticky top-0">
                {SECTIONS[section].label}
              </p>
              {items.map((item) => {
                const idx = flatResults.findIndex((f) => f.item._id === item._id && f.type === section);
                return renderRow({ type: section, item }, idx);
              })}
            </div>
          );
        })
      )}

      {/* No results */}
      {hasQuery && !searching && results && totalResults === 0 && (
        <p className="px-4 py-6 text-sm text-gray-500 text-center">
          No results for <span className="font-medium">"{query}"</span>
        </p>
      )}

      {/* Recent searches */}
      {!hasQuery && recentSearches.length > 0 && (
        <div>
          <p className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 flex items-center gap-1">
            <FiClock className="w-3 h-3" /> Recent searches
          </p>
          {recentSearches.map((r, i) => (
            <button
              key={r}
              type="button"
              onClick={() => setQuery(r)}
              className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${
                highlight === i ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {!hasQuery && recentSearches.length === 0 && (
        <p className="px-4 py-6 text-xs text-gray-400 text-center">Type to search across the store</p>
      )}
    </div>
  );

  // 📱 Mobile: full-screen overlay search
  if (isMobileSearchOpen) {
    return (
      <div className="fixed inset-0 z-50 bg-white animate-fade-in">
        <div className="p-3 border-b border-gray-100 flex items-center gap-2">
          <button onClick={onCloseMobile} className="btn-icon" aria-label="Close search">
            <FiX className="w-5 h-5" />
          </button>
          <div className="flex-1" ref={boxRef}>{searchInput}</div>
        </div>
        <div className="p-3">{dropdown}</div>
      </div>
    );
  }

  // 🖥️ Desktop: inline with dropdown
  return (
    <div className="relative w-full max-w-sm" ref={boxRef}>
      {searchInput}
      {open && <div className="absolute left-0 right-0 top-full mt-1.5 z-50">{dropdown}</div>}
    </div>
  );
};

export default GlobalSearch;
