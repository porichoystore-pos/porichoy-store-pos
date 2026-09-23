import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiRefreshCw } from 'react-icons/fi';
import api from '../../services/api';
import { formatCurrency, formatShortDate } from '../../utils/formatters';
import StatsCards from './StatsCards';
import { DashboardSkeleton } from '../common/Skeletons';
import PageHeader from '../common/PageHeader';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

// Get today's date in LOCAL timezone (not UTC)
const getLocalDateString = (date = new Date()) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
  const [topSelling, setTopSelling] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // ---- 1. Today's POS bills (ONLY actual POS transactions) ----
      let posSales = 0;
      let posBills = 0;
      try {
        const todayRes = await api.get('/bills/today');
        const summary = todayRes.data.summary || { total: 0, count: 0 };
        posSales = summary.total || 0;
        posBills = summary.count || 0;
        console.log('🧾 Today POS bills:', { sales: posSales, count: posBills });
      } catch (error) {
        console.error('Error fetching today bills:', error);
      }

      // ---- 2. Today's manual sales (DailySales tracker — separate from bills) ----
      let manualSales = 0;
      let manualCount = 0;
      try {
        const todayISO = getLocalDateString();
        const manualRes = await api.get(
          `/daily-sales?startDate=${todayISO}&endDate=${todayISO}`
        );
        const manualSummary = manualRes.data.summary || {};
        manualSales = manualSummary.totalAmount || 0;
        manualCount = manualSummary.count || 0;
        console.log('📝 Today manual sales:', {
          sales: manualSales,
          entries: manualCount
        });
      } catch (error) {
        console.error('Error fetching today manual sales:', error);
      }

      // ---- 3. Total products ----
      let productsTotal = 0;
      try {
        const productsRes = await api.get('/products?limit=1000');
        // Try multiple fields as fallback
        const productsArray = productsRes.data.products || [];
        productsTotal =
          productsRes.data.total ?? productsArray.length ?? 0;
        console.log('📦 Products fetched:', {
          arrayLength: productsArray.length,
          reportedTotal: productsRes.data.total
        });
      } catch (error) {
        console.error('Error fetching products:', error);
      }

      // ---- 4. Total customers ----
      let customersTotal = 0;
      try {
        const customersRes = await api.get('/customers?limit=1');
        customersTotal = customersRes.data.total || 0;
        console.log('👥 Customers:', customersTotal);
      } catch (error) {
        console.error('Error fetching customers:', error);
      }

      // ---- 5. Recent bills ----
      let recent = [];
      try {
        const billsRes = await api.get('/bills?limit=5');
        recent = billsRes.data.bills || [];
      } catch (error) {
        console.error('Error fetching recent bills:', error);
      }

      // ---- 6. Sales data for last 7 days (already merged on backend) ----
      let dailySales = [];
      try {
        const salesRes = await api.get('/reports/daily?days=7');
        dailySales = salesRes.data || [];
      } catch (error) {
        console.error('Error fetching sales data:', error);
      }

      // ---- 7. Top selling products ----
      try {
        const topRes = await api.get('/products/top-selling?days=7');
        setTopSelling(topRes.data || []);
      } catch (error) {
        console.error('Error fetching top selling:', error);
      }

      // ---- Format 7-day chart data ----
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = formatShortDate(date);

        const daySales = dailySales.find((d) => {
          if (!d._id) return false;
          const salesDate = new Date(d._id);
          return formatShortDate(salesDate) === dateStr;
        });

        last7Days.push({
          date: dateStr,
          sales: daySales ? daySales.total : 0
        });
      }

      // ---- Final merged stats ----
      // ✅ Today's Sales = POS sales + Manual sales
      // ✅ Today's Bills = ONLY POS bills (manual entries are NOT bills)
      const combinedTodaySales = posSales + manualSales;

      console.log('🎯 Final dashboard stats:', {
        todaySales: combinedTodaySales,
        todayBills: posBills,
        manualSalesToday: manualSales,
        manualEntriesToday: manualCount,
        totalProducts: productsTotal,
        totalCustomers: customersTotal
      });

      setStats({
        todaySales: combinedTodaySales,
        todayBills: posBills, // ← Only POS bills, NOT manual entries
        totalProducts: productsTotal,
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
    return <DashboardSkeleton />;
  }

  return (
    <div className="px-3 py-4 space-y-4">
      {/* Header */}
      <PageHeader title="Dashboard" subtitle="Store overview at a glance">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-icon"
          aria-label="Refresh dashboard"
        >
          <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </PageHeader>

      {/* Stats Cards */}
      <StatsCards stats={stats} />

      {/* Sales Chart */}
      <div className="bg-white rounded-lg border border-gray-100 p-3">
        <h2 className="section-title mb-3">Sales (Last 7 Days)</h2>
        <div className="h-44 sm:h-52">
          {salesData.some((day) => day.sales > 0) ? (
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

      {/* Top selling this week */}
      {topSelling.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-100 p-3">
          <h2 className="section-title mb-3">🏆 Top Selling This Week</h2>
          <div className="space-y-2">
            {topSelling.map((p, index) => (
              <div key={p._id} className="flex items-center gap-2">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    index < 3 ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {index + 1}
                </span>
                <span className="flex-1 text-xs font-medium text-gray-800 truncate">
                  {p.name}
                </span>
                <span className="text-[10px] text-gray-500 shrink-0">
                  {p.quantity} sold
                </span>
                <span className="text-xs font-semibold text-primary-600 shrink-0">
                  {formatCurrency(p.revenue)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Bills */}
      <div className="bg-white rounded-lg border border-gray-100 p-3">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xs font-semibold text-gray-700">Recent Bills</h2>
          <Link to="/bills" className="text-[10px] text-primary-600">
            View All
          </Link>
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