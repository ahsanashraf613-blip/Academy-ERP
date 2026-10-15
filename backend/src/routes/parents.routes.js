const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validationErrorHandler } = require('../middleware/security');

const router = express.Router();
router.use(requireAuth);

router.get('/dashboard', requireRole('parent'), (req, res) => {
  const children = db
    .prepare(
      `SELECT s.id, s.first_name, s.last_name, s.grade_level, s.section
       FROM students s
       JOIN parent_student_links l ON l.student_id = s.id
       WHERE l.parent_user_id = ?`
    )
    .all(req.user.id);

  const attendanceSummary = children.map((student) => ({
    studentId: student.id,
    name: `${student.first_name} ${student.last_name}`,
    latestAttendance: db
      .prepare(
        `SELECT status, date
         FROM attendance
         WHERE student_id = ?
         ORDER BY date DESC LIMIT 1`
      )
      .get(student.id),
  }));

  res.json({ data: { children, attendanceSummary } });
});

router.get(
  '/:parentId/students',
  requireRole('admin', 'registrar'),
  [param('parentId').isUUID()],
  validationErrorHandler(validationResult),
  (req, res) => {
    const rows = db
      .prepare(
        `SELECT s.*
         FROM students s
         JOIN parent_student_links l ON l.student_id = s.id
         WHERE l.parent_user_id = ?`
      )
      .all(req.params.parentId);

    res.json({ data: rows });
  }
);

router.post(
  '/link',
  requireRole('admin'),
  [
    body('parent_user_id').isUUID(),
    body('student_id').isUUID(),
  ],
  validationErrorHandler(validationResult),
  (req, res) => {
    const { parent_user_id, student_id, relation, is_primary } = req.body;
    const exists = db
      .prepare('SELECT id FROM parent_student_links WHERE parent_user_id = ? AND student_id = ?')
      .get(parent_user_id, student_id);

    if (exists) {
      return res.status(409).json({ error: 'Parent is already linked to this student.' });
    }

    const id = require('uuid').v4();
    db.prepare(
      'INSERT INTO parent_student_links (id, parent_user_id, student_id, relation, is_primary) VALUES (?, ?, ?, ?, ?)'
    ).run(id, parent_user_id, student_id, relation || null, is_primary ? 1 : 0);

    res.status(201).json({ data: { id, parent_user_id, student_id } });
  }
);

module.exports = router;
