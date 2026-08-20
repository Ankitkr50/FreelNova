# FreelNova - User Roles & Permission Matrix

This document outlines the three primary user roles (**Admin**, **Client**, and **Freelancer**) within the **FreelNova** platform and details their corresponding capabilities and platform permissions.

---

## 📊 Summary Table

| Feature / Action | Freelancer | Client | Admin |
| :--- | :---: | :---: | :---: |
| **Profile Onboarding & Dashboard** | Yes | Yes | Yes |
| **Apply to Projects (Submit Bids)** | Yes | No | No |
| **Purchase Connects (Razorpay)** | Yes | No | No |
| **Locked AI Cover Letter Writer** | Yes (Pro Only) | No | No |
| **Featured Bid Highlight** | Yes (Pro Only) | No | No |
| **Post Projects / Jobs** | No | Yes | No |
| **Review & Shortlist Applicants** | No | Yes | Yes |
| **Fund Escrow Payments (Razorpay)** | No | Yes | No |
| **Release Escrow Milestone** | No (Can Request) | Yes (Approver) | Yes (Override) |
| **Refund Payments** | No | Yes | Yes |
| **Hire Autonomous AI Agents (Razorpay)** | No | Yes | Yes |
| **Moderate Users & Suspend Accounts** | No | No | Yes |
| **Moderate & Approve/Reject Projects**| No | No | Yes |
| **Audit Payments & Resolve Disputes**  | No | No | Yes |

---

## 👑 1. Admin Role

The Admin is responsible for platform security, content moderation, and financial governance across the entire ecosystem.

### 🛠️ Key Capabilities:
* **User Management & Governance**:
  * Suspend or activate user accounts dynamically (`PATCH /api/admin/users/:id/status`).
  * Enforce security freeze/unfreeze actions for off-platform communication violations (e.g., sharing email or phone numbers in workspace chat).
* **Project Moderation**:
  * Moderate published projects to approve, reject, or flag them for platform policy compliance (`PATCH /api/admin/projects/:id/moderate`).
* **Payment Review & Financial Governance**:
  * Track all escrow deposits, gateway orders, and transaction statuses (`GET /api/admin/payments`).
  * Review flag statuses and perform admin-override reviews on pending/escrow payments (`PATCH /api/admin/payments/:id/review`).
* **Dispute Resolution**:
  * Manage arbitration disputes raised between freelancers and clients.
  * Update dispute status, assign admins, and enforce administrative escrow releases or overrides (`POST /api/admin/disputes`).

---

## 🤝 2. Client Role

The Client represents hiring accounts who post tasks, select candidates, and fund contract milestones.

### 🛠️ Key Capabilities:
* **Job & Project Management**:
  * Post new projects, complete with custom categories, required skills, and budget ranges (`POST /api/projects`).
* **Candidate Selection & Invites**:
  * Review applications, shortlist profiles, reject candidates, and send invitations for specific project briefs.
* **Escrow Funding Gate**:
  * Lock and deposit project milestones in a secure escrow pool via Razorpay integration before assigning a freelancer.
* **Milestone Payments**:
  * Release funded escrow balances to the freelancer once milestone deliverables are approved (`POST /api/payments/release`).
  * Request refunds for incomplete work or cancelled milestones (`POST /api/payments/refund`).
* **🤖 Autonomous AI Agents Workspace**:
  * Hire AI Digital Specialists (*Codex-AI Developer*, *PixelCraft-AI Designer*, *Scribe-AI Copywriter*) at fixed task rates (₹400, ₹300, ₹150) using Razorpay checkout.
* **Pro Upgrades**:
  * Access premium monthly/yearly tiers for discounted platform commission tax (10% instead of 15%) and advanced compliance tracking.

---

## 💻 3. Freelancer Role

The Freelancer represents candidate profiles applying for jobs, completing milestones, and managing their earnings.

### 🛠️ Key Capabilities:
* **Proposal Submission (Bidding)**:
  * Submit custom proposals with bid rates, estimated delivery days, and customized pitches on open projects.
* **Connects Purchase System**:
  * Consume platform tokens (Connects) to apply for new projects.
  * Purchase additional packs (20, 50, 100 connects) directly through Razorpay integration.
* **Payout & Milestone Release**:
  * Submit deliverables and trigger an "Escrow Release Request" to notify clients to release milestone payments.
* **AI Code Repository Audit**:
  * Run static analysis tests on active milestones to calculate project delivery scores and support swift payment releases.
* **Pro Features**:
  * **AI Cover Letter Writer**: Automatically generate context-rich pitches tailored to project briefs using the locked AI assist tool.
  * **Featured Bid Highlight**: Upgrade bids to automatically float to the top of the client's feed with a gold-highlighted card border.
  * **Discounted Platform Commission**: Undergo a lower platform tax rate (10% instead of 15%) when upgraded to Pro Yearly.
