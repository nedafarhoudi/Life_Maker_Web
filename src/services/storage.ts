import AsyncStorage from '@react-native-async-storage/async-storage';

import { seedState } from '../data/seed';
import { AppState } from '../types/domain';

const STORAGE_KEY = 'life-maker-web-state';

export async function loadAppState() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return seedState;
    }

    const parsed = JSON.parse(raw) as AppState;
    if (parsed.schemaVersion !== seedState.schemaVersion) {
      return {
        ...seedState,
        currentSession: null,
        currentRoute: 'landing' as const,
        selectedPatientId: null,
        language: parsed.language ?? seedState.language,
      };
    }

    return {
      ...seedState,
      ...parsed,
      drafts: {
        ...seedState.drafts,
        ...parsed.drafts,
        newPatient: {
          ...seedState.drafts.newPatient,
          ...parsed.drafts?.newPatient,
        },
        planByPatientId: {
          ...seedState.drafts.planByPatientId,
          ...parsed.drafts?.planByPatientId,
        },
        prescriptionByPatientId: {
          ...seedState.drafts.prescriptionByPatientId,
          ...parsed.drafts?.prescriptionByPatientId,
        },
      },
    };
  } catch {
    return seedState;
  }
}

export async function saveAppState(state: AppState) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Keep the demo usable even if persistence is temporarily unavailable.
  }
}
