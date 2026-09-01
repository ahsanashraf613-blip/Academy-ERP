const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { body, param, query, validationResult } = require('express-validator');
const db = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validationErrorHandler } = require('../middleware/security');
const { logAction } = require('../utils/audit');

const router = express.Router();
router.use(requireAuth);

const studentValidators = [
  body('admissionNo').trim().isLength({ min: 1, max: 30 }).escape(),
  body('firstName').trim().isLength({ min: 1, max: 60 }).escape(),
  body('lastName').trim().isLength({ min: 1, max: 60 }).escape(),
  body('dateOfBirth').optional({ values: 'falsy' }).isISO8601(),
  body('gender').optional({ values: 'falsy' }).isIn(['male', 'female', 'other']),
  body('gradeLevel').trim().isLength({ min: 1, max: 20 }).escape(),
  body('section').optional({ values: 'falsy' }).trim().isLength({ max: 20 }).escape(),
  body('guardianName').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).escape(),
  body('guardianPhone').optional({ values: 'falsy' }).trim().isLength({ max: 30 }).escape(),
  body('guardianEmail').optional({ values: 'falsy' }).isEmail().normalizeEmail(),
  body('address').optional({ values: 'falsy' }).trim().isLength({ max: 250 }).escape(),
];

// List + search + pagination
router.get(
  '/',
  [query('page').optional().isInt({ min: 1 }), query('pageSize').optional().isInt({ min: 1, max: 100 })],
  validationErrorHandler(validationResult),
  (req, res) => {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const search = (req.query.search || '').toString().trim();

    let where = '';
    const params = [];
    if (search) {
      where = `WHERE first_name LIKE ? OR last_name LIKE ? OR admission_no LIKE ?`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const total = db.prepare(`SELECT COUNT(*) AS c FROM students ${where}`).get(...params).c;
    const rows = db
      .prepare(`SELECT * FROM students ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(...params, pageSize, (page - 1) * pageSize);

    res.json({ data: rows, page, pageSize, total });
  }
);

router.get('/:id', param('id').isUUID(), validationErrorHandler(validationResult), (req, res) => {
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found.' });
  res.json({ data: student });
});

router.post(
  '/',
  requireRole('admin', 'registrar'),
  studentValidators,
  validationErrorHandler(validationResult),
  (req, res) => {
    const id = uuidv4();
    const b = req.body;
    try {
      db.prepare(
        `INSERT INTO students (id, admission_no, first_name, last_name, date_of_birth, gender, grade_level, section, guardian_name, guardian_phone, guardian_email, address)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(id, b.admissionNo, b.firstName, b.lastName, b.dateOfBirth || null, b.gender || null, b.gradeLevel, b.section || null, b.guardianName || null, b.guardianPhone || null, b.guardianEmail || null, b.address || null);
    } catch (err) {
      if (String(err.message).includes('UNIQUE')) {
        return res.status(409).json({ error: 'A student with this admission number already exists.' });
      }
      throw err;
    }
    logAction({ userId: req.user.id, action: 'create', entity: 'student', entityId: id, ip: req.ip });
    const created = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
    res.status(201).json({ data: created });
  }
);

router.put(
  '/:id',
  requireRole('admin', 'registrar'),
  [param('id').isUUID(), ...studentValidators],
  validationErrorHandler(validationResult),
  (req, res) => {
    const existing = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Student not found.' });
    const b = req.body;
    db.prepare(
      `UPDATE students SET admission_no=?, first_name=?, last_name=?, date_of_birth=?, gender=?, grade_level=?, section=?, guardian_name=?, guardian_phone=?, guardian_email=?, address=?, updated_at=datetime('now') WHERE id=?`
    ).run(b.admissionNo, b.firstName, b.lastName, b.dateOfBirth || null, b.gender || null, b.gradeLevel, b.section || null, b.guardianName || null, b.guardianPhone || null, b.guardianEmail || null, b.address || null, req.params.id);
    logAction({ userId: req.user.id, action: 'update', entity: 'student', entityId: req.params.id, ip: req.ip });
    const updated = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
    res.json({ data: updated });
  }
);

router.delete('/:id', requireRole('admin'), param('id').isUUID(), validationErrorHandler(validationResult), (req, res) => {
  const existing = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Student not found.' });
  db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id);
  logAction({ userId: req.user.id, action: 'delete', entity: 'student', entityId: req.params.id, ip: req.ip });
  res.status(204).send();
});

module.exports = router;
