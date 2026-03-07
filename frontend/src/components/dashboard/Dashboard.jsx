import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FiRefreshCw
} from 'react-icons/fi';
import api from '../../services/api';
import { formatCurrency, formatShortDate } from '../../utils/formatters';
import StatsCards from './StatsCards';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    todaySales: 0,
    todayBills: 0,
    totalProducts: 0,
    totalCustomers: 0
  });
  const [recentBills, setRecentBills] = useState([]);
  const [salesData, setSalesData] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch today's bills
      const todayRes = await api.get('/bills/today');
      const todaySummary = todayRes.data.summary || { total: 0, count: 0 };
      
      // Fetch products
      let products = [];
      try {
        const productsRes = await api.get('/products?limit=1000');
        products = productsRes.data.products || [];
      } catch (error) {
        console.error('Error fetching products:', error);
      }
      
      // Fetch recent bills
      let recent = [];
      try {
        const billsRes = await api.get('/bills?limit=5');
        recent = billsRes.data.bills || [];
      } catch (error) {
        console.error('Error fetching recent bills:', error);
      }
      
      // Fetch customers count
      let customersTotal = 0;
      try {
        const customersRes = await api.get('/customers?limit=1');
        customersTotal = customersRes.data.total || 0;
      } catch (error) {
        console.error('Error fetching customers:', error);
      }
      
      // Fetch sales data for last 7 days
      let dailySales = [];
      try {
        const salesRes = await api.get('/reports/daily?days=7');
        dailySales = salesRes.data || [];
      } catch (error) {
        console.error('Error fetching sales data:', error);
      }
      
      // Format sales data for chart
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = formatShortDate(date);
        
        const daySales = dailySales.find(d => {
          if (!d._id) return false;
          const salesDate = new Date(d._id);
          return formatShortDate(salesDate) === dateStr;
        });
        
        last7Days.push({
          date: dateStr,
          sales: daySales ? daySales.total : 0
        });
      }

      setStats({
        todaySales: todaySummary.total || 0,
        todayBills: todaySummary.count || 0,
        totalProducts: products.length,
        totalCustomers: customersTotal
      });
      
      setRecentBills(recent);
      setSalesData(last7Days);
      
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 shadow-lg rounded-lg border text-xs">
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-primary-600">Sales: {formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-2 text-xs text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 bg-gray-100 text-gray-700 rounded-lg disabled:opacity-50"
        >
          <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats Cards */}
      <StatsCards stats={stats} />

      {/* Sales Chart */}
      <div className="bg-white rounded-lg border border-gray-100 p-3">
        <h2 className="text-xs font-semibold text-gray-700 mb-3">Sales (Last 7 Days)</h2>
        <div className="h-40">
          {salesData.some(day => day.sales > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 8 }} />
                <YAxis tick={{ fontSize: 8 }} />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-xs">
              No sales data
            </div>
          )}
        </div>
      </div>

      {/* Recent Bills */}
      <div className="bg-white rounded-lg border border-gray-100 p-3">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xs font-semibold text-gray-700">Recent Bills</h2>
          <Link to="/bills" className="text-[10px] text-primary-600">View All</Link>
        </div>
        
        <div className="space-y-2">
          {recentBills.length > 0 ? (
            recentBills.map((bill) => (
              <Link
                key={bill._id}
                to={`/bills/${bill._id}`}
                className="block p-2 hover:bg-gray-50 rounded-lg border-b last:border-b-0"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-medium text-gray-900">{bill.billNumber}</p>
                    <p className="text-[10px] text-gray-500">
                      {bill.customer?.name || bill.customerInfo?.name || 'Walk-in Customer'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-primary-600">
                      {formatCurrency(bill.total)}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {formatShortDate(bill.createdAt)}
                    </p>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <p className="text-xs text-gray-400 text-center py-3">No bills yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;