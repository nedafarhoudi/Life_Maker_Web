export type Role = 'admin' | 'doctor_staff' | 'patient' | 'planner_member' | 'planner_observer';
export type AppLanguage = 'fa' | 'en';

export type AppRoute =
  | 'landing'
  | 'doctor/dashboard'
  | 'doctor/patients'
  | 'doctor/patients/new'
  | 'doctor/patients/detail'
  | 'doctor/patients/plan'
  | 'patient/today'
  | 'patient/plan'
  | 'patient/history'
  | 'planner/dashboard'
  | 'planner/plans'
  | 'planner/reviews'
  | 'planner/network'
  | 'admin/dashboard'
  | 'admin/clinics'
  | 'admin/users'
  | 'admin/patients';

export type PlanItemStatus = 'done' | 'not_done' | 'later';
export type AccountabilityRelationKind = 'friend' | 'team_observer' | 'manager';
export type RoutineScope = 'personal' | 'team' | 'work';
export type RoutineTaskRecurrence = 'daily' | 'weekly' | 'specific_days' | 'custom';
export type RoutineTaskPriority = 1 | 2 | 3;
export type RoutineReviewDecision = 'approved' | 'rejected';

export type PlanItemCadence = 'daily' | 'weekly' | 'custom';

export interface Clinic {
  id: string;
  name: string;
  city: string;
  staffCount: number;
  createdAt: string;
}

export interface User {
  id: string;
  clinicId: string | null;
  role: Exclude<Role, 'patient'>;
  name: string;
  email: string;
  password: string;
  createdAt: string;
}

export interface Patient {
  id: string;
  clinicId: string;
  doctorStaffUserId: string;
  name: string;
  phone: string;
  age: number;
  condition: string;
  notes: string;
  joinedAt: string;
}

export interface Plan {
  id: string;
  patientId: string;
  title: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  createdByUserId: string;
  createdAt: string;
}

export interface PlanItem {
  id: string;
  planId: string;
  label: string;
  instructions: string;
  timeOfDay: string;
  cadence: PlanItemCadence;
}

export interface DailyCheck {
  id: string;
  patientId: string;
  planItemId: string;
  status: PlanItemStatus;
  note: string;
  checkDate: string;
  createdAt: string;
}

export interface ReminderLog {
  id: string;
  patientId: string;
  message: string;
  channel: 'mock_sms' | 'manual_call';
  createdAt: string;
}

export interface AccountabilityLink {
  id: string;
  memberUserId: string;
  observerUserId: string;
  relationKind: AccountabilityRelationKind;
  title: string;
  createdAt: string;
}

export interface RoutinePlan {
  id: string;
  ownerUserId: string;
  title: string;
  scope: RoutineScope;
  defaultObserverUserId: string | null;
  defaultRelationKind: AccountabilityRelationKind | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  createdByUserId: string;
  createdAt: string;
}

export interface RoutineTask {
  id: string;
  routinePlanId: string;
  title: string;
  description: string;
  dueTime: string;
  recurrence: RoutineTaskRecurrence;
  recurrenceDays: number[];
  customRuleText: string;
  priority: RoutineTaskPriority;
  observerUserId: string | null;
}

export interface RoutineCheck {
  id: string;
  routineTaskId: string;
  ownerUserId: string;
  status: PlanItemStatus;
  note: string;
  checkDate: string;
  createdAt: string;
}

export interface RoutineReview {
  id: string;
  routineCheckId: string;
  routineTaskId: string;
  observerUserId: string;
  decision: RoutineReviewDecision;
  note: string;
  createdAt: string;
}

export interface AuthSession {
  role: Role;
  userId: string;
  patientId?: string;
}

export interface NewPatientDraft {
  name: string;
  phone: string;
  age: string;
  condition: string;
  notes: string;
}

export interface PlanItemDraft {
  label: string;
  instructions: string;
  timeOfDay: string;
}

export interface PlanDraft {
  title: string;
  startDate: string;
  endDate: string;
  items: PlanItemDraft[];
}

export interface MedicationInstructionDraft {
  medicationName: string;
  dose: string;
  frequency: string;
  times: string;
  durationDays: string;
  note: string;
}

export interface PrescriptionDraft {
  sourceNote: string;
  transcriptText: string;
  extractionStatus: 'manual_review' | 'approved';
  photoUri: string | null;
  photoUpdatedAt: string | null;
  medications: MedicationInstructionDraft[];
}

export interface RoutineTaskDraft {
  title: string;
  description: string;
  dueTime: string;
  recurrence: RoutineTaskRecurrence;
  recurrenceDaysText: string;
  customRuleText: string;
  priority: RoutineTaskPriority;
  observerUserId: string;
}

export interface RoutinePlanDraft {
  title: string;
  scope: RoutineScope;
  defaultObserverUserId: string;
  defaultRelationKind: AccountabilityRelationKind;
  startDate: string;
  endDate: string;
  tasks: RoutineTaskDraft[];
}

export interface AppState {
  schemaVersion: number;
  language: AppLanguage;
  clinics: Clinic[];
  users: User[];
  patients: Patient[];
  plans: Plan[];
  planItems: PlanItem[];
  dailyChecks: DailyCheck[];
  reminderLogs: ReminderLog[];
  accountabilityLinks: AccountabilityLink[];
  routinePlans: RoutinePlan[];
  routineTasks: RoutineTask[];
  routineChecks: RoutineCheck[];
  routineReviews: RoutineReview[];
  currentSession: AuthSession | null;
  currentRoute: AppRoute;
  selectedPatientId: string | null;
  drafts: {
    newPatient: NewPatientDraft;
    planByPatientId: Record<string, PlanDraft>;
    prescriptionByPatientId: Record<string, PrescriptionDraft>;
    routinePlanByOwnerId: Record<string, RoutinePlanDraft>;
  };
}

export interface AdherenceSummary {
  patientId: string;
  rate7d: number;
  checksToday: number;
  checks7d: number;
  hasCheckedInEver: boolean;
  hasCheckedInLast2Days: boolean;
  needsFollowUp: boolean;
  reason: string;
}

export interface TodayPlanRow {
  planItem: PlanItem;
  latestStatus: PlanItemStatus | null;
  latestCheckId: string | null;
}

export interface RoutineTaskTodayRow {
  task: RoutineTask;
  latestCheck: RoutineCheck | null;
  latestReview: RoutineReview | null;
  needsReview: boolean;
}

export interface RoutineAdherenceSummary {
  ownerUserId: string;
  todayRate: number;
  rate7d: number;
  doneToday: number;
  notDoneToday: number;
  overdueToday: number;
  pendingReviews: number;
}
