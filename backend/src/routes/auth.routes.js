const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { loginLimiter, validationErrorHandler } = require('../middleware/security');
const { requireAuth } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

const router = express.Router();
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_TTL || '15m' }
  );
}

function issueRefreshToken(userId) {
  const rawToken = crypto.randomBytes(48).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)`
  ).run(uuidv4(), userId, tokenHash, expiresAt);
  return rawToken;
}

const cookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

router.post(
  '/signup',
  [
    body('name').isString().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters.'),
    body('email').isEmail().normalizeEmail(),
    body('password').isString().isLength({ min: 12 }).withMessage('Password must be at least 12 characters.'),
  ],
  validationErrorHandler(validationResult),
  (req, res) => {
    const { name, email, password } = req.body;

    // Check if email already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    // Create new user with teacher role by default (can be upgraded by admin)
    const userId = uuidv4();
    const passwordHash = bcrypt.hashSync(password, 12);
    db.prepare(
      `INSERT INTO users (id, name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(userId, name, email, passwordHash, 'teacher', 0); // is_active = 0 (requires admin approval)

    logAction({ userId: null, action: 'signup', entity: 'user', entityId: userId, ip: req.ip });

    res.status(201).json({
      message: 'Account created! Your account needs admin approval. Please wait for activation.',
      user: { id: userId, name, email, role: 'teacher' },
    });
  }
);

router.post(
  '/login',
  loginLimiter,
  [body('email').isEmail().normalizeEmail(), body('password').isString().isLength({ min: 1 })],
  validationErrorHandler(validationResult),
  (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    // Constant-shape response to avoid leaking whether the account exists.
    const genericError = () => res.status(401).json({ error: 'Invalid email or password.' });

    if (!user || !user.is_active) return genericError();

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(423).json({ error: 'Account temporarily locked due to failed login attempts. Try again later.' });
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      const attempts = user.failed_login_attempts + 1;
      const locked = attempts >= MAX_FAILED_ATTEMPTS;
      db.prepare(
        `UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?`
      ).run(
        attempts,
        locked ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString() : null,
        user.id
      );
      logAction({ userId: user.id, action: 'login_failed', entity: 'user', entityId: user.id, ip: req.ip });
      return genericError();
    }

    db.prepare('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?').run(user.id);

    const accessToken = signAccessToken(user);
    const refreshToken = issueRefreshToken(user.id);
    res.cookie('refreshToken', refreshToken, cookieOpts);

    logAction({ userId: user.id, action: 'login_success', entity: 'user', entityId: user.id, ip: req.ip });

    res.json({
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  }
);

router.post('/refresh', (req, res) => {
  const rawToken = req.cookies?.refreshToken;
  if (!rawToken) return res.status(401).json({ error: 'No refresh token provided.' });

  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const record = db.prepare('SELECT * FROM refresh_tokens WHERE token_hash = ?').get(tokenHash);

  if (!record || record.revoked || new Date(record.expires_at) < new Date()) {
    return res.status(401).json({ error: 'Refresh token invalid or expired. Please log in again.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(record.user_id);
  if (!user || !user.is_active) return res.status(401).json({ error: 'Account unavailable.' });

  // Rotate: revoke old token, issue a new one
  db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE id = ?').run(record.id);
  const newRefreshToken = issueRefreshToken(user.id);
  res.cookie('refreshToken', newRefreshToken, cookieOpts);

  const accessToken = signAccessToken(user);
  res.json({ accessToken, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

router.post('/logout', requireAuth, (req, res) => {
  const rawToken = req.cookies?.refreshToken;
  if (rawToken) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?').run(tokenHash);
  }
  res.clearCookie('refreshToken', { path: '/api/auth' });
  logAction({ userId: req.user.id, action: 'logout', entity: 'user', entityId: req.user.id, ip: req.ip });
  res.json({ message: 'Logged out.' });
});

router.post(
  '/change-password',
  requireAuth,
  [
    body('currentPassword').isString().isLength({ min: 1 }),
    body('newPassword').isString().isLength({ min: 12 }).withMessage('New password must be at least 12 characters.'),
  ],
  validationErrorHandler(validationResult),
  (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!bcrypt.compareSync(req.body.currentPassword, user.password_hash)) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }
    const newHash = bcrypt.hashSync(req.body.newPassword, 12);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?').run(newHash, user.id);
    // Revoke all outstanding refresh tokens on password change
    db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?').run(user.id);
    logAction({ userId: user.id, action: 'password_changed', entity: 'user', entityId: user.id, ip: req.ip });
    res.json({ message: 'Password updated. Please log in again.' });
  }
);

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(req.user.id);
  res.json({ user });
});

module.exports = router;
