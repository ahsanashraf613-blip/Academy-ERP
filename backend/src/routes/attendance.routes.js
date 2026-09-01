const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { body, query, validationResult } = require('express-validator');
const db = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validationErrorHandler } = require('../middleware/security');
const { logAction } = require('../utils/audit');

const router = express.Router();
router.use(requireAuth);

router.get('/', [query('date').optional().isISO8601(), query('studentId').optional().isUUID()], validationErrorHandler(validationResult), (req, res) => {
  let sql = 'SELECT * FROM attendance WHERE 1=1';
  const params = [];
  if (req.query.date) { sql += ' AND date = ?'; params.push(req.query.date); }
  if (req.query.studentId) { sql += ' AND student_id = ?'; params.push(req.query.studentId); }
  sql += ' ORDER BY date DESC';
  res.json({ data: db.prepare(sql).all(...params) });
});

router.post(
  '/',
  requireRole('admin', 'teacher', 'registrar'),
  [
    body('studentId').isUUID(),
    body('date').isISO8601(),
    body('status').isIn(['present', 'absent', 'late', 'excused']),
  ],
  validationErrorHandler(validationResult),
  (req, res) => {
    const student = db.prepare('SELECT id FROM students WHERE id = ?').get(req.body.studentId);
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    const id = uuidv4();
    try {
      db.prepare(
        `INSERT INTO attendance (id, student_id, date, status, recorded_by) VALUES (?, ?, ?, ?, ?)`
      ).run(id, req.body.studentId, req.body.date, req.body.status, req.user.id);
    } catch (err) {
      if (String(err.message).includes('UNIQUE')) {
        // Already recorded for that day - update instead
        db.prepare(`UPDATE attendance SET status = ?, recorded_by = ? WHERE student_id = ? AND date = ?`)
          .run(req.body.status, req.user.id, req.body.studentId, req.body.date);
        logAction({ userId: req.user.id, action: 'update', entity: 'attendance', entityId: req.body.studentId, ip: req.ip });
        return res.json({ data: db.prepare('SELECT * FROM attendance WHERE student_id = ? AND date = ?').get(req.body.studentId, req.body.date) });
      }
      throw err;
    }
    logAction({ userId: req.user.id, action: 'create', entity: 'attendance', entityId: id, ip: req.ip });
    res.status(201).json({ data: db.prepare('SELECT * FROM attendance WHERE id = ?').get(id) });
  }
);

module.exports = router;
