# Life Maker - MVP Build Tasks

## Phase 1 - Project Setup
- [ ] Initialize Next.js app with TypeScript
- [ ] Configure Tailwind CSS
- [ ] Add Prisma
- [ ] Set up database connection
- [ ] Add Zod
- [ ] Create base app structure
- [ ] Create shared layout patterns
- [ ] Create env example file

---

## Phase 2 - Data Layer
- [ ] Design Prisma schema for:
  - [ ] Clinic
  - [ ] User
  - [ ] Patient
  - [ ] Plan
  - [ ] PlanItem
  - [ ] DailyCheck
  - [ ] ReminderLog
- [ ] Add enums:
  - [ ] Role
  - [ ] ClinicStatus
  - [ ] PatientStatus
  - [ ] PlanStatus
  - [ ] TimeOfDay
  - [ ] DailyCheckStatus
- [ ] Run migration/db push
- [ ] Create seed script
- [ ] Seed demo data

---

## Phase 3 - Authentication
- [ ] Implement simple auth for admin and doctor_staff
- [ ] Implement mock patient login flow
- [ ] Add route protection
- [ ] Add role-based access checks
- [ ] Add demo credentials to README

---

## Phase 4 - Shared UI Components
- [ ] AppShell
- [ ] Sidebar
- [ ] Header
- [ ] PageContainer
- [ ] StatCard
- [ ] StatusBadge
- [ ] EmptyState
- [ ] DataTable / PatientTable
- [ ] AdherenceSummaryCard
- [ ] DailyCheckButtons
- [ ] Form input components

---

## Phase 5 - Doctor/Staff Features
### Dashboard
- [ ] Build `/doctor/dashboard`
- [ ] Show:
  - [ ] total active patients
  - [ ] checked in today
  - [ ] patients needing follow-up
  - [ ] recent patients

### Patients
- [ ] Build `/doctor/patients`
- [ ] List patients
- [ ] Search/filter optional if simple

### Add Patient
- [ ] Build `/doctor/patients/new`
- [ ] Create patient form
- [ ] Validate form with Zod

### Patient Details
- [ ] Build `/doctor/patients/[id]`
- [ ] Show patient info
- [ ] Show active plan summary
- [ ] Show adherence summary
- [ ] Show recent checks
- [ ] Show follow-up state

### Plan Editor
- [ ] Build `/doctor/patients/[id]/plan`
- [ ] Create/edit plan
- [ ] Add/remove plan items
- [ ] Activate plan

---

## Phase 6 - Patient Features
### Login
- [ ] Build `/patient/login`
- [ ] Mock OTP or magic link flow

### Today Page
- [ ] Build `/patient/today`
- [ ] Show today’s plan items
- [ ] Submit status:
  - [ ] done
  - [ ] not_done
  - [ ] later

### Full Plan
- [ ] Build `/patient/plan`
- [ ] Show active plan and all items

### History
- [ ] Build `/patient/history`
- [ ] Show recent DailyChecks
- [ ] Show simple adherence percentage

---

## Phase 7 - Admin Features
### Admin Dashboard
- [ ] Build `/admin/dashboard`
- [ ] Show clinic count
- [ ] Show user count
- [ ] Show patient count
- [ ] Show recent activity summary

### Admin Lists
- [ ] Build `/admin/clinics`
- [ ] Build `/admin/users`
- [ ] Build `/admin/patients`

---

## Phase 8 - Business Logic
- [ ] Implement dashboard metrics logic
- [ ] Implement follow-up logic:
  - [ ] no DailyCheck in last 2 days
  - [ ] adherence < 40% in last 7 days
  - [ ] active plan but no first check-in
- [ ] Implement patient adherence calculation
- [ ] Implement today plan generation logic

---

## Phase 9 - Validation and Error Handling
- [ ] Add Zod validation to all major forms
- [ ] Add empty states
- [ ] Add basic loading states
- [ ] Add basic error states
- [ ] Prevent invalid submissions

---

## Phase 10 - Demo Readiness
- [ ] Add polished seed data
- [ ] Add README
- [ ] Add setup instructions
- [ ] Add env example
- [ ] Add demo credentials
- [ ] Add known limitations section
- [ ] Verify local startup from scratch

---

## Nice-to-have if still simple
- [ ] Filter “needs follow-up” page
- [ ] Plan templates
- [ ] Reminder log viewer
- [ ] Better patient history chart

Only build nice-to-have items if core MVP is already complete and clean.
