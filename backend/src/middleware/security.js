const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Strict security headers. CSP is locked down since this API serves JSON only,
// not HTML, so there's no need to allow scripts/styles/etc.
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'same-site' },
  referrerPolicy: { policy: 'no-referrer' },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
});

// General API rate limit - protects against abuse/DoS on all routes.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down and try again shortly.' },
});

// Tight rate limit specifically for login, to blunt credential-stuffing / brute force.
const loginLimiter = rateLimit({
  windowMs: Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  limit: Number(process.env.LOGIN_RATE_LIMIT_MAX) || 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Too many login attempts. Please wait before trying again.' },
});

function validationErrorHandler(validationResult) {
  return (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid input.', details: errors.array() });
    }
    return next();
  };
}

module.exports = { helmetConfig, apiLimiter, loginLimiter, validationErrorHandler };
