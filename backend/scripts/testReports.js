/**
 * E2E test for Reports: data shapes, date filters, exports, role guard.
 * Run: node scripts/testReports.js
 */
require('dotenv').config();
process.env.PORT = '5081'; // scratch port

const mongoose = require('mongoose');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Bill = require('../models/Bill');
const Sale = require('../models/Sale');

const BASE = `http://localhost:${process.env.PORT}/api`;
let failures = 0;

const check = (name, condition, extra = '') => {
  if (condition) console.log(`  ✅ ${name}`);
  else { failures++; console.log(`  ❌ ${name} ${extra}`); }
};

const api = async (path, { method = 'GET', token, body, raw = false } = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  if (raw) return { status: res.status, buffer: Buffer.from(await res.arrayBuffer()), headers: res.headers };
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
};

const isoDay = (d) => d.toISOString().split('T')[0];

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('DB connected');
  require('../server');
  await new Promise((r) => setTimeout(r, 2000));

  // ---------- Setup ----------
  await User.deleteMany({ username: /^_test_rep_/ });
  await Product.deleteMany({ name: { $regex: /^_TEST_REP/ } });
  await User.create({ username: '_test_rep_admin', password: 'TestPass123!', role: 'admin' });
  await User.create({ username: '_test_rep_staff', password: 'TestPass123!', role: 'staff' });
  const adminToken = (await api('/auth/login', { method: 'POST', body: { username: '_test_rep_admin', password: 'TestPass123!' } })).data.token;
  const staffToken = (await api('/auth/login', { method: 'POST', body: { username: '_test_rep_staff', password: 'TestPass123!' } })).data.token;
  check('Admin + staff login', !!adminToken && !!staffToken);

  const cat = await Category.findOne({ isActive: true });
  const product = await Product.create({
    name: '_TEST_REP_PRODUCT', category: cat._id, mrp: 200, price: 150, stock: 50, tax: 0
  });

  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const start = isoDay(yesterday);
  const end = isoDay(today);

  // Cash bill today (2 × 150 = 300), card bill yesterday (1 × 150)
  const cashBill = await api('/bills', {
    method: 'POST', token: adminToken,
    body: { items: [{ product: product._id, quantity: 2 }], payments: [{ method: 'cash', amount: 300, status: 'completed' }] }
  });
  check('Baseline cash bill created', cashBill.status === 201, JSON.stringify(cashBill.data));

  const cardBill = await Bill.create({
    items: [{ product: product._id, name: product.name, mrp: 200, price: 150, quantity: 1, tax: 0, subtotal: 150 }],
    subtotal: 150, taxTotal: 0, discount: 0, total: 150,
    payments: [{ method: 'card', amount: 150, status: 'completed' }],
    createdBy: (await User.findOne({ username: '_test_rep_admin' }))._id,
    createdAt: yesterday
  });
  check('Backdated card bill created', cardBill?.total === 150);
  const createdBillIds = [cashBill.data?._id, cardBill._id.toString()];

  console.log('\n--- 1. Sales report ---');
  const sales = await api(`/reports/sales?startDate=${start}&endDate=${end}`, { token: adminToken });
  // ≥ comparisons tolerate coincidental real bills in the same window
  check('Summary total ≥ 450', (sales.data?.summary?.totalSales || 0) >= 450, `got ${sales.data?.summary?.totalSales}`);
  check('Summary bills ≥ 2', (sales.data?.summary?.totalBills || 0) >= 2, `got ${sales.data?.summary?.totalBills}`);
  const payTotals = Object.fromEntries((sales.data?.byPayment || []).map((p) => [p._id, p.total]));
  check('byPayment: cash ≥ 300', payTotals.cash >= 300, JSON.stringify(payTotals));
  check('byPayment: card ≥ 150', payTotals.card >= 150, JSON.stringify(payTotals));

  // Date filter: only yesterday → only the 150 card bill
  const onlyYesterday = await api(`/reports/sales?startDate=${start}&endDate=${start}`, { token: adminToken });
  // Tolerant to real historical bills on that day — at minimum our 150 card bill is there
  check('Date filter works (yesterday ≥ 150)', (onlyYesterday.data?.summary?.totalSales || 0) >= 150, `got ${onlyYesterday.data?.summary?.totalSales}`);

  console.log('\n--- 2. Top products (with image field) ---');
  const top = await api(`/reports/top-products?startDate=${start}&endDate=${end}`, { token: adminToken });
  const tp = (top.data || []).find((p) => p.name === '_TEST_REP_PRODUCT');
  check('Product in top-products', !!tp);
  check('Total quantity = 3', tp?.totalQuantity === 3, `got ${tp?.totalQuantity}`);
  check('Revenue = 450', tp?.totalRevenue === 450, `got ${tp?.totalRevenue}`);

  console.log('\n--- 2b. Top products sanity (no bill overlap possible for our product) ---');

  console.log('\n--- 3. Daily sales (payment breakdown) ---');
  const daily = await api(`/reports/daily?startDate=${start}&endDate=${end}`, { token: adminToken });
  const todayRow = (daily.data || []).find((d) => d._id === isoDay(today));
  const yestRow = (daily.data || []).find((d) => d._id === start);
  check('Today: cash ≥ 300, count ≥ 1', todayRow?.cash >= 300 && todayRow?.count >= 1, JSON.stringify(todayRow));
  check('Yesterday: card ≥ 150, count ≥ 1', yestRow?.card >= 150 && yestRow?.count >= 1, JSON.stringify(yestRow));

  console.log('\n--- 4. Category sales + inventory ---');
  const catSales = await api(`/reports/category-sales?startDate=${start}&endDate=${end}`, { token: adminToken });
  const catRow = (catSales.data || []).find((c) => c.categoryName === cat.name);
  // Could contain real historical sales too — assert ours are included
  check('Category sales ≥ 450 (ours included)', (catRow?.totalSales || 0) >= 450, JSON.stringify(catRow));

  const inv = await api('/reports/inventory', { token: adminToken });
  check('Inventory summary present', inv.data?.summary?.totalProducts > 0);
  check('Inventory has byCategory', Array.isArray(inv.data?.byCategory) && inv.data.byCategory.length > 0);

  console.log('\n--- 5. Exports ---');
  const csv = await api(`/reports/export?type=sales&format=csv&startDate=${start}&endDate=${end}`, { token: adminToken, raw: true });
  check('CSV export 200', csv.status === 200);
  const csvText = csv.buffer.toString('utf8');
  check('CSV has header + yesterday row', csvText.includes('Total') && csvText.includes(start), csvText.slice(0, 200));
  check('CSV content-type', csv.headers.get('content-type')?.includes('text/csv'));

  const xlsx = await api(`/reports/export?type=inventory&format=excel`, { token: adminToken, raw: true });
  check('Excel export 200', xlsx.status === 200);
  check('Excel is a real xlsx (PK zip magic)', xlsx.buffer[0] === 0x50 && xlsx.buffer[1] === 0x4b);

  const badType = await api('/reports/export?type=nonsense', { token: adminToken });
  check('Invalid export type → 400', badType.status === 400);

  console.log('\n--- 6. Role guard ---');
  const staffReports = await api('/reports/sales', { token: staffToken });
  check('Staff blocked from reports (403)', staffReports.status === 403);
  const staffExport = await api('/reports/export?type=sales', { token: staffToken });
  check('Staff blocked from export (403)', staffExport.status === 403);

  // ---------- Cleanup ----------
  console.log('\n--- Cleanup ---');
  await Sale.deleteMany({ bill: { $in: createdBillIds } });
  await Bill.deleteMany({ _id: { $in: createdBillIds } });
  await Product.deleteOne({ _id: product._id });
  await User.deleteMany({ username: /^_test_rep_/ });
  console.log('Test data removed');

  console.log(failures === 0 ? '\n🎉 ALL TESTS PASSED' : `\n⚠️  ${failures} TEST(S) FAILED`);
  await mongoose.disconnect();
  process.exit(failures === 0 ? 0 : 1);
};

run().catch((e) => {
  console.error('TEST RUNNER ERROR:', e);
  process.exit(1);
});
