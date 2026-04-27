export type ScreenKey = 'dashboard' | 'today' | 'roles' | 'insights';

export type RecurrenceType = 'daily' | 'interval' | 'weekly' | 'monthly' | 'manual';

export type UrgencyTone = 'success' | 'warning' | 'danger' | 'muted';

export interface Role {
  id: string;
  title: string;
  description: string;
  color: string;
}

export interface Dimension {
  id: string;
  roleId: string;
  title: string;
  description: string;
}

export interface Task {
  id: string;
  roleId: string;
  dimensionId: string;
  title: string;
  description?: string;
  estimatedMinutes: number;
  recurrenceType: RecurrenceType;
  intervalDays?: number;
  monthlyDay?: number;
  dueTime?: string;
  dueDate?: string;
  startDate: string;
  priority: 1 | 2 | 3;
  baseScore: number;
  qualityWeight: number;
  autoSchedule: boolean;
}

export interface Completion {
  id: string;
  taskId: string;
  completedAt: string;
  toneAtCompletion: UrgencyTone;
  pointsAwarded: number;
  actualMinutes: number;
  quality: number;
}

export interface DailyScore {
  date: string;
  score: number;
}

export interface Certificate {
  id: string;
  taskId: string;
  title: string;
  awardedAt: string;
}

export interface QuoteCard {
  id: string;
  kind: 'quote' | 'poem';
  text: string;
  author: string;
}

export interface Settings {
  onboarded: boolean;
  selectedRoleIds: string[];
}

export interface AppState {
  roles: Role[];
  dimensions: Dimension[];
  tasks: Task[];
  completions: Completion[];
  dailyScores: DailyScore[];
  certificates: Certificate[];
  quotes: QuoteCard[];
  settings: Settings;
}

export interface TaskStatus {
  task: Task;
  dueAt: Date;
  remainingMs: number;
  isCompletedToday: boolean;
  tone: UrgencyTone;
  pointsPreview: number;
}
