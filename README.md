# FreelNova

MERN freelance marketplace platform (Fiverr-style) with:
- role-based auth (freelancer/recruiter/admin)
- project posting, apply/select workflow
- escrow-style payments with webhook verification
- notifications and admin moderation

## Repo Structure
- `client/` React + Vite + Tailwind
- `server/` Node + Express + MongoDB

## Quick Start

### Backend
```bash
cd server
cp .env.example .env
npm install
npm run dev
```

### Frontend
```bash
cd client
cp .env.example .env
npm install
npm run dev
```

## Release Candidate Docs
- Deployment: `DEPLOYMENT.md`
- API Contract Freeze: `server/docs/API_CONTRACT_v1.0.0.md`
- Production Validation: `server/docs/PHASE6_PRODUCTION_VALIDATION.md`
- Rollback: `server/docs/ROLLBACK.md`

## Release Tag (v1.0.0)
After final validation:
```bash
git add .
git commit -m "release: v1.0.0 release candidate"
git tag -a v1.0.0 -m "FreelNova v1.0.0"
git push origin main --tags
```
