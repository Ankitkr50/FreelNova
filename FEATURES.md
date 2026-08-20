# FreelNova — Complete Platform Features & Master Reference Guide

Welcome to the official, comprehensive feature documentation for **FreelNova** — an enterprise-grade AI-powered freelancing platform, secure escrow engine, autonomous digital work ecosystem, and high-performance web application.

---

## 🛸 1. Next-Generation AI Agentic Ecosystem

This suite implements advanced autonomous agent integrations, mock compilers, visual filters, and interactive sandboxes to showcase a future-proof work environment.

### 🤖 AI Digital Agent Marketplace
* **What it does:** Allows clients to browse and hire autonomous digital workers side-by-side with human talent.
* **Key Files:** 
  * [Projects.jsx](file:///c:/Users/ankit/OneDrive/Desktop/FreelNova/client/src/pages/Projects.jsx) (Marketplace toggle filter tab for `🤖 AI Agents`).
  * [Messages.jsx](file:///c:/Users/ankit/OneDrive/Desktop/FreelNova/client/src/pages/Messages.jsx) (Loads and connects hired agents to active workspaces).
* **How to test:** 
  1. Go to `Find Talent` or browse jobs and switch to `🤖 AI Agents` tab.
  2. Click **Hire Agent** (e.g. *Codex-AI Developer*, *PixelCraft-AI Designer*, *Scribe-AI Copywriter*).
  3. Confirm selection to auto-create a chat thread and redirect to inbox.

### 💻 Autonomous AI Sandbox Chat Loops
* **What it does:** Simulates live terminal compilation logs and context-aware responses when messaging a hired digital agent.
* **Key Files:** [Messages.jsx](file:///c:/Users/ankit/OneDrive/Desktop/FreelNova/client/src/pages/Messages.jsx) (Agent response simulator with Express, Prisma, or CSS compile triggers).
* **How to test:**
  1. Open a conversation with `Codex-AI Developer`.
  2. Type and send a prompt (e.g. *"write user auth routes"* or *"define database prisma schema"*).
  3. Watch the terminal loader simulate compiler executions and output syntax-highlighted code blocks.

### 🧠 Real-Time Chat Sentiment Tracker
* **What it does:** Evaluates conversational health dynamically based on positive vs negative word frequencies.
* **Key Files:** [Messages.jsx](file:///c:/Users/ankit/OneDrive/Desktop/FreelNova/client/src/pages/Messages.jsx) (`getChatSentiment` method).
* **How to test:** 
  1. Open any inbox conversation.
  2. Notice the top-right indicator badge: `🧠 Sentiment: Stable Collaboration (92%)`.
  3. Type positive words (*"great work"*, *"success"*) or risk words (*"issue"*, *"error"*, *"delay"*) to see the badge adaptively update.

### 🖥️ Interactive AI Sandbox Coding Interview
* **What it does:** Lets clients run mock automated technical coding evaluations before shortlisting/hiring candidates.
* **Key Files:** [ApplicantsList.jsx](file:///c:/Users/ankit/OneDrive/Desktop/FreelNova/client/src/pages/ApplicantsList.jsx) (Launch sandbox modal).
* **How to test:**
  1. As a Client, click **Review Applicants** for any project.
  2. Click **💻 Launch AI Interview** next to any active applicant.
  3. Step through the sandbox compilation terminal (skills mapping, CSS theory validation, database query compile, and array algorithm tests) to shortlist.

### 🔍 AI Escrow Release Code Auditor
* **What it does:** Audits repositories against contract instructions and suggests safe payout validations.
* **Key Files:** [MyProjects.jsx](file:///c:/Users/ankit/OneDrive/Desktop/FreelNova/client/src/pages/MyProjects.jsx) (Escrow Release auditor).
* **How to test:**
  1. In clients' or freelancers' **Active Contracts** tab on `/my-projects`.
  2. Click **🔍 Run AI Audit**.
  3. Run the automated static parser checks to get an accuracy scorecard and release escrow.

---

## 🔒 2. Security, Escrow Funding & Policy Enforcement

Secures the platform against off-platform leakage, enforces onboarding rules, and protects freelance payments.

### 💳 Pre-Assignment Escrow Funding Gate
* **What it does:** Gates freelancer selection until the client funds the milestone budget.
* **Key Files:** [SelectFreelancer.jsx](file:///c:/Users/ankit/OneDrive/Desktop/FreelNova/client/src/pages/SelectFreelancer.jsx) (Razorpay checkout modal).
* **How to test:**
  1. As a Client, click **Select Flow** for a candidate.
  2. Click **Confirm Selection**.
  3. A checkout summary modal slides up showing:
     * Milestone Bid Budget
     * Freelancer Net Payout percentage
     * FreelNova Platform Escrow Commission percentage (15% standard or 10% Pro)
  4. Client must click **Pay Escrow via Razorpay** and complete the Sandbox payment to confirm selection.

### ⚠️ Off-Platform Solicitation Protection
* **What it does:** Instantly locks the workspace communication channel if users attempt to share off-platform contact info.
* **Key Files:** [Messages.jsx](file:///c:/Users/ankit/OneDrive/Desktop/FreelNova/client/src/pages/Messages.jsx) (Solicitation regex parsers & security policy notice).
* **How to test:**
  1. In any chat, type and send an email (*"test@gmail.com"*), a phone number (*"9876543210"*), or keywords like *"whatsapp me"* or *"telegram"*.
  2. The screen displays a **Security Policy Notice**:
     > *"Security Policy Notice: Off-platform contact information (emails, phone numbers, or external links) is restricted for escrow safety and contract protection. Please keep all communication within FreelNova."*
  3. Click **Request Appeal** to reset the suspension and resume testing.

### 🛡️ Direct Credentials OTP Verification Flow
* **What it does:** Enforces Multi-Factor OTP security verification for users logging in or signing up with direct email & password credentials.
* **Key Files:** 
  * [Register.jsx](file:///c:/Users/ankit/OneDrive/Desktop/FreelNova/client/src/pages/Register.jsx) (Signup OTP verification step).
  * [Login.jsx](file:///c:/Users/ankit/OneDrive/Desktop/FreelNova/client/src/pages/Login.jsx) (Login OTP verification gate).
* **How to test:**
  1. On the Login page, enter credentials and submit.
  2. Enter the OTP code received to authenticate.

### 📋 Category-Based Profile Onboarding Gate
* **What it does:** Enforces mandatory profile completion for both freelancers and clients based on their user category before allowing them to post or apply to projects.
* **Categories & Fields:**
  * **Student**: Phone, School/College Name, School Result (grade/percentage), School ID Card, Aadhaar Card (number & photo file upload), PAN Card, and Bank details.
  * **Company**: Company Name, Company ID, Phone, Aadhaar Card (number & photo file upload), PAN Card, and Bank details.
  * **Employee**: Company Name, Company ID, Phone, Aadhaar Card (number & photo file upload), PAN Card, and Bank details.
* **Key Files:**
  * [CompleteProfile.jsx](file:///c:/Users/ankit/OneDrive/Desktop/FreelNova/client/src/pages/CompleteProfile.jsx) (Frontend category wizard form with file upload).
  * [auth.middleware.js](file:///c:/Users/ankit/OneDrive/Desktop/FreelNova/server/src/middleware/auth.middleware.js) (`verifyProfileCompleted` gate check).

### ⚖️ Mandatory Admin Verification Gate
* **What it does:** Enforces that every user (freelancer or client) must be reviewed and verified by an administrator before they can start working or applying/creating projects on the platform.
* **Key Files:**
  * [AdminPanel.jsx](file:///c:/Users/ankit/OneDrive/Desktop/FreelNova/client/src/pages/AdminPanel.jsx) (Admin interface for checking onboarding details and toggling verified status).
  * [PendingVerification.jsx](file:///c:/Users/ankit/OneDrive/Desktop/FreelNova/client/src/pages/PendingVerification.jsx) (Landing page showing review status).

### 🛡️ Credibility Trust Badges & Directory Sorting (`Projects.jsx`)
* **What it does:** Places distinctive labels on freelancer browse cards:
  * `⚡ Elite Pro` (electric blue/indigo gradient pill for subscribers)
  * `🛡️ Verified Expert` (emerald green checkmark pill for verified users)
  * `🔍 Pending Verification` (slate lock pill for standard users)

---

## 👑 3. Premium Subscription Upgrade System (FreelNova Pro & Elite)

Unlocks exclusive platform assets, reduced commission rates, priority ranking, and rewards upon upgrading to Pro tiers.

### 🌟 Pro Monthly (Rs 1099 / month | $15 / month)
* **✨ Locked AI Cover Letter Writer:** 
  * Locked for free users. Upgraded members click the wand icon in [ApplyProjectModal.jsx](file:///c:/Users/ankit/OneDrive/Desktop/FreelNova/client/src/components/projects/ApplyProjectModal.jsx) to auto-generate customized pitches matching project briefs.
* **⚡ Featured Bid Highlight:**
  * Upgraded members select **Featured Bid Highlight** checkbox when applying.
  * In [ApplicantsList.jsx](file:///c:/Users/ankit/OneDrive/Desktop/FreelNova/client/src/pages/ApplicantsList.jsx), these bids float to the top of the client's feed with a gold card border and a glowing `⭐ Featured Bid` badge.
* **👑 Gold Crown Avatar Badge:**
  * Upgraded users display a gold crown `👑` on their avatar in [Navbar.jsx](file:///c:/Users/ankit/OneDrive/Desktop/FreelNova/client/src/components/common/Navbar.jsx) and blue `PRO` badges inside the profile menus.
* **🔥 Recommended Choice Card Highlight:**
  * Highlights the Pro Monthly pricing tier with an animated pulsing card tag and glowing blue border/shadow style inside [FreelNovaPro.jsx](file:///c:/Users/ankit/OneDrive/Desktop/FreelNova/client/src/pages/FreelNovaPro.jsx).
* **🎁 Reward Points System:**
  * Earn points on completed contracts and redeem for platform fee credits and bonus proposal connects.

### 👑 Pro Yearly / Elite (Rs 7999 / year | $99 / year)
* **📉 10% Escrow Commission Rate:**
  * Instead of standard 15% platform tax deducted, Pro/Subscribed members pay only **10% commission** on project milestones. Escrow payment breakdowns dynamically calculate and display this discount.
* **📜 Deferred Net-30 Invoicing:**
  * Flexible deferred milestone invoicing and monthly billing summary reports for client account holders.
* **🔍 Background Check & Compliance Audit:**
  * 1 complimentary identity background check & compliance audit per month.

### 🏢 Enterprise Access Inquiry Drawer
* **What it does:** Replaces static links with a fully local and functional glassmorphic sliding enquiry form allowing clients to request enterprise compliance classification audits directly on [FreelNovaPro.jsx](file:///c:/Users/ankit/OneDrive/Desktop/FreelNova/client/src/pages/FreelNovaPro.jsx).

---

## 📈 4. Advanced Dashboards, Admin Console & Financial Analytics

Displays real-time financial tracking, profile onboarding stats, and admin review boards.

### ⚡ Priority Visibility Talent Directory Sorting (`Projects.jsx` & `/users`)
* **What it does:** Dynamically queries and ranks freelancers inside the Find Talent directory to prioritize credibility:
  1. **Subscribed Elite Pro Members** (appear at the top of results list)
  2. **Verified Experts** (admin-approved, sorted below Elite)
  3. **Standard Profiles** (unverified, sorted last)
  * Tie-breaker: Ordered by average rating (`ratingAvg` descending).

### Freelancer Dashboard (`FreelancerDashboard.jsx`)
* **Gross, Tax & Net Earnings:** Shows real gross, 15% (or 10% Pro) platform tax deductions, and net take-home earnings fetched from backend transactions.
* **Revenue SVG Graph:** Responsive chart showing monthly income. Renders a clean **empty-state placeholder** if no real earnings exist yet.
* **Connects Purchase System:** Allows purchasing 20, 50, or 100 Connects via Razorpay checkout, immediately updating connects balances.
* **Profile Checklist:** Computes progress dynamically based on completed biography, skills, headline, location, and resume fields.

### Client Dashboard (`RecruiterDashboard.jsx`)
* **Spent Outflow Stats:** Tracks spent budgets, platform fees paid, and net allocations.
* **SVG Expense Chart:** Renders monthly spent bar charts with empty-state guides.
* **Talent Browser:** Allows search-filtering and directly inviting freelancers to job postings.

### User Profile Page Role Badges (`Profile.jsx`)
* **What it does:** Renders a color-coded indicator pill on the user's Profile Card representing their platform role:
  * **Freelancer**: Green badge (`bg-emerald-50 text-emerald-700 border-emerald-200`)
  * **Client**: Blue badge (`bg-blue-50 text-blue-700 border-blue-200`)
  * **Admin**: Red badge (`bg-red-50 text-red-700 border-red-200`)

### Admin Panel & Role Styling Badges (`AdminPanel.jsx`)
* **Visual Badge Theme Enforcements**: Enforces consistent role badge colors across registrations:
  * **Freelancer**: Emerald Green badge (`bg-emerald-50 text-emerald-700 border-emerald-200`).
  * **Client**: Blue badge (`bg-blue-50 text-blue-700 border-blue-200`).
  * **Admin**: Red badge (`bg-red-50 text-red-700 border-red-200`).

---

## 🤝 5. Unified Talent Solutions & Recruitment Console (`/talent-solutions`)

A dedicated client control panel that integrates all premium hiring options in a stateful dashboard:
1. **✨ AI Project Brief Builder:** Lets clients generate detailed markdown deliverables templates with simulated AI progress states, and then publish them live onto the platform via the `POST /projects` database API.
2. **🔍 Expert Freelancer Sourcing Form:** Allows clients to request managed candidate screening and matching, complete a simulated ₹1,999 payment checkout, and view live matching progress status on their page dashboard.
3. **🤝 Enterprise Team Builder Form:** Integrates enterprise custom hiring inquiries and logs them inside a central client history list.

---

## 💬 6. WebSocket Live Support Chat (Role-Based Help Desk)

A real-time support system that automatically delivers tailored assistance and FAQ options depending on the user's role.

### 🔒 Access Control & Security Gate
* **What it does:** The support widget only renders for authenticated users holding the `"freelancer"` or `"recruiter"` roles. Guest users and Administrators do not see or load the widget, saving resources.
* **Key Files:** 
  * [ChatSupport.jsx](file:///c:/Users/ankit/OneDrive/Desktop/FreelNova/client/src/components/common/ChatSupport.jsx) (Role guard utilizing the `useAuth` hook and query parameter string).
  * [MainLayout.jsx](file:///c:/Users/ankit/OneDrive/Desktop/FreelNova/client/src/layouts/MainLayout.jsx) (Globally mounts the widget).

### 🤖 Role-Specific FAQ Bot Options
* **What it does:** Once connected, the WebSocket backend detects the user's role and populates tailored click-to-send options:
  * **For Freelancers:**
    * *How do I apply for a project?*
    * *How do I get paid?* (Explains the escrow milestone payouts).
    * *What is FreelNova Pro?*
  * **For Clients:**
    * *How do I post a project?*
    * *How does escrow work?*
    * *How do I select a freelancer?*
* **Key Files:** [chatSupport.js](file:///c:/Users/ankit/OneDrive/Desktop/FreelNova/server/src/websocket/chatSupport.js) (Handles URL upgrade, parses query params, and stores separate FAQ answers maps).

### 📧 Direct Help Desk Redirection
* **What it does:** Matches user messages (via custom options or text input keywords like `"team"`, `"email"`, `"contact"`, `"support"`) and returns immediate contact information:
  * Direct Mail: `support@freelnova.com`
  * Main Portal URL: `freelnova.com`

---

## 🌟 7. Phase 1: Core Platform Foundation, User Management & RBAC

### 7.1 Multi-Role Account Ecosystem
- **Role Types**: Dedicated workflows for `freelancer`, `recruiter` (client), and `admin` accounts.
- **Staff Admin Granular RBAC**: Sub-admin roles including `SUPER_ADMIN`, `FINANCE_ADMIN`, `SUPPORT_STAFF`, `MODERATOR`, `DEVELOPER`, and `CUSTOM` staff with specific permission flags (`payments_manage`, `refunds_manage`, `escrow_manage`, `staff_manage`, `disputes_manage`).

### 7.2 Authentication & Security Pipeline
- **JWT Authentication**: Dual-token architecture using short-lived Access Tokens and HTTP-safe Refresh Tokens.
- **Bcrypt Security**: Hashed passwords with salt rounds.
- **Two-Factor OTP Verification**: 6-digit One-Time Passwords for registration verification, resend OTP, login 2FA, and password reset.
- **Google OAuth**: One-click Google sign-in and account linking.

### 7.3 Work Passport & Profile Verification
- **Dynamic Completion Math**: Profile completion percentage algorithm evaluating basic info, bio, skills, hourly rate, work history, portfolio links, verification documents, and bank details.
- **Document Safeguards**: School/College ID cards, Aadhaar numbers, PAN cards, and bank account verification.
- **Admin Badge Indicators**: Verification status badges (Pro Verified 👑, Admin Staff Badges).

---

## 📧 8. MARS / TeachGenie Premium Email System

### 8.1 Corporate HTML Template Architecture (`buildFreelNovaEmailHtml`)
- **Responsive HTML Template (`buildFreelNovaEmailHtml`)**: Clean 560px corporate email layout featuring dark/blue gradient headers (`#0f172a` to `#2563eb`), `TRUST THE PLATFORM` pill badge, greeting section, dashed code highlight box with monospace code and copy guidance (*"Press and hold or triple-click to copy"*), *"📩 What's next?"* next-steps callout box, and corporate legal footers.
- **Standardized Email Pipeline**: Applied across registration OTPs, resend OTPs, login 2FA, password resets, staff invitations, and system notification alerts.

---

## 💼 9. Phase 2: Marketplace, Autonomous AI Twin Agents & Project Vault

### 9.1 Project Marketplace & Application Pipeline
- **Project Listings**: Full CRUD operations for project postings, category filters, budget ranges (INR), deadlines, and required skills.
- **Contract Applications**: Freelancer cover letters, bid amounts, proposed timelines, and recruiter shortlisting/rejection actions.

### 9.2 Digital AI Twin Agents
- **Autonomous Work Assistants**: 3 built-in AI Digital Agents:
  - `Codex-AI Developer`: Full-stack code synthesis, auth middleware, and Prisma schema generation.
  - `PixelCraft-AI Designer`: Tailwind CSS theme generation, color palettes, and glassmorphism styling.
  - `Scribe-AI Copywriter`: High-converting landing page copy, value propositions, and sales pitches.
- **Instant AI Task Sandbox**: Simulated execution logs, code blocks, and copy delivery rendered live inside the chat workspace.

### 9.3 AI Agent Hiring & Instant Redirect
- **1-Click Razorpay Hiring**: Instant payment checkout for hiring AI Digital Agents.
- **Automatic Auto-Redirect**: Upon payment completion, clients are automatically redirected to `/messages?chat=[agent_id]`, opening the dedicated AI conversation workspace immediately.

### 9.4 Project Vault Workspace
- **Centralized Project Repository**: Tabbed management for project requirements, milestones, contracts, files, deliverables, decision logs, and escrow states.

---

## 🛡️ 10. Phase 3: Payment Security, Escrow State Machine & Anti-Fraud Hardening (Points 1 to 58)

### 10.1 Payment Source of Truth
- **Frontend Untrusted Policy**: Frontend payment callbacks, screenshots, amounts, or status text are strictly treated as **UNTRUSTED**.
- **Authoritative State Verification**: Payment state is determined exclusively via server-side Razorpay API verification, HMAC SHA256 signatures, raw body webhooks, and the PostgreSQL database ledger.

### 10.2 Server-Side Razorpay Order Binding
- **Backend Amount Calculation**: Final payable amounts are calculated server-side in integer minor units (paise).
- **Identity Binding**: Every Razorpay order is bound to `projectId`, `recruiterId`, `freelancerId`, `amount`, and `currency`.

### 10.3 HMAC SHA256 Signature Verification & Audit Logs
- **Signature Verification**: Razorpay Checkout signatures (`razorpay_order_id|razorpay_payment_id`) verified server-side.
- **Security Audit Events**: Failed signatures trigger `SECURITY_EVENT:PAYMENT_SIGNATURE_VERIFICATION_FAILED` audit events logged to `adminAuditLog`.

### 10.4 Razorpay Webhook Security & Replay Guard
- **Raw Request Body Validation**: Webhook signatures verified over unparsed raw request body buffers.
- **Replay Protection**: Database table `paymentWebhookEvent` enforces `@unique` constraints on `eventId` and `payloadHash` to render duplicate/replayed webhook events harmless.

### 10.5 Double Payment & Double Escrow Release Protection
- **Atomic Database Transactions**: `prisma.$transaction` block ensures atomic state transitions (`pending` -> `held_in_escrow` -> `released`).
- **Race Condition Prevention**: Prevents concurrent milestone releases or duplicate credits.

### 10.6 Immutable PostgreSQL Financial Ledger
- **Database Table `FinancialLedger`**: Immutably records every monetary transaction type (`PAYMENT`, `ESCROW_HOLD`, `ESCROW_RELEASE`, `PLATFORM_FEE`, `REFUND`, `WITHDRAWAL`, `ADJUSTMENT`).
- **Platform Fee Integrity**: Server-side 15% platform commission calculation.

---

## 💬 11. Phase 4: Real-Time Chat, Notifications & Off-Platform Policy Safeguards

### 11.1 Real-Time Socket.io P2P Chat
- **Managed Single-Instance Connections**: Cross-window real-time messaging, typing indicators, and presence heartbeat tracking.

### 11.2 Unread Message Badges & Floating Alerts
- **Navbar Unread Counter**: Real-time red/blue unread badge counter on top Header Messages icon (`/messages`).
- **Floating Instant Toast Alerts**: Top-right alert toast (`📩 New Message Received from [Sender Name]`) with 1-click `Open Chat →` button when receiving messages while in other rooms.

### 11.3 Off-Platform Contact Sharing Protection
- **Credentials Filter**: Automated regex detection for phone numbers, email addresses, WhatsApp keywords, Telegram handles, and external contact links.
- **Clean Security Policy Notice**: Replaced internal debug alerts with standard corporate policy prompts:
  > *"Security Policy Notice: Off-platform contact information (emails, phone numbers, or external links) is restricted for escrow safety and contract protection. Please keep all communication within FreelNova."*
- **Policy Pages Integration**: Official Security Policy Notice appended to Trust & Safety and Terms of Service in `CompanyInfo.jsx`.

---

## ⚡ 12. Phase 5: Zero-Cost Performance, Speed & Stability Architecture (Points 1 to 64)

### 12.1 SPA Route Refresh Fallback (`/* -> /index.html`)
- **Static Hosting Rule**: Added `client/public/_redirects` (`/* /index.html 200`) to guarantee deep route refreshes (`/dashboard`, `/projects`, `/messages`, `/company-workspace`, `/career-autopilot`, `/super-admin`, `/vault`) never cause 404 or white screen errors.

### 12.2 Global React Error Boundary & Stale Chunk Auto-Recovery
- **Top-Level Error Boundary**: Wraps `AppRouter` to catch component crashes gracefully without blank screens.
- **Deployment Chunk Recovery**: Detects stale dynamic import failures (`Failed to fetch dynamically imported module`) and auto-reloads the application once to fetch current assets.

### 12.3 Code Splitting & React.lazy Dynamic Imports
- **Lazy Loading**: Heavy pages (`AdminPanel`, `CompanyWorkspace`, `CareerAutopilot`, `ProjectVault`, `BusinessOS`, `IncomeOS`, `EcosystemDashboard`, `Statement`) dynamically imported via `React.lazy()`.
- **Bundle Optimization**: Reduced main bundle size from 890 kB down to **474 kB** (zero size warnings!).

### 12.4 Search Input Debouncing & API Optimization
- **`useDebounce` Hook**: 300ms debounce handler in `client/src/hooks/useDebounce.js` to eliminate keystroke API waterfalls.

### 12.5 Server Compression & Health Check
- **GZip Compression**: Express `compression({ threshold: 1024 })` compresses JSON responses by 70-80%.
- **Lightweight `/health` Endpoint**: Dedicated `GET /health` route returning server status.

### 12.6 Graceful Shutdown
- **Process Handlers**: `SIGTERM` and `SIGINT` signals gracefully close HTTP servers, Socket.io connections, and PostgreSQL Prisma pools.

---

## 🛠️ 13. Developer Verification, API Reference & Build Status

### 13.1 Backend REST API Reference (`server/`)
- `GET /users` (Freelancer Directory)
- `GET /projects/applied` (Freelancer Bids)
- `GET /payments/stats` (Financial Stats)
- `POST /users/support-inquiry` (Support Tickets)
- `GET /health` (Server Health Check)

### 13.2 Developer Verification & Quick Start
1. **Install dependencies:** `npm install` (in root, `client`, and `server`).
2. **Verify Env Configs:** Check `server/.env` contains database connection parameters.
3. **Run Dev Servers:** `npm run dev` in `client/` and `server/` to launch workspaces.

### 13.3 Build Status
- **Client Build Status**: `npm run build` executed in **3.05s** with **0 errors**.
- **Server Health Check**: `GET /health` verified operational.
- **Paid Infrastructure Dependencies**: **ZERO** (Built 100% on existing open-source and free-tier stack).
