const { Pool } = require('pg');
require('dotenv').config();

// Supabase PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Helper functions for query execution
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.DEBUG_SQL) {
      console.log('Executed query', { text, duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('Database query error', { text, error: error.message });
    throw error;
  }
};

const getOne = async (text, params) => {
  const res = await query(text, params);
  return res.rows[0];
};

const getAll = async (text, params) => {
  const res = await query(text, params);
  return res.rows;
};

const run = async (text, params) => {
  const res = await query(text, params);
  return res.rowCount;
};

// Export pool and helper functions
module.exports = {
  query,
  getOne,
  getAll,
  run,
  pool
};
