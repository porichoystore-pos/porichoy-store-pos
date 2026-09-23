/**
 * E2E test for Search & Recommendations.
 * Run: node scripts/testSearch.js
 */
require('dotenv').config();
process.env.PORT = '5082';

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
  require('../server');
  await new Promise((r) => setTimeout(r, 2000));

  // ---------- Setup ----------
  await User.deleteMany({ username: '_test_search_admin' });
  await Product.deleteMany({ name: { $regex: /^_TEST_SEARCH/ } });
  await User.create({ username: '_test_search_admin', password: 'TestPass123!', role: 'admin' });
  const token = (await api('/auth/login', { method: 'POST', body: { username: '_test_search_admin', password: 'TestPass123!' } })).data.token;
  check('Admin login', !!token);

  const cat = await Category.findOne({ isActive: true });
  const p1 = await Product.create({ name: '_TEST_SEARCH Lipstick Matte Red', category: cat._id, mrp: 200, price: 150, stock: 10, barcode: '8901234567890', tags: ['lipstick', 'makeup', 'red'] });
  const p2 = await Product.create({ name: '_TEST_SEARCH Lip Gloss Pink', category: cat._id, mrp: 100, price: 80, stock: 5 });
  const p3 = await Product.create({ name: '_TEST_SEARCH Vitamin C Serum', category: cat._id, mrp: 300, price: 250, stock: 3 });

  // A bill containing P1 + P2 together (for co-occurrence)
  const bill = await Bill.create({
    items: [
      { product: p1._id, name: p1.name, price: 150, quantity: 1, subtotal: 150 },
      { product: p2._id, name: p2.name, price: 80, quantity: 1, subtotal: 80 }
    ],
    subtotal: 230, taxTotal: 0, discount: 0, total: 230,
    payments: [{ method: 'cash', amount: 230, status: 'completed' }],
    createdBy: (await User.findOne({ username: '_test_search_admin' }))._id
  });

  console.log('\n--- 1. Product search enhancements ---');
  const typo = await api('/products/search?q=lpstck', { token });
  check('Typo "lpstck" → finds Lipstick (fuzzy)', typo.data?.some((p) => p._id === p1._id.toString()), JSON.stringify(typo.data?.map(p => p.name)));

  const wordTypo = await api('/products/search?q=lipstik', { token });
  check('Typo "lipstik" → finds Lipstick', wordTypo.data?.some((p) => p._id === p1._id.toString()));

  const partialBarcode = await api('/products/search?q=8901234567', { token });
  check('Partial barcode "8901234567" → finds P1', partialBarcode.data?.some((p) => p._id === p1._id.toString()));

  const exactBarcode = await api('/products/search?q=8901234567890', { token });
  check('Exact barcode returns only P1 (fast path)', exactBarcode.data?.length === 1 && exactBarcode.data[0]?._id === p1._id.toString());

  const tagSearch = await api('/products/search?q=makeup', { token });
  check('Tag search "makeup" → finds P1', tagSearch.data?.some((p) => p._id === p1._id.toString()));

  const ranked = await api('/products/search?q=_TEST_SEARCH%20Lip', { token });
  const names = (ranked.data || []).map((p) => p.name);
  check('Multi-word search returns both lip products', names.includes(p1.name) && names.includes(p2.name), JSON.stringify(names));

  console.log('\n--- 2. Global search ---');
  const global = await api('/search?q=_TEST_SEARCH', { token });
  check('Products group has results', (global.data?.products || []).length >= 3, `got ${global.data?.products?.length}`);
  check('Groups shape complete', ['products', 'categories', 'customers', 'bills'].every((k) => Array.isArray(global.data?.[k])));

  const billSearch = await api(`/search?q=${bill.billNumber}`, { token });
  check('Global search finds bill number', (billSearch.data?.bills || []).some((b) => b._id === bill._id.toString()));

  console.log('\n--- 3. Recommendations ---');
  const related = await api(`/products/${p1._id}/related`, { token });
  check('Related excludes self', !(related.data || []).some((p) => p._id === p1._id.toString()));
  check('Related includes same-category P2', (related.data || []).some((p) => p._id === p2._id.toString()), JSON.stringify((related.data || []).map(p => p.name)));

  const fbt = await api(`/products/frequently-bought?productIds=${p1._id}`, { token });
  check('Frequently-bought returns P2 (seen with P1)', (fbt.data || []).some((p) => p._id === p2._id.toString()), JSON.stringify((fbt.data || []).map(p => p.name)));

  const fbtEmpty = await api('/products/frequently-bought?productIds=', { token });
  check('Empty productIds → []', Array.isArray(fbtEmpty.data) && fbtEmpty.data.length === 0);

  const top = await api('/products/top-selling?days=7', { token });
  check('Top-selling includes P1 (in today\'s bill)', (top.data || []).some((p) => p._id === p1._id.toString()));

  console.log('\n--- 4. Guards ---');
  const noAuth = await api('/search?q=test');
  check('Global search requires auth (401)', noAuth.status === 401);
  const emptyQ = await api('/products/search?q=', { token });
  check('Empty query → []', Array.isArray(emptyQ.data) && emptyQ.data.length === 0);

  // ---------- Cleanup ----------
  console.log('\n--- Cleanup ---');
  await Sale.deleteMany({ bill: bill._id });
  await Bill.deleteOne({ _id: bill._id });
  await Product.deleteMany({ _id: { $in: [p1._id, p2._id, p3._id] } });
  await User.deleteMany({ username: '_test_search_admin' });
  console.log('Test data removed');

  console.log(failures === 0 ? '\n🎉 ALL TESTS PASSED' : `\n⚠️  ${failures} TEST(S) FAILED`);
  await mongoose.disconnect();
  process.exit(failures === 0 ? 0 : 1);
};

run().catch((e) => {
  console.error('TEST RUNNER ERROR:', e);
  process.exit(1);
});
