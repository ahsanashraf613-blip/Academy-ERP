require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const db = require('./db');

const email = process.env.SEED_ADMIN_EMAIL || 'admin@school.test';
const password = process.env.SEED_ADMIN_PASSWORD;

if (!password || password.length < 12) {
  console.error('Refusing to seed: set SEED_ADMIN_PASSWORD in .env to a value of 12+ characters.');
  process.exit(1);
}

const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
if (existing) {
  console.log(`Admin user ${email} already exists. Skipping.`);
  process.exit(0);
}

const hash = bcrypt.hashSync(password, 12);
db.prepare(
  `INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, 'admin')`
).run(uuidv4(), 'System Administrator', email, hash);

console.log(`Seeded admin account: ${email}`);
console.log('Log in and change this password immediately.');
