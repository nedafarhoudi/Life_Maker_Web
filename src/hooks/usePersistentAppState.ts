import { useEffect, useMemo, useState } from 'react';

import { seedState } from '../data/seed';
import { loadAppState, saveAppState } from '../services/storage';
import {
  AccountabilityRelationKind,
  AppLanguage,
  AppState,
  AppRoute,
  DailyCheck,
  MedicationInstructionDraft,
  NewPatientDraft,
  Patient,
  Plan,
  PlanDraft,
  PlanItemDraft,
  PrescriptionDraft,
  Role,
  RoutineCheck,
  RoutinePlan,
  RoutinePlanDraft,
  RoutineTaskDraft,
  RoutineReviewDecision,
  User,
} from '../types/domain';
import { computeRoutineAdherenceSummary, getMemberLinks, getObserverLinks, getObserverReviewQueue, getRoutinePlansForOwner, getRoutineTasksForPlan, getRoutineTodayRows } from '../utils/accountability';
import { buildPatientSummaryRows, computeAdherenceSummary, getActivePlan, getPlanItems, getTodayPlanRows } from '../utils/scoring';
import { toDateKey } from '../utils/date';

function buildBlankPlanDraft(): PlanDraft {
  return {
    title: '',
    startDate: toDateKey(new Date()),
    endDate: '',
    items: [
      { label: '', instructions: '', timeOfDay: '08:00' },
      { label: '', instructions: '', timeOfDay: '20:00' },
    ],
  };
}

function buildBlankPrescriptionDraft(): PrescriptionDraft {
  return {
    sourceNote: '',
    transcriptText: '',
    extractionStatus: 'manual_review',
    photoUri: null,
    photoUpdatedAt: null,
    medications: [
      { medicationName: '', dose: '', frequency: '', times: '08:00', durationDays: '7', note: '' },
    ],
  };
}

function buildBlankRoutinePlanDraft(): RoutinePlanDraft {
  return {
    title: '',
    scope: 'personal',
    defaultObserverUserId: '',
    defaultRelationKind: 'friend',
    startDate: toDateKey(new Date()),
    endDate: '',
    tasks: [
      {
        title: '',
        description: '',
        dueTime: '08:00',
        recurrence: 'daily',
        recurrenceDaysText: '',
        customRuleText: '',
        priority: 2,
        observerUserId: '',
      },
    ],
  };
}

function normalizeRecurrenceDaysText(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
}

function parseRecurrenceDays(text: string) {
  const dictionary: Record<string, number> = {
    sat: 6,
    saturday: 6,
    شنبه: 6,
    sun: 0,
    sunday: 0,
    یکشنبه: 0,
    mon: 1,
    monday: 1,
    دوشنبه: 1,
    tue: 2,
    tuesday: 2,
    سه‌شنبه: 2,
    'سه شنبه': 2,
    wed: 3,
    wednesday: 3,
    چهارشنبه: 3,
    thu: 4,
    thursday: 4,
    پنجشنبه: 4,
    fri: 5,
    friday: 5,
    جمعه: 5,
  };

  return normalizeRecurrenceDaysText(text)
    .split(/[,\s]+/)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean)
    .map((token) => {
      if (/^\d+$/.test(token)) return Number(token);
      return dictionary[token];
    })
    .filter((value): value is number => Number.isInteger(value) && value >= 0 && value <= 6);
}

function buildMedicationTemplate(templateKey: 'ointment' | 'tablet' | 'syrup' | 'dressing' | 'burn_pack'): MedicationInstructionDraft[] {
  if (templateKey === 'ointment') {
    return [{ medicationName: 'Bacitracin', dose: 'thin layer', frequency: 'twice daily', times: '08:00', durationDays: '7', note: 'apply on clean wound' }];
  }
  if (templateKey === 'tablet') {
    return [{ medicationName: 'Acetaminophen', dose: '500 mg', frequency: 'every 8 hours if needed', times: '08:00', durationDays: '3', note: 'after food if stomach sensitive' }];
  }
  if (templateKey === 'syrup') {
    return [{ medicationName: 'Cough syrup', dose: '10 mL', frequency: 'three times daily', times: '08:00', durationDays: '5', note: '' }];
  }
  if (templateKey === 'dressing') {
    return [{ medicationName: 'Non-stick dressing change', dose: '1 change', frequency: 'once daily', times: '08:15', durationDays: '7', note: 'replace sooner if wet or dirty' }];
  }
  return [
    { medicationName: 'Bacitracin', dose: 'thin layer', frequency: 'twice daily', times: '08:00', durationDays: '7', note: 'apply on clean wound' },
    { medicationName: 'Non-stick dressing change', dose: '1 change', frequency: 'once daily', times: '08:15', durationDays: '7', note: 'replace sooner if wet or dirty' },
    { medicationName: 'Wound review', dose: '1 check', frequency: 'every evening', times: '20:00', durationDays: '7', note: 'watch for redness, discharge, fever, bad odor' },
  ];
}

