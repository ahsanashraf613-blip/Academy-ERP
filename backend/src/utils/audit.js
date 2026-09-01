const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

function logAction({ userId, action, entity, entityId, ip }) {
  db.prepare(
    `INSERT INTO audit_log (id, user_id, action, entity, entity_id, ip_address) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(uuidv4(), userId || null, action, entity, entityId || null, ip || null);
}

module.exports = { logAction };
