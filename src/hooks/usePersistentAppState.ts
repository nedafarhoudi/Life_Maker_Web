import { useEffect, useMemo, useState } from 'react';

import { seedState } from '../data/seed';
import { loadAppState, saveAppState } from '../services/storage';
import { AppState, Certificate, DailyScore, Role, Task } from '../types/domain';
import { buildCompletion, buildTaskStatuses, computeDailyScore, computeStreak } from '../utils/scoring';
import { toDateKey } from '../utils/date';

function buildCertificate(task: Task, streak: number): Certificate {
  return {
    id: `certificate-${task.id}-${streak}`,
    taskId: task.id,
    title: `گواهی پایداری ${streak} مرحله ای`,
    awardedAt: new Date().toISOString(),
  };
}

export function usePersistentAppState() {
  const [state, setState] = useState<AppState>(seedState);
  const [isReady, setReady] = useState(false);

  useEffect(() => {
    loadAppState().then((loaded) => {
      setState(loaded);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (isReady) {
      void saveAppState(state);
    }
  }, [isReady, state]);

  const statuses = useMemo(() => buildTaskStatuses(state), [state]);

  const selectedRoles = useMemo(() => {
    if (state.settings.selectedRoleIds.length === 0) {
      return state.roles;
    }

    return state.roles.filter((role) => state.settings.selectedRoleIds.includes(role.id));
  }, [state.roles, state.settings.selectedRoleIds]);

  function finishOnboarding(selectedRoleIds: string[]) {
    setState((current) => ({
      ...current,
      settings: {
        onboarded: true,
        selectedRoleIds,
      },
    }));
  }

  function completeTask(taskId: string) {
    const status = statuses.find((entry) => entry.task.id === taskId);
    if (!status || status.isCompletedToday) {
      return;
    }

    const completion = buildCompletion(status.task, status.tone, status.task.estimatedMinutes, 1);

    setState((current) => {
      const completions = [completion, ...current.completions];
      const dateKey = toDateKey(new Date());
      const scoreEntry: DailyScore = {
        date: dateKey,
        score: computeDailyScore({ ...current, completions }, dateKey),
      };

      const nextDailyScores = [scoreEntry, ...current.dailyScores.filter((entry) => entry.date !== dateKey)];
      const nextCertificates = [...current.certificates];
      const streak = computeStreak(taskId, completions);
      const task = current.tasks.find((item) => item.id === taskId);

      if (task && streak > 0 && streak % 5 === 0) {
        const exists = nextCertificates.some((item) => item.taskId === taskId && item.title.includes(`${streak}`));
        if (!exists) {
          nextCertificates.unshift(buildCertificate(task, streak));
        }
      }

      return {
        ...current,
        completions,
        dailyScores: nextDailyScores,
        certificates: nextCertificates,
      };
    });
  }

  function addRole(title: string, description: string) {
    const role: Role = {
      id: `role-${Date.now()}`,
      title,
      description,
      color: '#7b8f7a',
    };

    setState((current) => ({
      ...current,
      roles: [...current.roles, role],
      settings: {
        ...current.settings,
        selectedRoleIds: [...new Set([...current.settings.selectedRoleIds, role.id])],
      },
    }));
  }

  function addDimension(roleId: string, title: string, description: string) {
    setState((current) => ({
      ...current,
      dimensions: [
        ...current.dimensions,
        {
          id: `dimension-${Date.now()}`,
          roleId,
          title,
          description,
        },
      ],
    }));
  }

  function addTask(task: Omit<Task, 'id' | 'startDate'>) {
    setState((current) => ({
      ...current,
      tasks: [
        ...current.tasks,
        {
          ...task,
          id: `task-${Date.now()}`,
          startDate: new Date().toISOString(),
        },
      ],
    }));
  }

  return {
    isReady,
    state,
    statuses,
    selectedRoles,
    finishOnboarding,
    completeTask,
    addRole,
    addDimension,
    addTask,
  };
}
