# Day 3 QA Checklist (Recruiter + Admin Flows)

## Setup
- [ ] Run `npm run dev`
- [ ] Ensure mock mode is enabled:
  - [ ] `VITE_USE_MOCK_PROJECTS=true`
  - [ ] `VITE_USE_MOCK_DASHBOARD=true`

## Recruiter Core Flow
- [ ] Login as recruiter
- [ ] Open `/post-project`
- [ ] Create project with valid data and confirm success message
- [ ] Open `/my-projects` and verify created project appears
- [ ] Use project filters (status + category) in My Projects
- [ ] Toggle cards/table views in My Projects
- [ ] Use `View Applicants` action from My Projects row
- [ ] In Applicants page, verify cards/table toggle + search + status filter
- [ ] Execute action flow: shortlist / reject / select
- [ ] Open `SelectFreelancer` flow and confirm selection action
- [ ] Return to `/my-projects` and confirm status update visible

## Project Status Timeline
- [ ] Timeline visible in `/my-projects` rows
- [ ] Timeline visible in `/projects/:id`
- [ ] Current step updates when status changes
- [ ] Completed/pending steps are visually distinct

## Admin Panel Flow
- [ ] Login as admin and open `/admin`
- [ ] Verify tabs render: Users, Projects, Payments, Disputes
- [ ] Verify each tab table renders rows
- [ ] Search works for each tab
- [ ] Status filter works for each tab
- [ ] Sort works (`Newest`, `Oldest`, `A-Z`)
- [ ] Row action placeholders work:
  - [ ] View
  - [ ] Flag
  - [ ] Resolve
- [ ] Action feedback message appears after click

## Access & Role Checks
- [ ] Non-admin user is blocked from admin panel content
- [ ] Non-recruiter user is blocked from `/recruiter/applicants`
- [ ] Non-recruiter user is blocked from `/recruiter/select-freelancer`

## Responsive Checks
- [ ] Recruiter pages usable at mobile width (<768px)
- [ ] Admin tables remain usable with horizontal scroll
- [ ] Modals/forms/buttons do not overflow on small screens

## Automated Checks
- [x] `npm run lint`
- [x] `npm run build`
