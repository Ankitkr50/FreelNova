# FreelNova API Contract Freeze - v1.0.0

Contract status: **Frozen for release candidate v1.0.0**

Base path: `/api`
Response envelope:
- success: `boolean`
- message: `string`
- data: `object|array|null`
- details: `object` (validation/error context, optional)
- requestId: `string|null` (error responses)

## Auth
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/verify`
- `POST /auth/refresh`
- `POST /auth/logout`

## RBAC
- `GET /rbac/me`
- `GET /rbac/admin`
- `GET /rbac/recruiter`
- `GET /rbac/freelancer`

## Users
- `GET /users/profile`
- `PUT /users/profile`
- `PUT /users/profile/resume`

## Projects / Applications
- `POST /projects` (recruiter)
- `GET /projects`
- `GET /projects/:id`
- `POST /projects/:id/apply` (freelancer)
- `POST /projects/:id/select` (recruiter)
- `GET /projects/:id/applicants` (recruiter/admin owner scope)
- `POST /projects/:id/applicants/:applicantId/review` (recruiter/admin)
- `PATCH /projects/:id/status` (recruiter/admin)

## Reviews
- `POST /reviews`

## Payments / Escrow / Webhook
- `POST /payments/create` (recruiter)
- `POST /payments/release` (recruiter/admin)
- `POST /payments/webhook` (Razorpay signed)

## Notifications
- `GET /notifications`
- `PATCH /notifications/:id/read`

## Admin Moderation
- `GET /admin/users`
- `PATCH /admin/users/:id/status`
- `GET /admin/projects`
- `PATCH /admin/projects/:id/moderate`
- `GET /admin/payments`
- `PATCH /admin/payments/:id/review`
- `POST /admin/disputes`
- `GET /admin/disputes`
- `PATCH /admin/disputes/:id`

## Operational
- `GET /health`
- `GET /ready`

## Versioning Policy (Post v1.0.0)
- No breaking changes in-place for frozen endpoints.
- Breaking changes must be introduced under `/api/v2/*`.
- Non-breaking additions (optional fields / new endpoints) allowed in v1.x.

