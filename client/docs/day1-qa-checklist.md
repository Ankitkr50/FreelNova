# Day 1 QA Checklist (Frontend Auth Foundation)

## Environment
- [ ] Run `npm run dev`
- [ ] Confirm `.env` has `VITE_USE_MOCK_AUTH=true` for mock flow testing

## Route Guard Checks
- [ ] Open `/dashboard` while logged out -> redirected to `/login`
- [ ] Open `/my-projects` while logged out -> redirected to `/login`
- [ ] Open `/post-project` while logged out -> redirected to `/login`
- [ ] Open `/admin` while logged out -> redirected to `/login`

## Auth Page Redirect Checks
- [ ] Login successfully, then open `/login` -> redirected to `/dashboard`
- [ ] Login successfully, then open `/register` -> redirected to `/dashboard`

## Role Registration Checks
- [ ] Home page role card "Freelancer" opens `/register?role=freelancer`
- [ ] Home page role card "Recruiter" opens `/register?role=recruiter`
- [ ] Register as `freelancer` succeeds and routes to verify email screen
- [ ] Register as `recruiter` succeeds and routes to verify email screen

## Verify Email Flow
- [ ] Empty token shows validation error
- [ ] Short token shows validation error
- [ ] Valid token triggers success state and redirects to login

## Validation and UX Checks
- [ ] Login email/password validation shows and clears correctly
- [ ] Register validation for full name, email, password, confirm password works
- [ ] Submit buttons show loading state while API mutation is pending
- [ ] Navbar logout works in desktop and mobile menu
- [ ] Responsive layout is usable on mobile widths (`<768px`)

## Automated Quality Checks
- [x] `npm run lint`
- [x] `npm run build`
