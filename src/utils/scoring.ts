import { AdherenceSummary, AppState, DailyCheck, Patient, Plan, PlanItem, PlanItemStatus, TodayPlanRow } from '../types/domain';
import { addDays, toDateKey } from './date';

function isWithinWindow(dateKey: string, startKey: string) {
  return dateKey >= startKey;
}

function getPatientChecks(patientId: string, dailyChecks: DailyCheck[]) {
  return dailyChecks.filter((entry) => entry.patientId === patientId);
}

export function getActivePlan(patientId: string, plans: Plan[]) {
  return plans.find((plan) => plan.patientId === patientId && plan.isActive) ?? null;
}

export function getPlanItems(planId: string | null, planItems: PlanItem[]) {
  if (!planId) return [];
  return planItems.filter((item) => item.planId === planId);
}

export function getTodayPlanRows(state: AppState, patientId: string, now = new Date()): TodayPlanRow[] {
  const activePlan = getActivePlan(patientId, state.plans);
  const items = getPlanItems(activePlan?.id ?? null, state.planItems);
  const todayKey = toDateKey(now);

  return items.map((planItem) => {
    const todayChecks = state.dailyChecks
      .filter((entry) => entry.patientId === patientId && entry.planItemId === planItem.id && entry.checkDate === todayKey)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const latest = todayChecks[0];

    return {
      planItem,
      latestStatus: latest?.status ?? null,
      latestCheckId: latest?.id ?? null,
    };
  });
}

export function computeAdherenceSummary(state: AppState, patient: Patient, now = new Date()): AdherenceSummary {
  const activePlan = getActivePlan(patient.id, state.plans);
  const items = getPlanItems(activePlan?.id ?? null, state.planItems);
  const checks = getPatientChecks(patient.id, state.dailyChecks);
  const todayKey = toDateKey(now);
  const last2DaysKey = toDateKey(addDays(now, -1));
  const start7DaysKey = toDateKey(addDays(now, -6));
  const checks7d = checks.filter((entry) => isWithinWindow(entry.checkDate, start7DaysKey));
  const checksToday = checks.filter((entry) => entry.checkDate === todayKey).length;
  const hasCheckedInEver = checks.length > 0;
  const hasCheckedInLast2Days = checks.some((entry) => entry.checkDate >= last2DaysKey);
  const expectedChecks7d = items.length * 7;
  const positiveChecks7d = checks7d.filter((entry) => entry.status === 'done').length;
  const rate7d = expectedChecks7d > 0 ? Math.round((positiveChecks7d / expectedChecks7d) * 100) : 0;

  let needsFollowUp = false;
  let reason = 'Stable';

  if (activePlan && !hasCheckedInEver) {
    needsFollowUp = true;
    reason = 'Active plan with no first check-in yet';
  } else if (!hasCheckedInLast2Days) {
    needsFollowUp = true;
    reason = 'No DailyCheck in the last 2 days';
  } else if (activePlan && rate7d < 40) {
    needsFollowUp = true;
    reason = '7-day adherence below 40%';
  }

  return {
    patientId: patient.id,
    rate7d,
    checksToday,
    checks7d: checks7d.length,
    hasCheckedInEver,
    hasCheckedInLast2Days,
    needsFollowUp,
    reason,
  };
}

export function buildPatientSummaryRows(state: AppState, patientIds?: string[]) {
  const patients = patientIds ? state.patients.filter((patient) => patientIds.includes(patient.id)) : state.patients;

  return patients.map((patient) => ({
    patient,
    activePlan: getActivePlan(patient.id, state.plans),
    summary: computeAdherenceSummary(state, patient),
  }));
}

export function getStatusTone(status: PlanItemStatus | null) {
  if (status === 'done') return 'success';
  if (status === 'later') return 'warning';
  if (status === 'not_done') return 'danger';
  return 'muted';
}
