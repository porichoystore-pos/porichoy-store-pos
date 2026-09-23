/**
 * E2E test for Manual Sales Entry.
 * Spins up the server on a scratch port, exercises the full flow,
 * then cleans up all test data. Run: node scripts/testManualSale.js
 */
require('dotenv').config();
process.env.PORT = '5077'; // dedicated scratch port (avoid clashing with any running server)

const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const Bill = require('../models/Bill');
const Sale = require('../models/Sale');

const BASE = `http://localhost:${process.env.PORT}/api`;
let failures = 0;

const check = (name, condition, extra = '') => {
  if (condition) {
    console.log(`  ✅ ${name}`);
  } else {
    failures++;
    console.log(`  ❌ ${name} ${extra}`);
  }
};

const api = async (path, { method = 'GET', token, body } = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
};
const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('DB connected');
  require('../server'); // boots on process.env.PORT
  await new Promise((r) => setTimeout(r, 2000));

  // ---------- Setup: temp users ----------
  await User.deleteMany({ username: /^_test_manual_/ });
  await User.create({ username: '_test_manual_admin', password: 'TestPass123!', role: 'admin', name: 'Test Admin' });
  await User.create({ username: '_test_manual_staff', password: 'TestPass123!', role: 'staff', name: 'Test Staff' });

  const adminLogin = await api('/auth/login', { method: 'POST', body: { username: '_test_manual_admin', password: 'TestPass123!' } });
  const staffLogin = await api('/auth/login', { method: 'POST', body: { username: '_test_manual_staff', password: 'TestPass123!' } });
  const adminToken = adminLogin.data?.token;
  const staffToken = staffLogin.data?.token;
  check('Admin login', !!adminToken);
  check('Staff login', !!staffToken);

  // Use a real product if one has enough stock, otherwise create a temp test product
  let product = await Product.findOne({ isActive: true, stock: { $gte: 5 } });
  let tempProductCreated = false;
  if (!product) {
    const cat = (await mongoose.model('Category').findOne({ isActive: true }))?._id;
    if (!cat) throw new Error('No category available to create a test product');
    product = await Product.create({
      name: '_TEST_MANUAL_PRODUCT',
      category: cat,
      mrp: 100,
      price: 50,
      stock: 50,
      tax: 0
    });
    tempProductCreated = true;
    console.log('  (No stocked product found — created temporary test product)');
  }
  const productId = product._id;
  const stockBefore = product.stock;
  const salesBefore = product.salesCount || 0;
  console.log(`  Using product: ${product.name} (stock ${stockBefore}, price ${product.price})`);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(12, 0, 0, 0);
  const yKey = yesterday.toISOString().split('T')[0];

  console.log('\n--- 1. Create manual sale (yesterday) ---');
  const create = await api('/sales/manual', {
    method: 'POST',
    token: adminToken,
    body: {
      date: yesterday.toISOString(),
      customerInfo: { name: 'Test Walk-in', phone: '9999999999' },
      items: [{ product: productId, quantity: 2, price: product.price }],
      paymentMethod: 'cash',
      notes: 'E2E test manual sale'
    }
  });
  check('POST /api/sales/manual → 201', create.status === 201, `got ${create.status}: ${JSON.stringify(create.data)}`);
  const bill = create.data;
  check('Bill number starts with MAN-', bill?.billNumber?.startsWith('MAN-'), bill?.billNumber);
  check('isManual = true', bill?.isManual === true);
  check('createdAt is yesterday', new Date(bill?.createdAt).toISOString().split('T')[0] === yKey);
  check('Total = qty × price', Math.abs(bill?.total - product.price * 2 * (1 + (product.tax || 0) / 100)) < 0.5);

  let after = await Product.findById(productId);
  check('Stock reduced by 2', after.stock === stockBefore - 2, `expected ${stockBefore - 2}, got ${after.stock}`);
  check('salesCount increased by 2', (after.salesCount || 0) === salesBefore + 2);

  console.log('\n--- 2. Bill in list + details with isManual ---');
  const detail = await api(`/bills/${bill._id}`, { token: adminToken });
  check('GET /bills/:id → isManual true', detail.data?.isManual === true);
  const list = await api('/bills?limit=100', { token: adminToken });
  const inList = (list.data?.bills || []).find((b) => b._id === bill._id);
  check('Bill in list with isManual flag', inList?.isManual === true);

  console.log('\n--- 3. Reports — daily sales includes manual sale ---');
  const daily = await api('/reports/daily?days=3', { token: adminToken });
  const dayEntry = (daily.data || []).find((d) => d._id === yKey);
  check("Daily report contains yesterday's entry", !!dayEntry, JSON.stringify((daily.data || []).map((d) => d._id)));
  if (dayEntry) check('Daily entry total includes manual sale', dayEntry.total > 0);

  console.log('\n--- 4. Edit the manual sale ---');
  const update = await api(`/sales/manual/${bill._id}`, {
    method: 'PUT',
    token: adminToken,
    body: {
      date: yesterday.toISOString(),
      customerInfo: { name: 'Test Walk-in Edited', phone: '9999999999' },
      items: [{ product: product._id, quantity: 3, price: 1 }],
      paymentMethod: 'card',
      notes: 'edited by E2E'
    }
  });
  check('PUT /sales/manual/:id → 200', update.status === 200, `got ${update.status}: ${JSON.stringify(update.data)}`);
  check('Total = 3 × ₹1 (+tax if any)', Math.abs((update.data?.total || 0) - 3 * (1 + (product.tax || 0) / 100)) < 0.5, `total=${update.data?.total}`);
  after = await Product.findById(product._id);
  check('Stock now before-3 (2 restored, 3 deducted)', after.stock === stockBefore - 3, `expected ${stockBefore - 3}, got ${after.stock}`);

  console.log('\n--- 5. Guards ---');
  const future = new Date(Date.now() + 86400000 * 5).toISOString();
  const futureRes = await api('/sales/manual', {
    method: 'POST', token: adminToken,
    body: { date: future, items: [{ product: product._id, quantity: 1 }], paymentMethod: 'cash' }
  });
  check('Future date rejected (400)', futureRes.status === 400, `got ${futureRes.status}`);

  const staffRes = await api('/sales/manual', {
    method: 'POST', token: staffToken,
    body: { date: yesterday.toISOString(), items: [{ product: product._id, quantity: 1 }], paymentMethod: 'cash' }
  });
  check('Staff blocked (403)', staffRes.status === 403, `got ${staffRes.status}`);

  const emptyItems = await api('/sales/manual', {
    method: 'POST', token: adminToken,
    body: { date: yesterday.toISOString(), items: [], paymentMethod: 'cash' }
  });
  check('Empty items rejected (400)', emptyItems.status === 400);

  console.log('\n--- 6. Void (delete) the manual sale ---');
  const voidRes = await api(`/bills/${bill._id}/void`, { method: 'PUT', token: adminToken, body: { reason: 'E2E test cleanup' } });
  check('Void OK (200)', voidRes.status === 200);
  after = await Product.findById(product._id);
  check('Stock fully restored after void', after.stock === stockBefore, `expected ${stockBefore}, got ${after.stock}`);

  console.log('\n--- Cleanup ---');
  await Sale.deleteMany({ bill: bill._id });
  await Bill.deleteOne({ _id: bill._id });
  await User.deleteMany({ username: /^_test_manual_/ });
  await Product.findByIdAndUpdate(product._id, { $set: { salesCount: salesBefore, stock: stockBefore } });
  console.log('Test data removed, product counters restored');

  console.log(failures === 0 ? '\n🎉 ALL TESTS PASSED' : `\n⚠️  ${failures} TEST(S) FAILED`);
  await mongoose.disconnect();
  process.exit(failures === 0 ? 0 : 1);
};

run().catch((e) => {
  console.error('TEST RUNNER ERROR:', e);
  process.exit(1);
});
