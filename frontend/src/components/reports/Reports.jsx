import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  FiCalendar,
  FiTrendingUp,
  FiPackage,
  FiPieChart,
  FiDownload,
  FiPrinter,
  FiChevronDown
} from 'react-icons/fi';
import { BiRupee } from 'react-icons/bi';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useToast } from '../../context/ToastContext';
import api, { getImageUrl } from '../../services/api';
import PageHeader from '../common/PageHeader';
import EmptyState from '../common/EmptyState';
import Badge from '../common/Badge';
import { formatCurrency, formatShortDate } from '../../utils/formatters';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

const TABS = [
  { id: 'sales', name: 'Sales', icon: BiRupee },
  { id: 'inventory', name: 'Inventory', icon: FiPackage },
  { id: 'products', name: 'Top Products', icon: FiTrendingUp },
  { id: 'categories', name: 'Categories', icon: FiPieChart },
  { id: 'daily', name: 'Daily', icon: FiCalendar }
];

// ---- Date presets ----
const isoDay = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getPresetRange = (preset) => {
  const end = new Date();
  const start = new Date();
  switch (preset) {
    case 'today':
      break;
    case '7d':
      start.setDate(start.getDate() - 6);
      break;
    case 'month':
      start.setDate(1);
      break;
    case 'lastMonth': {
      start.setMonth(start.getMonth() - 1);
      start.setDate(1);
      end.setDate(0);
      break;
    }
    default:
      break;
  }
  return { startDate: isoDay(start), endDate: isoDay(end) };
};

const PRESETS = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 Days' },
  { id: 'month', label: 'This Month' },
  { id: 'lastMonth', label: 'Last Month' },
  { id: 'custom', label: 'Custom' }
];

// ---- Shared mini components ----
const SummaryCards = ({ cards }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
    {cards.map((c, i) => (
      <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
        <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5">{c.label}</p>
        <p className={`text-sm sm:text-base font-bold ${c.color || 'text-gray-900'}`}>{c.value}</p>
      </div>
    ))}
  </div>
);

const ChartCard = ({ title, children, height = 'h-56 sm:h-64' }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4">
    <h3 className="section-title mb-3">{title}</h3>
    <div className={height}>{children}</div>
  </div>
);

