const express = require('express');
const db = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/dashboard', requireRole('admin', 'registrar', 'accountant'), (req, res) => {
  const totalStudents = db.prepare('SELECT COUNT(*) AS c FROM students').get().c || 0;
  const activeStudents = db.prepare("SELECT COUNT(*) AS c FROM students WHERE status = 'active'").get().c || 0;
  const attendanceToday = db.prepare("SELECT COUNT(*) AS c FROM attendance WHERE date = date('now') AND status = 'present'").get().c || 0;
  const feesCollected = db.prepare("SELECT IFNULL(SUM(amount_paid), 0) AS s FROM fee_invoices").get().s || 0;
  const overdueFees = db.prepare("SELECT COUNT(*) AS c FROM fee_invoices WHERE status IN ('overdue', 'partial')").get().c || 0;

  res.json({
    data: {
      totalStudents,
      activeStudents,
      attendanceToday,
      feesCollected,
      overdueFees,
    },
  });
});

module.exports = router;
