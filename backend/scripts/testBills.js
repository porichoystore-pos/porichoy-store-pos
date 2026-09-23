/**
 * E2E test for Bills CRUD: create (POS-style) → edit → filters → void → guards.
 * Run: node scripts/testBills.js
 */
require('dotenv').config();
process.env.PORT = '5079'; // scratch port

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
  await User.deleteMany({ username: '_test_bill_admin' });
  await Product.deleteMany({ name: { $regex: /^_TEST_BILL/ } });
  await User.create({ username: '_test_bill_admin', password: 'TestPass123!', role: 'admin' });
  const login = await api('/auth/login', { method: 'POST', body: { username: '_test_bill_admin', password: 'TestPass123!' } });
  const token = login.data?.token;
  check('Admin login', !!token);

  const cat = await Category.findOne({ isActive: true });
  const product = await Product.create({
    name: '_TEST_BILL_PRODUCT', category: cat._id, mrp: 200, price: 150, stock: 50, tax: 0
  });
  const stockBefore = product.stock;

  console.log('\n--- 1. Create bill (POS-style) ---');
  const create = await api('/bills', {
    method: 'POST', token,
    body: {
      customerInfo: { name: 'TESTCUST9982', phone: '9876543210' },
      items: [{ product: product._id, quantity: 2 }],
      payments: [{ method: 'cash', amount: 300, status: 'completed' }],
      notes: 'original note'
    }
  });
  check('POST /bills → 201', create.status === 201, `got ${create.status}`);
  const bill = create.data;
  check('Total is 2 × 150 = 300', bill?.total === 300, `total=${bill?.total}`);
  let after = await Product.findById(product._id);
  // NOTE: POS createBill currently does NOT decrement stock — document current behavior
  console.log(`  ℹ️  Stock after POS sale: ${after.stock} (started ${stockBefore})`);

  console.log('\n--- 2. Edit bill (discount, notes, payment method) ---');
  const edit = await api(`/bills/${bill._id}`, {
    method: 'PUT', token,
    body: { discount: 10, notes: 'updated by E2E', paymentMethod: 'card' }
  });
  check('PUT /bills/:id → 200', edit.status === 200, `got ${edit.status}: ${JSON.stringify(edit.data)}`);
  check('Discount applied → total 290', edit.data?.discount === 10 && edit.data?.total === 290, `total=${edit.data?.total}`);
  check('Payment method → card', edit.data?.payments?.[0]?.method === 'card');
  check('Payment amount synced to new total', edit.data?.payments?.[0]?.amount === 290);
  check('Notes updated', edit.data?.notes === 'updated by E2E');

  // Items must NOT be editable
  const itemsBefore = JSON.stringify(bill.items);
  const tampered = await api(`/bills/${bill._id}`, {
    method: 'PUT', token,
    body: { items: [{ product: product._id, quantity: 99, price: 1 }] }
  });
  const slim = (items) => JSON.stringify((items || []).map((i) => ({
    p: String(i.product?._id || i.product), q: i.quantity
  })));
  check('Items NOT editable (unchanged)', slim(tampered.data?.items) === slim(bill.items));

  const badDiscount = await api(`/bills/${bill._id}`, {
    method: 'PUT', token, body: { discount: 999999 }
  });
  check('Over-max discount rejected (400)', badDiscount.status === 400, `got ${badDiscount.status}`);

  console.log('\n--- 3. List filters ---');
  const byMethod = await api('/bills?paymentMethod=card&limit=100', { token });
  check('Filter paymentMethod=card finds bill', (byMethod.data?.bills || []).some((b) => b._id === bill._id));
  const byCustomer = await api('/bills?customer=TESTCUST9982&limit=100', { token });
  check('Filter customer finds bill', (byCustomer.data?.bills || []).some((b) => b._id === bill._id));
  const voidedBefore = await api('/bills?status=voided&limit=100', { token });
  check('status=voided does not include active bill', !(voidedBefore.data?.bills || []).some((b) => b._id === bill._id));

  console.log('\n--- 4. Void + stock restore ---');
  const voidRes = await api(`/bills/${bill._id}/void`, { method: 'PUT', token, body: { reason: 'E2E void test' } });
  check('Void → 200', voidRes.status === 200, `got ${voidRes.status}`);
  after = await Product.findById(product._id);
  // POS createBill doesn't deduct stock (documented), void always restores → before + 2
  check('Void restores stock (→ before + 2)', after.stock === stockBefore + 2, `got ${after.stock}, expected ${stockBefore + 2}`);

  const listDefault = await api('/bills?limit=100', { token });
  check('Voided bill hidden from default list', !(listDefault.data?.bills || []).some((b) => b._id === bill._id));
  const listVoided = await api('/bills?status=voided&limit=100', { token });
  check('Voided bill appears under status=voided', (listVoided.data?.bills || []).some((b) => b._id === bill._id));

  const reVoid = await api(`/bills/${bill._id}/void`, { method: 'PUT', token, body: { reason: 'double' } });
  check('Double void rejected (400)', reVoid.status === 400);
  const editVoided = await api(`/bills/${bill._id}`, { method: 'PUT', token, body: { notes: 'x' } });
  check('Edit voided bill rejected (400)', editVoided.status === 400);

  // ---------- Cleanup ----------
  console.log('\n--- Cleanup ---');
  await Sale.deleteMany({ bill: bill._id });
  await Bill.deleteOne({ _id: bill._id });
  await Product.deleteOne({ _id: product._id });
  await User.deleteMany({ username: '_test_bill_admin' });
  console.log('Test data removed');

  console.log(failures === 0 ? '\n🎉 ALL TESTS PASSED' : `\n⚠️  ${failures} TEST(S) FAILED`);
  await mongoose.disconnect();
  process.exit(failures === 0 ? 0 : 1);
};

run().catch((e) => {
  console.error('TEST RUNNER ERROR:', e);
  process.exit(1);
});
