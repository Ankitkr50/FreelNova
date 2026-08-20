# FreelNova v1.0.0 Release Candidate

Release type: Production-ready RC

## Highlights
- Full auth lifecycle with email verification and JWT access/refresh.
- Role-based marketplace workflows for recruiter/freelancer/admin.
- Escrow-style payment lifecycle with webhook verification and replay protection.
- In-app notifications and admin moderation APIs.
- Security hardening: helmet, strict CORS allowlist/methods, sanitization, rate limiting.
- Observability: request IDs, structured logs, health/readiness endpoints.
- Deployment configs for Vercel (client), Render/Railway (server).

## API Contract
- Frozen contract file: `server/docs/API_CONTRACT_v1.0.0.md`

## Validation
- Production validation checklist: `server/docs/PHASE6_PRODUCTION_VALIDATION.md`
- Rollback runbook: `server/docs/ROLLBACK.md`

## Known Constraints
- Integration tests require `TEST_MONGODB_URI` when mongodb-memory-server cannot download binaries in restricted network environments.
