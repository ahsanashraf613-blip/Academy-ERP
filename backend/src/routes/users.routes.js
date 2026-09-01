const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { body, param, query, validationResult } = require('express-validator');
const db = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validationErrorHandler } = require('../middleware/security');
const { logAction } = require('../utils/audit');

const router = express.Router();
router.use(requireAuth);
router.use(requireRole('admin'));

const userValidators = [
  body('name').trim().isLength({ min: 1, max: 100 }).escape(),
  body('email').isEmail().normalizeEmail(),
  body('role').isIn(['admin', 'registrar', 'teacher', 'accountant']),
  body('password').optional({ values: 'falsy' }).isLength({ min: 12 }),
];

// List all users
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC').all();
  res.json({ data: rows });
});

// Get single user
router.get('/:id', param('id').isUUID(), validationErrorHandler(validationResult), (req, res) => {
  const user = db.prepare('SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ data: user });
});

// Create user
router.post(
  '/',
  userValidators,
  validationErrorHandler(validationResult),
  (req, res) => {
    const id = uuidv4();
    const b = req.body;
    const password = b.password || Math.random().toString(36).slice(2, 14);
    const hash = bcrypt.hashSync(password, 12);

    try {
      db.prepare(
        `INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`
      ).run(id, b.name, b.email, hash, b.role);
    } catch (err) {
      if (String(err.message).includes('UNIQUE')) {
        return res.status(409).json({ error: 'A user with this email already exists.' });
      }
      throw err;
    }

    logAction({ userId: req.user.id, action: 'create', entity: 'user', entityId: id, ip: req.ip });
    const created = db.prepare('SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ?').get(id);
    res.status(201).json({ data: created, tempPassword: b.password ? undefined : password });
  }
);

// Update user
router.put(
  '/:id',
  [param('id').isUUID(), ...userValidators],
  validationErrorHandler(validationResult),
  (req, res) => {
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'User not found.' });

    const b = req.body;
    let query = `UPDATE users SET name=?, email=?, role=?, updated_at=datetime('now') WHERE id=?`;
    const params = [b.name, b.email, b.role, req.params.id];

    // Only update password if provided
    if (b.password) {
      const hash = bcrypt.hashSync(b.password, 12);
      query = `UPDATE users SET name=?, email=?, role=?, password_hash=?, updated_at=datetime('now') WHERE id=?`;
      params.splice(3, 0, hash);
    }

    try {
      db.prepare(query).run(...params);
    } catch (err) {
      if (String(err.message).includes('UNIQUE')) {
        return res.status(409).json({ error: 'A user with this email already exists.' });
      }
      throw err;
    }

    logAction({ userId: req.user.id, action: 'update', entity: 'user', entityId: req.params.id, ip: req.ip });
    const updated = db.prepare('SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ?').get(req.params.id);
    res.json({ data: updated });
  }
);

// Toggle user active status
router.patch(
  '/:id/toggle-status',
  param('id').isUUID(),
  validationErrorHandler(validationResult),
  (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user.id === req.user.id) return res.status(400).json({ error: 'You cannot deactivate your own account.' });

    const newStatus = user.is_active ? 0 : 1;
    db.prepare('UPDATE users SET is_active=?, updated_at=datetime(\'now\') WHERE id=?').run(newStatus, req.params.id);
    logAction({ userId: req.user.id, action: 'update', entity: 'user', entityId: req.params.id, ip: req.ip });
    const updated = db.prepare('SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ?').get(req.params.id);
    res.json({ data: updated });
  }
);

module.exports = router;
