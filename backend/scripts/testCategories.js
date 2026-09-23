/**
 * E2E test for Categories CRUD + guards.
 * Run: node scripts/testCategories.js
 */
require('dotenv').config();
process.env.PORT = '5078'; // scratch port

const mongoose = require('mongoose');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');

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
  await User.deleteMany({ username: '_test_cat_admin' });
  await User.create({ username: '_test_cat_admin', password: 'TestPass123!', role: 'admin' });
  const login = await api('/auth/login', { method: 'POST', body: { username: '_test_cat_admin', password: 'TestPass123!' } });
  const token = login.data?.token;
  check('Admin login', !!token);

  // Cleanup leftovers from previous failed runs
  await Product.deleteMany({ name: { $regex: /^_TEST_CAT/ } });
  await Category.deleteMany({ name: { $regex: /^_TEST_CAT/ } });

  console.log('\n--- 1. Add category ---');
  const create = await api('/categories', {
    method: 'POST', token,
    body: { name: '_TEST_CAT_A', description: 'Test category', color: '#FF0000', type: 'main' }
  });
  check('POST /categories → 201', create.status === 201, `got ${create.status}: ${JSON.stringify(create.data)}`);
  const catA = create.data;
  check('Color + type saved', catA?.color === '#FF0000' && catA?.type === 'main');

  const dup = await api('/categories', { method: 'POST', token, body: { name: '_TEST_CAT_A', type: 'main' } });
  check('Duplicate name rejected (400)', dup.status === 400, `got ${dup.status}`);

  console.log('\n--- 2. Edit (name + color) ---');
  const edit = await api(`/categories/${catA._id}`, {
    method: 'PUT', token,
    body: { name: '_TEST_CAT_A_RENAMED', color: '#00FF00' }
  });
  check('PUT /categories/:id → 200', edit.status === 200, `got ${edit.status}`);
  check('Name updated', edit.data?.name === '_TEST_CAT_A_RENAMED');
  check('Color updated', edit.data?.color === '#00FF00');

  // Rename collision guard
  await api('/categories', { method: 'POST', token, body: { name: '_TEST_CAT_B', type: 'main' } });
  const catB = (await api(`/categories`, { token })).data.find((c) => c.name === '_TEST_CAT_B');
  const collision = await api(`/categories/${catB?._id}`, { method: 'PUT', token, body: { name: '_TEST_CAT_A_RENAMED' } });
  check('Rename to existing name rejected (400)', collision.status === 400, `got ${collision.status}`);

  console.log('\n--- 3. Persistence check (simulated refresh) ---');
  const list = (await api('/categories', { token })).data || [];
  const persisted = list.find((c) => c._id === catA._id);
  check('Renamed category present after refresh', persisted?.name === '_TEST_CAT_A_RENAMED');
  check('Updated color persisted', persisted?.color === '#00FF00');

  console.log('\n--- 4. Delete blocked when products exist ---');
  const tempProduct = await Product.create({
    name: '_TEST_CAT_PRODUCT', category: catA._id, mrp: 100, price: 50, stock: 0
  });
  const blocked = await api(`/categories/${catA._id}`, { method: 'DELETE', token });
  check('Delete with products → 400', blocked.status === 400, `got ${blocked.status}`);
  check('Error message mentions products', /product/i.test(blocked.data?.message || ''));

  await Product.deleteOne({ _id: tempProduct._id });
  const del = await api(`/categories/${catA._id}`, { method: 'DELETE', token });
  check('Delete empty category → 200', del.status === 200, `got ${del.status}`);
  const afterDelete = (await api('/categories', { token })).data || [];
  check('Deleted category gone from list', !afterDelete.some((c) => c._id === catA._id));

  console.log('\n--- 5. Subcategories + parent guard ---');
  const parent = await api('/categories', { method: 'POST', token, body: { name: '_TEST_CAT_PARENT', type: 'main' } });
  const sub = await api('/categories', {
    method: 'POST', token,
    body: { name: '_TEST_CAT_SUB', type: 'sub', parentCategory: parent.data._id }
  });
  check('Subcategory created with parent', sub.status === 201 && sub.data?.parentCategory === parent.data._id, JSON.stringify(sub.data?.parentCategory));

  const blockParent = await api(`/categories/${parent.data._id}`, { method: 'DELETE', token });
  check('Delete parent with subcategories → 400', blockParent.status === 400, `got ${blockParent.status}`);

  await api(`/categories/${sub.data._id}`, { method: 'DELETE', token });
  const delParent = await api(`/categories/${parent.data._id}`, { method: 'DELETE', token });
  check('Parent deletable after sub removed → 200', delParent.status === 200);

  console.log('\n--- Cleanup ---');
  await Category.deleteMany({ name: { $regex: /^_TEST_CAT/ } });
  await Product.deleteMany({ name: { $regex: /^_TEST_CAT/ } });
  await User.deleteMany({ username: '_test_cat_admin' });
  console.log('Test data removed');

  console.log(failures === 0 ? '\n🎉 ALL TESTS PASSED' : `\n⚠️  ${failures} TEST(S) FAILED`);
  await mongoose.disconnect();
  process.exit(failures === 0 ? 0 : 1);
};

run().catch((e) => {
  console.error('TEST RUNNER ERROR:', e);
  process.exit(1);
});
