/**
 * E2E test for Settings, User Management & Backup.
 * Run: node scripts/testSettings.js
 */
require('dotenv').config();
process.env.PORT = '5083';

const mongoose = require('mongoose');
const User = require('../models/User');
const Setting = require('../models/Setting');

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

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('DB connected');
  require('../server');
  await new Promise((r) => setTimeout(r, 2000));

  // ---------- Setup ----------
  await User.deleteMany({ username: /^_test_set_/ });
  await User.create({ username: '_test_set_admin', password: 'TestPass123!', role: 'admin' });
  await User.create({ username: '_test_set_staff', password: 'TestPass123!', role: 'staff' });
  const adminToken = (await api('/auth/login', { method: 'POST', body: { username: '_test_set_admin', password: 'TestPass123!' } })).data?.token;
  const staffToken = (await api('/auth/login', { method: 'POST', body: { username: '_test_set_staff', password: 'TestPass123!' } })).data?.token;
  check('Admin + staff login', !!adminToken && !!staffToken);

  // Keep original settings to restore after the test
  const original = await Setting.getSingleton();
  const originalJson = original.toObject();

  console.log('\n--- 1. Settings ---');
  const get1 = await api('/settings', { token: staffToken });
  check('Staff can READ settings (200)', get1.status === 200);
  check('Defaults present', typeof get1.data?.storeName === 'string' && typeof get1.data?.defaultTaxRate === 'number');

  const upd = await api('/settings', {
    method: 'PUT', token: adminToken,
    body: { storeName: 'E2E Test Store', address: '42 Test Lane, Test City', phone: '9000011111', defaultTaxRate: 12, receiptFooter: 'E2E footer line' }
  });
  check('Admin can update settings (200)', upd.status === 200);
  check('Store name persisted', upd.data?.storeName === 'E2E Test Store');
  check('Tax rate persisted (12%)', upd.data?.defaultTaxRate === 12);

  const get2 = await api('/settings', { token: adminToken });
  check('Persist after re-fetch', get2.data?.storeName === 'E2E Test Store');

  const staffWrite = await api('/settings', { method: 'PUT', token: staffToken, body: { storeName: 'Hacked' } });
  check('Staff cannot update settings (403)', staffWrite.status === 403);
  const verify = await api('/settings', { token: adminToken });
  check('Staff write had no effect', verify.data?.storeName === 'E2E Test Store');

  console.log('\n--- 2. User management ---');
  const list = await api('/users', { token: adminToken });
  check('Admin lists users (200)', list.status === 200 && Array.isArray(list.data));
  check('Passwords NOT exposed in list', !list.data?.some((u) => u.password));

  const created = await api('/users', {
    method: 'POST', token: adminToken,
    body: { username: '_test_set_newstaff', password: 'NewPass123!', name: 'New Staff', role: 'staff' }
  });
  check('Create user → 201', created.status === 201, JSON.stringify(created.data));

  const newLogin = await api('/auth/login', { method: 'POST', body: { username: '_test_set_newstaff', password: 'NewPass123!' } });
  check('New user can login', newLogin.status === 200 && !!newLogin.data?.token);

  const dupUser = await api('/users', { method: 'POST', token: adminToken, body: { username: '_test_set_newstaff', password: 'xxxxxx' } });
  check('Duplicate username → 400', dupUser.status === 400);

  const adminId = original && (await User.findOne({ username: '_test_set_admin' }))._id;
  const selfDel = await api(`/users/${adminId}`, { method: 'DELETE', token: adminToken });
  check('Admin cannot delete self (400)', selfDel.status === 400);

  const newUserId = created.data?._id;
  const toggleOff = await api(`/users/${newUserId}/toggle`, { method: 'PUT', token: adminToken });
  check('Deactivate user (200)', toggleOff.status === 200 && toggleOff.data?.isActive === false);
  const offLogin = await api('/auth/login', { method: 'POST', body: { username: '_test_set_newstaff', password: 'NewPass123!' } });
  check('Deactivated user cannot login (401)', offLogin.status === 401);
  await api(`/users/${newUserId}/toggle`, { method: 'PUT', token: adminToken });
  const reLogin = await api('/auth/login', { method: 'POST', body: { username: '_test_set_newstaff', password: 'NewPass123!' } });
  check('Re-activated user can login', reLogin.status === 200);

  const staffUserMgmt = await api('/users', { token: staffToken });
  check('Staff blocked from /users (403)', staffUserMgmt.status === 403);

  console.log('\n--- 3. Backup export/import ---');
  const backup = await api('/backup/export', { token: adminToken });
  check('Export returns collections', backup.status === 200 && Array.isArray(backup.data?.data?.products) && Array.isArray(backup.data?.data?.settings), backup.data?.message);
  const exportedUsers = backup.data?.data?.users || [];
  check('Exported users lack password field', exportedUsers.every((u) => u.password === undefined));

  // Import roundtrip: restore ORIGINAL settings via backup import
  const importRes = await api('/backup/import', {
    method: 'POST', token: adminToken,
    body: { data: { settings: [originalJson] }, collections: ['settings'] }
  });
  check('Import accepted (200)', importRes.status === 200, JSON.stringify(importRes.data));
  const afterImport = await api('/settings', { token: adminToken });
  check('Import restored original store name', afterImport.data?.storeName === originalJson.storeName);

  console.log('\n--- 4. Invoice uses settings ---');
  // Make a minimal product + bill so we can verify PDF generation
  const Category = require('../models/Category');
  const Product = require('../models/Product');
  const Bill = require('../models/Bill');
  const cat = await Category.findOne({ isActive: true });
  const prod = await Product.create({ name: '_TEST_INVOICE_P', category: cat._id, mrp: 10, price: 10, stock: 5 });
  const billRes = await api('/bills', {
    method: 'POST', token: adminToken,
    body: { items: [{ product: prod._id, quantity: 1 }], payments: [{ method: 'cash', amount: 10, status: 'completed' }] }
  });
  check('Test bill created for print', billRes.status === 201, JSON.stringify(billRes.data));

  const print = await api(`/bills/${billRes.data._id}/print`, { token: adminToken, raw: true });
  check('PDF invoice generated (content-type)', print.status === 200 && print.headers.get('content-type')?.includes('pdf'), `status=${print.status}`);
  check('PDF is a valid PDF file', print.buffer.length > 500 && print.buffer.slice(0, 5).toString() === '%PDF-');

  // cleanup invoice test docs (bills/sale/product)
  const Sale = require('../models/Sale');
  await Sale.deleteMany({ bill: billRes.data._id });
  await Bill.deleteOne({ _id: billRes.data._id });
  await Product.deleteOne({ _id: prod._id });

  // ---------- Cleanup ----------
  console.log('\n--- Cleanup ---');
  await User.deleteMany({ username: /^_test_set_/ });
  await Setting.deleteMany({});
  await Setting.create(originalJson);
  console.log('Test data removed, settings restored');

  console.log(failures === 0 ? '\n🎉 ALL TESTS PASSED' : `\n⚠️  ${failures} TEST(S) FAILED`);
  await mongoose.disconnect();
  process.exit(failures === 0 ? 0 : 1);
};

run().catch((e) => {
  console.error('TEST RUNNER ERROR:', e);
  process.exit(1);
});
