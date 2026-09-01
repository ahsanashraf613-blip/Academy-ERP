require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const { helmetConfig, apiLimiter } = require('./middleware/security');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/users.routes');
const studentRoutes = require('./routes/students.routes');
const staffRoutes = require('./routes/staff.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const gradeRoutes = require('./routes/grades.routes');
const feeRoutes = require('./routes/fees.routes');
const timetableRoutes = require('./routes/timetable.routes');
const auditRoutes = require('./routes/audit.routes');

const REQUIRED_ENV = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key] || process.env[key].length < 20) {
    console.error(`Missing or weak ${key}. Set a long random value in .env before starting the server.`);
    process.exit(1);
  }
}

const app = express();

// Trust the first proxy hop (needed for correct req.ip behind a load balancer/reverse proxy)
app.set('trust proxy', 1);

app.use(helmetConfig);
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use('/api', apiLimiter);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/audit', auditRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Not found.' }));

// Central error handler - never leak stack traces to the client
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: 'An unexpected error occurred.' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`School admin API listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});
