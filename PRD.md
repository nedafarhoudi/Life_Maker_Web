# Life Maker - Healthcare Adherence MVP PRD

## 1. Product Summary
A minimal healthcare adherence web app for clinics, doctors/staff, and patients.

The core goal is to help doctors or clinic staff create a simple care/treatment plan for patients, help patients follow the plan daily, and help clinics monitor adherence and identify patients who need follow-up.

This is an MVP for fast validation and real-world testing.
The product must remain intentionally narrow and simple.

---

## 2. Problem
Doctors and clinics often give care instructions, treatment plans, or routines to patients, but:
- patients forget
- patients do not consistently follow the plan
- clinics lack simple visibility into adherence
- staff do not know which patients need follow-up first

The MVP solves this by turning a care plan into a daily execution experience and a simple monitoring dashboard.

---

## 3. Target Users

### Primary Buyer
- Doctor
- Clinic
- Clinic manager
- Assistant / secretary / staff member

### End User
- Patient

### Internal User
- Admin

---

## 4. Core Value Proposition

### For Clinics / Doctors
- Better visibility into whether patients are following the plan
- Faster identification of non-adherent patients
- Easier follow-up prioritization
- More structured patient engagement

### For Patients
- Clear daily tasks
- Easy check-in flow
- Reduced confusion about what to do today

---

## 5. Roles

1. **admin**
2. **doctor_staff**
3. **patient**

---

## 6. MVP Scope

### Included in MVP

#### Doctor/Staff
- login
- dashboard
- patient list
- add patient
- patient detail page
- create/edit patient plan
- see adherence summary
- see patients needing follow-up

#### Patient
- simple login
- today plan
- full plan
- mark item as done / not done / later
- basic recent history/progress

#### Admin
- login
- clinics list
- users list
- patients list
- basic dashboard counts

---

## 7. Out of Scope
The following are explicitly excluded from MVP:
- chat
- audio/video consultation
- AI diagnosis
- prescription management complexity
- billing/subscription/payment
- advanced analytics
- native mobile apps
- complex notification engine
- full EMR
- lab integrations
- pharmacy integrations
- advanced permissions
- multi-language
- file upload complexity
- patient communities
- marketplace of doctors

---

## 8. Main User Flows

### Flow A: Doctor/Staff creates patient and plan
1. doctor/staff logs in
2. opens patients page
3. adds patient
4. opens patient detail page
5. creates a plan
6. adds plan items
7. activates the plan
8. patient gets simple access method (mock OTP / magic link)

### Flow B: Patient follows the plan
1. patient logs in
2. opens Today page
3. sees today’s items
4. marks each as:
   - done
   - not_done
   - later
5. optionally views full plan and history

### Flow C: Clinic monitors adherence
1. doctor/staff opens dashboard
2. sees summary metrics
3. opens “needs follow-up”
4. reviews patients with low adherence or no recent check-ins
5. opens patient detail for review

---

## 9. Follow-up Logic
A patient is flagged as “needs follow-up” if any of these are true:
- no DailyCheck in the last 2 days
- adherence rate in the last 7 days is below 40%
- patient has an active plan but has never checked in

Keep logic simple and transparent.

---

## 10. Success Metrics for MVP
Initial success can be measured by:
- number of clinics/doctors actively using the app
- number of patients added
- percentage of patients who submit at least one daily check
- weekly adherence rate
- number of flagged follow-up patients reviewed by staff

---

## 11. UX Principles
- minimal friction
- simple forms
- fast path to value
- mobile-friendly patient flow
- desktop-friendly clinic dashboard
- clean and readable UI
- no overwhelming screens
- clear action hierarchy

---

## 12. Core Screens

### Shared
- landing / role chooser
- login pages

### Doctor/Staff
- dashboard
- patients list
- add patient
- patient details
- create/edit plan

### Patient
- login
- today plan
- full plan
- history

### Admin
- dashboard
- clinics
- users
- patients

---

## 13. Functional Requirements

### Doctor/Staff
- can create patients
- can edit patients
- can create plan for patient
- can create multiple plan items
- can see plan status
- can view patient adherence summary
- can see follow-up list

### Patient
- can authenticate with minimal friction
- can view today’s plan
- can submit daily status per item
- can view full plan
- can view recent history

### Admin
- can view platform-level counts
- can view all clinics/users/patients

---

## 14. Non-Functional Requirements
- responsive
- local dev friendly
- easy demo setup
- seedable data
- simple monolith architecture
- maintainable code
- minimal dependencies where possible

---

## 15. Data Model Overview
Entities:
- Clinic
- User
- Patient
- Plan
- PlanItem
- DailyCheck
- ReminderLog

---

## 16. Assumptions
- only one active plan per patient at a time in MVP
- reminders can be mocked/logged only
- OTP can be mocked for demo
- staff and doctor are combined into one role: `doctor_staff`
- no advanced patient medical record is required

---

## 17. MVP Constraints
- build for speed
- do not over-design
- no enterprise architecture
- no unnecessary background jobs
- no real SMS integration
- no external system dependency unless mocked

---

## 18. Demo Data Requirements
Seed with:
- 1 admin
- 1 clinic
- 1 doctor/staff
- 3 patients
- 2 active plans
- multiple plan items
- sample DailyCheck records

---

## 19. Demo Goal
This MVP should be ready for:
- product demo
- clinic validation
- first customer conversations
- usability testing with real users
