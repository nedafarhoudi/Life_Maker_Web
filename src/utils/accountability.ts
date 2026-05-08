import {
  AccountabilityLink,
  AppState,
  RoutineAdherenceSummary,
  RoutineCheck,
  RoutinePlan,
  RoutineReview,
  RoutineTask,
  RoutineTaskTodayRow,
} from '../types/domain';
import { addDays, toDateKey } from './date';

function isTaskDueOnDate(task: RoutineTask, date: Date) {
  if (task.recurrence === 'daily') return true;
  const weekday = date.getDay();

  if (task.recurrence === 'weekly') {
    return task.recurrenceDays[0] === weekday;
  }

  if (task.recurrence === 'specific_days') {
    return task.recurrenceDays.includes(weekday);
  }

  return true;
}

export function getObserverLinks(state: AppState, userId: string) {
  return state.accountabilityLinks.filter((link) => link.observerUserId === userId);
}

export function getMemberLinks(state: AppState, userId: string) {
  return state.accountabilityLinks.filter((link) => link.memberUserId === userId);
}

export function getRoutinePlansForOwner(state: AppState, ownerUserId: string) {
  return state.routinePlans.filter((plan) => plan.ownerUserId === ownerUserId && plan.isActive);
}

export function getRoutineTasksForPlan(state: AppState, routinePlanId: string) {
  return state.routineTasks.filter((task) => task.routinePlanId === routinePlanId);
}

export function getRoutineTodayRows(state: AppState, ownerUserId: string, now = new Date()): RoutineTaskTodayRow[] {
  const todayKey = toDateKey(now);
  const activePlans = getRoutinePlansForOwner(state, ownerUserId);
  const tasks = activePlans.flatMap((plan) => getRoutineTasksForPlan(state, plan.id));

  return tasks
    .filter((task) => isTaskDueOnDate(task, now))
    .map((task) => {
      const latestCheck =
        state.routineChecks
          .filter((check) => check.ownerUserId === ownerUserId && check.routineTaskId === task.id && check.checkDate === todayKey)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
      const latestReview =
        state.routineReviews
          .filter((review) => review.routineTaskId === task.id && latestCheck && review.routineCheckId === latestCheck.id)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;

      return {
        task,
        latestCheck,
        latestReview,
        needsReview: Boolean(latestCheck && task.observerUserId && !latestReview),
      };
    })
    .sort((a, b) => a.task.dueTime.localeCompare(b.task.dueTime));
}

export function computeRoutineAdherenceSummary(state: AppState, ownerUserId: string, now = new Date()): RoutineAdherenceSummary {
  const todayRows = getRoutineTodayRows(state, ownerUserId, now);
  const doneToday = todayRows.filter((row) => row.latestCheck?.status === 'done').length;
  const notDoneToday = todayRows.filter((row) => row.latestCheck?.status === 'not_done').length;
  const overdueToday = todayRows.filter((row) => !row.latestCheck || row.latestCheck.status === 'later').length;
  const pendingReviews = todayRows.filter((row) => row.needsReview).length;
  const todayRate = todayRows.length > 0 ? Math.round((doneToday / todayRows.length) * 100) : 0;

  let expected7d = 0;
  let done7d = 0;
  for (let offset = 0; offset < 7; offset += 1) {
    const date = addDays(now, -offset);
    const dateKey = toDateKey(date);
    const rows = getRoutineTodayRows(state, ownerUserId, date);
    expected7d += rows.length;
    done7d += rows.filter((row) => {
      const check =
        state.routineChecks
          .filter((entry) => entry.ownerUserId === ownerUserId && entry.routineTaskId === row.task.id && entry.checkDate === dateKey)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
      return check?.status === 'done';
    }).length;
  }

  return {
    ownerUserId,
    todayRate,
    rate7d: expected7d > 0 ? Math.round((done7d / expected7d) * 100) : 0,
    doneToday,
    notDoneToday,
    overdueToday,
    pendingReviews,
  };
}

export function getObserverReviewQueue(state: AppState, observerUserId: string) {
  const observedTaskIds = state.routineTasks.filter((task) => task.observerUserId === observerUserId).map((task) => task.id);

  return state.routineChecks
    .filter((check) => observedTaskIds.includes(check.routineTaskId))
    .map((check) => {
      const task = state.routineTasks.find((entry) => entry.id === check.routineTaskId) ?? null;
      const owner = state.users.find((entry) => entry.id === check.ownerUserId) ?? null;
      const latestReview =
        state.routineReviews
          .filter((review) => review.routineCheckId === check.id && review.observerUserId === observerUserId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;

      return {
        check,
        task,
        owner,
        latestReview,
      };
    })
    .sort((a, b) => b.check.createdAt.localeCompare(a.check.createdAt));
}

export function findRelationForPair(links: AccountabilityLink[], memberUserId: string, observerUserId: string) {
  return links.find((link) => link.memberUserId === memberUserId && link.observerUserId === observerUserId) ?? null;
}
