# Testing Guide

This document covers testing strategies for the School Admin system.

## Backend Testing

### Smoke Tests

Run basic smoke tests to verify API connectivity and authentication:

```bash
cd backend
npm test
```

Or with a custom API URL:

```bash
API_URL=https://your-api.com/api npm test
```

### What's Tested

- ✓ Health check endpoint
- ✓ Login validation
- ✓ Authentication required for protected endpoints
- ✓ Authorization checks

### Running Tests Manually

```bash
# Start the dev server
npm run dev

# In another terminal, run tests
npm test
```

### Integration Testing

For comprehensive integration testing, use an HTTP client like Postman or Insomnia:

1. **Import the API collection** (create from API.md)
2. **Set up environment variables**:
   - `{{API_BASE}}` = http://localhost:4000/api
   - `{{ACCESS_TOKEN}}` = (populated by login request)
3. **Run test sequences**:
   - Login → Create Student → Get Student → Update Student → Delete Student
   - Login → Create Grade → Get Grades → Update Grade
   - Etc.

### Example Manual Test Flow

```bash
# Terminal 1: Start API
cd backend
npm run dev

# Terminal 2: Seed database
npm run seed

# Terminal 3: Run tests
npm test
```

---

## Frontend Testing

### Component Testing

The frontend uses React components. Test key workflows manually:

1. **Authentication Flow**
   - Open http://localhost:5173
   - Login with seeded credentials
   - Verify redirect to dashboard

2. **CRUD Operations**
   - Create a student → Edit student → Delete student
   - Create staff → Edit staff → Delete staff
   - Record grade → Edit grade

3. **Navigation & Access Control**
   - Navigate to all pages
   - Verify admin-only pages (Users, Audit) only visible to admin role
   - Test logout and re-login

4. **Error Handling**
   - Submit empty forms (should show validation errors)
   - Try invalid email/password (should show error message)
   - Trigger API errors (e.g., delete with invalid ID)

### Running Frontend Dev Server

```bash
cd frontend
npm install
npm run dev
```

Opens on http://localhost:5173

### Building for Production

```bash
npm run build
npm run preview
```

---

## API Testing with cURL

Test specific endpoints:

```bash
# Health check
curl http://localhost:4000/api/health

# Login
TOKEN=$(curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@school.test","password":"ChangeMe!2026"}' \
  | jq -r '.accessToken')

# Get students
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/students

# Create student
curl -X POST http://localhost:4000/api/students \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "admissionNo":"STU001",
    "firstName":"John",
    "lastName":"Doe",
    "gradeLevel":"10"
  }'
```

---

## Performance Testing

### Load Testing with Artillery

Install artillery:
```bash
npm install -g artillery
```

Create `load-test.yml`:
```yaml
config:
  target: "http://localhost:4000/api"
  phases:
    - duration: 60
      arrivalRate: 10
  processor: "./load-test-functions.js"

scenarios:
  - name: "Health Check"
    flow:
      - get:
          url: "/health"

  - name: "Login"
    flow:
      - post:
          url: "/auth/login"
          json:
            email: "admin@school.test"
            password: "ChangeMe!2026"

  - name: "Get Students"
    flow:
      - post:
          url: "/auth/login"
          json:
            email: "admin@school.test"
            password: "ChangeMe!2026"
          capture:
            - json: "$.accessToken"
              as: "token"
      - get:
          url: "/students?pageSize=50"
          headers:
            Authorization: "Bearer {{ token }}"
```

Run:
```bash
artillery run load-test.yml
```

### Expected Results

- Health check: < 50ms
- Login: < 200ms
- List students: < 100ms
- Create student: < 150ms

---

## Security Testing

### 1. SQL Injection

