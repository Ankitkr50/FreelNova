# FreelNova Backend (Day 4 Auth Module)

## Setup
1. Copy `.env.example` to `.env`.
2. Fill all required secrets and Mongo URI.
3. Run:
```bash
npm install
npm run dev
```

Server starts at `http://localhost:5000` by default.

## Test Setup (Recommended)
- For local/CI without mongodb-memory-server downloads, set:
- `TEST_MONGODB_URI` to a dedicated test database.
- Then run: `npm test`

## Required Environment Variables
- `MONGODB_URI`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

Recommended:
- `TEST_MONGODB_URI`
- `CLIENT_URL`
- `CORS_ORIGINS`
- `CORS_METHODS`
- `EMAIL_FROM`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_SECURE`
- `NOTIFICATIONS_EMAIL_ENABLED`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

## API Endpoints
- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/verify`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/rbac/me`
- `GET /api/rbac/admin`
- `GET /api/rbac/recruiter`
- `GET /api/rbac/freelancer`
- `GET /api/users/profile`
- `PUT /api/users/profile`
- `PUT /api/users/profile/resume`
- `POST /api/projects`
- `GET /api/projects`
- `GET /api/projects/:id`
- `POST /api/projects/:id/apply`
- `POST /api/projects/:id/select`
- `POST /api/reviews`
- `POST /api/payments/create`
- `POST /api/payments/webhook`
- `POST /api/payments/release`
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `GET /api/admin/users`
- `PATCH /api/admin/users/:id/status`
- `GET /api/admin/projects`
- `PATCH /api/admin/projects/:id/moderate`
- `GET /api/admin/payments`
- `PATCH /api/admin/payments/:id/review`
- `POST /api/admin/disputes`
- `GET /api/admin/disputes`
- `PATCH /api/admin/disputes/:id`

## Manual QA Flow (Phase 7)
1. Register user:
```http
POST /api/auth/register
{
  "name": "Demo Freelancer",
  "email": "demo.freelancer@example.com",
  "password": "StrongPass@123",
  "role": "freelancer"
}
```
2. Verify email using token from email link:
```http
POST /api/auth/verify
{
  "token": "<email_verification_token>"
}
```
3. Login:
```http
POST /api/auth/login
{
  "email": "demo.freelancer@example.com",
  "password": "StrongPass@123"
}
```
4. Copy `accessToken` and `refreshToken`.
5. Refresh:
```http
POST /api/auth/refresh
{
  "refreshToken": "<refresh_token>"
}
```
6. Logout:
```http
POST /api/auth/logout
{
  "refreshToken": "<refresh_token_or_rotated_refresh_token>"
}
```

## RBAC QA
Use `Authorization: Bearer <access_token>`.
- `GET /api/rbac/me` must pass for any authenticated user.
- Role-mismatch endpoint must return `403`.
- Matching role endpoint must return `200`.

## Edge Cases to Validate
- Duplicate email on register returns `409`.
- Invalid verify token returns `400`.
- Expired verify token returns `400`.
- Invalid credentials on login returns `401`.
- Unverified user login returns `403`.
- Expired access token returns `401`.
- Expired/invalid refresh token returns `401`.

## Day 5 QA Matrix (Domain APIs)
### 1) Profile + Resume
- `GET /api/users/profile` with valid token returns user profile.
- `PUT /api/users/profile` updates `name/bio/skills/experience/portfolioLinks`.
- `PUT /api/users/profile/resume` with:
  - `resumeMimeType=application/pdf`
  - `resumeSize <= 5242880`
  returns updated resume metadata.
- Invalid resume MIME or oversized file metadata returns `400`.

### 2) Projects Post/List/Search
- Recruiter token can `POST /api/projects` (status is forced to `posted`).
- Freelancer token on `POST /api/projects` returns `403`.
- `GET /api/projects` supports:
  - `q`, `skills`, `category`, `budgetMin`, `budgetMax`, `status`, `sort`, `page`, `limit`
  - pagination `meta` object in response.

### 3) Apply + Select Transitions
- Freelancer can `POST /api/projects/:id/apply` only when project is `posted/applied`.
- Self-apply, duplicate apply, or apply after deadline returns `4xx`.
- Recruiter owner can `POST /api/projects/:id/select` with `applicationId` or `freelancerId`.
- Transition path:
  - first valid apply: `posted -> applied`
  - select: `applied -> selected`
  - select with `{ "startNow": true }`: `selected -> in_progress`
- Re-selecting different freelancer after selection is blocked (`409`).

### 4) Review + Rating
- `POST /api/reviews` only when project status is `completed` or `paid`.
- Only recruiter and selected freelancer can review each other.
- One review per reviewer per project (duplicate returns `409`).
- On each review, `reviewee.ratingAvg` and `reviewee.ratingCount` are recalculated.

## Day 6 Payments + Notifications + Admin
### Role Matrix
- `POST /api/payments/create`: `recruiter`
- `POST /api/payments/webhook`: gateway only (signature-verified, no auth token)
- `POST /api/payments/release`: `recruiter` (own payments) or `admin` (`forceRelease` allowed)
- `GET /api/notifications`, `PATCH /api/notifications/:id/read`: any authenticated user
- `GET/PATCH /api/admin/*`, `POST/GET/PATCH /api/admin/disputes`: `admin`

### Full Flow Validation
1. Create payment order:
```http
POST /api/payments/create
Authorization: Bearer <recruiter_token>
x-idempotency-key: pay-order-2026-001
{
  "projectId": "<project_id>",
  "amount": 25000,
  "currency": "INR"
}
```
2. Send webhook `payment.captured` (valid Razorpay signature).
3. Confirm payment state transitions:
   - `status: captured`
   - `escrowStatus: held_in_escrow`
4. Release escrow:
```http
POST /api/payments/release
Authorization: Bearer <recruiter_or_admin_token>
{
  "paymentId": "<payment_id>",
  "releaseNote": "Work approved"
}
```
5. Confirm:
   - payment `escrowStatus: released`
   - project `status: paid`
6. Verify notifications:
   - `payment_created`
   - `escrow_held`
   - `escrow_released`
   via `GET /api/notifications`.

### Security Edge Cases
- Duplicate webhook `eventId` returns idempotent success (no duplicate mutation).
- Replay webhook with same payload hash returns idempotent success.
- Invalid/missing Razorpay signature returns `401`.
- Invalid release before escrow hold returns `400`.
- Non-owner recruiter release attempt returns `403`.
- Non-admin `forceRelease` attempt returns `403`.
- Payment create without idempotency key returns `400`.

### Rate Limits
- `POST /api/payments/webhook`: 180 req/min per event-id/IP key.
- `POST /api/payments/create`: 20 req/min per recruiter/idempotency/IP key.
- `POST /api/payments/release`: 30 req/min per user.

### Admin API Samples
Update user moderation:
```http
PATCH /api/admin/users/:id/status
Authorization: Bearer <admin_token>
{
  "moderationStatus": "suspended",
  "moderationNote": "Policy violation"
}
```

Moderate project:
```http
PATCH /api/admin/projects/:id/moderate
Authorization: Bearer <admin_token>
{
  "moderationStatus": "flagged",
  "moderationNote": "Needs compliance review"
}
```

Review payment:
```http
PATCH /api/admin/payments/:id/review
Authorization: Bearer <admin_token>
{
  "reviewStatus": "approved",
  "reviewNote": "Verified payout trail"
}
```

Create dispute:
```http
POST /api/admin/disputes
Authorization: Bearer <admin_token>
{
  "projectId": "<project_id>",
  "paymentId": "<payment_id>",
  "type": "payment",
  "reason": "Freelancer reports non-release delay",
  "priority": "high"
}
```

## Security Notes Implemented
- Password hashing with bcrypt.
- Refresh token hashing at rest in DB.
- Email verification token stored as SHA-256 hash.
- Access/refresh token expiry handling with explicit error messages.
- Centralized error format: `success`, `message`, optional `details`.

## Deployment (Render / Railway)

### Scripts
- `npm run build`
- `npm run start:prod`

### Required Production Env
- `NODE_ENV=production`
- `PORT` (platform default is fine)
- `CLIENT_URL` (frontend domain)
- `CORS_ORIGINS` (comma separated frontend domains)
- `MONGODB_URI` (MongoDB Atlas URI)
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES_IN` (default `15m`)
- `JWT_REFRESH_EXPIRES_IN` (default `7d`)
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `EMAIL_FROM`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_SECURE`
- `NOTIFICATIONS_EMAIL_ENABLED`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

### Health Endpoints
- `GET /api/health`
- `GET /api/ready`

### Infra Config Files
- `../render.yaml`
- `../railway.json`

## Release Candidate v1.0.0
- API freeze: `./docs/API_CONTRACT_v1.0.0.md`
- Production validation checklist: `./docs/PHASE6_PRODUCTION_VALIDATION.md`
- Rollback runbook: `./docs/ROLLBACK.md`
