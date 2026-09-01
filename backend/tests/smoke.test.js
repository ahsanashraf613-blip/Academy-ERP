#!/usr/bin/env node
/**
 * Basic smoke tests for School Admin API
 * Run with: node tests/smoke.test.js
 */

const http = require('http');
const assert = require('assert');

const API_BASE = process.env.API_URL || 'http://localhost:4000/api';

let testsPassed = 0;
let testsFailed = 0;

async function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null,
          });
        } catch (err) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
    testsPassed++;
  } catch (err) {
    console.log(`✗ ${name}`);
    console.log(`  ${err.message}`);
    testsFailed++;
  }
}

async function runTests() {
  console.log('Running smoke tests...\n');

  // Health check
  await test('Health check', async () => {
    const res = await request('GET', '/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
  });

  // Login without credentials
  await test('Login fails with missing credentials', async () => {
    const res = await request('POST', '/auth/login', {});
    assert(res.status === 400 || res.status === 422);
  });

  // Get me without auth
  await test('GET /auth/me fails without token', async () => {
    const res = await request('GET', '/auth/me');
    assert.strictEqual(res.status, 401);
  });

  // Get students without auth
  await test('GET /students fails without token', async () => {
    const res = await request('GET', '/students');
    assert.strictEqual(res.status, 401);
  });

  // Create student without auth
  await test('POST /students fails without token', async () => {
    const res = await request('POST', '/students', {
      admissionNo: 'TEST001',
      firstName: 'Test',
      lastName: 'User',
      gradeLevel: '10',
    });
    assert.strictEqual(res.status, 401);
  });

  console.log(`\n\n📊 Results: ${testsPassed} passed, ${testsFailed} failed`);
  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