const DataTable = ({ columns, rows, sortKey, sortDir, onSort, maxHeight = 'max-h-96' }) => (
  <div className={`overflow-x-auto ${maxHeight} overflow-y-auto`}>
    <table className="w-full text-sm">
      <thead className="sticky top-0 bg-gray-50 z-10">
        <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
          {columns.map((col) => (
            <th
              key={col.key}
              onClick={col.sortable ? () => onSort(col.key) : undefined}
              className={`px-3 py-2.5 font-medium ${col.align === 'right' ? 'text-right' : ''} ${
                col.sortable ? 'cursor-pointer select-none hover:text-gray-700' : ''
              }`}
            >
              {col.label}
              {col.sortable && sortKey === col.key && (
                <span className="ml-1">{sortDir === 'desc' ? '↓' : '↑'}</span>
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">{rows}</tbody>
    </table>
  </div>
);

const Reports = () => {
  const [activeTab, setActiveTab] = useState('sales');
  const [preset, setPreset] = useState('7d');
  const [dateRange, setDateRange] = useState(() => getPresetRange('7d'));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [salesData, setSalesData] = useState(null);
  const [inventoryData, setInventoryData] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [categorySales, setCategorySales] = useState([]);
  const [dailySales, setDailySales] = useState([]);

  const [catSort, setCatSort] = useState({ key: 'totalSales', dir: 'desc' });

  const toast = useToast();
  const menuRef = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowExportMenu(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const applyPreset = (p) => {
    setPreset(p);
    if (p !== 'custom') setDateRange(getPresetRange(p));
  };

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, dateRange]);

  const fetchReports = async () => {
    setLoading(true);
    const params = new URLSearchParams({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    });
    try {
      switch (activeTab) {
        case 'sales': {
          const res = await api.get(`/reports/sales?${params}`);
          setSalesData(res.data);
          break;
        }
        case 'inventory': {
          const res = await api.get('/reports/inventory');
          setInventoryData(res.data);
          break;
        }
        case 'products': {
          const res = await api.get(`/reports/top-products?${params}&limit=20`);
          setTopProducts(res.data);
          break;
        }
        case 'categories': {
          const res = await api.get(`/reports/category-sales?${params}`);
          setCategorySales(res.data);
          break;
        }
        case 'daily': {
          const res = await api.get(`/reports/daily?${params}`);
          setDailySales(res.data);
          break;
        }
      }
    } catch (error) {
      toast.error('Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  };

  const TAB_TO_EXPORT_TYPE = {
    sales: 'sales',
    inventory: 'inventory',
    products: 'top-products',
    categories: 'category-sales',
    daily: 'daily'
  };

  const handleExport = async (format) => {
    setShowExportMenu(false);

    if (format === 'pdf') {
      window.print();
      return;
    }

    setExporting(true);
    try {
      const params = new URLSearchParams({
        type: TAB_TO_EXPORT_TYPE[activeTab],
        format,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      const token = localStorage.getItem('token');
      const res = await fetch(`${api.defaults.baseURL}/reports/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${TAB_TO_EXPORT_TYPE[activeTab]}-report-${dateRange.endDate}.${format === 'csv' ? 'csv' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const sortedCategorySales = [...categorySales].sort((a, b) => {
    const dir = catSort.dir === 'asc' ? 1 : -1;
    return (a[catSort.key] > b[catSort.key] ? 1 : -1) * dir;
  });
  const toggleCatSort = (key) =>
    setCatSort((prev) => (prev.key === key ? { key, dir: prev.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' }));

  return (
    <div className="px-3 py-4">
      <PageHeader title="Reports" subtitle={`${dateRange.startDate} → ${dateRange.endDate}`}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className={`btn-icon ${showDatePicker ? 'bg-primary-100 text-primary-600' : ''}`}
            aria-label="Change date range"
          >
            <FiCalendar className="w-4 h-4" />
          </button>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={exporting}
              className="btn-secondary btn-sm"
            >
              {exporting ? (
                <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <FiDownload />
              )}
              Export <FiChevronDown />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20 animate-fade-in">
                <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50">
                  📄 CSV file
                </button>
                <button onClick={() => handleExport('excel')} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50">
                  📊 Excel (.xlsx)
                </button>
                <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2">
                  <FiPrinter className="w-4 h-4" /> Print / PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => applyPreset(p.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              preset === p.id
                ? 'bg-primary-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {(showDatePicker || preset === 'custom') && (
        <div className="mb-4 p-3 bg-white rounded-xl border border-gray-200 animate-fade-in flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
          <div className="flex-1">
            <label className="input-label !text-xs">From</label>
            <input
              type="date"
              value={dateRange.startDate}
              max={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="input-field !py-2 !text-xs"
            />
          </div>
          <div className="flex-1">
            <label className="input-label !text-xs">To</label>
            <input
              type="date"
              value={dateRange.endDate}
              min={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="input-field !py-2 !text-xs"
            />
          </div>
          {preset === 'custom' && showDatePicker && (
            <button onClick={() => setShowDatePicker(false)} className="btn-ghost btn-sm">Done</button>
          )}
        </div>
      )}

      <div className="border-b border-gray-200 mb-4 overflow-x-auto">
        <div className="flex min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      <div id="print-area" className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse bg-gray-200 rounded-xl" />
              ))}
            </div>
            <div className="h-56 animate-pulse bg-gray-200 rounded-xl" />
          </div>
        ) : (
          <>
            {activeTab === 'sales' && salesData && (
              <>
                <SummaryCards
                  cards={[
                    { label: 'Total Sales', value: formatCurrency(salesData.summary.totalSales || 0), color: 'text-primary-700' },
                    { label: 'Total Bills', value: salesData.summary.totalBills || 0 },
                    { label: 'Average Bill', value: formatCurrency(salesData.summary.averageBill || 0) },
                    { label: 'Total Tax', value: formatCurrency(salesData.summary.totalTax || 0), color: 'text-amber-600' }
                  ]}
                />

                {salesData.sales.length > 0 ? (
                  <ChartCard title="Sales Trend">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={salesData.sales}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="_id" tick={{ fontSize: 10 }} tickFormatter={(d) => formatShortDate(d).slice(0, 6)} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v) => formatCurrency(v)} labelFormatter={(d) => formatShortDate(d)} />
                        <Line type="monotone" dataKey="total" stroke="#3B82F6" strokeWidth={2} name="Sales" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartCard>
                ) : (
                  <EmptyState icon={BiRupee} title="No sales in this period" description="Try a wider date range" />
                )}

                {salesData.byPayment?.length > 0 && (
                  <ChartCard title="Sales by Payment Method">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salesData.byPayment}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="_id" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v) => formatCurrency(v)} />
                        <Bar dataKey="total" fill="#10B981" name="Amount" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                )}
              </>
            )}

            {activeTab === 'inventory' && inventoryData && (
              <>
                <SummaryCards
                  cards={[
                    { label: 'Total Products', value: inventoryData.summary.totalProducts },
                    { label: 'Inventory Value', value: formatCurrency(inventoryData.summary.totalValue), color: 'text-green-600' },
                    { label: 'Low Stock', value: inventoryData.summary.lowStock, color: 'text-yellow-600' },
                    { label: 'Out of Stock', value: inventoryData.summary.outOfStock, color: 'text-red-600' }
                  ]}
                />

                {inventoryData.byCategory?.length > 0 && (
                  <ChartCard title="Stock Value by Category">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={inventoryData.byCategory}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ category, percent }) => `${category?.name || 'N/A'} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={70}
                          dataKey="totalValue"
                        >
                          {inventoryData.byCategory.map((_, index) => (
                            <Cell key={index} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => formatCurrency(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartCard>
                )}

                <ChartCard title={`Low Stock Products (${inventoryData.lowStockProducts?.length || 0})`}>
                  {inventoryData.lowStockProducts?.length > 0 ? (
                    <DataTable
                      columns={[
                        { key: 'name', label: 'Product' },
                        { key: 'stock', label: 'Stock', align: 'right' },
                        { key: 'alert', label: 'Alert At', align: 'right' },
                        { key: 'action', label: '', align: 'right' }
                      ]}
                      sortKey=""
                      sortDir="desc"
                      onSort={() => {}}
                      rows={inventoryData.lowStockProducts.map((p) => (
                        <tr key={p._id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-800 max-w-[180px] truncate">{p.name}</td>
                          <td className="px-3 py-2 text-right">
                            <Badge variant={p.stock === 0 ? 'danger' : 'warning'}>{p.stock}</Badge>
                          </td>
                          <td className="px-3 py-2 text-right text-gray-500">{p.lowStockAlert}</td>
                          <td className="px-3 py-2 text-right">
                            <Link to={`/products/edit/${p._id}`} className="text-xs text-primary-600 hover:underline font-medium">
                              Restock →
                            </Link>
                          </td>
                        </tr>
                      ))}
                    />
                  ) : (
                    <p className="text-xs text-gray-500 text-center py-4">All products well stocked 🎉</p>
                  )}
                </ChartCard>
              </>
            )}

            {activeTab === 'products' && (
              topProducts.length > 0 ? (
                <>
                  <ChartCard title="Units Sold — Top 10">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topProducts.slice(0, 10)} layout="vertical" margin={{ left: 10, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 9 }} tickFormatter={(n) => n.length > 14 ? n.slice(0, 14) + '…' : n} />
                        <Tooltip formatter={(v, name) => name === 'totalRevenue' ? formatCurrency(v) : v} />
                        <Bar dataKey="totalQuantity" fill="#3B82F6" name="Units" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <ChartCard title="Ranked by Units Sold">
                    <div className="space-y-2">
                      {topProducts.map((p, index) => (
                        <div key={p._id || index} className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            index < 3 ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {index + 1}
                          </div>
                          {p.image ? (
                            <img
                              src={getImageUrl(p.image)}
                              alt={p.name}
                              loading="lazy"
                              className="w-9 h-9 rounded-lg object-cover bg-gray-50 shrink-0"
                              onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                              <FiPackage className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-900 truncate">{p.name}</p>
                            <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                              <div
                                className="bg-primary-500 rounded-full h-1.5"
                                style={{ width: `${(p.totalQuantity / (topProducts[0]?.totalQuantity || 1)) * 100}%` }}
                              />
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-semibold text-gray-900">{p.totalQuantity} units</p>
                            <p className="text-[10px] text-gray-500">{formatCurrency(p.totalRevenue)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ChartCard>
                </>
              ) : (
                <EmptyState icon={FiTrendingUp} title="No product sales" description="No sales recorded in this period" />
              )
            )}

            {activeTab === 'categories' && (
              categorySales.length > 0 ? (
                <>
                  <ChartCard title="Sales by Category">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categorySales}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="categoryName" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v) => formatCurrency(v)} />
                        <Bar dataKey="totalSales" fill="#8B5CF6" name="Sales" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <ChartCard title="Category Breakdown">
                    <DataTable
                      columns={[
                        { key: 'categoryName', label: 'Category', sortable: true },
                        { key: 'totalQuantity', label: 'Units', align: 'right', sortable: true },
                        { key: 'totalSales', label: 'Sales', align: 'right', sortable: true },
                        { key: 'count', label: 'Orders', align: 'right', sortable: true }
                      ]}
                      sortKey={catSort.key}
                      sortDir={catSort.dir}
                      onSort={toggleCatSort}
                      rows={sortedCategorySales.map((c, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-800">{c.categoryName}</td>
                          <td className="px-3 py-2 text-right">{c.totalQuantity}</td>
                          <td className="px-3 py-2 text-right font-medium text-primary-600">{formatCurrency(c.totalSales)}</td>
                          <td className="px-3 py-2 text-right text-gray-500">{c.count}</td>
                        </tr>
                      ))}
                    />
                  </ChartCard>
                </>
              ) : (
                <EmptyState icon={FiPieChart} title="No category sales" description="No sales recorded in this period" />
              )
            )}

            {activeTab === 'daily' && (
              dailySales.length > 0 ? (
                <>
                  <SummaryCards
                    cards={[
                      { label: 'Days w/ Sales', value: dailySales.length },
                      { label: 'Total', value: formatCurrency(dailySales.reduce((s, d) => s + d.total, 0)), color: 'text-primary-600' },
                      { label: 'Bills', value: dailySales.reduce((s, d) => s + d.count, 0) },
                      { label: 'Best Day', value: formatCurrency(Math.max(0, ...dailySales.map((d) => d.total))), color: 'text-green-600' }
                    ]}
                  />

                  <ChartCard title={`Daily Breakdown — ${formatShortDate(dateRange.startDate)} → ${formatShortDate(dateRange.endDate)}`}>
                    <DataTable
                      columns={[
                        { key: 'date', label: 'Date' },
                        { key: 'count', label: 'Bills', align: 'right' },
                        { key: 'cash', label: 'Cash', align: 'right' },
                        { key: 'card', label: 'Card', align: 'right' },
                        { key: 'upi', label: 'UPI', align: 'right' },
                        { key: 'total', label: 'Total', align: 'right' }
                      ]}
                      sortKey=""
                      sortDir="desc"
                      onSort={() => {}}
                      rows={[...dailySales].reverse().map((day) => (
                        <tr key={day._id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 whitespace-nowrap text-gray-700">{formatShortDate(day._id)}</td>
                          <td className="px-3 py-2 text-right">{day.count}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{formatCurrency(day.cash)}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{formatCurrency(day.card)}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{formatCurrency(day.upi)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-primary-600">{formatCurrency(day.total)}</td>
                        </tr>
                      ))}
                    />
                  </ChartCard>
                </>
              ) : (
                <EmptyState icon={FiCalendar} title="No daily data" description="No sales in the selected range" />
              )
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Reports;