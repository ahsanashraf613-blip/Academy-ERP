const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { body, query, validationResult } = require('express-validator');
const db = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validationErrorHandler } = require('../middleware/security');
const { logAction } = require('../utils/audit');

const router = express.Router();
router.use(requireAuth);

router.get('/', [query('gradeLevel').optional().isString()], validationErrorHandler(validationResult), (req, res) => {
  let sql = 'SELECT * FROM timetable WHERE 1=1';
  const params = [];
  if (req.query.gradeLevel) { sql += ' AND grade_level = ?'; params.push(req.query.gradeLevel); }
  sql += " ORDER BY CASE day_of_week WHEN 'Mon' THEN 1 WHEN 'Tue' THEN 2 WHEN 'Wed' THEN 3 WHEN 'Thu' THEN 4 WHEN 'Fri' THEN 5 ELSE 6 END, period";
  res.json({ data: db.prepare(sql).all(...params) });
});

router.post(
  '/',
  requireRole('admin', 'registrar'),
  [
    body('gradeLevel').trim().isLength({ min: 1, max: 20 }).escape(),
    body('section').optional({ values: 'falsy' }).trim().isLength({ max: 20 }).escape(),
    body('dayOfWeek').isIn(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']),
    body('period').trim().isLength({ min: 1, max: 20 }).escape(),
    body('subject').trim().isLength({ min: 1, max: 60 }).escape(),
    body('staffId').optional({ values: 'falsy' }).isUUID(),
  ],
  validationErrorHandler(validationResult),
  (req, res) => {
    const b = req.body;
    const id = uuidv4();
    db.prepare(
      `INSERT INTO timetable (id, grade_level, section, day_of_week, period, subject, staff_id) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, b.gradeLevel, b.section || null, b.dayOfWeek, b.period, b.subject, b.staffId || null);
    logAction({ userId: req.user.id, action: 'create', entity: 'timetable', entityId: id, ip: req.ip });
    res.status(201).json({ data: db.prepare('SELECT * FROM timetable WHERE id = ?').get(id) });
  }
);

router.delete('/:id', requireRole('admin', 'registrar'), (req, res) => {
  const existing = db.prepare('SELECT * FROM timetable WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Timetable entry not found.' });
  db.prepare('DELETE FROM timetable WHERE id = ?').run(req.params.id);
  logAction({ userId: req.user.id, action: 'delete', entity: 'timetable', entityId: req.params.id, ip: req.ip });
  res.status(204).send();
});

module.exports = router;
