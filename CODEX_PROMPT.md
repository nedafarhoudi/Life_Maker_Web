You are a senior full-stack product engineer.

Build a production-ready MVP web application for a healthcare adherence platform focused on doctors/clinic staff and patients.

## Product Goal
The app helps a doctor or clinic staff create a treatment/care plan for a patient, allows the patient to see their daily plan and mark tasks as done/not done/later, and allows the doctor/clinic to monitor patient adherence.

This is an MVP. Keep it minimal, practical, and demo-ready.

---

## Context Files
Use the following project documents as source of truth:
- `PRD.md`
- `TASKS.md`

Follow them closely.

---

## Core Roles
There are exactly 3 roles:
1. admin
2. doctor_staff
3. patient

---

## Scope
Implement ONLY the MVP features described in the PRD and tasks.

### Doctor/Staff
- login
- dashboard
- patients list
- add patient
- patient details
- create/edit patient plan
- adherence summary
- needs follow-up list or section

### Patient
- simple login
- today’s plan
- full plan
- mark items as done / not_done / later
- recent history / progress

### Admin
- login
- dashboard
- clinics list
- users list
- patients list

---

## Explicitly Out of Scope
Do NOT build:
- chat
- video call
- AI diagnosis
- payments
- subscriptions
- native mobile app
- advanced analytics
- full EMR
- external integrations
- real SMS provider
- complicated notification system
- microservices
- unnecessary abstractions

---

## Preferred Stack
- Next.js
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL or SQLite for local dev
- Zod

Use the simplest clean auth approach that works for local demo.
Mock patient OTP or magic link if needed.

---

## Core Data Model
Implement these entities:
- Clinic
- User
- Patient
- Plan
- PlanItem
- DailyCheck
- ReminderLog

Include necessary enums and relations.

---

## Required Logic

### Follow-up rule
A patient needs follow-up if:
- no DailyCheck in last 2 days
OR
- adherence in the last 7 days is below 40%
OR
- patient has an active plan but no first check-in yet

### Dashboard metrics
Doctor/staff dashboard should show:
- total active patients
- patients checked in today
- patients needing follow-up
- recent patients

### Patient today view
Show today’s plan items clearly and allow one-tap status actions:
- done
- not_done
- later

---

## UI Pages Required

### Shared
- landing/login chooser
- sign in pages

### Doctor/Staff
- `/doctor/dashboard`
- `/doctor/patients`
- `/doctor/patients/new`
- `/doctor/patients/[id]`
- `/doctor/patients/[id]/plan`

### Patient
- `/patient/login`
- `/patient/today`
- `/patient/plan`
- `/patient/history`

### Admin
- `/admin/dashboard`
- `/admin/clinics`
- `/admin/users`
- `/admin/patients`

---

## Components
Create simple reusable components where useful:
- AppShell
- Sidebar
- Header
- StatCard
- PatientTable
- PlanForm
- PlanItemList
- StatusBadge
- AdherenceSummaryCard
- DailyCheckButtons
- EmptyState

Keep them simple and readable.

---

## Validation
Use Zod for:
- login
- patient create/update
- plan create/update
- plan item create/update
- daily check submit

---

## Seed Data
Seed:
- 1 admin
- 1 clinic
- 1 doctor_staff
- 3 patients
- at least 2 active plans
- sample plan items
- sample daily checks

Include demo credentials in README.

---

## Code Quality Rules
- TypeScript only
- clear folder organization
- no dead code
- no fake placeholder architecture
- comments only where useful
- prioritize maintainability
- optimize for demo readiness and local development speed

---

## Deliverables
Generate:
1. project folder structure
2. Prisma schema
3. seed script
4. auth setup
5. all core pages
6. reusable components
7. dashboard/follow-up logic
8. README with:
   - setup
   - env example
   - migrate/db push
   - seed
   - run
   - demo credentials
   - assumptions
   - known limitations

---

## Output Instructions
Work in phases.

### Phase 1
Return only:
1. proposed folder structure
2. Prisma schema
3. route map
4. component list
5. implementation plan

Do NOT write full code yet.

After Phase 1, continue with implementation in logical order:
- setup/config
- prisma/db
- auth
- shared UI
- doctor pages
- patient pages
- admin pages
- seed data
- README

If anything is ambiguous, choose the simplest MVP-friendly implementation and continue.
