# Day 2 QA Checklist (Profile + Resume + Projects + Dashboard)

## Setup
- [ ] Run `npm run dev`
- [ ] Ensure mock toggles are enabled in `.env`:
  - [ ] `VITE_USE_MOCK_PROFILE=true`
  - [ ] `VITE_USE_MOCK_RESUME=true`
  - [ ] `VITE_USE_MOCK_PROJECTS=true`
  - [ ] `VITE_USE_MOCK_DASHBOARD=true`

## Route Checks
- [ ] `/profile` loads profile details
- [ ] `/profile/edit` loads editable profile form
- [ ] `/profile/resume` loads resume upload panel
- [ ] `/projects` loads listing with filters
- [ ] `/projects/:id` loads project details
- [ ] `/dashboard` shows role-specific dashboard

## Profile Edit Checks
- [ ] Required fields show validation errors when empty
- [ ] Invalid email shows error
- [ ] Bio shorter than 40 chars shows error
- [ ] Skills tags can be added and removed
- [ ] Portfolio URL rejects invalid links (without `http/https`)
- [ ] Save success message appears and updates reflect in `/profile`

## Resume Upload Checks
- [ ] Non-PDF file is rejected
- [ ] PDF above size limit is rejected
- [ ] Valid PDF upload shows progress bar
- [ ] Success state shown after upload
- [ ] Uploaded CV block shows file metadata
- [ ] Preview and download links are visible and usable

## Projects Listing Checks
- [ ] Card view and table view both render
- [ ] Search filters by title/description/skills
- [ ] Category filter works
- [ ] Skill filter works
- [ ] Budget min/max filters work
- [ ] Invalid budget range (`min > max`) shows validation message
- [ ] Sort options change listing order
- [ ] Empty state appears when filters return no results

## Project Details + Apply Checks
- [ ] Details page shows requirements, budget, timeline, recruiter info
- [ ] Apply modal opens and closes correctly
- [ ] Clicking outside modal closes it
- [ ] Proposal/bid/delivery validation errors display
- [ ] Valid application shows success state
- [ ] Logged-out apply redirects to login and returns after auth

## Dashboard Role Checks
- [ ] Freelancer dashboard: profile completion, applied projects, recommended jobs
- [ ] Recruiter dashboard: posted projects, applicant summary, quick actions
- [ ] Admin dashboard shell loads metrics block

## Responsive Checks
- [ ] Mobile navigation works without overflow
- [ ] Profile edit sections are readable on small screens
- [ ] Projects filters remain usable on small screens
- [ ] Apply modal remains usable on small screens

## Automated Checks
- [x] `npm run lint`
- [x] `npm run build`
