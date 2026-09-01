const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { body, param, query, validationResult } = require('express-validator');
const db = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validationErrorHandler } = require('../middleware/security');
const { logAction } = require('../utils/audit');

const router = express.Router();
router.use(requireAuth);

router.get('/', [query('studentId').optional().isUUID(), query('term').optional().isString()], validationErrorHandler(validationResult), (req, res) => {
  let sql = 'SELECT * FROM grades WHERE 1=1';
  const params = [];
  if (req.query.studentId) { sql += ' AND student_id = ?'; params.push(req.query.studentId); }
  if (req.query.term) { sql += ' AND term = ?'; params.push(req.query.term); }
  sql += ' ORDER BY created_at DESC';
  res.json({ data: db.prepare(sql).all(...params) });
});

const gradeValidators = [
  body('studentId').isUUID(),
  body('subject').trim().isLength({ min: 1, max: 60 }).escape(),
  body('term').trim().isLength({ min: 1, max: 30 }).escape(),
  body('score').isFloat({ min: 0, max: 1000 }),
  body('maxScore').optional().isFloat({ min: 1, max: 1000 }),
  body('remarks').optional({ values: 'falsy' }).trim().isLength({ max: 250 }).escape(),
];

router.post('/', requireRole('admin', 'teacher'), gradeValidators, validationErrorHandler(validationResult), (req, res) => {
  const b = req.body;
  if (b.score > (b.maxScore || 100)) {
    return res.status(400).json({ error: 'Score cannot exceed the maximum score.' });
  }
  const student = db.prepare('SELECT id FROM students WHERE id = ?').get(b.studentId);
  if (!student) return res.status(404).json({ error: 'Student not found.' });

  const id = uuidv4();
  db.prepare(
    `INSERT INTO grades (id, student_id, subject, term, score, max_score, remarks, recorded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, b.studentId, b.subject, b.term, b.score, b.maxScore || 100, b.remarks || null, req.user.id);

  logAction({ userId: req.user.id, action: 'create', entity: 'grade', entityId: id, ip: req.ip });
  res.status(201).json({ data: db.prepare('SELECT * FROM grades WHERE id = ?').get(id) });
});

router.put('/:id', requireRole('admin', 'teacher'), [param('id').isUUID(), ...gradeValidators], validationErrorHandler(validationResult), (req, res) => {
  const existing = db.prepare('SELECT * FROM grades WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Grade record not found.' });
  const b = req.body;
  db.prepare(
    `UPDATE grades SET subject=?, term=?, score=?, max_score=?, remarks=?, updated_at=datetime('now') WHERE id=?`
  ).run(b.subject, b.term, b.score, b.maxScore || 100, b.remarks || null, req.params.id);
  logAction({ userId: req.user.id, action: 'update', entity: 'grade', entityId: req.params.id, ip: req.ip });
  res.json({ data: db.prepare('SELECT * FROM grades WHERE id = ?').get(req.params.id) });
});

module.exports = router;
