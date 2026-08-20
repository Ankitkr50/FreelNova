# FreelNova Deployment Guide

## Architecture
- Client: Vite React app on Vercel (`client/`)
- Server: Express API on Render or Railway (`server/`)
- Database: MongoDB Atlas

## 1) Client Deployment (Vercel)

### Config
- File: `client/vercel.json`
- Root Directory: `client`
- Build: `npm run build`
- Output: `dist`
- SPA rewrite enabled to `index.html`

### Required Env (Vercel)
- `VITE_API_BASE_URL=https://<your-api-domain>/api`

## 2) Server Deployment (Render)

### Config
- File: `render.yaml`
- Service root: `server`
- Build: `npm install && npm run build`
- Start: `npm run start:prod`
- Health check: `/api/health`

### Required Env (Render)
- `NODE_ENV=production`
- `PORT` (optional on Render)
- `CLIENT_URL=https://<your-vercel-domain>`
- `CORS_ORIGINS=https://<your-vercel-domain>,https://<custom-domain-if-any>`
- `MONGODB_URI=<atlas-uri>`
- `JWT_ACCESS_SECRET=<strong-secret>`
- `JWT_REFRESH_SECRET=<strong-secret>`
- `JWT_ACCESS_EXPIRES_IN=15m`
- `JWT_REFRESH_EXPIRES_IN=7d`
- `RAZORPAY_KEY_ID=<test-or-live-key>`
- `RAZORPAY_KEY_SECRET=<test-or-live-secret>`
- `RAZORPAY_WEBHOOK_SECRET=<webhook-secret>`
- `EMAIL_FROM=<from-email>`
- `SMTP_HOST=<smtp-host>`
- `SMTP_PORT=587`
- `SMTP_USER=<smtp-user>`
- `SMTP_PASS=<smtp-pass>`
- `SMTP_SECURE=false`
- `NOTIFICATIONS_EMAIL_ENABLED=false` (or `true`)
- `CLOUDINARY_CLOUD_NAME=<cloud-name>`
- `CLOUDINARY_API_KEY=<api-key>`
- `CLOUDINARY_API_SECRET=<api-secret>`

### Gmail OTP Setup
- `EMAIL_FROM=yourgmail@gmail.com`
- `SMTP_HOST=smtp.gmail.com`
- `SMTP_PORT=587`
- `SMTP_USER=yourgmail@gmail.com`
- `SMTP_PASS=<16-character Gmail App Password>`
- `SMTP_SECURE=false`

Use a Gmail App Password, not your normal Gmail login password. Also keep `EMAIL_FROM` the same as `SMTP_USER`, otherwise many providers will reject the sender and OTP mail will not be delivered.

## 3) Server Deployment (Railway)

### Config
- File: `railway.json`
- Build: `cd server && npm install && npm run build`
- Start: `cd server && npm run start:prod`
- Health check: `/api/health`

Use the same server env variable set as Render.

## 4) Staging then Production Strategy

1. Create staging services first:
- `freelnova-api-staging`
- `freelnova-client-staging`
- Atlas database: `freelnova_staging`
- Razorpay test keys only

2. Validate:
- `GET /api/health`
- `GET /api/ready`
- auth/login flow
- payment create + webhook + release flow

3. Promote to production:
- Production Atlas DB
- Production Razorpay keys
- Production frontend domain in `CLIENT_URL` and `CORS_ORIGINS`

## 5) Operational Checks

- API health: `GET /api/health`
- DB readiness: `GET /api/ready`
- Check server logs for request IDs (`x-request-id`) and structured events.

## 6) Production Validation (Phase 6)

- Use `server/docs/PHASE6_PRODUCTION_VALIDATION.md`.
