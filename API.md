# API Documentation

## Base URL
```
http://localhost:4000/api
```

## Authentication

All endpoints (except `/auth/login` and `/auth/refresh`) require authentication using a JWT access token passed in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Refresh tokens are stored in `httpOnly` cookies and rotated automatically.

---

## Authentication Routes

### POST /auth/login
Login with email and password.

**Request:**
```json
{
  "email": "admin@school.test",
  "password": "your-password"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "name": "Admin User",
    "email": "admin@school.test",
    "role": "admin"
  }
}
```

---

### POST /auth/refresh
Refresh the access token using the stored refresh token cookie.

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": { ... }
}
```

---

### POST /auth/logout
Logout and revoke the refresh token.

---

### POST /auth/change-password
Change the authenticated user's password. Revokes all refresh tokens on password change.

**Request:**
```json
{
  "currentPassword": "old-password",
  "newPassword": "new-password-12-chars-min"
}
```

**Response:**
```json
{
  "message": "Password updated. Please log in again."
}
```

---

### GET /auth/me
Get the authenticated user's profile.

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "name": "Admin User",
    "email": "admin@school.test",
    "role": "admin"
  }
}
```

---

## Students Routes

### GET /students
List students with pagination and search.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 20, max: 100)
- `search` (optional): Search by name or admission number

**Response:**
```json
{
  "data": [...],
  "page": 1,
  "pageSize": 20,
  "total": 150
}
```

---

### GET /students/:id
Get a single student by ID.

---

### POST /students
Create a new student. Requires `admin` or `registrar` role.

**Request:**
```json
{
  "admissionNo": "STU001",
  "firstName": "John",
  "lastName": "Doe",
  "gradeLevel": "10",
  "section": "A",
  "dateOfBirth": "2009-01-15",
  "gender": "male",
  "guardianName": "Jane Doe",
  "guardianPhone": "+27123456789",
  "guardianEmail": "guardian@email.com",
  "address": "123 Main Street"
}
```

---

### PUT /students/:id
Update a student. Requires `admin` or `registrar` role.

---

### DELETE /students/:id
Delete a student. Requires `admin` role.

---

## Staff Routes

### GET /staff
List all staff members.

---

### GET /staff/:id
Get a single staff member by ID.

---

### POST /staff
Create a new staff member. Requires `admin` role.

**Request:**
```json
{
  "employeeNo": "EMP001",
  "firstName": "Jane",
  "lastName": "Smith",
  "roleTitle": "Mathematics Teacher",
  "department": "Mathematics",
  "email": "jane@school.test",
  "phone": "+27123456789"
}
```

---

### PUT /staff/:id
Update a staff member. Requires `admin` role.

---

### DELETE /staff/:id
Delete a staff member. Requires `admin` role.

---

## Attendance Routes

### GET /attendance
Get attendance records.

**Query Parameters:**
- `date` (optional): Filter by date (ISO 8601 format)
- `studentId` (optional): Filter by student ID

---

### POST /attendance
Mark a student's attendance.

**Request:**
```json
{
  "studentId": "uuid",
  "date": "2024-01-15",
  "status": "present"
}
```

Status can be: `present`, `absent`, `late`, or `excused`.

---

## Grades Routes

### GET /grades
List all grades.

**Query Parameters:**
- `studentId` (optional): Filter by student
- `term` (optional): Filter by term

---

### POST /grades
Record a grade. Requires `admin` or `teacher` role.

**Request:**
```json
{
  "studentId": "uuid",
  "subject": "Mathematics",
  "term": "Term 1",
  "score": 85.5,
  "maxScore": 100,
  "remarks": "Good performance"
}
```

---

### PUT /grades/:id
Update a grade. Requires `admin` or `teacher` role.

---

## Fees Routes

### GET /fees
List fee invoices.

**Query Parameters:**
- `studentId` (optional): Filter by student

---

### POST /fees
Create a fee invoice. Requires `admin` or `accountant` role.

**Request:**
```json
{
  "studentId": "uuid",
  "term": "Term 1",
  "amountDue": 5000.00,
  "dueDate": "2024-02-01"
}
```

---

### POST /fees/:id/payments
Record a payment for an invoice. Requires `admin` or `accountant` role.

**Request:**
```json
{
  "amount": 2500.00
}
```

---

## Timetable Routes

### GET /timetable
List timetable entries.

**Query Parameters:**
- `gradeLevel` (optional): Filter by grade level

---

### POST /timetable
Add a timetable entry. Requires `admin` or `registrar` role.

**Request:**
```json
{
  "gradeLevel": "10",
  "section": "A",
  "dayOfWeek": "Mon",
  "period": "09:00-10:00",
  "subject": "Mathematics",
  "staffId": "uuid"
}
```

Days: `Mon`, `Tue`, `Wed`, `Thu`, `Fri`, `Sat`

---

### DELETE /timetable/:id
Delete a timetable entry. Requires `admin` or `registrar` role.

---

## Users Routes (Admin only)

### GET /users
List all users.

---

### GET /users/:id
Get a single user by ID.

---

### POST /users
Create a new user. Requires `admin` role.

**Request:**
```json
{
  "name": "New User",
  "email": "newuser@school.test",
  "role": "teacher",
  "password": "optional-password-or-generated"
}
```

**Response includes `tempPassword`** if no password was provided.

---

### PUT /users/:id
Update a user. Requires `admin` role.

---

### PATCH /users/:id/toggle-status
Toggle a user's active status. Requires `admin` role.

---

## Audit Log Routes (Admin only)

### GET /audit
List audit log entries with pagination and filtering.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 50, max: 100)
- `action` (optional): Filter by action
- `entity` (optional): Filter by entity type

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "user_name": "Admin User",
      "action": "create",
      "entity": "student",
      "entity_id": "uuid",
      "ip_address": "192.168.1.1",
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 50,
  "total": 245
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Description of the error",
  "details": [
    {
      "field": "email",
      "msg": "Invalid email format"
    }
  ]
}
```

### HTTP Status Codes
- `200`: Success
- `201`: Created
- `204`: No content (successful DELETE)
- `400`: Bad request (validation errors)
- `401`: Unauthorized (missing or invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not found
- `409`: Conflict (duplicate entry)
- `423`: Locked (account locked due to failed login attempts)
- `500`: Internal server error

---

## Rate Limiting

- General API: 100 requests per minute
- Login endpoint: 5 attempts per 15 minutes

---

## Security Notes

- All passwords are hashed with bcrypt (cost factor 12)
- JW tokens have a 15-minute expiration; refresh tokens expire after 7 days
- Refresh tokens are hashed before storage and rotated on every use
- SQL injection is prevented using parameterized statements
- All user input is validated and sanitized
- HTTPS is required in production (set `NODE_ENV=production`)
