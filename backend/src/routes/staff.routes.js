const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { body, param, validationResult } = require('express-validator');
const db = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validationErrorHandler } = require('../middleware/security');
const { logAction } = require('../utils/audit');

const router = express.Router();
router.use(requireAuth);

const staffValidators = [
  body('employeeNo').trim().isLength({ min: 1, max: 30 }).escape(),
  body('firstName').trim().isLength({ min: 1, max: 60 }).escape(),
  body('lastName').trim().isLength({ min: 1, max: 60 }).escape(),
  body('roleTitle').trim().isLength({ min: 1, max: 60 }).escape(),
  body('department').optional({ values: 'falsy' }).trim().isLength({ max: 60 }).escape(),
  body('email').optional({ values: 'falsy' }).isEmail().normalizeEmail(),
  body('phone').optional({ values: 'falsy' }).trim().isLength({ max: 30 }).escape(),
  body('hireDate').optional({ values: 'falsy' }).isISO8601(),
];

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM staff ORDER BY created_at DESC').all();
  res.json({ data: rows });
});

router.post('/', requireRole('admin'), staffValidators, validationErrorHandler(validationResult), (req, res) => {
  const id = uuidv4();
  const b = req.body;
  try {
    db.prepare(
      `INSERT INTO staff (id, employee_no, first_name, last_name, role_title, department, email, phone, hire_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, b.employeeNo, b.firstName, b.lastName, b.roleTitle, b.department || null, b.email || null, b.phone || null, b.hireDate || null);
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) return res.status(409).json({ error: 'An employee with this number already exists.' });
    throw err;
  }
  logAction({ userId: req.user.id, action: 'create', entity: 'staff', entityId: id, ip: req.ip });
  res.status(201).json({ data: db.prepare('SELECT * FROM staff WHERE id = ?').get(id) });
});

router.put('/:id', requireRole('admin'), [param('id').isUUID(), ...staffValidators], validationErrorHandler(validationResult), (req, res) => {
  const existing = db.prepare('SELECT * FROM staff WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Staff member not found.' });
  const b = req.body;
  db.prepare(
    `UPDATE staff SET employee_no=?, first_name=?, last_name=?, role_title=?, department=?, email=?, phone=?, hire_date=?, updated_at=datetime('now') WHERE id=?`
  ).run(b.employeeNo, b.firstName, b.lastName, b.roleTitle, b.department || null, b.email || null, b.phone || null, b.hireDate || null, req.params.id);
  logAction({ userId: req.user.id, action: 'update', entity: 'staff', entityId: req.params.id, ip: req.ip });
  res.json({ data: db.prepare('SELECT * FROM staff WHERE id = ?').get(req.params.id) });
});

router.delete('/:id', requireRole('admin'), param('id').isUUID(), validationErrorHandler(validationResult), (req, res) => {
  const existing = db.prepare('SELECT * FROM staff WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Staff member not found.' });
  db.prepare('DELETE FROM staff WHERE id = ?').run(req.params.id);
  logAction({ userId: req.user.id, action: 'delete', entity: 'staff', entityId: req.params.id, ip: req.ip });
  res.status(204).send();
});

module.exports = router;
