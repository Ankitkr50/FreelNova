# Phase 6 Production Validation Checklist

## 1) Setup Validation Environment
Set these variables in your shell (or `.env` equivalent):

```powershell
$env:VALIDATE_BASE_URL="https://<your-server-domain>"
$env:VALIDATE_CORS_ORIGIN="https://<your-client-domain>"

$env:VALIDATE_RECRUITER_EMAIL="recruiter@example.com"
$env:VALIDATE_RECRUITER_PASSWORD="Strong@123"
$env:VALIDATE_FREELANCER_EMAIL="freelancer@example.com"
$env:VALIDATE_FREELANCER_PASSWORD="Strong@123"
$env:VALIDATE_ADMIN_EMAIL="admin@example.com"
$env:VALIDATE_ADMIN_PASSWORD="Strong@123"

$env:VALIDATE_OPEN_PROJECT_ID="<project-id>"
$env:VALIDATE_APPLY_PROJECT_ID="<open-project-id>"
$env:VALIDATE_SELECTABLE_PROJECT_ID="<project-id-for-selection>"
$env:VALIDATE_SELECT_FREELANCER_ID="<freelancer-id-to-select>"

$env:VALIDATE_PAYMENT_PROJECT_ID="<project-id-for-payment-create>"
$env:VALIDATE_PAYMENT_AMOUNT="500"
$env:VALIDATE_PAYMENT_CURRENCY="INR"
$env:VALIDATE_PAYMENT_ID="<existing-payment-id-for-release>"
$env:VALIDATE_PAYMENT_GATEWAY_ORDER_ID="<gateway-order-id-for-webhook>"

$env:RAZORPAY_WEBHOOK_SECRET="<same-secret-configured-on-server>"
```

## 2) Run Automated Validation

```powershell
cd server
npm run validate:deploy
```

The script checks:
- health + readiness
- CORS preflight
- login by role
- profile/resume metadata update
- projects list/details/apply/select (where IDs provided)
- payment create/release reachability
- webhook signature + processing
- notifications + admin list endpoint

## 3) Browser Validation (Manual)

### CORS + Auth
- Open deployed client and log in.
- Verify no CORS errors in browser console/network.

### Resume Upload + Cloudinary Flow
- Upload PDF in profile resume screen.
- Confirm backend stores resume metadata.
- Confirm Cloudinary URL/public id are present in profile API response.

### Razorpay Test Webhook
- Complete test-mode payment from client.
- Verify webhook event hits `POST /api/payments/webhook`.
- Confirm payment status transitions to `captured` + escrow `held_in_escrow`.

### Notifications + Admin
- Verify new notifications for payment/application changes.
- Verify admin tables load and action endpoints respond.

## 4) Pass Criteria
- `npm run validate:deploy` returns zero failures.
- Browser has no CORS failures.
- Payment webhook end-to-end transition confirmed.
- Resume upload metadata + Cloudinary references confirmed.
- Admin/auth critical actions are reachable and authorized correctly.

