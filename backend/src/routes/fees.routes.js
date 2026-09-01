const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { body, param, query, validationResult } = require('express-validator');
const db = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validationErrorHandler } = require('../middleware/security');
const { logAction } = require('../utils/audit');

const router = express.Router();
router.use(requireAuth);

function computeStatus(amountDue, amountPaid, dueDate) {
  if (amountPaid >= amountDue && amountDue > 0) return 'paid';
  if (amountPaid > 0) return 'partial';
  if (dueDate && new Date(dueDate) < new Date()) return 'overdue';
  return 'unpaid';
}

router.get('/', query('studentId').optional().isUUID(), validationErrorHandler(validationResult), (req, res) => {
  let sql = 'SELECT * FROM fee_invoices WHERE 1=1';
  const params = [];
  if (req.query.studentId) { sql += ' AND student_id = ?'; params.push(req.query.studentId); }
  sql += ' ORDER BY created_at DESC';
  res.json({ data: db.prepare(sql).all(...params) });
});

router.post(
  '/',
  requireRole('admin', 'accountant'),
  [
    body('studentId').isUUID(),
    body('term').trim().isLength({ min: 1, max: 30 }).escape(),
    body('amountDue').isFloat({ min: 0 }),
    body('dueDate').optional({ values: 'falsy' }).isISO8601(),
  ],
  validationErrorHandler(validationResult),
  (req, res) => {
    const b = req.body;
    const student = db.prepare('SELECT id FROM students WHERE id = ?').get(b.studentId);
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    const id = uuidv4();
    const status = computeStatus(b.amountDue, 0, b.dueDate);
    db.prepare(
      `INSERT INTO fee_invoices (id, student_id, term, amount_due, amount_paid, due_date, status) VALUES (?, ?, ?, ?, 0, ?, ?)`
    ).run(id, b.studentId, b.term, b.amountDue, b.dueDate || null, status);

    logAction({ userId: req.user.id, action: 'create', entity: 'fee_invoice', entityId: id, ip: req.ip });
    res.status(201).json({ data: db.prepare('SELECT * FROM fee_invoices WHERE id = ?').get(id) });
  }
);

router.post(
  '/:id/payments',
  requireRole('admin', 'accountant'),
  [param('id').isUUID(), body('amount').isFloat({ gt: 0 })],
  validationErrorHandler(validationResult),
  (req, res) => {
    const invoice = db.prepare('SELECT * FROM fee_invoices WHERE id = ?').get(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });

    const newPaid = invoice.amount_paid + req.body.amount;
    const status = computeStatus(invoice.amount_due, newPaid, invoice.due_date);
    db.prepare(`UPDATE fee_invoices SET amount_paid = ?, status = ?, updated_at = datetime('now') WHERE id = ?`).run(newPaid, status, req.params.id);

    logAction({ userId: req.user.id, action: 'payment_recorded', entity: 'fee_invoice', entityId: req.params.id, ip: req.ip });
    res.json({ data: db.prepare('SELECT * FROM fee_invoices WHERE id = ?').get(req.params.id) });
  }
);

module.exports = router;