function normalizeTranscriptValue(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/\s+/g, ' ')
    .trim();
}

function inferFrequency(line: string) {
  const normalized = line.toLowerCase();
  const matchers: Array<[RegExp, string]> = [
    [/\b1\s*time(s)?\s*per\s*day\b|\bonce daily\b/i, 'once daily'],
    [/\b2\s*time(s)?\s*per\s*day\b|\btwice daily\b/i, 'twice daily'],
    [/\b3\s*time(s)?\s*per\s*day\b|\bthree times daily\b/i, 'three times daily'],
    [/\bevery\s*\d+\s*hours?\b/i, normalized.match(/\bevery\s*\d+\s*hours?\b/i)?.[0] ?? ''],
    [/روزی\s*یک\s*بار|روزانه\s*یک\s*بار|۱\s*بار\s*در\s*روز/i, 'روزی یک بار'],
    [/روزی\s*دو\s*بار|۲\s*بار\s*در\s*روز/i, 'روزی دو بار'],
    [/روزی\s*سه\s*بار|۳\s*بار\s*در\s*روز/i, 'روزی سه بار'],
    [/هر\s*\d+\s*ساعت/i, line.match(/هر\s*\d+\s*ساعت/i)?.[0] ?? ''],
  ];

  for (const [pattern, value] of matchers) {
    if (pattern.test(line)) return value;
  }

  return '';
}

function parseTranscriptLine(line: string): MedicationInstructionDraft | null {
  const normalizedLine = normalizeTranscriptValue(line);
  if (!normalizedLine) return null;

  const pipeParts = normalizedLine.split('|').map((part) => part.trim()).filter(Boolean);
  if (pipeParts.length >= 2) {
    return {
      medicationName: pipeParts[0] ?? '',
      dose: pipeParts[1] ?? '',
      frequency: pipeParts[2] ?? '',
      times: pipeParts[3] ?? '08:00',
      durationDays: (pipeParts[4] ?? '').replace(/[^\d]/g, ''),
      note: pipeParts.slice(5).join(' | '),
    };
  }

  const timeMatch = normalizedLine.match(/\b([01]?\d|2[0-3])[:.][0-5]\d\b/);
  const durationMatch = normalizedLine.match(/(?:for\s*)?(\d+)\s*(?:days?|روز)/i);
  const frequency = inferFrequency(normalizedLine);
  const cleanedWithoutMeta = normalizedLine
    .replace(timeMatch?.[0] ?? '', '')
    .replace(durationMatch?.[0] ?? '', '')
    .replace(frequency, '')
    .replace(/\s+-\s+/g, ' - ')
    .trim();

  let medicationName = cleanedWithoutMeta;
  let dose = '';
  let note = '';

  const dashParts = cleanedWithoutMeta.split(' - ').map((part) => part.trim()).filter(Boolean);
  if (dashParts.length > 1) {
    medicationName = dashParts[0] ?? '';
    dose = dashParts[1] ?? '';
    note = dashParts.slice(2).join(' - ');
  } else {
    const commaParts = cleanedWithoutMeta.split(',').map((part) => part.trim()).filter(Boolean);
    if (commaParts.length > 1) {
      medicationName = commaParts[0] ?? '';
      dose = commaParts[1] ?? '';
      note = commaParts.slice(2).join(', ');
    } else {
      const regexMatch = normalizedLine.match(/^(.+?)\s+((?:\d+\s*time(?:s)?\s*per\s*day)|(?:once daily)|(?:twice daily)|(?:three times daily)|(?:روزی\s*\S+\s*بار)|(?:هر\s*\d+\s*ساعت))/i);
      if (regexMatch) {
        medicationName = regexMatch[1]?.trim() ?? medicationName;
      }
    }
  }

  if (!medicationName.trim()) return null;

  return {
    medicationName: medicationName.trim(),
    dose: dose.trim(),
    frequency: frequency.trim(),
    times: (timeMatch?.[0] ?? '08:00').replace('.', ':'),
    durationDays: durationMatch?.[1] ?? '',
    note: note.trim(),
  };
}

function parsePrescriptionTranscript(text: string) {
  return text
    .split(/\r?\n|;/)
    .map((line) => parseTranscriptLine(line))
    .filter((item): item is MedicationInstructionDraft => Boolean(item));
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;
}

function getDefaultRoute(role: Role): AppRoute {
  if (role === 'admin') return 'admin/dashboard';
  if (role === 'doctor_staff') return 'doctor/dashboard';
  if (role === 'planner_member' || role === 'planner_observer') return 'planner/dashboard';
  return 'patient/today';
}

