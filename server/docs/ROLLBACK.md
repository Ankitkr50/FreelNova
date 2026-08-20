# Rollback Runbook

## Scope
Rollback for FreelNova backend/frontend production incidents after `v1.0.0` release.

## Trigger Conditions
- Sustained 5xx errors on `/api/health` critical paths.
- Payment webhook failures or escrow state corruption risk.
- Authentication failures (login/refresh spike).
- Severe CORS/auth regressions blocking all users.

## Backend Rollback (Render / Railway)
1. Open platform deploy history.
2. Rollback to previous healthy deployment.
3. Confirm:
- `GET /api/health` => `200`
- `GET /api/ready` => `200`
4. Verify auth + payment create endpoints manually.

## Frontend Rollback (Vercel)
1. Promote previous stable deployment.
2. Confirm login/project pages load and API calls succeed.
3. Verify browser CORS errors are absent.

## Configuration Rollback
- Revert env vars if a recent secret/config change caused regression:
- `CLIENT_URL`, `CORS_ORIGINS`, JWT secrets, Razorpay keys/secrets, Mongo URI.

## Data Safety Notes
- Do **not** run destructive DB commands during incident response.
- For payment incidents:
- Pause new releases.
- Keep webhook endpoint active.
- Audit `payments` and `paymentWebhookEvents` before manual corrections.

## Post-Rollback Validation
- Auth flow: login + refresh + logout.
- Project flow: list + details.
- Payment flow: create + webhook capture path.
- Admin flow: users list endpoint.

## Incident Closure
- Record root cause.
- Add regression test and monitoring alert.
- Re-release only after staging validation passes.

