import { AppState, QuoteCard } from '../types/domain';

const quotes: QuoteCard[] = [
  { id: 'q1', kind: 'quote', text: 'تعادل یعنی هر بخش زندگی در زمان خودش رسیدگی شود.', author: 'Life Rhythm' },
  { id: 'q2', kind: 'poem', text: 'قطره قطره جمع گردد وانگهی دریا شود', author: 'مولوی' },
];

export const seedState: AppState = {
  roles: [
    { id: 'role-mother', title: 'مادر بودن', description: 'رسیدگی به فرزند و برنامه تربیتی', color: '#d98b64' },
    { id: 'role-work', title: 'کارمند و پژوهشگر', description: 'کارهای مرکز تحقیقات و پروژه های علمی', color: '#5c7c77' },
    { id: 'role-home', title: 'مدیریت خانه', description: 'گردش کارهای خانه و نظم روزانه', color: '#c6a15b' },
    { id: 'role-relationship', title: 'رابطه عاطفی', description: 'رسیدگی به رابطه و سفرهای ملاقات', color: '#aa6a82' },
    { id: 'role-business', title: 'شرکت شخصی', description: 'پروژه های تیمی و معامله ای', color: '#6084b0' },
    { id: 'role-self', title: 'سلامتی و رشد فردی', description: 'ورزش، دوستی ها و رشد شخصی', color: '#6ba56f' },
    { id: 'role-family', title: 'نقش فرزند', description: 'مسئولیت در برابر پدر و مادر', color: '#8f7358' },
  ],
  dimensions: [
    { id: 'dim-school', roleId: 'role-mother', title: 'کارهای درسی پسرم', description: 'پیگیری تکالیف و کلاس ها' },
    { id: 'dim-care', roleId: 'role-mother', title: 'بهداشت و مراقبت', description: 'حمام، اصلاح و خواب منظم' },
    { id: 'dim-research', roleId: 'role-work', title: 'تحقیقات کاربردی', description: 'تحویل های زمانی و پیگیری پروژه' },
    { id: 'dim-knowledge', roleId: 'role-work', title: 'مرز دانش', description: 'مطالعه و نگارش علمی' },
    { id: 'dim-kitchen', roleId: 'role-home', title: 'چرخه آشپزخانه', description: 'ظرف، میز غذا و نظم' },
    { id: 'dim-laundry', roleId: 'role-home', title: 'رخت و لباس', description: 'شستشو، پهن کردن و جمع آوری' },
    { id: 'dim-relationship', roleId: 'role-relationship', title: 'حفظ پیوند', description: 'تماس، سفر و برنامه مشترک' },
    { id: 'dim-business', roleId: 'role-business', title: 'پروژه های شرکت', description: 'پیگیری طراحی و معامله' },
    { id: 'dim-health', roleId: 'role-self', title: 'ورزش و خودمراقبتی', description: 'پیاده روی، ورزش و ملاقات دوستان' },
    { id: 'dim-parents', roleId: 'role-family', title: 'رسیدگی به والدین', description: 'تماس، سرزدن و هماهنگی' },
  ],
  tasks: [
    { id: 'task-math', roleId: 'role-mother', dimensionId: 'dim-school', title: 'مرور تکالیف ریاضی', estimatedMinutes: 35, recurrenceType: 'daily', dueTime: '18:00', startDate: '2026-04-27T06:00:00.000Z', priority: 1, baseScore: 18, qualityWeight: 0.2, autoSchedule: true },
    { id: 'task-sleep-routine', roleId: 'role-mother', dimensionId: 'dim-care', title: 'خواب شبانه تا 20:30', estimatedMinutes: 20, recurrenceType: 'daily', dueTime: '20:30', startDate: '2026-04-27T06:00:00.000Z', priority: 2, baseScore: 12, qualityWeight: 0.15, autoSchedule: true },
    { id: 'task-application-research', roleId: 'role-work', dimensionId: 'dim-research', title: 'پیگیری گزارش پروژه کاربردی', estimatedMinutes: 90, recurrenceType: 'interval', intervalDays: 3, dueTime: '13:00', startDate: '2026-04-25T06:00:00.000Z', priority: 1, baseScore: 24, qualityWeight: 0.2, autoSchedule: true },
    { id: 'task-paper', roleId: 'role-work', dimensionId: 'dim-knowledge', title: 'یادداشت پژوهشی برای گسترش دانش', estimatedMinutes: 60, recurrenceType: 'weekly', intervalDays: 7, dueTime: '17:00', startDate: '2026-04-23T06:00:00.000Z', priority: 2, baseScore: 20, qualityWeight: 0.25, autoSchedule: true },
    { id: 'task-dishes', roleId: 'role-home', dimensionId: 'dim-kitchen', title: 'چیدن ظرف ها در ظرفشویی', estimatedMinutes: 25, recurrenceType: 'daily', dueTime: '21:00', startDate: '2026-04-27T06:00:00.000Z', priority: 1, baseScore: 10, qualityWeight: 0.1, autoSchedule: true },
    { id: 'task-laundry', roleId: 'role-home', dimensionId: 'dim-laundry', title: 'شستن و پهن کردن لباس ها', estimatedMinutes: 45, recurrenceType: 'interval', intervalDays: 2, dueTime: '16:30', startDate: '2026-04-26T06:00:00.000Z', priority: 2, baseScore: 14, qualityWeight: 0.15, autoSchedule: true },
    { id: 'task-call-spouse', roleId: 'role-relationship', dimensionId: 'dim-relationship', title: 'تماس عاطفی روزانه', estimatedMinutes: 20, recurrenceType: 'daily', dueTime: '22:00', startDate: '2026-04-27T06:00:00.000Z', priority: 2, baseScore: 13, qualityWeight: 0.25, autoSchedule: true },
    { id: 'task-business-review', roleId: 'role-business', dimensionId: 'dim-business', title: 'مرور پروژه طراحی سازه', estimatedMinutes: 75, recurrenceType: 'weekly', intervalDays: 7, dueTime: '14:00', startDate: '2026-04-24T06:00:00.000Z', priority: 1, baseScore: 22, qualityWeight: 0.2, autoSchedule: true },
    { id: 'task-walk', roleId: 'role-self', dimensionId: 'dim-health', title: 'پیاده روی و تنفس', estimatedMinutes: 40, recurrenceType: 'daily', dueTime: '07:30', startDate: '2026-04-27T06:00:00.000Z', priority: 1, baseScore: 16, qualityWeight: 0.2, autoSchedule: true },
    { id: 'task-parents', roleId: 'role-family', dimensionId: 'dim-parents', title: 'تماس با پدر و مادر', estimatedMinutes: 25, recurrenceType: 'interval', intervalDays: 2, dueTime: '19:30', startDate: '2026-04-27T06:00:00.000Z', priority: 2, baseScore: 15, qualityWeight: 0.2, autoSchedule: true },
  ],
  completions: [],
  dailyScores: [],
  certificates: [],
  quotes,
  settings: {
    onboarded: false,
    selectedRoleIds: [],
  },
};