export function usePersistentAppState() {
  const [state, setState] = useState<AppState>(seedState);
  const [isReady, setReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    loadAppState()
      .then((loaded) => {
        if (!isMounted) return;
        setState(loaded);
      })
      .catch(() => {
        if (!isMounted) return;
        setState(seedState);
      })
      .finally(() => {
        if (!isMounted) return;
        setReady(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isReady) {
      void saveAppState(state);
    }
  }, [isReady, state]);

  const currentUser = useMemo(() => {
    const session = state.currentSession;
    if (!session) return null;
    if (session.role === 'patient') {
      return state.patients.find((patient) => patient.id === session.patientId) ?? null;
    }

    return state.users.find((user) => user.id === session.userId) ?? null;
  }, [state.currentSession, state.patients, state.users]);

  const selectedPatient = useMemo(
    () => state.patients.find((patient) => patient.id === state.selectedPatientId) ?? null,
    [state.patients, state.selectedPatientId],
  );

  const patientSummaries = useMemo(() => buildPatientSummaryRows(state), [state]);
  const followUpPatients = useMemo(() => patientSummaries.filter((entry) => entry.summary.needsFollowUp), [patientSummaries]);

  const dashboardMetrics = useMemo(() => {
    const activePatients = state.patients.filter((patient) => getActivePlan(patient.id, state.plans)).length;
    const checkedInToday = patientSummaries.filter((entry) => entry.summary.checksToday > 0).length;

    return {
      totalActivePatients: activePatients,
      checkedInToday,
      needsFollowUp: followUpPatients.length,
      recentPatients: [...state.patients].sort((a, b) => b.joinedAt.localeCompare(a.joinedAt)).slice(0, 4),
    };
  }, [followUpPatients.length, patientSummaries, state.patients, state.plans]);

  const adminMetrics = useMemo(
    () => ({
      clinics: state.clinics.length,
      users: state.users.length,
      patients: state.patients.length,
      activePlans: state.plans.filter((plan) => plan.isActive).length,
    }),
    [state.clinics.length, state.patients.length, state.plans, state.users.length],
  );

  const patientTodayRows = useMemo(() => {
    if (state.currentSession?.role !== 'patient' || !state.currentSession.patientId) return [];
    return getTodayPlanRows(state, state.currentSession.patientId);
  }, [state]);

  const patientHistory = useMemo(() => {
    if (state.currentSession?.role !== 'patient' || !state.currentSession.patientId) return [];
    return state.dailyChecks
      .filter((entry) => entry.patientId === state.currentSession?.patientId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 12);
  }, [state]);

  const plannerCurrentUserId =
    state.currentSession?.role === 'planner_member' || state.currentSession?.role === 'planner_observer'
      ? state.currentSession.userId
      : null;

  const plannerTodayRows = useMemo(() => {
    if (!plannerCurrentUserId || state.currentSession?.role !== 'planner_member') return [];
    return getRoutineTodayRows(state, plannerCurrentUserId);
  }, [plannerCurrentUserId, state]);

  const plannerSummary = useMemo(() => {
    if (!plannerCurrentUserId || state.currentSession?.role !== 'planner_member') return null;
    return computeRoutineAdherenceSummary(state, plannerCurrentUserId);
  }, [plannerCurrentUserId, state]);

  const plannerLinks = useMemo(() => {
    if (!plannerCurrentUserId) return [];
    if (state.currentSession?.role === 'planner_member') return getMemberLinks(state, plannerCurrentUserId);
    return getObserverLinks(state, plannerCurrentUserId);
  }, [plannerCurrentUserId, state]);

  const observerQueue = useMemo(() => {
    if (!plannerCurrentUserId || state.currentSession?.role !== 'planner_observer') return [];
    return getObserverReviewQueue(state, plannerCurrentUserId);
  }, [plannerCurrentUserId, state]);

  const plannerActivePlans = useMemo(() => {
    if (!plannerCurrentUserId || state.currentSession?.role !== 'planner_member') return [];
    return getRoutinePlansForOwner(state, plannerCurrentUserId);
  }, [plannerCurrentUserId, state]);

  const plannerManagedMembers = useMemo(() => {
    if (!plannerCurrentUserId || state.currentSession?.role !== 'planner_observer') return [];
    return plannerLinks
      .map((link) => ({
        link,
        member: state.users.find((user) => user.id === link.memberUserId) ?? null,
        summary: computeRoutineAdherenceSummary(state, link.memberUserId),
      }))
      .filter((entry) => entry.member);
  }, [plannerCurrentUserId, plannerLinks, state]);

  function navigate(route: AppRoute) {
    setState((current) => ({ ...current, currentRoute: route }));
  }

  function setLanguage(language: AppLanguage) {
    setState((current) => ({ ...current, language }));
  }

  function selectPatient(patientId: string, route?: AppRoute) {
    setState((current) => ({
      ...current,
      selectedPatientId: patientId,
      currentRoute: route ?? current.currentRoute,
      drafts: {
        ...current.drafts,
        planByPatientId: {
          ...current.drafts.planByPatientId,
          [patientId]: current.drafts.planByPatientId[patientId] ?? buildPlanDraftFromCurrent(current, patientId),
        },
        prescriptionByPatientId: {
          ...current.drafts.prescriptionByPatientId,
          [patientId]: current.drafts.prescriptionByPatientId[patientId] ?? buildPrescriptionDraftFromCurrent(current, patientId),
        },
      },
    }));
  }

  function logout() {
    setState((current) => ({
      ...current,
      currentSession: null,
      currentRoute: 'landing',
      selectedPatientId: null,
    }));
  }

  function loginWithEmail(email: string, password: string, role: Exclude<Role, 'patient'>) {
    const user = state.users.find((entry) => entry.role === role && entry.email.trim().toLowerCase() === email.trim().toLowerCase() && entry.password === password);
    if (!user) return false;

    setState((current) => ({
      ...current,
      currentSession: { role, userId: user.id },
      currentRoute: getDefaultRoute(role),
      selectedPatientId: null,
    }));
    return true;
  }

  function loginAsStaff(email: string, password: string, role: 'admin' | 'doctor_staff') {
    return loginWithEmail(email, password, role);
  }

  function loginAsPlanner(email: string, password: string, role: 'planner_member' | 'planner_observer') {
    return loginWithEmail(email, password, role);
  }

  function loginAsPatient(phone: string) {
    const patient = state.patients.find((entry) => entry.phone === phone.trim());
    if (!patient) return false;

    setState((current) => ({
      ...current,
      currentSession: { role: 'patient', userId: patient.id, patientId: patient.id },
      currentRoute: 'patient/today',
      selectedPatientId: patient.id,
    }));
    return true;
  }

  function updateNewPatientDraft(patch: Partial<NewPatientDraft>) {
    setState((current) => ({
      ...current,
      drafts: {
        ...current.drafts,
        newPatient: { ...current.drafts.newPatient, ...patch },
      },
    }));
  }

  function addPatient() {
    const doctor = state.currentSession?.role === 'doctor_staff' ? state.users.find((user) => user.id === state.currentSession?.userId) : null;
    if (!doctor?.clinicId) return false;

    const draft = state.drafts.newPatient;
    if (!draft.name.trim() || !draft.phone.trim() || !draft.age.trim() || !draft.condition.trim()) return false;

    const patient: Patient = {
      id: createId('patient'),
      clinicId: doctor.clinicId,
      doctorStaffUserId: doctor.id,
      name: draft.name.trim(),
      phone: draft.phone.trim(),
      age: Number(draft.age),
      condition: draft.condition.trim(),
      notes: draft.notes.trim(),
      joinedAt: new Date().toISOString(),
    };

    setState((current) => ({
      ...current,
      patients: [patient, ...current.patients],
      selectedPatientId: patient.id,
      currentRoute: 'doctor/patients/detail',
      drafts: {
        ...current.drafts,
        newPatient: seedState.drafts.newPatient,
        planByPatientId: {
          ...current.drafts.planByPatientId,
          [patient.id]: buildBlankPlanDraft(),
        },
        prescriptionByPatientId: {
          ...current.drafts.prescriptionByPatientId,
          [patient.id]: buildBlankPrescriptionDraft(),
        },
      },
    }));
    return true;
  }

  function updatePlanDraft(patientId: string, patch: Partial<PlanDraft>) {
    setState((current) => ({
      ...current,
      drafts: {
        ...current.drafts,
        planByPatientId: {
          ...current.drafts.planByPatientId,
          [patientId]: {
            ...(current.drafts.planByPatientId[patientId] ?? buildPlanDraftFromCurrent(current, patientId)),
            ...patch,
          },
        },
      },
    }));
  }

  function updatePlanDraftItem(patientId: string, index: number, patch: Partial<PlanItemDraft>) {
    setState((current) => {
      const currentDraft = current.drafts.planByPatientId[patientId] ?? buildPlanDraftFromCurrent(current, patientId);
      const nextItems = currentDraft.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item));

      return {
        ...current,
        drafts: {
          ...current.drafts,
          planByPatientId: {
            ...current.drafts.planByPatientId,
            [patientId]: { ...currentDraft, items: nextItems },
          },
        },
      };
    });
  }

  function addPlanDraftItem(patientId: string) {
    setState((current) => {
      const currentDraft = current.drafts.planByPatientId[patientId] ?? buildPlanDraftFromCurrent(current, patientId);

      return {
        ...current,
        drafts: {
          ...current.drafts,
          planByPatientId: {
            ...current.drafts.planByPatientId,
            [patientId]: {
              ...currentDraft,
              items: [...currentDraft.items, { label: '', instructions: '', timeOfDay: '14:00' }],
            },
          },
        },
      };
    });
  }

  function savePlan(patientId: string) {
    const draft = state.drafts.planByPatientId[patientId] ?? buildPlanDraftFromCurrent(state, patientId);
    const doctor = state.currentSession?.role === 'doctor_staff' ? state.users.find((user) => user.id === state.currentSession?.userId) : null;
    if (!doctor || !draft.title.trim() || draft.items.some((item) => !item.label.trim() || !item.timeOfDay.trim())) return false;

    const now = new Date().toISOString();
    const existingPlan = getActivePlan(patientId, state.plans);
    const nextPlanId = existingPlan?.id ?? createId('plan');
    const nextPlan: Plan = {
      id: nextPlanId,
      patientId,
      title: draft.title.trim(),
      startDate: draft.startDate,
      endDate: draft.endDate.trim() || null,
      isActive: true,
      createdByUserId: doctor.id,
      createdAt: existingPlan?.createdAt ?? now,
    };

    setState((current) => {
      const plans = [
        nextPlan,
        ...current.plans.filter((plan) => (plan.patientId !== patientId || !plan.isActive) && plan.id !== nextPlanId).map((plan) => (plan.patientId === patientId ? { ...plan, isActive: false } : plan)),
      ];
      const nextItems = draft.items.map((item, index) => ({
        id: createId(`item-${index}`),
        planId: nextPlanId,
        label: item.label.trim(),
        instructions: item.instructions.trim(),
        timeOfDay: item.timeOfDay.trim(),
        cadence: 'daily' as const,
      }));

      return {
        ...current,
        plans,
        planItems: [...current.planItems.filter((item) => item.planId !== nextPlanId), ...nextItems],
        currentRoute: 'doctor/patients/detail',
        drafts: {
          ...current.drafts,
          planByPatientId: {
            ...current.drafts.planByPatientId,
            [patientId]: draft,
          },
        },
      };
    });
    return true;
  }

  function updatePrescriptionDraft(patientId: string, patch: Partial<PrescriptionDraft>) {
    setState((current) => ({
      ...current,
      drafts: {
        ...current.drafts,
        prescriptionByPatientId: {
          ...current.drafts.prescriptionByPatientId,
          [patientId]: {
            ...(current.drafts.prescriptionByPatientId[patientId] ?? buildPrescriptionDraftFromCurrent(current, patientId)),
            ...patch,
          },
        },
      },
    }));
  }

  function updatePrescriptionMedication(patientId: string, index: number, patch: Partial<MedicationInstructionDraft>) {
    setState((current) => {
      const currentDraft = current.drafts.prescriptionByPatientId[patientId] ?? buildPrescriptionDraftFromCurrent(current, patientId);
      const medications = currentDraft.medications.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item));

      return {
        ...current,
        drafts: {
          ...current.drafts,
          prescriptionByPatientId: {
            ...current.drafts.prescriptionByPatientId,
            [patientId]: { ...currentDraft, medications },
          },
        },
      };
    });
  }

  function addPrescriptionMedication(patientId: string) {
    setState((current) => {
      const currentDraft = current.drafts.prescriptionByPatientId[patientId] ?? buildPrescriptionDraftFromCurrent(current, patientId);
      return {
        ...current,
        drafts: {
          ...current.drafts,
          prescriptionByPatientId: {
            ...current.drafts.prescriptionByPatientId,
            [patientId]: {
              ...currentDraft,
              medications: [...currentDraft.medications, { medicationName: '', dose: '', frequency: '', times: '20:00', durationDays: '7', note: '' }],
            },
          },
        },
      };
    });
  }

  function updateRoutinePlanDraft(ownerUserId: string, patch: Partial<RoutinePlanDraft>) {
    setState((current) => ({
      ...current,
      drafts: {
        ...current.drafts,
        routinePlanByOwnerId: {
          ...current.drafts.routinePlanByOwnerId,
          [ownerUserId]: {
            ...(current.drafts.routinePlanByOwnerId[ownerUserId] ?? buildRoutinePlanDraftFromCurrent(current, ownerUserId)),
            ...patch,
          },
        },
      },
    }));
  }

  function updateRoutineTaskDraft(ownerUserId: string, index: number, patch: Partial<RoutineTaskDraft>) {
    setState((current) => {
      const currentDraft = current.drafts.routinePlanByOwnerId[ownerUserId] ?? buildRoutinePlanDraftFromCurrent(current, ownerUserId);
      const nextTasks = currentDraft.tasks.map((task, taskIndex) => (taskIndex === index ? { ...task, ...patch } : task));

      return {
        ...current,
        drafts: {
          ...current.drafts,
          routinePlanByOwnerId: {
            ...current.drafts.routinePlanByOwnerId,
            [ownerUserId]: {
              ...currentDraft,
              tasks: nextTasks,
            },
          },
        },
      };
    });
  }

  function addRoutineTaskDraft(ownerUserId: string) {
    setState((current) => {
      const currentDraft = current.drafts.routinePlanByOwnerId[ownerUserId] ?? buildRoutinePlanDraftFromCurrent(current, ownerUserId);

      return {
        ...current,
        drafts: {
          ...current.drafts,
          routinePlanByOwnerId: {
            ...current.drafts.routinePlanByOwnerId,
            [ownerUserId]: {
              ...currentDraft,
              tasks: [
                ...currentDraft.tasks,
                {
                  title: '',
                  description: '',
                  dueTime: '14:00',
                  recurrence: 'daily',
                  recurrenceDaysText: '',
                  customRuleText: '',
                  priority: 2,
                  observerUserId: currentDraft.defaultObserverUserId,
                },
              ],
            },
          },
        },
      };
    });
  }

  function saveRoutinePlan(ownerUserId: string) {
    const draft = state.drafts.routinePlanByOwnerId[ownerUserId] ?? buildRoutinePlanDraftFromCurrent(state, ownerUserId);
    if (!draft.title.trim() || draft.tasks.some((task) => !task.title.trim() || !task.dueTime.trim())) return false;

    const activePlan = state.routinePlans.find((plan) => plan.ownerUserId === ownerUserId && plan.isActive) ?? null;
    const nextPlanId = activePlan?.id ?? createId('routine-plan');
    const now = new Date().toISOString();
    const createdByUserId = state.currentSession?.userId ?? ownerUserId;

    const nextPlan: RoutinePlan = {
      id: nextPlanId,
      ownerUserId,
      title: draft.title.trim(),
      scope: draft.scope,
      defaultObserverUserId: draft.defaultObserverUserId.trim() || null,
      defaultRelationKind: draft.defaultRelationKind,
      startDate: draft.startDate,
      endDate: draft.endDate.trim() || null,
      isActive: true,
      createdByUserId,
      createdAt: activePlan?.createdAt ?? now,
    };

    setState((current) => ({
      ...current,
      routinePlans: [
        nextPlan,
        ...current.routinePlans.filter((plan) => plan.id !== nextPlanId).map((plan) => (plan.ownerUserId === ownerUserId ? { ...plan, isActive: false } : plan)),
      ],
      routineTasks: [
        ...current.routineTasks.filter((task) => task.routinePlanId !== nextPlanId),
        ...draft.tasks.map((task, index) => ({
          id: createId(`routine-task-${index}`),
          routinePlanId: nextPlanId,
          title: task.title.trim(),
          description: task.description.trim(),
          dueTime: task.dueTime.trim(),
          recurrence: task.recurrence,
          recurrenceDays: parseRecurrenceDays(task.recurrenceDaysText),
          customRuleText: task.customRuleText.trim(),
          priority: task.priority,
          observerUserId: task.observerUserId.trim() || draft.defaultObserverUserId.trim() || null,
        })),
      ],
      drafts: {
        ...current.drafts,
        routinePlanByOwnerId: {
          ...current.drafts.routinePlanByOwnerId,
          [ownerUserId]: draft,
        },
      },
      currentRoute: 'planner/dashboard',
    }));
    return true;
  }

  function submitRoutineCheck(taskId: string, status: RoutineCheck['status'], note = '') {
    if (state.currentSession?.role !== 'planner_member') return;
    const ownerUserId = state.currentSession.userId;
    const todayKey = toDateKey(new Date());
    const entry: RoutineCheck = {
      id: createId('routine-check'),
      routineTaskId: taskId,
      ownerUserId,
      status,
      note: note.trim(),
      checkDate: todayKey,
      createdAt: new Date().toISOString(),
    };

    setState((current) => ({
      ...current,
      routineChecks: [
        entry,
        ...current.routineChecks.filter((check) => !(check.ownerUserId === ownerUserId && check.routineTaskId === taskId && check.checkDate === todayKey)),
      ],
      routineReviews: current.routineReviews.filter((review) => {
        const replaced = current.routineChecks.find((check) => check.ownerUserId === ownerUserId && check.routineTaskId === taskId && check.checkDate === todayKey);
        return replaced ? review.routineCheckId !== replaced.id : true;
      }),
    }));
  }

  function reviewRoutineCheck(checkId: string, decision: RoutineReviewDecision, note: string) {
    if (state.currentSession?.role !== 'planner_observer') return false;
    const check = state.routineChecks.find((entry) => entry.id === checkId);
    if (!check) return false;

    const task = state.routineTasks.find((entry) => entry.id === check.routineTaskId);
    if (!task || task.observerUserId !== state.currentSession.userId) return false;

    const review = {
      id: createId('routine-review'),
      routineCheckId: checkId,
      routineTaskId: task.id,
      observerUserId: state.currentSession.userId,
      decision,
      note: note.trim(),
      createdAt: new Date().toISOString(),
    };

    setState((current) => ({
      ...current,
      routineReviews: [
        review,
        ...current.routineReviews.filter((entry) => !(entry.routineCheckId === checkId && entry.observerUserId === state.currentSession?.userId)),
      ],
    }));
    return true;
  }

  function parsePrescriptionTranscriptForPatient(patientId: string) {
    const currentDraft = state.drafts.prescriptionByPatientId[patientId] ?? buildPrescriptionDraftFromCurrent(state, patientId);
    const parsedRows = parsePrescriptionTranscript(currentDraft.transcriptText);
    if (parsedRows.length === 0) return false;

    setState((current) => ({
      ...current,
      drafts: {
        ...current.drafts,
        prescriptionByPatientId: {
          ...current.drafts.prescriptionByPatientId,
          [patientId]: {
            ...(current.drafts.prescriptionByPatientId[patientId] ?? buildPrescriptionDraftFromCurrent(current, patientId)),
            extractionStatus: 'manual_review',
            medications: parsedRows,
          },
        },
      },
    }));
    return true;
  }

  function applyPrescriptionTemplate(patientId: string, templateKey: 'ointment' | 'tablet' | 'syrup' | 'dressing' | 'burn_pack') {
    setState((current) => {
      const currentDraft = current.drafts.prescriptionByPatientId[patientId] ?? buildPrescriptionDraftFromCurrent(current, patientId);
      const hasOnlyEmptyRow =
        currentDraft.medications.length === 1 &&
        !currentDraft.medications[0].medicationName.trim() &&
        !currentDraft.medications[0].dose.trim() &&
        !currentDraft.medications[0].frequency.trim() &&
        !currentDraft.medications[0].note.trim();
      const templateRows = buildMedicationTemplate(templateKey);

      return {
        ...current,
        drafts: {
          ...current.drafts,
          prescriptionByPatientId: {
            ...current.drafts.prescriptionByPatientId,
            [patientId]: {
              ...currentDraft,
              extractionStatus: 'manual_review',
              medications: hasOnlyEmptyRow ? templateRows : [...currentDraft.medications, ...templateRows],
            },
          },
        },
      };
    });
  }

  function generatePlanFromPrescription(patientId: string) {
    const prescriptionDraft = state.drafts.prescriptionByPatientId[patientId] ?? buildPrescriptionDraftFromCurrent(state, patientId);
    const filteredMeds = prescriptionDraft.medications.filter((item) => item.medicationName.trim() && item.times.trim());
    if (filteredMeds.length === 0) return false;

    const generatedItems: PlanItemDraft[] = filteredMeds.map((med) => ({
      label: `${med.medicationName.trim()} ${med.dose.trim()}`.trim(),
      timeOfDay: med.times.trim(),
      instructions: [med.frequency.trim(), med.durationDays.trim() ? `for ${med.durationDays.trim()} days` : '', med.note.trim()].filter(Boolean).join(' • '),
    }));

    setState((current) => {
      const planDraft = current.drafts.planByPatientId[patientId] ?? buildPlanDraftFromCurrent(current, patientId);
      const rxDraft = current.drafts.prescriptionByPatientId[patientId] ?? buildPrescriptionDraftFromCurrent(current, patientId);

      return {
        ...current,
        drafts: {
          ...current.drafts,
          planByPatientId: {
            ...current.drafts.planByPatientId,
            [patientId]: {
              ...planDraft,
              title: planDraft.title.trim() || 'Medication Adherence Plan',
              items: generatedItems,
            },
          },
          prescriptionByPatientId: {
            ...current.drafts.prescriptionByPatientId,
            [patientId]: {
              ...rxDraft,
              extractionStatus: 'approved',
            },
          },
        },
      };
    });
    return true;
  }

  function submitDailyCheck(planItemId: string, status: DailyCheck['status']) {
    if (state.currentSession?.role !== 'patient' || !state.currentSession.patientId) return;

    const patientId = state.currentSession.patientId;
    const todayKey = toDateKey(new Date());
    const entry: DailyCheck = {
      id: createId('check'),
      patientId,
      planItemId,
      status,
      note: '',
      checkDate: todayKey,
      createdAt: new Date().toISOString(),
    };

    setState((current) => ({
      ...current,
      dailyChecks: [
        entry,
        ...current.dailyChecks.filter((check) => !(check.patientId === patientId && check.planItemId === planItemId && check.checkDate === todayKey)),
      ],
    }));
  }

  return {
    isReady,
    state,
    currentUser,
    selectedPatient,
    patientSummaries,
    followUpPatients,
    dashboardMetrics,
    adminMetrics,
    patientTodayRows,
    patientHistory,
    plannerTodayRows,
    plannerSummary,
    plannerLinks,
    plannerActivePlans,
    plannerManagedMembers,
    observerQueue,
    navigate,
    setLanguage,
    selectPatient,
    logout,
    loginAsStaff,
    loginAsPlanner,
    loginAsPatient,
    updateNewPatientDraft,
    addPatient,
    updatePlanDraft,
    updatePlanDraftItem,
    addPlanDraftItem,
    updatePrescriptionDraft,
    updatePrescriptionMedication,
    addPrescriptionMedication,
    updateRoutinePlanDraft,
    updateRoutineTaskDraft,
    addRoutineTaskDraft,
    saveRoutinePlan,
    submitRoutineCheck,
    reviewRoutineCheck,
    parsePrescriptionTranscriptForPatient,
    applyPrescriptionTemplate,
    generatePlanFromPrescription,
    savePlan,
    submitDailyCheck,
    getPlanDraft: (patientId: string) => state.drafts.planByPatientId[patientId] ?? buildPlanDraftFromCurrent(state, patientId),
    getPrescriptionDraft: (patientId: string) => state.drafts.prescriptionByPatientId[patientId] ?? buildPrescriptionDraftFromCurrent(state, patientId),
    getRoutinePlanDraft: (ownerUserId: string) => state.drafts.routinePlanByOwnerId[ownerUserId] ?? buildRoutinePlanDraftFromCurrent(state, ownerUserId),
    getPatientSummary: (patientId: string) => {
      const patient = state.patients.find((entry) => entry.id === patientId);
      return patient ? computeAdherenceSummary(state, patient) : null;
    },
    getActivePlanForPatient: (patientId: string) => {
      const plan = getActivePlan(patientId, state.plans);
      return {
        plan,
        items: getPlanItems(plan?.id ?? null, state.planItems),
      };
    },
  };
}

