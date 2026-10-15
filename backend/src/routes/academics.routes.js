const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validationErrorHandler } = require('../middleware/security');
const { logAction } = require('../utils/audit');

const router = express.Router();
router.use(requireAuth);

router.get('/years', (req, res) => {
  const rows = db.prepare('SELECT * FROM academic_years ORDER BY start_date DESC').all();
  res.json({ data: rows });
});

router.post(
  '/years',
  requireRole('admin'),
  [
    body('name').trim().notEmpty(),
    body('start_date').isISO8601(),
    body('end_date').isISO8601(),
  ],
  validationErrorHandler(validationResult),
  (req, res) => {
    const id = uuidv4();
    const b = req.body;

    db.prepare(
      'INSERT INTO academic_years (id, name, start_date, end_date, is_active) VALUES (?, ?, ?, ?, ?)'
    ).run(id, b.name, b.start_date, b.end_date, b.is_active ? 1 : 0);

    logAction({ userId: req.user.id, action: 'create', entity: 'academic_year', entityId: id, ip: req.ip });

    const created = db.prepare('SELECT * FROM academic_years WHERE id = ?').get(id);
    res.status(201).json({ data: created });
  }
);

router.get('/classes', (req, res) => {
  const rows = db.prepare('SELECT * FROM classes ORDER BY name').all();
  res.json({ data: rows });
});

router.post(
  '/classes',
  requireRole('admin', 'registrar'),
  [
    body('name').trim().notEmpty(),
    body('academic_year_id').optional().isUUID(),
  ],
  validationErrorHandler(validationResult),
  (req, res) => {
    const id = uuidv4();
    const b = req.body;

    db.prepare(
      'INSERT INTO classes (id, academic_year_id, name, level, status) VALUES (?, ?, ?, ?, ?)'
    ).run(id, b.academic_year_id || null, b.name, b.level || null, b.status || 'active');

    logAction({ userId: req.user.id, action: 'create', entity: 'class', entityId: id, ip: req.ip });

    const created = db.prepare('SELECT * FROM classes WHERE id = ?').get(id);
    res.status(201).json({ data: created });
  }
);

router.get('/sections', (req, res) => {
  const rows = db.prepare('SELECT * FROM sections ORDER BY name').all();
  res.json({ data: rows });
});

router.post(
  '/sections',
  requireRole('admin', 'registrar'),
  [
    body('class_id').isUUID(),
    body('name').trim().notEmpty(),
  ],
  validationErrorHandler(validationResult),
  (req, res) => {
    const id = uuidv4();
    const b = req.body;

    db.prepare(
      'INSERT INTO sections (id, class_id, name, capacity) VALUES (?, ?, ?, ?)'
    ).run(id, b.class_id, b.name, Number(b.capacity || 0));

    logAction({ userId: req.user.id, action: 'create', entity: 'section', entityId: id, ip: req.ip });

    const created = db.prepare('SELECT * FROM sections WHERE id = ?').get(id);
    res.status(201).json({ data: created });
  }
);

router.get('/subjects', (req, res) => {
  const rows = db.prepare('SELECT * FROM subjects ORDER BY name').all();
  res.json({ data: rows });
});

router.post(
  '/subjects',
  requireRole('admin', 'registrar'),
  [
    body('name').trim().notEmpty(),
    body('code').optional().trim(),
  ],
  validationErrorHandler(validationResult),
  (req, res) => {
    const id = uuidv4();
    const b = req.body;

    db.prepare(
      'INSERT INTO subjects (id, name, code, description) VALUES (?, ?, ?, ?)'
    ).run(id, b.name, b.code || null, b.description || null);

    logAction({ userId: req.user.id, action: 'create', entity: 'subject', entityId: id, ip: req.ip });

    const created = db.prepare('SELECT * FROM subjects WHERE id = ?').get(id);
    res.status(201).json({ data: created });
  }
);

module.exports = router;
