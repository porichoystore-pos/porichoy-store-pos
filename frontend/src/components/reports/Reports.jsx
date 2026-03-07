import React, { useState, useEffect } from 'react';
import {
  FiCalendar,
  FiTrendingUp,
  FiPackage,
  FiDollarSign,
  FiPieChart,
  FiDownload
} from 'react-icons/fi';
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
import api from '../../services/api';
import { formatCurrency, formatShortDate } from '../../utils/formatters';

const Reports = () => {
  const [activeTab, setActiveTab] = useState('sales');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [salesData, setSalesData] = useState(null);
  const [inventoryData, setInventoryData] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [categorySales, setCategorySales] = useState([]);
  const [dailySales, setDailySales] = useState([]);
  
  const toast = useToast();

  useEffect(() => {
    fetchReports();
  }, [activeTab, dateRange]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });

      switch (activeTab) {
        case 'sales':
          const salesRes = await api.get(`/reports/sales?${params}`);
          setSalesData(salesRes.data);
          break;
          
        case 'inventory':
          const invRes = await api.get('/reports/inventory');
          setInventoryData(invRes.data);
          break;
          
        case 'products':
          const topRes = await api.get(`/reports/top-products?${params}&limit=10`);
          setTopProducts(topRes.data);
          break;
          
        case 'categories':
          const catRes = await api.get(`/reports/category-sales?${params}`);
          setCategorySales(catRes.data);
          break;
          
        case 'daily':
          const dailyRes = await api.get('/reports/daily');
          setDailySales(dailyRes.data);
          break;
      }
    } catch (error) {
      toast.error('Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

  const tabs = [
    { id: 'sales', name: 'Sales', icon: FiDollarSign },
    { id: 'inventory', name: 'Inventory', icon: FiPackage },
    { id: 'products', name: 'Top Products', icon: FiTrendingUp },
    { id: 'categories', name: 'Categories', icon: FiPieChart },
    { id: 'daily', name: 'Daily', icon: FiCalendar }
  ];

  return (
    <div className="px-3 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Reports</h1>
        <button
          onClick={() => setShowDatePicker(!showDatePicker)}
          className="p-2 bg-gray-100 text-gray-700 rounded-lg"
        >
          <FiCalendar className="w-4 h-4" />
        </button>
      </div>

      {/* Date Range Picker */}
      {showDatePicker && (
        <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
          <div className="space-y-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              />
            </div>
            <button
              onClick={() => {
                fetchReports();
                setShowDatePicker(false);
              }}
              className="w-full px-3 py-2 bg-primary-600 text-white rounded-lg text-sm"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex overflow-x-auto mb-4 pb-1">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-xs font-medium rounded-lg flex items-center whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5 mr-1" />
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      {/* Report Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs text-gray-600">Loading report...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Sales Report */}
            {activeTab === 'sales' && salesData && (
              <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-primary-50 rounded-lg p-3">
                    <p className="text-[10px] text-primary-600">Total Sales</p>
                    <p className="text-sm font-bold text-primary-700">
                      {formatCurrency(salesData.summary.totalSales || 0)}
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-[10px] text-green-600">Total Bills</p>
                    <p className="text-sm font-bold text-green-700">
                      {salesData.summary.totalBills || 0}
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-[10px] text-purple-600">Average</p>
                    <p className="text-sm font-bold text-purple-700">
                      {formatCurrency(salesData.summary.averageBill || 0)}
                    </p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-3">
                    <p className="text-[10px] text-yellow-600">Total Tax</p>
                    <p className="text-sm font-bold text-yellow-700">
                      {formatCurrency(salesData.summary.totalTax || 0)}
                    </p>
                  </div>
                </div>

                {/* Sales Chart */}
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={salesData.sales}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="_id" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Line type="monotone" dataKey="total" stroke="#3B82F6" name="Sales" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Inventory Report */}
            {activeTab === 'inventory' && inventoryData && (
              <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-primary-50 rounded-lg p-3">
                    <p className="text-[10px] text-primary-600">Total Products</p>
                    <p className="text-sm font-bold text-primary-700">
                      {inventoryData.summary.totalProducts}
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-[10px] text-green-600">Inventory Value</p>
                    <p className="text-sm font-bold text-green-700">
                      {formatCurrency(inventoryData.summary.totalValue)}
                    </p>
                  </div>
                </div>

                {/* Category Distribution */}
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={inventoryData.byCategory}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={60}
                        dataKey="totalValue"
                        nameKey="category.name"
                      >
                        {inventoryData.byCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Top Products */}
            {activeTab === 'products' && (
              <div className="space-y-3">
                {topProducts.map((product, index) => (
                  <div key={product._id} className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-xs font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium truncate max-w-[120px]">{product.name}</span>
                        <span className="text-[10px] text-gray-600">
                          {product.totalQuantity} units
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1">
                        <div
                          className="bg-primary-600 rounded-full h-1"
                          style={{
                            width: `${(product.totalQuantity / topProducts[0]?.totalQuantity) * 100}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Category Sales */}
            {activeTab === 'categories' && (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categorySales}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="categoryName" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Bar dataKey="totalSales" fill="#3B82F6" name="Sales" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Daily Sales */}
            {activeTab === 'daily' && (
              <div className="space-y-2">
                {dailySales.map((day) => (
                  <div key={day._id} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                    <span className="text-xs text-gray-600">{formatShortDate(day._id)}</span>
                    <span className="text-xs font-semibold text-primary-600">{formatCurrency(day.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Reports;