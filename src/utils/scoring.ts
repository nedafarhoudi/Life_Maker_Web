import { AppState, Completion, Task, TaskStatus, UrgencyTone } from '../types/domain';
import { addDays, addMonths, diffInDays, setTime, startOfDay, toDateKey } from './date';

function getLatestCompletion(taskId: string, completions: Completion[]) {
  return completions
    .filter((entry) => entry.taskId === taskId)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
}

function isCompletedOnDate(taskId: string, completions: Completion[], date: Date) {
  const key = toDateKey(date);
  return completions.some((entry) => entry.taskId === taskId && entry.completedAt.slice(0, 10) === key);
}

function getNextScheduledDue(task: Task, completions: Completion[], now: Date) {
  const start = new Date(task.startDate);
  const baseline = setTime(startOfDay(start), task.dueTime);

  if (task.recurrenceType === 'manual' && task.dueDate) {
    return new Date(task.dueDate);
  }

  if (task.recurrenceType === 'daily') {
    const todayDue = setTime(startOfDay(now), task.dueTime);
    if (now <= todayDue || !isCompletedOnDate(task.id, completions, now)) {
      return todayDue;
    }

    return addDays(todayDue, 1);
  }

  if (task.recurrenceType === 'interval' || task.recurrenceType === 'weekly') {
    const interval = task.recurrenceType === 'weekly' ? task.intervalDays ?? 7 : task.intervalDays ?? 3;
    const daysSinceStart = Math.max(0, diffInDays(now, baseline));
    const elapsedCycles = Math.floor(daysSinceStart / interval);
    let due = addDays(baseline, elapsedCycles * interval);

    if (getLatestCompletion(task.id, completions)?.completedAt && isCompletedOnDate(task.id, completions, due)) {
      due = addDays(due, interval);
    }

    while (isCompletedOnDate(task.id, completions, due)) {
      due = addDays(due, interval);
    }

    return due;
  }

  if (task.recurrenceType === 'monthly') {
    let due = new Date(baseline);
    due.setDate(task.monthlyDay ?? due.getDate());

    while (due < now && isCompletedOnDate(task.id, completions, due)) {
      due = addMonths(due, 1);
    }

    return due;
  }

  return baseline;
}

function getTone(remainingMs: number, estimatedMinutes: number): UrgencyTone {
  if (remainingMs < 0) {
    return 'danger';
  }

  const warningThreshold = Math.max(estimatedMinutes * 60000, 2 * 60 * 60 * 1000);
  if (remainingMs <= warningThreshold) {
    return 'warning';
  }

  return 'success';
}

function calculatePoints(task: Task, tone: UrgencyTone, quality = 1) {
  const toneMultiplier = tone === 'success' ? 1.15 : tone === 'warning' ? 1 : tone === 'danger' ? 0.55 : 0.85;
  const qualityMultiplier = 0.75 + quality * task.qualityWeight;
  return Math.round(task.baseScore * toneMultiplier * qualityMultiplier);
}

export function buildTaskStatuses(state: AppState, now = new Date()): TaskStatus[] {
  return state.tasks.map((task) => {
    const dueAt = getNextScheduledDue(task, state.completions, now);
    const remainingMs = dueAt.getTime() - now.getTime();
    const isCompletedToday = isCompletedOnDate(task.id, state.completions, now);
    const tone = isCompletedToday ? 'muted' : getTone(remainingMs, task.estimatedMinutes);

    return {
      task,
      dueAt,
      remainingMs,
      isCompletedToday,
      tone,
      pointsPreview: calculatePoints(task, tone),
    };
  });
}

export function computeDailyScore(state: AppState, dateKey: string) {
  return state.completions
    .filter((entry) => entry.completedAt.slice(0, 10) === dateKey)
    .reduce((sum, entry) => sum + entry.pointsAwarded, 0);
}

export function buildCompletion(task: Task, tone: UrgencyTone, actualMinutes: number, quality: number): Completion {
  const now = new Date();
  return {
    id: `completion-${task.id}-${now.getTime()}`,
    taskId: task.id,
    completedAt: now.toISOString(),
    toneAtCompletion: tone,
    pointsAwarded: calculatePoints(task, tone, quality),
    actualMinutes,
    quality,
  };
}

export function computeStreak(taskId: string, completions: Completion[]) {
  const history = completions
    .filter((entry) => entry.taskId === taskId)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));

  if (history.length === 0) {
    return 0;
  }

  let streak = 1;

  for (let index = 1; index < history.length; index += 1) {
    const previous = startOfDay(new Date(history[index - 1].completedAt));
    const current = startOfDay(new Date(history[index].completedAt));
    const distance = diffInDays(previous, current);

    if (distance <= 7) {
      streak += 1;
      continue;
    }

    break;
  }

  return streak;
}