Try to inject SQL in search/filter fields. Should fail silently or with validation error:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  'http://localhost:4000/api/students?search=1%27%20OR%20%271%27=%271'
```

Expected: No data exposure, proper error handling.

### 2. XSS Prevention

Submit HTML/JavaScript in form fields:

```bash
curl -X POST http://localhost:4000/api/students \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "admissionNo":"<script>alert(1)</script>",
    "firstName":"Test",
    "lastName":"User",
    "gradeLevel":"10"
  }'
```

Expected: Input sanitized, script not executed.

### 3. Authentication Bypass

- Try accessing protected endpoints without token
- Try accessing with expired/invalid token
- Try accessing data as wrong role

All should return 401 or 403.

### 4. Rate Limiting

Try logging in 6+ times quickly:

```bash
for i in {1..7}; do
  curl -X POST http://localhost:4000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@school.test","password":"wrong"}'
done
```

Expected: After 5 attempts, account locked for 15 minutes.

---

## Browser Testing

### Supported Browsers

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

Test in each browser:
- Login flow
- Create/edit/delete operations
- Responsive design (mobile, tablet, desktop)
- Error messages and confirmations

### Accessibility Testing

Use browser dev tools or axe DevTools:

```javascript
// Run in browser console
// Check for keyboard navigation
// Tab through form fields and buttons
// Test with screen reader (Windows: Narrator, Mac: VoiceOver)
```

---

## Continuous Testing

### GitHub Actions CI/CD

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres

    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      
      - name: Install backend dependencies
        run: cd backend && npm ci
      
      - name: Run backend tests
        run: cd backend && npm test
        env:
          NODE_ENV: test
      
      - name: Install frontend dependencies
        run: cd frontend && npm ci
      
      - name: Build frontend
        run: cd frontend && npm run build
```

---

## Test Checklist

Before deploying to production, verify:

- [ ] Backend starts without errors
- [ ] Database seeds successfully
- [ ] All smoke tests pass
- [ ] Login works with seeded credentials
- [ ] Each role can only access appropriate endpoints
- [ ] CRUD operations work (Create, Read, Update, Delete)
- [ ] Search/filter functions work
- [ ] Audit log records actions
- [ ] Frontend builds without warnings
- [ ] Responsive design works on mobile
- [ ] Error messages display correctly
- [ ] No console errors or warnings
- [ ] Performance meets targets (see Performance Testing)
- [ ] Rate limiting blocks excessive attempts
- [ ] SQL injection attempts fail safely

---

## Debugging Tips

### Backend Debugging

```bash
# Enable verbose logging
DEBUG=* npm run dev

# Check database state
sqlite3 data/school.db
> SELECT COUNT(*) FROM students;
> SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 5;
```

### Frontend Debugging

```javascript
// React DevTools: Check component state and props
// In browser console:
localStorage  // Check auth state (should be empty, using memory)
document.cookie  // Check refresh token

// Network tab: Monitor API requests
// Sources tab: Set breakpoints and step through code
```

### Network Issues

```bash
# Check if backend is running
curl -v http://localhost:4000/api/health

# Check CORS headers
curl -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: GET" \
  -v http://localhost:4000/api/students

# Monitor network traffic
tcpdump -i lo -n 'port 4000 or port 5173'
```

---

## Reporting Issues

When reporting a bug, include:

1. **Steps to reproduce**
2. **Expected behavior**
3. **Actual behavior**
4. **Browser/OS/Node.js version**
5. **Error message from console/logs**
6. **Screenshots if applicable**

Example:

> **Title**: Login fails with "Invalid email or password" for valid credentials
>
> **Steps**:
> 1. Start backend (`npm run dev`)
> 2. Run seed script (`npm run seed`)
> 3. Visit http://localhost:5173
> 4. Enter: email=admin@school.test, password=ChangeMe!2026
> 5. Click Login
>
> **Expected**: Logged in, redirect to dashboard
>
> **Actual**: Error message "Invalid email or password"
>
> **Browser**: Chrome 120, Ubuntu 22.04
>
> **Logs**: [paste console/server logs]