function buildPrescriptionDraftFromCurrent(state: AppState, patientId: string): PrescriptionDraft {
  return state.drafts.prescriptionByPatientId[patientId] ?? buildBlankPrescriptionDraft();
}

function buildRoutinePlanDraftFromCurrent(state: AppState, ownerUserId: string): RoutinePlanDraft {
  const activePlan = state.routinePlans.find((plan) => plan.ownerUserId === ownerUserId && plan.isActive) ?? null;
  const tasks = activePlan ? getRoutineTasksForPlan(state, activePlan.id) : [];

  if (!activePlan) {
    const firstLink = state.accountabilityLinks.find((link) => link.memberUserId === ownerUserId) ?? null;
    return {
      ...buildBlankRoutinePlanDraft(),
      defaultObserverUserId: firstLink?.observerUserId ?? '',
      defaultRelationKind: firstLink?.relationKind ?? 'friend',
    };
  }

  return {
    title: activePlan.title,
    scope: activePlan.scope,
    defaultObserverUserId: activePlan.defaultObserverUserId ?? '',
    defaultRelationKind: activePlan.defaultRelationKind ?? 'friend',
    startDate: activePlan.startDate,
    endDate: activePlan.endDate ?? '',
    tasks: tasks.length
      ? tasks.map((task) => ({
          title: task.title,
          description: task.description,
          dueTime: task.dueTime,
          recurrence: task.recurrence,
          recurrenceDaysText: task.recurrenceDays.join(','),
          customRuleText: task.customRuleText,
          priority: task.priority,
          observerUserId: task.observerUserId ?? '',
        }))
      : buildBlankRoutinePlanDraft().tasks,
  };
}

function buildPlanDraftFromCurrent(state: AppState, patientId: string): PlanDraft {
  const activePlan = getActivePlan(patientId, state.plans);
  const items = getPlanItems(activePlan?.id ?? null, state.planItems);

  if (!activePlan) {
    return buildBlankPlanDraft();
  }

  return {
    title: activePlan.title,
    startDate: activePlan.startDate,
    endDate: activePlan.endDate ?? '',
    items: items.length
      ? items.map((item) => ({
          label: item.label,
          instructions: item.instructions,
          timeOfDay: item.timeOfDay,
        }))
      : buildBlankPlanDraft().items,
  };
}
