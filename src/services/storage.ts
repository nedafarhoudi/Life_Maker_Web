import AsyncStorage from '@react-native-async-storage/async-storage';

import { seedState } from '../data/seed';
import { AppState } from '../types/domain';

const STORAGE_KEY = 'life-rhythm-state';

export async function loadAppState() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return seedState;
  }

  try {
    const parsed = JSON.parse(raw) as AppState;
    return {
      ...seedState,
      ...parsed,
    };
  } catch {
    return seedState;
  }
}

export async function saveAppState(state: AppState) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
