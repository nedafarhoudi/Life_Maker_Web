import { useEffect, useMemo, useState } from 'react';

import { seedState } from '../data/seed';
import { loadAppState, saveAppState } from '../services/storage';
import { AppLanguage, AppState, AppRoute, DailyCheck, MedicationInstructionDraft, NewPatientDraft, Patient, Plan, PlanDraft, PlanItemDraft, PrescriptionDraft, Role, User } from '../types/domain';
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
    extractionStatus: 'manual_review',
    photoUri: null,
    photoUpdatedAt: null,
    medications: [
      { medicationName: '', dose: '', frequency: '', times: '08:00', durationDays: '7', note: '' },
    ],
  };
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

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;
}

function getDefaultRoute(role: Role): AppRoute {
  if (role === 'admin') return 'admin/dashboard';
  if (role === 'doctor_staff') return 'doctor/dashboard';
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

  function loginAsStaff(email: string, password: string, role: 'admin' | 'doctor_staff') {
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
    navigate,
    setLanguage,
    selectPatient,
    logout,
    loginAsStaff,
    loginAsPatient,
    updateNewPatientDraft,
    addPatient,
    updatePlanDraft,
    updatePlanDraftItem,
    addPlanDraftItem,
    updatePrescriptionDraft,
    updatePrescriptionMedication,
    addPrescriptionMedication,
    applyPrescriptionTemplate,
    generatePlanFromPrescription,
    savePlan,
    submitDailyCheck,
    getPlanDraft: (patientId: string) => state.drafts.planByPatientId[patientId] ?? buildPlanDraftFromCurrent(state, patientId),
    getPrescriptionDraft: (patientId: string) => state.drafts.prescriptionByPatientId[patientId] ?? buildPrescriptionDraftFromCurrent(state, patientId),
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
