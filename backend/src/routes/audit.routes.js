const express = require('express');
const { query, validationResult } = require('express-validator');
const db = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validationErrorHandler } = require('../middleware/security');

const router = express.Router();
router.use(requireAuth);
router.use(requireRole('admin'));

// List audit log
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('pageSize').optional().isInt({ min: 1, max: 100 }),
    query('action').optional().isString(),
    query('entity').optional().isString(),
  ],
  validationErrorHandler(validationResult),
  (req, res) => {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 50;
    const action = req.query.action ? `%${req.query.action}%` : null;
    const entity = req.query.entity ? `%${req.query.entity}%` : null;

    let where = '';
    const params = [];

    if (action) {
      where += 'WHERE action LIKE ? ';
      params.push(action);
    }
    if (entity) {
      where += (where ? 'AND ' : 'WHERE ') + 'entity LIKE ? ';
      params.push(entity);
    }

    const total = db.prepare(`SELECT COUNT(*) AS c FROM audit_log ${where}`).get(...params).c;
    const rows = db
      .prepare(`
        SELECT al.*, u.name as user_name 
        FROM audit_log al
        LEFT JOIN users u ON al.user_id = u.id
        ${where}
        ORDER BY al.created_at DESC 
        LIMIT ? OFFSET ?
      `)
      .all(...params, pageSize, (page - 1) * pageSize);

    res.json({ data: rows, page, pageSize, total });
  }
);

module.exports = router;
