# 🛡️ FREELNOVA — DISASTER RECOVERY & DATA SAFETY RUNBOOK

## 1. Executive Summary
This document defines the emergency recovery procedures, database backup strategy, idempotent financial transaction safeguards, and service health diagnostics for the FreelNova Enterprise platform.

---

## 2. Database Backup & Point-In-Time Recovery (PITR)

### Automated Daily PostgreSQL Backups
- **Frequency**: Every 6 hours via automated cron job.
- **Storage**: Encrypted off-site storage.
- **Retention**: 30 rolling daily backups, 12 monthly backups.

### Manual Backup Execution Command
```bash
pg_dump -U postgres -d freelnova_db -F c -b -v -f /backups/freelnova_pg_$(date +%Y%m%d_%H%M%S).dump
```

### Restore Procedure
```bash
pg_restore -U postgres -d freelnova_db -v -c /backups/freelnova_pg_YYYYMMDD_HHMMSS.dump
```

---

## 3. Idempotent Payment & Escrow Recovery

### Payment Reconciliation
If a network disconnect occurs during Razorpay checkout:
1. Webhooks guarantee automatic state update (`payment.captured` -> status `captured`, escrow `held_in_escrow`).
2. Webhook replay protection uses unique `eventId` indexing to prevent duplicate credits.
3. In case of webhook delivery failure, admin triggers manual reconciliation via `/api/enterprise/reconciliation/run`.

---

## 4. Emergency System Health Checklist

1. **API Readiness Diagnostic**:
   `GET /api/ready` -> returns HTTP 200 with PostgreSQL and Redis connectivity status.
2. **Server Uptime Diagnostic**:
   `GET /api/health` -> returns server uptime, active environment, and timestamp.
3. **Session Revocation**:
   `POST /api/admin/security/sessions/revoke-all` -> emergency invalidate all compromised active JWT tokens.
