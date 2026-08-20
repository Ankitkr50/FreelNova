# SkillBridge Client

## Scripts
- `npm run dev` - local development
- `npm run build` - production build
- `npm run start` - preview production build locally

## Environment
Create `client/.env`:
```env
VITE_API_BASE_URL=https://<your-backend-domain>/api
```

## Vercel Deployment
This repo includes `client/vercel.json`.

Vercel project settings:
- Root Directory: `client`
- Build Command: `npm run build`
- Output Directory: `dist`

Add env var in Vercel:
- `VITE_API_BASE_URL`

