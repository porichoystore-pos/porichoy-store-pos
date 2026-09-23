const mongoose = require('mongoose');

const COLLECTIONS = ['users', 'products', 'categories', 'customers', 'bills', 'sales', 'settings'];
const SECRET_FIELDS = new Set(['password']); // never export password hashes

// @desc    Export all data as JSON
// @route   GET /api/backup/export
// @access  Private/Admin
exports.exportBackup = async (req, res) => {
  try {
    const data = {};
    for (const name of COLLECTIONS) {
      const docs = await mongoose.connection.collection(name).find({}).toArray();
      data[name] = docs.map((doc) => {
        const clean = { ...doc };
        SECRET_FIELDS.forEach((f) => delete clean[f]);
        return clean;
      });
    }

    const filename = `porichoy-backup-${new Date().toISOString().split('T')[0]}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.json({
      exportedAt: new Date().toISOString(),
      version: 1,
      collections: COLLECTIONS,
      counts: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.length])),
      note: 'Passwords are NOT included in exports for security. Imported users keep existing passwords only if already present.',
      data
    });
  } catch (error) {
    console.error('Backup export error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Import data from backup JSON (upsert by _id)
// @route   POST /api/backup/import
// @access  Private/Admin
exports.importBackup = async (req, res) => {
  try {
    const { data, collections } = req.body;

    if (!data || typeof data !== 'object') {
      return res.status(400).json({ message: 'Invalid backup: missing "data" object' });
    }

    const allowed = Array.isArray(collections) ? collections.filter((c) => COLLECTIONS.includes(c)) : COLLECTIONS;
    const report = {};

    for (const name of allowed) {
      const docs = data[name];
      if (!Array.isArray(docs)) continue;

      const ops = docs
        .filter((d) => d && d._id)
        .map((doc) => {
          const { _id, ...rest } = doc; // _id is immutable — filter-only
          return {
            updateOne: {
              filter: { _id: doc._id instanceof mongoose.mongo.ObjectId ? doc._id : new mongoose.mongo.ObjectId(String(doc._id)) },
              update: { $set: rest },
              upsert: true
            }
          };
        });

      if (ops.length > 0) {
        const result = await mongoose.connection.collection(name).bulkWrite(ops, { ordered: false });
        report[name] = {
          matched: result.matchedCount,
          updated: result.modifiedCount,
          inserted: result.upsertedCount
        };
      } else {
        report[name] = { matched: 0, updated: 0, inserted: 0 };
      }
    }

    res.json({ message: 'Backup imported (upserted by _id)', report });
  } catch (error) {
    console.error('Backup import error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
