import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton, Pill, ProgressBar, SectionCard, SectionTitle } from './components/ui';
import { usePersistentAppState } from './hooks/usePersistentAppState';
import { theme } from './theme';
import { AccountabilityRelationKind, DailyCheck, Patient, PlanItemStatus, Role, RoutineReviewDecision } from './types/domain';
import { formatCompactDate, formatDateLabel, formatTime, toDateKey } from './utils/date';
import { getStatusTone } from './utils/scoring';

const roleImages = {
  self: require('../assets/roles/ic_personalgrowth.png'),
  mission: require('../assets/roles/ic_employee.png'),
  manager: require('../assets/roles/ic_selfbusiness.png'),
  parentCare: require('../assets/roles/ic_parentcare.png'),
  relationship: require('../assets/roles/ic_relationship.png'),
  home: require('../assets/roles/ic_housekeeping.png'),
  childCare: require('../assets/roles/ic_mother.png'),
  petOwner: require('../assets/roles/ic_pet.png'),
  finance: require('../assets/roles/ic_finance.png'),
  gardener: require('../assets/roles/ic_gardener.png'),
  driver: require('../assets/roles/ic_driver.png'),
  programBuilder: require('../assets/roles/ic_selfbusiness.png'),
};

const pinImage = require('../assets/roles/pin.png');

function roleImageFor(roleKey: string) {
  const normalizedKey = roleKey.startsWith('childCare-') ? 'childCare' : roleKey;
  return roleImages[normalizedKey as keyof typeof roleImages] ?? roleImages.self;
}

type LifeRoleKey = 'self' | 'mission' | 'manager';
type HomeRoleKey = string;
type OnboardingMode = 'none' | 'questionnaire' | 'roleList';
type RelationshipStatus = 'single' | 'married' | 'relationship';
type EmploymentStatus = 'employed' | 'unemployed' | '';
type AddPlanMode = 'none' | 'existing' | 'custom';
type RoleTaskStatus = 'overdue' | 'done' | 'upcoming';
type QualityLabel = 'بسیار خوب' | 'خوب' | 'نسبتاً خوب' | 'قابل قبول' | 'انجام مجدد';
type ShareAccessRole = 'ناظر' | 'مدیر' | 'همکار' | 'انجام‌دهنده';
type ScheduleUnit = 'روز' | 'هفته' | 'ماه';
type AdherenceWindow = 'daily' | 'weekly' | 'monthly' | 'all';
type AuthMode = 'login' | 'register';
interface LifeRoleOption {
  key: LifeRoleKey;
  titleFa: string;
  titleEn: string;
  subtitleFa: string;
  subtitleEn: string;
  mappedRole: Role;
  color: string;
}

const lifeRoleOptions: LifeRoleOption[] = [
  {
    key: 'self',
    titleFa: 'خود',
    titleEn: 'Self',
    subtitleFa: 'رشد فردی و سلامتی',
    subtitleEn: 'Personal growth and wellness',
    mappedRole: 'planner_member',
    color: theme.colors.success,
  },
  {
    key: 'mission',
    titleFa: 'وظیفه‌پذیر',
    titleEn: 'Executor',
    subtitleFa: 'وظایف دریافتی',
    subtitleEn: 'Received duties',
    mappedRole: 'planner_member',
    color: theme.colors.primary,
  },
  {
    key: 'manager',
    titleFa: 'مدیر',
    titleEn: 'Manager',
    subtitleFa: 'وظایف مدیریتی',
    subtitleEn: 'Management duties',
    mappedRole: 'planner_observer',
    color: theme.colors.secondary,
  },
];

interface HomeRoleOption {
  key: HomeRoleKey;
  titleFa: string;
  titleEn: string;
  responsibilityFa: string;
  responsibilityEn: string;
  color: string;
  mappedRole: Role;
}

interface DemoAuthProfile {
  firstName: string;
  lastName: string;
  mobile: string;
  email: string;
  password: string;
}

const roleColors = {
  relationship: '#d74b4b',
  parentCare: '#f08a34',
  childCare: '#e47aa4',
  petOwner: '#8a5a3c',
  home: '#7c5cc4',
  finance: '#7f8790',
  mission: '#d8a900',
  self: '#36a66a',
  gardener: '#20a7a0',
  driver: '#3f6f95',
  programBuilder: '#2f6f8f',
};

const programBuilderRole: HomeRoleOption = {
  key: 'programBuilder',
  titleFa: 'برنامه‌ساز',
  titleEn: 'Program builder',
  responsibilityFa: 'ساخت و پایش برنامه برای رهجو',
  responsibilityEn: 'Create and monitor plans for learners',
  color: roleColors.programBuilder,
  mappedRole: 'planner_member',
};

const homeRoleOptions: HomeRoleOption[] = [
  {
    key: 'self',
    titleFa: 'خودم',
    titleEn: 'Myself',
    responsibilityFa: 'رشد و سلامت فردی',
    responsibilityEn: 'Self-care',
    color: roleColors.self,
    mappedRole: 'planner_member',
  },
  {
    key: 'parentCare',
    titleFa: 'فرزند',
    titleEn: 'Child',
    responsibilityFa: 'رسیدگی به پدر/مادر',
    responsibilityEn: 'Caring for parents',
    color: roleColors.parentCare,
    mappedRole: 'planner_member',
  },
  {
    key: 'relationship',
    titleFa: 'شریک عاطفی',
    titleEn: 'Emotional partner',
    responsibilityFa: 'استحکام رابطه عاطفی',
    responsibilityEn: 'Strengthening the relationship',
    color: roleColors.relationship,
    mappedRole: 'planner_member',
  },
  {
    key: 'mission',
    titleFa: 'کارآفرین/کارمند',
    titleEn: 'Employee / Entrepreneur',
    responsibilityFa: 'انجام امور کاری',
    responsibilityEn: 'Work responsibilities',
    color: roleColors.mission,
    mappedRole: 'planner_member',
  },
  {
    key: 'home',
    titleFa: 'مدیرخانه',
    titleEn: 'Home manager',
    responsibilityFa: 'انجام کارهای خانه',
    responsibilityEn: 'Home tasks',
    color: roleColors.home,
    mappedRole: 'planner_member',
  },
  {
    key: 'childCare',
    titleFa: 'والد',
    titleEn: 'Parent',
    responsibilityFa: 'رسیدگی به فرزند',
    responsibilityEn: 'Child care',
    color: roleColors.childCare,
    mappedRole: 'planner_member',
  },
  {
    key: 'petOwner',
    titleFa: 'نگهدارنده حیوان خانگی',
    titleEn: 'Pet owner',
    responsibilityFa: 'نگهداری از حیوانات خانگی',
    responsibilityEn: 'Pet care',
    color: roleColors.petOwner,
    mappedRole: 'planner_member',
  },
  {
    key: 'finance',
    titleFa: 'مدیر مالی',
    titleEn: 'Financial manager',
    responsibilityFa: 'ارتقا مالی',
    responsibilityEn: 'Financial growth',
    color: roleColors.finance,
    mappedRole: 'planner_member',
  },
  {
    key: 'gardener',
    titleFa: 'باغبان',
    titleEn: 'Gardener',
    responsibilityFa: 'نگهداری از گیاهان',
    responsibilityEn: 'Plant care',
    color: roleColors.gardener,
    mappedRole: 'planner_member',
  },
  {
    key: 'driver',
    titleFa: 'راننده',
    titleEn: 'Driver',
    responsibilityFa: 'امور رفت‌وآمد و خودرو',
    responsibilityEn: 'Driving and car duties',
    color: roleColors.driver,
    mappedRole: 'planner_member',
  },
];

const pinnedShortcuts: Array<{ id: string; roleKey: LifeRoleKey; titleFa: string; titleEn: string; routeRole: Role }> = [
  { id: 'shortcut-skin', roleKey: 'self', titleFa: 'روتین پوستی دکتر منصوری', titleEn: 'Dr. Mansouri skin routine', routeRole: 'patient' },
  { id: 'shortcut-company', roleKey: 'manager', titleFa: 'کارتابل شرکت', titleEn: 'Company queue', routeRole: 'planner_observer' },
  { id: 'shortcut-missions', roleKey: 'mission', titleFa: 'وظایف امروز', titleEn: "Today's duties", routeRole: 'planner_member' },
];

const dailyMessages = [
  'روزت را دریاب؛ این روز از آن توست، آن را زندگی کن. مارگوت بیکل',
  'ما همان چیزی هستیم که مکرر انجام می‌دهیم؛ برتری یک عادت است. ارسطو',
  'لازم نیست عالی باشی تا شروع کنی، اما باید شروع کنی تا عالی شوی. زیگ زیگلار',
  'آینده به کاری بستگی دارد که امروز انجام می‌دهی. مهاتما گاندی',
  'موفقیت جمع قدم‌های کوچک است که هر روز تکرار می‌شوند. رابرت کولیر',
];

const drMansouriProgramSamples = [
  ['DM-RJ-01', 'جوانسازی', 'روتین پایه جوانسازی', 'دکتر منصوری', 'رایگان'],
  ['DM-RJ-02', 'جوانسازی', 'لک و شفافیت پوست', 'دکتر منصوری', 'رایگان'],
  ['DM-RJ-03', 'جوانسازی', 'چروک‌های سطحی', 'دکتر منصوری', 'رایگان'],
  ['DM-BU-01', 'سوختگی', 'سوختگی نوع ۱', 'دکتر منصوری', 'رایگان'],
  ['DM-BU-02', 'سوختگی', 'سوختگی نوع ۲', 'دکتر منصوری', '۳۰۰۰۰۰ تومان'],
  ['DM-BU-03', 'سوختگی', 'سوختگی نوع ۳', 'دکتر منصوری', '۵۰۰۰۰۰ تومان'],
  ['DM-HL-01', 'ریزش مو', 'ریزش منتشر', 'دکتر منصوری', 'رایگان'],
  ['DM-HL-02', 'ریزش مو', 'ریزش الگوی زنانه/مردانه', 'دکتر منصوری', 'رایگان'],
  ['DM-HL-03', 'ریزش مو', 'ریزش پس از استرس یا بیماری', 'دکتر منصوری', 'رایگان'],
];

const skincareTaskSamples = [
  ['شستن صورت با صابون مخصوص', 'دو روز یکبار', '۷:۰۰', ''],
  ['تونر', 'روزانه', '۷:۰۰', ''],
  ['آبرسان', 'روز یکبار ۳', '۷:۰۰', ''],
  ['مرطوب کننده', 'روزانه', '۷:۰۰', ''],
  ['ضدآفتاب', 'روزانه', '', ''],
  ['تمدید ضد آفتاب', 'روزانه', '', ''],
  ['شستن صورت', 'روزانه', '۲۰:۰۰', ''],
  ['مرطوب کننده', 'روزانه', '۲۰:۰۰', ''],
  ['کرم دور چشم', 'روزانه', '۲۲:۰۰', ''],
];

const programBuilderSamples = [
  {
    category: 'جوانسازی',
    subcategories: ['روتین پایه', 'لک و شفافیت', 'چروک‌های سطحی'],
    samplePlan: 'روتین جوانسازی پایه: پاکسازی ملایم، مرطوب‌کننده، ضدآفتاب و پیگیری هفتگی تحمل پوست.',
  },
  {
    category: 'سوختگی',
    subcategories: ['سوختگی نوع ۱', 'سوختگی نوع ۲', 'سوختگی نوع ۳'],
    samplePlan: 'سوختگی نوع ۱: خنک‌سازی اولیه، شست‌وشوی ملایم، پانسمان سبک در صورت نیاز و هشدار ارجاع در درد شدید یا تاول گسترده.',
  },
  {
    category: 'ریزش مو',
    subcategories: ['ریزش منتشر', 'ریزش الگوی مردانه/زنانه', 'ریزش پس از استرس یا بیماری'],
    samplePlan: 'ریزش منتشر: ثبت عکس ماهانه، بررسی محرک‌ها، پیگیری مصرف منظم درمان تجویزی و ثبت عوارض.',
  },
];

const shareAccessDescriptions: Record<ShareAccessRole, string> = {
  ناظر: 'دوست من است و می‌خواهم فقط بر انجام کارهایم نظارت داشته باشد. اجازه تغییر در هیچ آیتمی را ندارد.',
  مدیر: 'کیفیت انجام کارها را اگر مورد تأییدش نبود، می‌تواند تغییر دهد.',
  همکار: 'قرار است این کارها را با هم انجام دهیم. به تمام آیتم‌های لیست دسترسی دارد.',
  'انجام‌دهنده': 'قرار است کارها را او انجام دهد و من مدیریت کنم. من می‌توانم کیفیت را تأیید کرده یا تغییر دهم.',
};

const shareAccessRoles: Array<[ShareAccessRole, string]> = [
  ['ناظر', shareAccessDescriptions['ناظر']],
  ['مدیر', 'کیفیت انجام کارها را اگر مورد تاییدش نبود، می‌تواند تغییر دهد'],
  ['همکار', 'قرار است این کارها را با هم انجام دهیم و به تمام آیتم‌های لیست دسترسی دارد'],
  ['انجام‌دهنده', 'قرار است کارها را او انجام دهد و من مدیریت کنم، می‌توانم کیفیت را تایید کرده یا تغییر دهم'],
];

const qualityScores: Record<QualityLabel, number> = {
  'بسیار خوب': 100,
  خوب: 75,
  'نسبتاً خوب': 50,
  'قابل قبول': 25,
  'انجام مجدد': 0,
};

const qualityEmojis: Record<QualityLabel, string> = {
  'بسیار خوب': '★★★★★',
  خوب: '★★★★',
  'نسبتاً خوب': '★★★',
  'قابل قبول': '★★',
  'انجام مجدد': 'انجام مجدد!',
};

const builderTargetRoles = [
  'استحکام رابطه عاطفی',
  'رسیدگی به پدر/مادر',
  'رسیدگی به فرزند',
  'نگهداری از حیوانات خانگی',
  'انجام کارهای خانه',
  'نگهداری از گل و گیاه',
  'ارتقا مالی',
  'انجام امور کاری',
  'رشد و سلامت فردی',
];

interface RoleTask {
  id: string;
  title: string;
  frequency: string;
  endTime: string;
  startDate?: string;
  status: RoleTaskStatus;
  completedAt: string | null;
  quality: QualityLabel | null;
  baseTitle?: string;
  scheduleLabel?: string;
  instanceIndex?: number;
  autoAlert?: boolean;
}

interface RolePlan {
  id: string;
  roleKey: HomeRoleKey;
  title: string;
  source: 'sample' | 'custom';
  tasks: RoleTask[];
  pinned?: boolean;
  archived?: boolean;
}

interface ProgramBuilderItem {
  id: string;
  title: string;
  description: string;
}

interface ProgramBuilderTemplate {
  id: string;
  itemId: string;
  title: string;
  targetRolePurpose: string;
  tasks: RoleTask[];
}

interface ProgramBuilderLearner {
  id: string;
  templateId: string;
  firstName: string;
  lastName: string;
  mobile: string;
  adherencePercent: number;
}

interface ProgramBuilderComment {
  id: string;
  learnerId: string;
  templateId: string;
  author: string;
  text: string;
  createdAt: string;
}

const roleQuestionCount = 11;
const persianWeekdays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

const initialTaskDraft = {
  title: '',
  repeatCount: '',
  windowQuantity: '',
  windowUnit: 'روز' as ScheduleUnit,
  durationQuantity: '',
  durationUnit: 'روز' as ScheduleUnit,
  firstDate: '',
  deadlineTime: '',
  weekdays: persianWeekdays,
  autoAlert: false,
};

type TaskDraft = typeof initialTaskDraft;

const initialRoleQuestionnaire = {
  age: '',
  gender: '',
  relationshipStatus: '' as RelationshipStatus | '',
  caresForFather: false,
  caresForMother: false,
  caresForChild: false,
  childrenCount: '',
  childrenNames: '',
  caresForPet: false,
  petsCount: '',
  caresForPlants: false,
  managesHome: false,
  managesFinance: false,
  employmentStatus: '' as EmploymentStatus,
  hasSharedPlans: false,
};

const demoCredentials = {
  admin: { email: 'admin@lifemaker.local', password: 'admin123' },
  doctor_staff: { email: 'doctor@lifemaker.local', password: 'doctor123' },
  patient: { phone: '09120000001' },
  planner_member: { email: 'leila@lifemaker.local', password: 'plan123' },
  planner_observer: { email: 'shima@lifemaker.local', password: 'observe123' },
};

let currentLanguage: 'fa' | 'en' = 'fa';
const bi = (fa: string, en: string) => (currentLanguage === 'fa' ? fa : en);
const roleLabel = (role: Role) => {
  if (role === 'admin') return bi('ادمین', 'Admin');
  if (role === 'doctor_staff') return bi('پزشک یا منشی', 'Doctor / Staff');
  if (role === 'planner_member') return bi('کاربر پلن', 'Planner member');
  if (role === 'planner_observer') return bi('ناظر', 'Observer');
  return bi('بیمار', 'Patient');
};

const relationKindLabel = (kind: AccountabilityRelationKind) => {
  if (kind === 'friend') return bi('دوست / همراه', 'Friend / partner');
  if (kind === 'team_observer') return bi('ناظر تیمی', 'Team observer');
  return bi('مدیر / ناظر سازمانی', 'Manager');
};

const reviewDecisionLabel = (decision: RoutineReviewDecision) => (decision === 'approved' ? bi('تایید شد', 'Approved') : bi('رد شد', 'Rejected'));

function translateSeedText(value: string) {
  if (currentLanguage === 'en') return value;

  const dictionary: Record<string, string> = {
    'Life Maker Clinic': 'کلینیک لایف میکر',
    'Platform Admin': 'ادمین سامانه',
    'Superficial partial-thickness burn on forearm': 'سوختگی سطحی-نسبی روی ساعد',
    'Demo outpatient burn-care plan. Escalate urgently if redness spreads, pain sharply worsens, fever develops, bad odor appears, or the burn involves face, hands, feet, genitals, or a large area.': 'پلن دمو برای مراقبت سرپایی سوختگی. اگر قرمزی گسترش یافت، درد شدیدتر شد، تب ایجاد شد، بوی بد یا ترشح ظاهر شد، یا سوختگی در صورت، دست، پا، ناحیه تناسلی یا سطح وسیع بود، باید فوری ارجاع شود.',
    'Hypertension': 'فشار خون بالا',
    'Medication adherence has been inconsistent.': 'پایبندی دارویی ناپایدار بوده است.',
    'Physiotherapy follow-up': 'پیگیری فیزیوتراپی',
    'Active plan but has not checked in yet.': 'پلن فعال دارد اما هنوز هیچ چکی ثبت نکرده است.',
    'Outpatient Burn Dressing Plan': 'پلن سرپایی پانسمان سوختگی',
    'Blood Pressure Control Plan': 'پلن کنترل فشار خون',
    'Mobility Restart Plan': 'پلن شروع دوباره تحرک',
    'Morning gentle wound cleansing': 'شست‌وشوی ملایم صبحگاهی زخم',
    'Once daily: wash hands, then gently rinse the burn with clean lukewarm water or sterile saline and pat dry with clean gauze. Do not scrub the wound.': 'روزی یک بار: ابتدا دست‌ها را بشویید، سپس سوختگی را با آب ولرم تمیز یا سرم شست‌وشو به‌آرامی پاک کنید و با گاز تمیز خشک کنید. زخم را نسابید.',
    'Apply thin antibiotic ointment layer': 'مالیدن لایه نازک پماد آنتی‌بیوتیک',
    'After cleansing, apply a thin layer of the prescribed burn ointment such as bacitracin. For this demo, record it morning and evening if the clinician ordered twice-daily use.': 'بعد از شست‌وشو، یک لایه نازک از پماد تجویزی سوختگی مثل باسیتراسین بمالید. در این دمو اگر پزشک مصرف دوبار در روز خواسته، صبح و شب ثبت شود.',
    'Change non-stick dressing': 'تعویض پانسمان غیرچسبنده',
    'Place a nonadherent dressing and light gauze after ointment. Change every 24 hours, or sooner if the dressing becomes wet, dirty, or loose.': 'پس از پماد، پانسمان غیرچسبنده و گاز سبک بگذارید. هر ۲۴ ساعت تعویض شود یا اگر خیس، آلوده یا شل شد زودتر عوض شود.',
    'Evening ointment and infection check': 'پماد شبانه و بررسی عفونت',
    'Evening review: reapply the prescribed ointment only if the clinician directed twice-daily use, and check for spreading redness, swelling, odor, pus, or fever.': 'بررسی شبانه: فقط اگر پزشک مصرف دوبار در روز دستور داده، پماد دوباره استفاده شود و از نظر قرمزی منتشر، تورم، بو، چرک یا تب بررسی شود.',
    'Take blood pressure medication': 'مصرف داروی فشار خون',
    'Take after breakfast.': 'بعد از صبحانه مصرف شود.',
    'Check blood pressure': 'اندازه‌گیری فشار خون',
    'Record reading and rest first.': 'ابتدا استراحت کند و سپس عدد فشار ثبت شود.',
    'Stretching session': 'جلسه کشش',
    '5 guided stretches for lower back.': '۵ حرکت کششی هدایت‌شده برای کمر.',
    'Short walk': 'پیاده‌روی کوتاه',
    'Walk indoors for 10 minutes.': '۱۰ دقیقه در فضای داخل خانه راه برود.',
    'Staff called patient after low adherence trend.': 'پس از روند پایبندی پایین، منشی با بیمار تماس گرفت.',
    'Medication Adherence Plan': 'پلن پایبندی دارویی',
  };

  return dictionary[value] ?? value;
}

export function LifestyleApp() {
  const { width } = useWindowDimensions();
  const isWide = width >= 1024;
  const [activeLifeRole, setActiveLifeRole] = useState<LifeRoleKey>('self');
  const [selectedHomeRoleKey, setSelectedHomeRoleKey] = useState<HomeRoleKey>('self');
  const [onboardingMode, setOnboardingMode] = useState<OnboardingMode>('none');
  const [activeHomeRoleKeys, setActiveHomeRoleKeys] = useState<HomeRoleKey[]>(['self']);
  const [roleQuestionnaire, setRoleQuestionnaire] = useState(initialRoleQuestionnaire);
  const [roleQuestionnaireSummary, setRoleQuestionnaireSummary] = useState('');
  const [planBuilderMode, setPlanBuilderMode] = useState<'choice' | 'existing' | 'custom'>('choice');
  const [activePlanTab, setActivePlanTab] = useState<'home' | 'skin'>('home');
  const [addPlanMode, setAddPlanMode] = useState<AddPlanMode>('none');
  const [expandedTaskStatus, setExpandedTaskStatus] = useState<RoleTaskStatus | null>(null);
  const [selectedRolePlanId, setSelectedRolePlanId] = useState<string | null>(null);
  const [rolePlans, setRolePlans] = useState<RolePlan[]>(() => {
    if (typeof localStorage === 'undefined') return [];
    const rawPlans = localStorage.getItem('lifeMakerRolePlans');
    return rawPlans ? JSON.parse(rawPlans) as RolePlan[] : [];
  });
  const [isPlanEditing, setIsPlanEditing] = useState(false);
  const [customPlanName, setCustomPlanName] = useState('');
  const [programFilters, setProgramFilters] = useState({ code: '', category: '', name: '', provider: '', cost: '' });
  const [taskDraft, setTaskDraft] = useState({
    ...initialTaskDraft,
  });
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authProfile, setAuthProfile] = useState<DemoAuthProfile>(() => {
    if (typeof localStorage === 'undefined') return { firstName: '', lastName: '', mobile: '', email: '', password: '' };
    const raw = localStorage.getItem('lifeMakerAuthProfile');
    return raw ? JSON.parse(raw) as DemoAuthProfile : { firstName: '', lastName: '', mobile: '', email: '', password: '' };
  });
  const [authDraft, setAuthDraft] = useState<DemoAuthProfile>(() => ({
    firstName: authProfile.firstName,
    lastName: authProfile.lastName,
    mobile: authProfile.mobile,
    email: authProfile.email,
    password: authProfile.password,
  }));
  const [isDemoAuthenticated, setIsDemoAuthenticated] = useState(() => (typeof localStorage !== 'undefined' ? localStorage.getItem('lifeMakerLoggedIn') === 'true' : false));
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  const [costRange, setCostRange] = useState({ min: '', max: '' });
  const [builderTargetRole, setBuilderTargetRole] = useState(builderTargetRoles[8]);
  const [userProfile, setUserProfile] = useState({ name: '', mobile: '' });
  const [showTodayTasks, setShowTodayTasks] = useState(false);
  const [openQualityTaskId, setOpenQualityTaskId] = useState<string | null>(null);
  const [showShareRoleMenu, setShowShareRoleMenu] = useState(false);
  const [adherenceWindow, setAdherenceWindow] = useState<AdherenceWindow>('daily');
  const [showBuilderLearners, setShowBuilderLearners] = useState(false);
  const [shareDraft, setShareDraft] = useState({ name: '', role: 'ناظر' as ShareAccessRole });
  const [sharedPeople, setSharedPeople] = useState<Array<{ id: string; name: string; role: ShareAccessRole }>>([]);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [builderItems, setBuilderItems] = useState<ProgramBuilderItem[]>([]);
  const [builderItemDraft, setBuilderItemDraft] = useState({ title: '', description: '' });
  const [showBuilderItemForm, setShowBuilderItemForm] = useState(false);
  const [selectedBuilderItemId, setSelectedBuilderItemId] = useState<string | null>(null);
  const [builderTemplates, setBuilderTemplates] = useState<ProgramBuilderTemplate[]>([]);
  const [selectedBuilderTemplateId, setSelectedBuilderTemplateId] = useState<string | null>(null);
  const [showBuilderTargetMenu, setShowBuilderTargetMenu] = useState(false);
  const [builderLearners, setBuilderLearners] = useState<ProgramBuilderLearner[]>([]);
  const [builderLearnerDraft, setBuilderLearnerDraft] = useState({ firstName: '', lastName: '', mobile: '' });
  const [builderLearnerFilters, setBuilderLearnerFilters] = useState({ firstName: '', lastName: '', adherence: '' });
  const [builderGlobalLearnerQuery, setBuilderGlobalLearnerQuery] = useState('');
  const [builderSavedLearnerQuery, setBuilderSavedLearnerQuery] = useState('');
  const [selectedBuilderLearnerId, setSelectedBuilderLearnerId] = useState<string | null>(null);
  const [builderComments, setBuilderComments] = useState<ProgramBuilderComment[]>([]);
  const [builderCommentDraft, setBuilderCommentDraft] = useState('');
  const [customHomeRoles, setCustomHomeRoles] = useState<HomeRoleOption[]>([]);
  const [customRoleDraft, setCustomRoleDraft] = useState({ title: '', description: '' });
  const [selectedRole, setSelectedRole] = useState<Role>('planner_member');
  const [email, setEmail] = useState(demoCredentials.planner_member.email);
  const [password, setPassword] = useState(demoCredentials.planner_member.password);
  const [patientPhone, setPatientPhone] = useState(demoCredentials.patient.phone);
  const [photoReview, setPhotoReview] = useState<{ patientId: string; uri: string; updatedAt: string } | null>(null);
  const [routineReviewNotes, setRoutineReviewNotes] = useState<Record<string, string>>({});
  const {
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
    getPlanDraft,
    getPrescriptionDraft,
    getRoutinePlanDraft,
    getPatientSummary,
    getActivePlanForPatient,
  } = usePersistentAppState();
  currentLanguage = state.language;

  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('lifeMakerAuthProfile', JSON.stringify(authProfile));
    localStorage.setItem('lifeMakerLoggedIn', String(isDemoAuthenticated));
  }, [authProfile, isDemoAuthenticated]);

  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('lifeMakerRolePlans', JSON.stringify(rolePlans));
  }, [rolePlans]);

  const patientPlanDraft = selectedPatient ? getPlanDraft(selectedPatient.id) : null;
  const patientPrescriptionDraft = selectedPatient ? getPrescriptionDraft(selectedPatient.id) : null;
  const plannerSession =
    state.currentSession && (state.currentSession.role === 'planner_member' || state.currentSession.role === 'planner_observer')
      ? state.currentSession
      : null;
  const routinePlanDraft = plannerSession?.role === 'planner_member' ? getRoutinePlanDraft(plannerSession.userId) : null;
  const selectedPatientPlan = selectedPatient ? getActivePlanForPatient(selectedPatient.id) : { plan: null, items: [] };
  const selectedPatientSummary = selectedPatient ? getPatientSummary(selectedPatient.id) : null;

  const patientProgress = useMemo(() => {
    if (patientTodayRows.length === 0) return 0;
    return Math.round((patientTodayRows.filter((row) => row.latestStatus === 'done').length / patientTodayRows.length) * 100);
  }, [patientTodayRows]);
  const localizedInputStyle = state.language === 'fa' ? styles.inputRtl : styles.inputLtr;
  const plannerObservers =
    plannerSession?.role === 'planner_member'
      ? plannerLinks
          .map((link) => ({
            link,
            user: state.users.find((entry) => entry.id === link.observerUserId) ?? null,
          }))
          .filter((entry) => entry.user)
      : [];
  const globalPendingRoutineReviews = state.routineChecks.filter((check) => {
    const task = state.routineTasks.find((entry) => entry.id === check.routineTaskId);
    if (!task?.observerUserId) return false;
    return !state.routineReviews.some((review) => review.routineCheckId === check.id && review.observerUserId === task.observerUserId);
  }).length;
  const activePanelTitle =
    state.currentSession?.role === 'planner_member'
      ? bi('برنامه امروز', 'Today Plan')
      : state.currentSession?.role === 'planner_observer'
        ? bi('پنل ناظر', 'Observer Panel')
        : state.currentSession?.role === 'patient'
          ? bi('پلن درمان من', 'My Care Plan')
          : state.currentSession?.role === 'admin'
            ? bi('پنل ادمین', 'Admin Panel')
            : bi('اقدام‌های درمان', 'Care Actions');
  const allHomeRoleOptions = [programBuilderRole, ...homeRoleOptions, ...customHomeRoles];
  const activeHomeRole = getHomeRoleDisplay(
    allHomeRoleOptions.find((role) => role.key === selectedHomeRoleKey) ?? homeRoleOptions[0],
  );
  const activeRoleColor = activeHomeRole.color;
  const activeRolePlans = rolePlans.filter((plan) => !plan.archived);
  const currentRolePlans = activeRolePlans.filter((plan) => plan.roleKey === selectedHomeRoleKey);
  const selectedRolePlan = selectedRolePlanId ? currentRolePlans.find((plan) => plan.id === selectedRolePlanId) ?? null : null;
  const aggregatedRoleTasks = currentRolePlans.flatMap((plan) => plan.tasks.map((task) => ({ plan, task })));
  const currentBuilderItem = selectedBuilderItemId ? builderItems.find((item) => item.id === selectedBuilderItemId) ?? null : null;
  const currentBuilderTemplates = selectedBuilderItemId ? builderTemplates.filter((template) => template.itemId === selectedBuilderItemId) : [];
  const selectedBuilderTemplate = selectedBuilderTemplateId ? currentBuilderTemplates.find((template) => template.id === selectedBuilderTemplateId) ?? null : null;
  const selectedBuilderLearner = selectedBuilderLearnerId ? builderLearners.find((learner) => learner.id === selectedBuilderLearnerId) ?? null : null;
  const selectedBuilderLearnerRecords = selectedBuilderLearner
    ? builderLearners.filter((learner) => learner.mobile === selectedBuilderLearner.mobile)
    : [];
  const globalBuilderLearners = Array.from(
    new Map(builderLearners.map((learner) => [learner.mobile, learner])).values(),
  ).filter((learner) => {
    const query = builderGlobalLearnerQuery.trim();
    if (!query) return true;
    return `${learner.firstName} ${learner.lastName} ${learner.mobile}`.includes(query);
  });
  const savedBuilderLearners = Array.from(
    new Map(builderLearners.map((learner) => [learner.mobile, learner])).values(),
  ).filter((learner) => {
    const query = builderSavedLearnerQuery.trim();
    if (!query) return true;
    return `${learner.firstName} ${learner.lastName} ${learner.mobile}`.includes(query);
  });
  const selectedBuilderTemplateLearners = selectedBuilderTemplate
    ? builderLearners
        .filter((learner) => learner.templateId === selectedBuilderTemplate.id)
        .filter((learner) =>
          learner.firstName.includes(builderLearnerFilters.firstName.trim()) &&
          learner.lastName.includes(builderLearnerFilters.lastName.trim()) &&
          String(learner.adherencePercent).includes(builderLearnerFilters.adherence.trim()),
        )
    : [];
  const costToNumber = (cost: string) => (cost.includes('رایگان') ? 0 : Number(cost.replace(/[^\d]/g, '')) || 0);
  const filteredPrograms = drMansouriProgramSamples.filter(([code, category, name, provider, cost]) => {
    const costNumber = costToNumber(cost);
    const min = costRange.min.trim() ? Number(costRange.min) : null;
    const max = costRange.max.trim() ? Number(costRange.max) : null;
    return code.includes(programFilters.code.trim()) &&
      category.includes(programFilters.category.trim()) &&
      name.includes(programFilters.name.trim()) &&
      provider.includes(programFilters.provider.trim()) &&
      cost.includes(programFilters.cost.trim()) &&
      (min === null || costNumber >= min) &&
      (max === null || costNumber <= max);
  });
  const dailyMessage = dailyMessages[new Date().getDate() % dailyMessages.length];
  const lifeMakerContacts = ['لیلا سامدی', 'رضا خراسانی', 'شیما ادیب', 'نوید کریمی'];
  const userDisplayName = `${authProfile.firstName} ${authProfile.lastName}`.trim() || authProfile.mobile || currentUser?.name || bi('کاربر مهمان', 'Guest user');
  const todayTaskRows = activeRolePlans.flatMap((plan) =>
    plan.tasks.map((task) => ({
      plan,
      task,
      role: allHomeRoleOptions.find((item) => item.key === plan.roleKey) ?? homeRoleOptions[0],
    })),
  ).sort((a, b) => {
    if (a.task.status === 'done' && b.task.status !== 'done') return 1;
    if (a.task.status !== 'done' && b.task.status === 'done') return -1;
    return a.task.endTime.localeCompare(b.task.endTime);
  });
  const pinnedPlans = activeRolePlans.filter((plan) => plan.pinned);
  const todayTaskCount = todayTaskRows.filter(({ task }) => task.status !== 'done').length;
  const childNameFields = Array.from({ length: Math.max(0, Number(roleQuestionnaire.childrenCount) || 0) }, (_, index) => roleQuestionnaire.childrenNames.split(/[,،]/)[index]?.trim() ?? '');
  const roleProgresses = activeHomeRoleKeys.map((roleKey) => {
    const plans = activeRolePlans.filter((plan) => plan.roleKey === roleKey);
    const tasks = plans.flatMap((plan) => plan.tasks);
    if (tasks.length === 0) return 0;
    return Math.round((tasks.filter((task) => task.status === 'done').length / tasks.length) * 100);
  });
  const progressMean = roleProgresses.length ? roleProgresses.reduce((sum, value) => sum + value, 0) / roleProgresses.length : 0;
  const progressStdDev = roleProgresses.length ? Math.sqrt(roleProgresses.reduce((sum, value) => sum + (value - progressMean) ** 2, 0) / roleProgresses.length) : 0;
  const lifeBalance = progressMean > 0 ? Math.max(0, Math.round((1 - progressStdDev / progressMean) * 100)) : 0;
  const adherenceChartLabels = adherenceWindow === 'daily'
    ? ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']
    : adherenceWindow === 'weekly'
      ? ['هفته ۱', 'هفته ۲', 'هفته ۳', 'هفته ۴']
      : adherenceWindow === 'monthly'
        ? ['ف', 'ا', 'خ', 'ت', 'م', 'ش', 'م', 'آ', 'آذ', 'د', 'ب', 'اس']
        : ['شروع', 'اکنون'];
  const adherenceChartValues = adherenceChartLabels.map((_, index) => {
    const base = selectedRolePlan ? planAdherence(selectedRolePlan) : roleAdherence();
    return Math.max(5, Math.min(100, base || [55, 70, 62, 80, 76, 66, 72][index % 7]));
  });
  const pieStops = activeHomeRoleKeys.length
    ? activeHomeRoleKeys.map((roleKey, index) => {
        const role = allHomeRoleOptions.find((item) => item.key === roleKey) ?? homeRoleOptions[0];
        const start = Math.round((index / activeHomeRoleKeys.length) * 100);
        const end = Math.round(((index + 1) / activeHomeRoleKeys.length) * 100);
        return `${role.color} ${start}% ${end}%`;
      }).join(', ')
    : `${theme.colors.muted} 0% 100%`;

  function getHomeRoleDisplay(role: HomeRoleOption) {
    if (role.key === 'relationship' && roleQuestionnaire.relationshipStatus === 'married') {
      return { ...role, titleFa: 'همسر' };
    }
    if (role.key === 'childCare') {
      const names = roleQuestionnaire.childrenNames.split(/[,،]/).map((name) => name.trim()).filter(Boolean);
      const childLabel = names.length > 1 ? names.join(' و ') : names[0];
      const parentLabel = roleQuestionnaire.gender === 'زن' ? 'مادر' : roleQuestionnaire.gender === 'مرد' ? 'پدر' : 'والد';
      if (childLabel) return { ...role, titleFa: `${parentLabel} ${childLabel}` };
    }
    return role;
  }

  function createSampleTasks(): RoleTask[] {
    return skincareTaskSamples.map(([title, frequency, endTime], index) => ({
      id: `sample-task-${Date.now()}-${index}`,
      title,
      frequency,
      endTime: endTime || '12:00',
      status: index < 2 ? 'done' : index < 5 ? 'upcoming' : 'overdue',
      completedAt: index < 2 ? formatTime(new Date(), state.language) : null,
      quality: index < 2 ? 'بسیار خوب' : null,
    }));
  }

  function normalizeTimeInput(value: string) {
    const digits = value.replace(/[^\d]/g, '');
    if (!digits) return '';
    if (digits.length <= 2) {
      const hour = Math.min(24, Number(digits));
      return `${String(hour).padStart(2, '0')}:00`;
    }
    const hour = Math.min(24, Number(digits.slice(0, 2)));
    const minute = hour === 24 ? 0 : Math.min(59, Number(digits.slice(2, 4).padEnd(2, '0')));
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  function addHoursToTime(time: string, hoursToAdd: number) {
    const [hourRaw, minuteRaw] = time.split(':');
    const startHour = Math.min(24, Number(hourRaw) || 0);
    const minute = Math.min(59, Number(minuteRaw) || 0);
    const totalMinutes = ((startHour * 60 + minute + hoursToAdd * 60) % (24 * 60) + 24 * 60) % (24 * 60);
    const hour = Math.floor(totalMinutes / 60);
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  function formatWindowLabel(days: number) {
    if (days === 1) return 'روز';
    if (days === 7) return 'هفته';
    if (days === 14) return 'دو هفته';
    if (days === 21) return 'سه هفته';
    if (days === 30) return 'ماه';
    if (days === 60) return 'دو ماه';
    if (days === 365) return 'سال';
    return `${days} روز`;
  }

  function formatRepeatLabel(repeatCount: number, windowQuantity: number) {
    const windowLabel = formatWindowLabel(windowQuantity);
    return repeatCount === 1 ? `هر ${windowLabel}` : `${repeatCount} بار در ${windowLabel}`;
  }

  function normalizePersianDigits(value: string) {
    const persian = '۰۱۲۳۴۵۶۷۸۹';
    const arabic = '٠١٢٣٤٥٦٧٨٩';
    return value.replace(/[۰-۹٠-٩]/g, (digit) => {
      const persianIndex = persian.indexOf(digit);
      if (persianIndex >= 0) return String(persianIndex);
      return String(arabic.indexOf(digit));
    });
  }

  function todayJalaliCompact() {
    const parts = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const year = normalizePersianDigits(parts.find((part) => part.type === 'year')?.value ?? '');
    const month = normalizePersianDigits(parts.find((part) => part.type === 'month')?.value ?? '');
    const day = normalizePersianDigits(parts.find((part) => part.type === 'day')?.value ?? '');
    return `${year}/${month}/${day}`;
  }

  function compactJalaliDate(value: string) {
    const digits = normalizePersianDigits(value).replace(/[^\d]/g, '');
    if (digits.length < 8) return '';
    return `${digits.slice(0, 4)}/${digits.slice(4, 6)}/${digits.slice(6, 8)}`;
  }

  function isFutureJalaliDate(value: string) {
    const date = compactJalaliDate(value);
    if (!date) return false;
    return date > todayJalaliCompact();
  }

  function formatWeekdayRule(weekdays: string[]) {
    const activeDays = weekdays.filter((day) => persianWeekdays.includes(day));
    if (activeDays.length === persianWeekdays.length) return '';
    const disabledDays = persianWeekdays.filter((day) => !activeDays.includes(day));
    if (disabledDays.length >= 1 && disabledDays.length <= 3) return `همه‌روزه به‌جز ${disabledDays.join(' و ')}`;
    return `فقط ${activeDays.join(' و ')}`;
  }

  function validateTaskDraftSchedule(draft: TaskDraft) {
    const repeatCount = Math.max(1, Number(draft.repeatCount) || 1);
    const windowQuantity = Math.max(1, Number(draft.windowQuantity) || 1);
    const activeDays = draft.weekdays.filter((day) => persianWeekdays.includes(day));
    if (activeDays.length === 0) return false;
    if (windowQuantity === 7 && activeDays.length < repeatCount) return false;
    return true;
  }

  function formatTaskFrequency(draft: TaskDraft) {
    const repeatCount = Math.max(1, Number(draft.repeatCount) || 1);
    const windowQuantity = Math.max(1, Number(draft.windowQuantity) || 1);
    const parts = [formatRepeatLabel(repeatCount, windowQuantity)];
    const duration = Number(normalizePersianDigits(draft.durationQuantity.trim()));
    if (duration > 0) parts.push(`به مدت ${duration} روز`);
    if (isFutureJalaliDate(draft.firstDate)) parts.push(`از ${draft.firstDate.trim()}`);
    const deadlineTime = normalizeTimeInput(draft.deadlineTime) || '24:00';
    if (deadlineTime !== '24:00') parts.push(`تا ${deadlineTime}`);
    const weekdayRule = formatWeekdayRule(draft.weekdays);
    if (weekdayRule) parts.push(weekdayRule);
    return parts.join('، ');
  }

  function createTasksFromDraft(): RoleTask[] | null {
    if (!validateTaskDraftSchedule(taskDraft)) {
      Alert.alert('برنامه ناسازگار است', 'تعداد روزهای مجاز با تعداد تکرار برنامه سازگار نیست.');
      return null;
    }
    const repeatCount = Math.max(1, Number(taskDraft.repeatCount) || 1);
    const windowQuantity = Math.max(1, Number(taskDraft.windowQuantity) || 1);
    const deadlineTime = normalizeTimeInput(taskDraft.deadlineTime) || '24:00';
    const intervalHours = repeatCount > 1 ? (24 * windowQuantity) / repeatCount : 0;
    const scheduleLabel = formatTaskFrequency(taskDraft);

    return Array.from({ length: repeatCount }, (_, index) => ({
      id: `role-task-${Date.now()}-${index}`,
      title: repeatCount > 1 ? `${taskDraft.title.trim()} - نوبت ${index + 1}` : taskDraft.title.trim(),
      baseTitle: taskDraft.title.trim(),
      frequency: scheduleLabel,
      scheduleLabel,
      instanceIndex: index + 1,
      autoAlert: taskDraft.autoAlert,
      startDate: taskDraft.firstDate.trim() || 'امروز',
      endTime: intervalHours ? addHoursToTime(deadlineTime, intervalHours * index) : deadlineTime,
      status: 'upcoming' as RoleTaskStatus,
      completedAt: null,
      quality: null,
    })).sort((a, b) => a.endTime.localeCompare(b.endTime));
  }

  function addRolePlan(title: string, source: RolePlan['source'], tasks: RoleTask[] = []) {
    const newPlan: RolePlan = {
      id: `role-plan-${Date.now()}`,
      roleKey: selectedHomeRoleKey,
      title,
      source,
      tasks,
      pinned: false,
    };
    setRolePlans((current) => [...current, newPlan]);
    setSelectedRolePlanId(newPlan.id);
    setIsPlanEditing(source === 'custom');
    setAddPlanMode('none');
    setCustomPlanName('');
  }

  function deleteRolePlan(planId: string) {
    setRolePlans((current) => current.filter((plan) => plan.id !== planId));
    if (selectedRolePlanId === planId) setSelectedRolePlanId(null);
    if (selectedRolePlanId === planId) setIsPlanEditing(false);
  }

  function archiveRolePlan(planId: string) {
    setRolePlans((current) => current.map((plan) => (plan.id === planId ? { ...plan, archived: true, pinned: false } : plan)));
    if (selectedRolePlanId === planId) setSelectedRolePlanId(null);
    if (selectedRolePlanId === planId) setIsPlanEditing(false);
  }

  function togglePlanPin(planId: string) {
    setRolePlans((current) => current.map((plan) => (plan.id === planId ? { ...plan, pinned: !plan.pinned } : plan)));
  }

  function openPinnedPlan(plan: RolePlan) {
    setSelectedHomeRoleKey(plan.roleKey);
    setSelectedRolePlanId(plan.id);
    setIsPlanEditing(false);
    loginAsPlanner(demoCredentials.planner_member.email, demoCredentials.planner_member.password, 'planner_member');
  }

  function submitAuth() {
    if (authMode === 'register') {
      if (!authDraft.firstName.trim() || !authDraft.lastName.trim() || !authDraft.mobile.trim() || !authDraft.email.trim() || !authDraft.password.trim()) {
        Alert.alert('ثبت‌نام ناقص است', 'نام، نام خانوادگی، موبایل، ایمیل و رمز عبور لازم است.');
        return;
      }
      setAuthProfile(authDraft);
      setIsDemoAuthenticated(true);
      return;
    }

    if (!authDraft.mobile.trim() || !authDraft.password.trim()) {
      Alert.alert('ورود ناقص است', 'شماره موبایل و رمز عبور را وارد کن.');
      return;
    }
    const savedMobile = authProfile.mobile.trim();
    const savedPassword = authProfile.password.trim();
    if (savedMobile && savedPassword && (authDraft.mobile.trim() !== savedMobile || authDraft.password.trim() !== savedPassword)) {
      Alert.alert('اطلاعات ورود درست نیست', 'برای نسخه دمو با همان موبایل و رمز ثبت‌نام‌شده وارد شو.');
      return;
    }
    setAuthProfile((current) => ({
      ...current,
      mobile: authDraft.mobile.trim(),
      password: authDraft.password.trim(),
    }));
    setIsDemoAuthenticated(true);
  }

  function demoLogout() {
    setIsDemoAuthenticated(false);
    setShowAccountMenu(false);
    setShowAccountDetails(false);
    logout();
  }

  function addBuilderItem() {
    if (!builderItemDraft.title.trim()) return;
    const item: ProgramBuilderItem = {
      id: `builder-item-${Date.now()}`,
      title: builderItemDraft.title.trim(),
      description: builderItemDraft.description.trim(),
    };
    setBuilderItems((current) => [...current, item]);
    setSelectedBuilderItemId(item.id);
    setBuilderItemDraft({ title: '', description: '' });
    setShowBuilderItemForm(false);
  }

  function addBuilderTemplate() {
    if (!selectedBuilderItemId || !customPlanName.trim()) return;
    const template: ProgramBuilderTemplate = {
      id: `builder-template-${Date.now()}`,
      itemId: selectedBuilderItemId,
      title: customPlanName.trim(),
      targetRolePurpose: builderTargetRole,
      tasks: [],
    };
    setBuilderTemplates((current) => [...current, template]);
    setSelectedBuilderTemplateId(template.id);
    setCustomPlanName('');
    setAddPlanMode('none');
    setIsPlanEditing(true);
  }

  function addTaskToBuilderTemplate() {
    if (!selectedBuilderTemplate || !taskDraft.title.trim()) return;
    const newTasks = createTasksFromDraft();
    if (!newTasks) return;
    setBuilderTemplates((current) =>
      current.map((template) =>
        template.id === selectedBuilderTemplate.id
          ? { ...template, tasks: [...template.tasks, ...newTasks].sort((a, b) => a.endTime.localeCompare(b.endTime)) }
          : template,
      ),
    );
    setTaskDraft({ ...initialTaskDraft });
  }

  function addExistingBuilderLearnerToTemplate(learner: ProgramBuilderLearner) {
    if (!selectedBuilderTemplate) return;
    const exists = builderLearners.some((item) => item.templateId === selectedBuilderTemplate.id && item.mobile === learner.mobile);
    if (exists) return;
    setBuilderLearners((current) => [
      ...current,
      {
        id: `builder-learner-${Date.now()}`,
        templateId: selectedBuilderTemplate.id,
        firstName: learner.firstName,
        lastName: learner.lastName,
        mobile: learner.mobile,
        adherencePercent: learner.adherencePercent,
      },
    ]);
  }

  function addBuilderLearner() {
    if (!selectedBuilderTemplate || !builderLearnerDraft.mobile.trim()) return;
    const learner: ProgramBuilderLearner = {
      id: `builder-learner-${Date.now()}`,
      templateId: selectedBuilderTemplate.id,
      firstName: builderLearnerDraft.firstName.trim() || 'رهجو',
      lastName: builderLearnerDraft.lastName.trim() || 'جدید',
      mobile: builderLearnerDraft.mobile.trim(),
      adherencePercent: Math.floor(35 + Math.random() * 60),
    };
    setBuilderLearners((current) => [...current, learner]);
    setBuilderLearnerDraft({ firstName: '', lastName: '', mobile: '' });
  }

  function addBuilderStandaloneLearner() {
    if (!builderLearnerDraft.mobile.trim()) return;
    const learner: ProgramBuilderLearner = {
      id: `builder-learner-${Date.now()}`,
      templateId: '',
      firstName: builderLearnerDraft.firstName.trim() || 'رهجو',
      lastName: builderLearnerDraft.lastName.trim() || 'جدید',
      mobile: builderLearnerDraft.mobile.trim(),
      adherencePercent: 0,
    };
    setBuilderLearners((current) => [...current, learner]);
    setBuilderLearnerDraft({ firstName: '', lastName: '', mobile: '' });
  }

  function addBuilderComment() {
    if (!selectedBuilderLearner || !selectedBuilderTemplate || !builderCommentDraft.trim()) return;
    const comment: ProgramBuilderComment = {
      id: `builder-comment-${Date.now()}`,
      learnerId: selectedBuilderLearner.id,
      templateId: selectedBuilderTemplate.id,
      author: userDisplayName,
      text: builderCommentDraft.trim(),
      createdAt: new Intl.DateTimeFormat('fa-IR-u-ca-persian', { dateStyle: 'short', timeStyle: 'short' }).format(new Date()),
    };
    setBuilderComments((current) => [comment, ...current]);
    setBuilderCommentDraft('');
  }

  function learnerTone(percent: number) {
    if (percent >= 85) return '#dff5e7';
    if (percent >= 55) return '#fff4cc';
    return '#ffe0df';
  }

  function templateForLearner(learner: ProgramBuilderLearner) {
    return builderTemplates.find((template) => template.id === learner.templateId) ?? null;
  }

  function itemForTemplate(template: ProgramBuilderTemplate | null) {
    return template ? builderItems.find((item) => item.id === template.itemId) ?? null : null;
  }

  function learnerNeedsFollowUp(learner: ProgramBuilderLearner) {
    const template = templateForLearner(learner);
    return learner.adherencePercent < 50 || Boolean(template?.tasks.some((task) => task.autoAlert));
  }

  function followUpMessage(learner: ProgramBuilderLearner) {
    const template = templateForLearner(learner);
    const alertTask = template?.tasks.find((task) => task.autoAlert);
    const taskTitle = alertTask?.baseTitle || alertTask?.title || template?.title || 'فعالیت پیگیری';
    return `پیگیری از ${userDisplayName}: ${taskTitle} را انجام بده`;
  }

  function addTaskToSelectedPlan() {
    if (!selectedRolePlan || !taskDraft.title.trim()) return;
    const newTasks = createTasksFromDraft();
    if (!newTasks) return;
    setRolePlans((current) =>
      current.map((plan) => (plan.id === selectedRolePlan.id ? { ...plan, tasks: [...plan.tasks, ...newTasks].sort((a, b) => {
        if (a.status === 'done' && b.status !== 'done') return 1;
        if (a.status !== 'done' && b.status === 'done') return -1;
        return a.endTime.localeCompare(b.endTime);
      }) } : plan)),
    );
    setTaskDraft({ ...initialTaskDraft });
  }

  function completeRoleTask(planId: string, taskId: string) {
    setRolePlans((current) =>
      current.map((plan) =>
        plan.id === planId
          ? {
              ...plan,
              tasks: plan.tasks.map((task) =>
                task.id === taskId
                  ? task.status === 'done'
                    ? { ...task, status: 'upcoming' as RoleTaskStatus, completedAt: null, quality: null }
                    : { ...task, status: 'done' as RoleTaskStatus, completedAt: formatTime(new Date(), state.language), quality: task.quality ?? 'بسیار خوب' }
                  : task,
              ).sort((a, b) => {
                if (a.status === 'done' && b.status !== 'done') return 1;
                if (a.status !== 'done' && b.status === 'done') return -1;
                return a.endTime.localeCompare(b.endTime);
              }),
            }
          : plan,
      ),
    );
  }

  function updateRoleTaskQuality(planId: string, taskId: string, quality: QualityLabel) {
    setRolePlans((current) =>
      current.map((plan) =>
        plan.id === planId
          ? { ...plan, tasks: plan.tasks.map((task) => (task.id === taskId ? { ...task, quality } : task)) }
          : plan,
      ),
    );
  }

  function addSharedPerson() {
    if (!shareDraft.name.trim()) return;
    setSharedPeople((current) => [...current, { id: `share-${Date.now()}`, name: shareDraft.name.trim(), role: shareDraft.role }]);
    setShareDraft({ name: '', role: 'ناظر' });
  }

  function updateChildName(index: number, value: string) {
    const names = [...childNameFields];
    names[index] = value;
    updateRoleQuestionnaire({ childrenNames: names.join('، ') });
  }

  function addCustomRole() {
    if (!customRoleDraft.title.trim()) return;
    const customRole: HomeRoleOption = {
      key: `custom-${Date.now()}`,
      titleFa: customRoleDraft.title.trim(),
      titleEn: customRoleDraft.title.trim(),
      responsibilityFa: customRoleDraft.description.trim() || 'نقش سفارشی',
      responsibilityEn: customRoleDraft.description.trim() || 'Custom role',
      color: roleColors.programBuilder,
      mappedRole: 'planner_member',
    };
    setCustomHomeRoles((current) => [...current, customRole]);
    setActiveHomeRoleKeys((current) => [...current, customRole.key]);
    setCustomRoleDraft({ title: '', description: '' });
    setRoleQuestionnaireSummary('نقش سفارشی اضافه شد. TODO: بارگذاری آیکن اختصاصی نقش در مرحله بعدی فعال می‌شود.');
  }

  function calculateTaskAdherence(task: RoleTask) {
    if (task.status !== 'done') return 0;
    const qualityScore = task.quality ? qualityScores[task.quality] : 100;
    // Product Decision Needed: negative TimePerformance is shown as-is until a clamp rule is approved.
    const timeScore = 100;
    return Math.round((qualityScore + timeScore) / 2);
  }

  function roleAdherence() {
    const doneTasks = aggregatedRoleTasks.filter(({ task }) => task.status === 'done');
    if (doneTasks.length === 0) return 0;
    return Math.round(doneTasks.reduce((sum, { task }) => sum + calculateTaskAdherence(task), 0) / doneTasks.length);
  }

  function planAdherence(plan: RolePlan | null) {
    const doneTasks = plan?.tasks.filter((task) => task.status === 'done') ?? [];
    if (doneTasks.length === 0) return 0;
    return Math.round(doneTasks.reduce((sum, task) => sum + calculateTaskAdherence(task), 0) / doneTasks.length);
  }

  function resolveUserName(userId: string | null | undefined) {
    if (!userId) return bi('بدون ناظر', 'No observer');
    return state.users.find((entry) => entry.id === userId)?.name ?? bi('نامشخص', 'Unknown');
  }

  function chooseRole(role: Role) {
    setSelectedRole(role);
    if (role === 'admin') {
      setEmail(demoCredentials.admin.email);
      setPassword(demoCredentials.admin.password);
    } else if (role === 'doctor_staff') {
      setEmail(demoCredentials.doctor_staff.email);
      setPassword(demoCredentials.doctor_staff.password);
    } else if (role === 'planner_member') {
      setEmail(demoCredentials.planner_member.email);
      setPassword(demoCredentials.planner_member.password);
    } else if (role === 'planner_observer') {
      setEmail(demoCredentials.planner_observer.email);
      setPassword(demoCredentials.planner_observer.password);
    } else {
      setPatientPhone(demoCredentials.patient.phone);
    }
  }

  function chooseLifeRole(roleKey: LifeRoleKey) {
    const option = lifeRoleOptions.find((item) => item.key === roleKey);
    if (!option) return;
    setActiveLifeRole(roleKey);
    chooseRole(option.mappedRole);
  }

  function enterHomeRole(role: HomeRoleOption) {
    const displayRole = getHomeRoleDisplay(role);
    setSelectedHomeRoleKey(displayRole.key);
    setAddPlanMode('none');
    setSelectedRolePlanId(null);
    setIsPlanEditing(false);
    setExpandedTaskStatus(null);
    if (role.key === 'self' || role.key === 'mission' || role.key === 'manager') {
      setActiveLifeRole(role.key);
    }

    if (role.mappedRole === 'planner_observer') {
      loginAsPlanner(demoCredentials.planner_observer.email, demoCredentials.planner_observer.password, 'planner_observer');
      return;
    }

    loginAsPlanner(demoCredentials.planner_member.email, demoCredentials.planner_member.password, 'planner_member');
  }

  function addActiveHomeRole(roleKey: HomeRoleKey) {
    setActiveHomeRoleKeys((current) => (current.includes(roleKey) ? current : [...current, roleKey]));
  }

  function updateRoleQuestionnaire(patch: Partial<typeof initialRoleQuestionnaire>) {
    setRoleQuestionnaire((current) => ({ ...current, ...patch }));
  }

  function generateRolesFromQuestionnaire() {
    const generated = new Set<HomeRoleKey>(['self']);
    const generatedCustomRoles: HomeRoleOption[] = [];
    if (roleQuestionnaire.relationshipStatus === 'married' || roleQuestionnaire.relationshipStatus === 'relationship') generated.add('relationship');
    if (roleQuestionnaire.caresForFather || roleQuestionnaire.caresForMother) generated.add('parentCare');
    if (roleQuestionnaire.caresForChild) {
      const childNames = childNameFields.map((name) => name.trim()).filter(Boolean);
      const parentLabel = roleQuestionnaire.gender === 'زن' ? 'مادر' : roleQuestionnaire.gender === 'مرد' ? 'پدر' : 'والد';
      if (childNames.length > 0) {
        childNames.forEach((name, index) => {
          const key = `childCare-${Date.now()}-${index}`;
          generated.add(key);
          generatedCustomRoles.push({
            key,
            titleFa: `${parentLabel} ${name}`,
            titleEn: `${parentLabel} ${name}`,
            responsibilityFa: 'رسیدگی به فرزند',
            responsibilityEn: 'Child care',
            color: roleColors.childCare,
            mappedRole: 'planner_member',
          });
        });
      } else {
        generated.add('childCare');
      }
    }
    if (roleQuestionnaire.caresForPet) generated.add('petOwner');
    if (roleQuestionnaire.caresForPlants) generated.add('gardener');
    if (roleQuestionnaire.managesHome) generated.add('home');
    if (roleQuestionnaire.managesFinance) generated.add('finance');
    if (roleQuestionnaire.employmentStatus === 'employed') generated.add('mission');

    const generatedRoles = Array.from(generated);
    if (generatedCustomRoles.length > 0) {
      setCustomHomeRoles((current) => [
        ...current.filter((role) => !role.key.startsWith('childCare-')),
        ...generatedCustomRoles,
      ]);
    }
    setActiveHomeRoleKeys(generatedRoles);
    setOnboardingMode('none');
    setRoleQuestionnaireSummary(
      bi(
        `${roleQuestionCount} سؤال بررسی شد و ${generatedRoles.length} نقش فعال شد. برنامه‌های مشترک فقط داخل پلن‌ها استفاده می‌شود و نقش جدا نمی‌سازد.`,
        `${roleQuestionCount} questions reviewed and ${generatedRoles.length} roles activated. Shared plans are handled inside plans and do not create a separate role.`,
      ),
    );
  }

  function showAddRolePrompt() {
    setOnboardingMode('none');
    setRoleQuestionnaireSummary('');
    requestAnimationFrame(() => setOnboardingMode('questionnaire'));
  }

  function openPinnedShortcut(shortcut: (typeof pinnedShortcuts)[number]) {
    setActiveLifeRole(shortcut.roleKey);
    chooseRole(shortcut.routeRole);
  }


  async function attachPrescriptionPhoto(mode: 'camera' | 'library') {
    if (!selectedPatient) return;

    if (mode === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(bi('دسترسی لازم است', 'Permission required'), bi('برای گرفتن عکس نسخه باید دسترسی دوربین را بدهی.', 'Camera permission is required to capture a prescription photo.'));
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setPhotoReview({
          patientId: selectedPatient.id,
          uri: result.assets[0].uri,
          updatedAt: new Date().toISOString(),
        });
      }
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(bi('دسترسی لازم است', 'Permission required'), bi('برای انتخاب عکس نسخه باید دسترسی گالری را بدهی.', 'Media library permission is required to choose a prescription photo.'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setPhotoReview({
        patientId: selectedPatient.id,
        uri: result.assets[0].uri,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  function renderAppHeader(kind: 'home' | 'role') {
    const today = new Date();
    const dateLocale = state.language === 'fa' ? 'fa-IR-u-ca-persian' : 'en-US';
    const dayAndDate = `${new Intl.DateTimeFormat(dateLocale, { weekday: 'long' }).format(today)}، ${new Intl.DateTimeFormat(dateLocale, { day: 'numeric', month: 'long' }).format(today)}`;
    return (
      <View style={styles.appHeaderWrap}>
        <View style={styles.appHeader}>
          <Pressable onPress={kind === 'home' ? () => setLanguage(state.language === 'fa' ? 'en' : 'fa') : logout} style={styles.headerIconButton}>
            <Text style={styles.headerIconText}>{kind === 'home' ? (state.language === 'fa' ? 'EN' : 'FA') : '⌂'}</Text>
          </Pressable>
          <Text style={styles.headerDate}>{dayAndDate}</Text>
          <Text style={styles.headerBrand}>Life Maker</Text>
          <Pressable onPress={() => setShowAccountMenu((value) => !value)} style={styles.headerAccount}>
            <Text style={styles.headerUserName} numberOfLines={1}>{userDisplayName}</Text>
            <Text style={styles.headerIconText}>◉</Text>
          </Pressable>
          <Text style={styles.cartIcon}>🛒</Text>
        </View>
        {showAccountMenu ? (
          <View style={styles.accountMenu}>
            <Pressable onPress={() => setShowAccountDetails((value) => !value)} style={styles.accountMenuItem}>
              <Text style={styles.itemTitle}>حساب کاربری</Text>
            </Pressable>
            {showAccountDetails ? (
              <View style={styles.accountDetails}>
                <Text style={styles.meta}>نام: {authProfile.firstName || '-'}</Text>
                <Text style={styles.meta}>نام خانوادگی: {authProfile.lastName || '-'}</Text>
                <Text style={styles.meta}>موبایل: {authProfile.mobile || '-'}</Text>
                <Text style={styles.meta}>ایمیل: {authProfile.email || '-'}</Text>
                <Text style={styles.meta}>تغییر رمز عبور: در نسخه دمو از صفحه ثبت‌نام دوباره تنظیم می‌شود.</Text>
              </View>
            ) : null}
            <Pressable onPress={demoLogout} style={styles.accountMenuItem}>
              <Text style={styles.itemTitle}>خروج</Text>
            </Pressable>
            <Pressable onPress={() => { setShowAccountMenu(false); loginAsStaff(demoCredentials.admin.email, demoCredentials.admin.password, 'admin'); }} style={styles.accountMenuItem}>
              <Text style={styles.itemTitle}>ورود ادمین دمو</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  }

  function renderProgramBuilderPanel() {
    return (
      <View style={styles.programBuilderPanel}>
        {!currentBuilderItem ? (
          <>
            <Text style={styles.rolePerformanceTitle}>طبقه‌بندی برنامه‌ها</Text>
            <Text style={styles.productDecisionText}>ابتدا طبقه‌بندی اصلی برنامه‌های خودت را بساز. هیچ آیتم پیش‌فرضی اضافه نشده است.</Text>
            <View style={styles.builderItemGrid}>
              {builderItems.map((item) => (
                <Pressable key={item.id} onPress={() => { setSelectedBuilderItemId(item.id); setSelectedBuilderTemplateId(null); setAddPlanMode('none'); }} style={styles.builderItemCard}>
                  <Text style={styles.builderItemTitle}>{item.title}</Text>
                  <Text style={styles.builderItemDescription}>{item.description || 'بدون توضیح'}</Text>
                </Pressable>
              ))}
              <Pressable onPress={() => setShowBuilderItemForm((value) => !value)} style={[styles.builderItemCard, styles.builderAddCard]}>
                <Text style={styles.homeAddPlus}>+</Text>
                <Text style={styles.builderItemTitle}>افزودن</Text>
              </Pressable>
            </View>
            {showBuilderItemForm ? (
              <View style={styles.planItemCard}>
                <TextInput value={builderItemDraft.title} onChangeText={(title) => setBuilderItemDraft((current) => ({ ...current, title }))} placeholder="نام آیتم" placeholderTextColor={theme.colors.muted} style={[styles.input, localizedInputStyle]} />
                <TextInput value={builderItemDraft.description} onChangeText={(description) => setBuilderItemDraft((current) => ({ ...current, description }))} placeholder="توضیح کوتاه" placeholderTextColor={theme.colors.muted} style={[styles.input, localizedInputStyle]} />
                <ActionButton label="افزودن آیتم" onPress={addBuilderItem} />
              </View>
            ) : null}
            <View style={styles.builderLearnerHomeCard}>
              <Text style={styles.metaStrong}>جستجو و مدیریت رهجوها</Text>
              <TextInput
                value={builderGlobalLearnerQuery}
                onChangeText={setBuilderGlobalLearnerQuery}
                placeholder="جستجو بر اساس نام، نام خانوادگی یا موبایل"
                placeholderTextColor={theme.colors.muted}
                style={[styles.input, localizedInputStyle]}
              />
              <View style={styles.scheduleGrid}>
                <TextInput value={builderLearnerDraft.firstName} onChangeText={(firstName) => setBuilderLearnerDraft((current) => ({ ...current, firstName }))} placeholder="نام رهجوی جدید" placeholderTextColor={theme.colors.muted} style={[styles.input, localizedInputStyle]} />
                <TextInput value={builderLearnerDraft.lastName} onChangeText={(lastName) => setBuilderLearnerDraft((current) => ({ ...current, lastName }))} placeholder="نام خانوادگی" placeholderTextColor={theme.colors.muted} style={[styles.input, localizedInputStyle]} />
                <TextInput value={builderLearnerDraft.mobile} onChangeText={(mobile) => setBuilderLearnerDraft((current) => ({ ...current, mobile }))} placeholder="شماره موبایل" placeholderTextColor={theme.colors.muted} keyboardType="phone-pad" style={[styles.input, localizedInputStyle]} />
              </View>
              <Pressable onPress={addBuilderStandaloneLearner} style={[styles.taskAddWideButton, { backgroundColor: activeRoleColor }]}>
                <Text style={styles.taskAddText}>افزودن فرد جدید</Text>
              </Pressable>
              <Text style={styles.productDecisionText}>برای اختصاص رهجو به برنامه، ابتدا وارد یک طبقه‌بندی و سپس یک برنامه شو. اینجا رهجوها و برنامه‌های مرتبطشان را می‌بینی.</Text>
              {globalBuilderLearners.length === 0 ? (
                <Text style={styles.meta}>هنوز رهجویی ثبت نشده است.</Text>
              ) : globalBuilderLearners.map((learner) => {
                const records = builderLearners.filter((item) => item.mobile === learner.mobile);
                return (
                  <Pressable key={`global-${learner.mobile}`} onPress={() => setSelectedBuilderLearnerId(learner.id)} style={[styles.learnerRow, { backgroundColor: records.some(learnerNeedsFollowUp) ? '#ffe0df' : learnerTone(Math.round(records.reduce((sum, item) => sum + item.adherencePercent, 0) / records.length)) }]}>
                    <Text style={styles.metaStrong}>{learner.firstName} {learner.lastName}</Text>
                    <Text style={styles.meta}>{learner.mobile} • {records.length} برنامه مرتبط</Text>
                    {selectedBuilderLearner?.mobile === learner.mobile ? (
                      <View style={styles.builderRelatedPrograms}>
                        {records.map((record) => {
                          const template = templateForLearner(record);
                          const item = itemForTemplate(template);
                          return <Text key={`home-program-${record.id}`} style={styles.productDecisionText}>{item?.title ?? 'بدون طبقه'} / {template?.title ?? 'بدون برنامه'} • پایبندی {record.adherencePercent}٪</Text>;
                        })}
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : (
          <View style={styles.builderMainPane}>
              <View style={styles.builderItemHeader}>
                <Pressable onPress={() => { setSelectedBuilderItemId(null); setSelectedBuilderTemplateId(null); setAddPlanMode('none'); }} style={styles.builderBackButton}>
                  <Text style={styles.metaStrong}>بازگشت</Text>
                </Pressable>
                <Text style={styles.builderItemPageTitle}>{currentBuilderItem.title}</Text>
              </View>
              <Text style={styles.productDecisionText}>{currentBuilderItem.description || 'برای این آیتم توضیحی ثبت نشده است.'}</Text>
              {!selectedBuilderTemplate ? (
                <Pressable onPress={() => setAddPlanMode(addPlanMode === 'custom' ? 'none' : 'custom')} style={[styles.addPlanBanner, { backgroundColor: activeRoleColor }]}>
                  <Text style={styles.addPlanBannerText}>افزودن برنامه جدید +</Text>
                </Pressable>
              ) : null}
              {addPlanMode === 'custom' && !selectedBuilderTemplate ? (
                <View style={styles.planItemCard}>
                  <FieldLabel text="این برنامه برای کدام نقش/هدف ساخته می‌شود؟" />
                  <Pressable onPress={() => setShowBuilderTargetMenu((value) => !value)} style={styles.builderDropdownButton}>
                    <Text style={styles.metaStrong}>{builderTargetRole} ▾</Text>
                  </Pressable>
                  {showBuilderTargetMenu ? (
                    <View style={styles.builderDropdownMenu}>
                      {builderTargetRoles.map((target) => (
                        <Pressable key={target} onPress={() => { setBuilderTargetRole(target); setShowBuilderTargetMenu(false); }} style={styles.qualityMenuItem}>
                          <Text style={styles.qualityChipText}>{target}</Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                  <TextInput value={customPlanName} onChangeText={setCustomPlanName} placeholder="نام برنامه" placeholderTextColor={theme.colors.muted} style={[styles.input, localizedInputStyle]} />
                  <Pressable onPress={addBuilderTemplate} style={[styles.taskAddWideButton, { backgroundColor: activeRoleColor }]}>
                    <Text style={styles.taskAddText}>افزودن برنامه</Text>
                  </Pressable>
                </View>
              ) : null}
              {selectedBuilderTemplate ? (
                <View style={styles.planDetailBlock}>
                  <View style={[styles.planTitleBanner, { backgroundColor: activeRoleColor }]}>
                    <Text style={styles.planTitleBannerText}>{selectedBuilderTemplate.title}</Text>
                  </View>
                  <Text style={styles.productDecisionText}>هدف برنامه: {selectedBuilderTemplate.targetRolePurpose}</Text>
                  <View style={styles.taskTable}>
                    <View style={[styles.taskTableRow, { backgroundColor: activeRoleColor }]}>
                      <Text style={styles.taskTableHeaderCell}>کار</Text>
                      <Text style={styles.taskTableTimeHeaderCell}>زمان</Text>
                      <Text style={styles.taskTableQualityHeaderCell}>نوع</Text>
                    </View>
                    {selectedBuilderTemplate.tasks.map((task) => (
                      <View key={task.id} style={styles.taskTableRow}>
                        <Text style={styles.taskTableCell}>{task.title}</Text>
                        <Text style={styles.taskTableTimeCell}>{task.frequency}</Text>
                        <Text style={styles.taskTableQualityCell}>قالب</Text>
                      </View>
                    ))}
                  </View>
                  <View style={[styles.tableEditPanel, { borderColor: `${activeRoleColor}55` }]}>
                    <Text style={styles.metaStrong}>افزودن فعالیت به قالب برنامه</Text>
                    <TextInput value={taskDraft.title} onChangeText={(title) => setTaskDraft((current) => ({ ...current, title }))} placeholder="نام فعالیت" placeholderTextColor={theme.colors.muted} style={[styles.input, localizedInputStyle]} />
                    <View style={styles.scheduleGrid}>
                      <TextInput value={taskDraft.repeatCount} onChangeText={(repeatCount) => setTaskDraft((current) => ({ ...current, repeatCount }))} placeholder="چند بار؟ (پیش‌فرض: 1)" placeholderTextColor={theme.colors.muted} keyboardType="number-pad" style={[styles.input, styles.scheduleInput, localizedInputStyle]} />
                      <TextInput value={taskDraft.windowQuantity} onChangeText={(windowQuantity) => setTaskDraft((current) => ({ ...current, windowQuantity }))} placeholder="چند روز یکبار؟ (پیش‌فرض: هر روز)" placeholderTextColor={theme.colors.muted} keyboardType="number-pad" style={[styles.input, styles.scheduleInput, localizedInputStyle]} />
                      <TextInput value={taskDraft.durationQuantity} onChangeText={(durationQuantity) => setTaskDraft((current) => ({ ...current, durationQuantity }))} placeholder="تا چند روز؟ (پیش‌فرض: تا همیشه)" placeholderTextColor={theme.colors.muted} keyboardType="number-pad" style={[styles.input, styles.scheduleInput, localizedInputStyle]} />
                      <TextInput value={taskDraft.firstDate} onChangeText={(firstDate) => setTaskDraft((current) => ({ ...current, firstDate }))} placeholder="اولین بار چه روزی انجام می‌دی؟ (پیش‌فرض: امروز) - TODO: Jalali date picker" placeholderTextColor={theme.colors.muted} style={[styles.input, styles.scheduleInput, localizedInputStyle]} />
                      <TextInput value={taskDraft.deadlineTime === '24:00' ? '' : taskDraft.deadlineTime} onChangeText={(deadlineTime) => setTaskDraft((current) => ({ ...current, deadlineTime }))} onBlur={() => setTaskDraft((current) => ({ ...current, deadlineTime: current.deadlineTime.trim() ? normalizeTimeInput(current.deadlineTime) : '' }))} placeholder="مهلت انجام (پیش‌فرض: تا آخر شب)" placeholderTextColor={theme.colors.muted} keyboardType="number-pad" style={[styles.input, styles.scheduleInput, localizedInputStyle]} />
                    </View>
                    <View style={styles.templateWrap}>
                      {persianWeekdays.map((day) => (
                        <Pressable key={`builder-${day}`} onPress={() => setTaskDraft((current) => {
                          if (current.weekdays.includes(day) && current.weekdays.length === 1) return current;
                          return { ...current, weekdays: current.weekdays.includes(day) ? current.weekdays.filter((item) => item !== day) : [...current.weekdays, day] };
                        })} style={[styles.qualityChip, taskDraft.weekdays.includes(day) && { backgroundColor: activeRoleColor }]}>
                          <Text style={[styles.qualityChipText, taskDraft.weekdays.includes(day) && styles.bottomPlanTabTextActive]}>{day}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <Pressable onPress={() => setTaskDraft((current) => ({ ...current, autoAlert: !current.autoAlert }))} style={[styles.qualityChip, taskDraft.autoAlert && { backgroundColor: activeRoleColor, borderColor: activeRoleColor }]}>
                      <Text style={[styles.qualityChipText, taskDraft.autoAlert && styles.bottomPlanTabTextActive]}>هشدار پیگیری خودکار</Text>
                    </Pressable>
                    <Pressable onPress={addTaskToBuilderTemplate} style={[styles.taskAddWideButton, { backgroundColor: activeRoleColor }]}>
                      <Text style={styles.taskAddText}>افزودن فعالیت</Text>
                    </Pressable>
                  </View>
                  <View style={styles.planItemCard}>
                    <Text style={styles.metaStrong}>اختصاص برنامه به رهجو/بیمار</Text>
                    <View style={styles.scheduleGrid}>
                      <TextInput value={builderLearnerDraft.firstName} onChangeText={(firstName) => setBuilderLearnerDraft((current) => ({ ...current, firstName }))} placeholder="نام" placeholderTextColor={theme.colors.muted} style={[styles.input, localizedInputStyle]} />
                      <TextInput value={builderLearnerDraft.lastName} onChangeText={(lastName) => setBuilderLearnerDraft((current) => ({ ...current, lastName }))} placeholder="نام خانوادگی" placeholderTextColor={theme.colors.muted} style={[styles.input, localizedInputStyle]} />
                      <TextInput value={builderLearnerDraft.mobile} onChangeText={(mobile) => setBuilderLearnerDraft((current) => ({ ...current, mobile }))} placeholder="شماره موبایل برای دعوت" placeholderTextColor={theme.colors.muted} keyboardType="phone-pad" style={[styles.input, localizedInputStyle]} />
                    </View>
                    <Pressable onPress={addBuilderLearner} style={[styles.taskAddWideButton, { backgroundColor: activeRoleColor }]}>
                      <Text style={styles.taskAddText}>افزودن رهجو</Text>
                    </Pressable>
                    <TextInput value={builderSavedLearnerQuery} onChangeText={setBuilderSavedLearnerQuery} placeholder="جستجو در رهجوهای قبلی" placeholderTextColor={theme.colors.muted} style={[styles.input, localizedInputStyle]} />
                    {savedBuilderLearners.filter((learner) => learner.templateId !== selectedBuilderTemplate.id).slice(0, 4).map((learner) => (
                      <Pressable key={`saved-${learner.mobile}`} onPress={() => addExistingBuilderLearnerToTemplate(learner)} style={styles.contactPickerItem}>
                        <Text style={styles.itemTitle}>{learner.firstName} {learner.lastName}</Text>
                        <Text style={styles.meta}>{learner.mobile}</Text>
                      </Pressable>
                    ))}
                    <Pressable onPress={() => setShowBuilderLearners((value) => !value)} style={[styles.editPlanButton, { borderColor: activeRoleColor }]}>
                      <Text style={[styles.editPlanButtonText, { color: activeRoleColor }]}>نمایش رهجوها</Text>
                    </Pressable>
                    {showBuilderLearners ? (
                      <View style={styles.learnerDashboardCard}>
                        <View style={styles.sampleTableRow}>
                          <TextInput value={builderLearnerFilters.firstName} onChangeText={(firstName) => setBuilderLearnerFilters((current) => ({ ...current, firstName }))} placeholder="نام" placeholderTextColor={theme.colors.muted} style={styles.sampleFilterCell} />
                          <TextInput value={builderLearnerFilters.lastName} onChangeText={(lastName) => setBuilderLearnerFilters((current) => ({ ...current, lastName }))} placeholder="نام خانوادگی" placeholderTextColor={theme.colors.muted} style={styles.sampleFilterCell} />
                          <TextInput value={builderLearnerFilters.adherence} onChangeText={(adherence) => setBuilderLearnerFilters((current) => ({ ...current, adherence }))} placeholder="پایبندی" placeholderTextColor={theme.colors.muted} keyboardType="number-pad" style={styles.sampleFilterCell} />
                        </View>
                        {selectedBuilderTemplateLearners.map((learner) => (
                          <Pressable key={learner.id} onPress={() => setSelectedBuilderLearnerId(learner.id)} style={[styles.learnerRow, { backgroundColor: learnerNeedsFollowUp(learner) ? '#ffe0df' : learnerTone(learner.adherencePercent) }]}>
                            <Text style={styles.metaStrong}>{learner.firstName} {learner.lastName} • {learner.adherencePercent}٪</Text>
                            <Text style={styles.meta}>{learner.mobile}</Text>
                            {learnerNeedsFollowUp(learner) ? <Text style={styles.productDecisionText}>{followUpMessage(learner)}</Text> : null}
                          </Pressable>
                        ))}
                      </View>
                    ) : null}
                    {selectedBuilderLearner ? (
                      <View style={styles.learnerDashboardCard}>
                        <Text style={styles.rolePerformanceTitle}>جزئیات {selectedBuilderLearner.firstName} {selectedBuilderLearner.lastName}</Text>
                        <Text style={styles.metaStrong}>پایبندی: {selectedBuilderLearner.adherencePercent}٪</Text>
                        {selectedBuilderLearnerRecords.map((record) => {
                          const template = templateForLearner(record);
                          const item = itemForTemplate(template);
                          return (
                            <View key={`learner-detail-${record.id}`} style={styles.builderLearnerProgramCard}>
                              <Text style={styles.metaStrong}>{item?.title ?? 'طبقه‌بندی'} / {template?.title ?? 'برنامه'}</Text>
                              {learnerNeedsFollowUp(record) ? <Text style={styles.productDecisionText}>{followUpMessage(record)}</Text> : null}
                              <View style={styles.taskTable}>
                                <View style={[styles.taskTableRow, { backgroundColor: activeRoleColor }]}>
                                  <Text style={styles.taskTableHeaderCell}>فعالیت</Text>
                                  <Text style={styles.taskTableTimeHeaderCell}>زمان</Text>
                                  <Text style={styles.taskTableQualityHeaderCell}>وضعیت</Text>
                                </View>
                                {(template?.tasks ?? []).map((task, index) => (
                                  <View key={`learner-task-${record.id}-${task.id}`} style={styles.taskTableRow}>
                                    <Text style={styles.taskTableCell}>{task.title}</Text>
                                    <Text style={styles.taskTableTimeCell}>{task.frequency}</Text>
                                    <Text style={styles.taskTableQualityCell}>{index % 3 === 0 ? 'عقب‌افتاده' : index % 3 === 1 ? 'انجام شده' : 'پیش‌رو'}</Text>
                                  </View>
                                ))}
                              </View>
                            </View>
                          );
                        })}
                        <TextInput value={builderCommentDraft} onChangeText={setBuilderCommentDraft} placeholder="کامنت جدید برنامه‌ساز" placeholderTextColor={theme.colors.muted} style={[styles.input, styles.multi, localizedInputStyle]} multiline />
                        <ActionButton label="ثبت کامنت" onPress={addBuilderComment} />
                        {builderComments.filter((comment) => comment.learnerId === selectedBuilderLearner.id && comment.templateId === selectedBuilderTemplate.id).map((comment) => (
                          <View key={comment.id} style={styles.commentCard}>
                            <Text style={styles.metaStrong}>{comment.author} • {comment.createdAt}</Text>
                            <Text style={styles.productDecisionText}>{comment.text}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                </View>
              ) : null}
              <View style={styles.bottomPlanTabs}>
                <Pressable onPress={() => setSelectedBuilderTemplateId(null)} style={[styles.bottomPlanTab, !selectedBuilderTemplateId && { backgroundColor: activeRoleColor, borderColor: activeRoleColor }]}>
                  <Text style={[styles.bottomPlanTabText, !selectedBuilderTemplateId && styles.bottomPlanTabTextActive]}>{currentBuilderItem.title}</Text>
                </Pressable>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bottomPlanTabsScroll}>
                  {currentBuilderTemplates.map((template) => (
                    <Pressable key={template.id} onPress={() => setSelectedBuilderTemplateId(template.id)} style={[styles.bottomPlanTab, selectedBuilderTemplateId === template.id && { backgroundColor: activeRoleColor, borderColor: activeRoleColor }]}>
                      <Text style={[styles.bottomPlanTabText, selectedBuilderTemplateId === template.id && styles.bottomPlanTabTextActive]}>{template.title}</Text>
                    </Pressable>
                  ))}
                  <Pressable onPress={() => { setSelectedBuilderTemplateId(null); setAddPlanMode('custom'); }} style={[styles.bottomPlanTabAdd, { borderColor: activeRoleColor }]}>
                    <Text style={[styles.bottomPlanTabText, { color: activeRoleColor }]}>+</Text>
                  </Pressable>
                </ScrollView>
              </View>
          </View>
        )}
      </View>
    );
  }

  if (!isReady) {
    return <SafeAreaView style={styles.safe}><View style={styles.center}><Text style={styles.title}>{bi('در حال بارگذاری لایف میکر', 'Loading Life Maker')}</Text></View></SafeAreaView>;
  }

  if (!isDemoAuthenticated) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={[styles.authContent, isWide && styles.webMobileContent]}>
          <View style={styles.authCard}>
            <Text style={styles.heroTitle}>Life Maker</Text>
            <Text style={styles.metaStrong}>برای ادامه وارد شو یا ثبت‌نام کن.</Text>
            <View style={styles.authModeRow}>
              <Pressable onPress={() => setAuthMode('login')} style={[styles.authModeButton, authMode === 'login' && styles.authModeButtonActive]}>
                <Text style={[styles.authModeText, authMode === 'login' && styles.bottomPlanTabTextActive]}>ورود</Text>
              </Pressable>
              <Pressable onPress={() => setAuthMode('register')} style={[styles.authModeButton, authMode === 'register' && styles.authModeButtonActive]}>
                <Text style={[styles.authModeText, authMode === 'register' && styles.bottomPlanTabTextActive]}>ثبت‌نام</Text>
              </Pressable>
            </View>
            {authMode === 'register' ? (
              <>
                <TextInput value={authDraft.firstName} onChangeText={(firstName) => setAuthDraft((current) => ({ ...current, firstName }))} placeholder="نام" placeholderTextColor={theme.colors.muted} style={[styles.input, styles.inputRtl]} />
                <TextInput value={authDraft.lastName} onChangeText={(lastName) => setAuthDraft((current) => ({ ...current, lastName }))} placeholder="نام خانوادگی" placeholderTextColor={theme.colors.muted} style={[styles.input, styles.inputRtl]} />
                <TextInput value={authDraft.email} onChangeText={(email) => setAuthDraft((current) => ({ ...current, email }))} placeholder="ایمیل" placeholderTextColor={theme.colors.muted} keyboardType="email-address" style={[styles.input, styles.inputLtr]} />
              </>
            ) : null}
            <TextInput value={authDraft.mobile} onChangeText={(mobile) => setAuthDraft((current) => ({ ...current, mobile }))} placeholder="شماره موبایل" placeholderTextColor={theme.colors.muted} keyboardType="phone-pad" style={[styles.input, styles.inputRtl]} />
            <TextInput value={authDraft.password} onChangeText={(password) => setAuthDraft((current) => ({ ...current, password }))} placeholder="رمز عبور" placeholderTextColor={theme.colors.muted} secureTextEntry style={[styles.input, styles.inputLtr]} />
            <ActionButton label={authMode === 'login' ? 'ورود' : 'ثبت‌نام و ورود'} onPress={submitAuth} />
            <Text style={styles.productDecisionText}>MVP دمو: اطلاعات ورود روی همین دستگاه ذخیره می‌شود. برای هاست و اشتراک‌گذاری واقعی به backend نیاز داریم.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!state.currentSession) {
    const today = new Date();
    const dateLocale = state.language === 'fa' ? 'fa-IR-u-ca-persian' : 'en-US';
    const homeDate = new Intl.DateTimeFormat(dateLocale, { day: 'numeric', month: 'long' }).format(today);
    const homeWeekday = new Intl.DateTimeFormat(dateLocale, { weekday: 'long' }).format(today);
    const visibleRoles = allHomeRoleOptions.filter((role) => activeHomeRoleKeys.includes(role.key));
    const inactiveRoles = allHomeRoleOptions.filter((role) => role.key !== 'self' && role.key !== 'programBuilder' && !activeHomeRoleKeys.includes(role.key));

    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={[styles.content, isWide && styles.webMobileContent]}>
          <View style={styles.roleHomeFrame}>
            {renderAppHeader('home')}

            <Text style={styles.quoteText}>
              {bi(dailyMessage, dailyMessages[0])}
            </Text>

            <Pressable onPress={() => setShowTodayTasks((value) => !value)} style={[styles.todayTasksShortcut, { borderColor: theme.colors.primary }]}>
              <Text style={styles.todayTasksTitle}>{bi('وظایف امروز', "Today's tasks")}</Text>
              <Text style={styles.meta}>{bi(`${todayTaskCount} کار باز در همه نقش‌ها`, `${todayTaskCount} open tasks across roles`)}</Text>
            </Pressable>
            {showTodayTasks ? (
              <View style={styles.todayTaskList}>
                {todayTaskRows.length === 0 ? <Text style={styles.meta}>{bi('فعلاً کاری برای امروز ثبت نشده است.', 'No tasks yet.')}</Text> : todayTaskRows.map(({ plan, task, role }, index) => {
                  const previous = todayTaskRows[index - 1];
                  const showRoleBar = !previous || previous.role.key !== role.key;
                  const showPlanBar = !previous || previous.plan.id !== plan.id;
                  return (
                  <View key={`today-${plan.id}-${task.id}`} style={styles.todayTaskGroupRow}>
                    {showRoleBar ? (
                      <View style={[styles.todayVerticalBar, { backgroundColor: `${role.color}28`, borderColor: role.color }]}>
                        <Image source={roleImageFor(role.key)} style={styles.todayRoleIcon} resizeMode="contain" />
                        <Text style={styles.todayVerticalText}>{role.titleFa}</Text>
                      </View>
                    ) : <View style={styles.todayVerticalSpacer} />}
                    {showPlanBar ? (
                      <View style={[styles.todayVerticalBar, styles.todayPlanBar, { borderColor: role.color }]}>
                        <Text style={styles.todayVerticalText}>{plan.title}</Text>
                      </View>
                    ) : <View style={[styles.todayVerticalSpacer, styles.todayPlanSpacer]} />}
                    <Pressable onPress={() => completeRoleTask(plan.id, task.id)} style={[styles.todayTaskRow, { backgroundColor: `${role.color}18`, borderColor: `${role.color}45` }]}>
                      <Text style={[styles.itemTitle, task.status === 'done' && styles.doneTaskText]} numberOfLines={1}>{task.title}</Text>
                      <Pressable onPress={() => setOpenQualityTaskId(openQualityTaskId === task.id ? null : task.id)} style={styles.todayQualityButton}>
                        <Text style={styles.qualityChipText}>{task.status === 'done' ? `${qualityEmojis[task.quality ?? 'بسیار خوب']} ${task.completedAt ?? ''}` : 'بعد از انجام'}</Text>
                      </Pressable>
                    </Pressable>
                    {openQualityTaskId === task.id && task.status === 'done' ? (
                      <View style={styles.qualityMenu}>
                        {(Object.keys(qualityScores) as QualityLabel[]).map((quality) => (
                          <Pressable key={`${task.id}-${quality}`} onPress={() => { updateRoleTaskQuality(plan.id, task.id, quality); setOpenQualityTaskId(null); }} style={styles.qualityMenuItem}>
                            <Text style={styles.qualityChipText}>{qualityEmojis[quality]}</Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : null}
                  </View>
                  );
                })}
              </View>
            ) : null}

            <View style={styles.homeShortcutArea}>
              {pinnedPlans.length === 0 ? (
                <View style={styles.emptyShortcutBox}>
                  <Text style={styles.emptyShortcutText}>{bi('برنامه‌های اولویت‌دار را پین کن تا در اینجا ببینی', 'Pin priority plans to see them here')}</Text>
                </View>
              ) : (
                <View style={styles.shortcutGrid}>
                  {pinnedPlans.slice(0, 6).map((plan) => {
                    const role = allHomeRoleOptions.find((item) => item.key === plan.roleKey) ?? homeRoleOptions[0];
                    return (
                      <Pressable key={`pin-${plan.id}`} onPress={() => openPinnedPlan(plan)} style={[styles.shortcutCard, { borderColor: role.color, backgroundColor: `${role.color}16` }]}>
                        <Text style={[styles.shortcutTitle, { color: role.color }]}>{plan.title}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            {roleQuestionnaireSummary ? <Text style={styles.productDecisionText}>{roleQuestionnaireSummary}</Text> : null}

            <Text style={styles.roleGridHeading}>{bi('نقش من به عنوان...', 'My role as...')}</Text>

            <Pressable onPress={() => enterHomeRole(programBuilderRole)} style={[styles.programBuilderTile, { backgroundColor: `${programBuilderRole.color}16`, borderColor: `${programBuilderRole.color}44` }]}>
              <View style={[styles.programBuilderIconWrap, { backgroundColor: `${programBuilderRole.color}20` }]}>
                <Image source={roleImageFor(programBuilderRole.key)} style={styles.programBuilderIcon} resizeMode="contain" />
              </View>
              <View style={styles.flex1}>
                <Text style={[styles.lifeRoleTitle, { textAlign: 'right' }]}>{bi(programBuilderRole.titleFa, programBuilderRole.titleEn)}</Text>
                <Text style={[styles.lifeRoleSubtitle, { textAlign: 'right' }]}>{bi(programBuilderRole.responsibilityFa, programBuilderRole.responsibilityEn)}</Text>
              </View>
            </Pressable>

            <View style={styles.homeRoleGrid}>
              {visibleRoles.map((role) => {
                const displayRole = getHomeRoleDisplay(role);
                return (
                <Pressable key={role.key} onPress={() => enterHomeRole(role)} style={[styles.homeRoleTile, { backgroundColor: `${displayRole.color}14`, borderColor: `${displayRole.color}35` }]}>
                  <View style={[styles.homeRoleImageWrap, { backgroundColor: `${displayRole.color}22` }]}>
                    {displayRole.key.startsWith('custom-') ? (
                      <Text style={styles.customRoleInitial}>{displayRole.titleFa.slice(0, 1)}</Text>
                    ) : (
                      <Image source={roleImageFor(displayRole.key)} style={styles.homeRoleImage} resizeMode="contain" />
                    )}
                  </View>
                  <Text style={styles.lifeRoleTitle}>{bi(displayRole.titleFa, displayRole.titleEn)}</Text>
                  <Text style={styles.lifeRoleSubtitle}>{bi(displayRole.responsibilityFa, displayRole.responsibilityEn)}</Text>
                </Pressable>
                );
              })}
              <Pressable onPress={showAddRolePrompt} style={[styles.homeRoleTile, styles.addRoleTile]}>
                <View style={[styles.homeRoleImageWrap, styles.homeAddRoleBox]}>
                  <Text style={styles.homeAddPlus}>+</Text>
                </View>
                <Text style={styles.lifeRoleTitle}>{bi('اضافه کردن نقش جدید', 'Add new role')}</Text>
              </Pressable>
            </View>

            {onboardingMode !== 'none' ? (
              <View style={styles.onboardingChoiceRow}>
                <Pressable onPress={() => setOnboardingMode(onboardingMode === 'questionnaire' ? 'none' : 'questionnaire')} style={[styles.onboardingChoiceButton, onboardingMode === 'questionnaire' && styles.onboardingChoicePrimary]}>
                  <Text style={[styles.onboardingChoiceText, onboardingMode === 'questionnaire' && styles.onboardingChoicePrimaryText]}>{bi('پاسخ به پرسش‌های راهنما', 'Answer guide questions')}</Text>
                </Pressable>
                <Pressable onPress={() => setOnboardingMode(onboardingMode === 'roleList' ? 'none' : 'roleList')} style={[styles.onboardingChoiceButton, onboardingMode === 'roleList' && styles.onboardingChoicePrimary]}>
                  <Text style={[styles.onboardingChoiceText, onboardingMode === 'roleList' && styles.onboardingChoicePrimaryText]}>{bi('فهرست نقش‌ها', 'Role list')}</Text>
                </Pressable>
              </View>
            ) : null}

            {onboardingMode === 'questionnaire' ? (
              <View style={styles.onboardingPanel}>
                <Text style={styles.rolePerformanceTitle}>{bi(`پرسشنامه نقش‌ساز (${roleQuestionCount} سؤال)`, `Role questionnaire (${roleQuestionCount} questions)`)}</Text>
                <Text style={styles.productDecisionText}>{bi('هر پاسخ فقط نقش مرتبط خودش را فعال می‌کند.', 'Each answer activates only its related role.')}</Text>
                <TextInput value={roleQuestionnaire.age} onChangeText={(age) => updateRoleQuestionnaire({ age })} placeholder={bi('۱. سن', '1. Age')} placeholderTextColor={theme.colors.muted} keyboardType="number-pad" style={[styles.input, localizedInputStyle]} />
                <FieldLabel text={bi('۲. جنسیت', '2. Gender')} />
                <View style={styles.templateWrap}>
                  {['زن', 'مرد'].map((gender) => (
                    <Pressable key={gender} onPress={() => updateRoleQuestionnaire({ gender })} style={[styles.templateChip, roleQuestionnaire.gender === gender && styles.templateChipActive]}>
                      <Text style={[styles.templateChipText, roleQuestionnaire.gender === gender && styles.templateChipTextActive]}>{gender}</Text>
                    </Pressable>
                  ))}
                </View>
                <FieldLabel text={bi('۳. وضعیت رابطه', '3. Relationship status')} />
                <View style={styles.templateWrap}>
                  {[
                    ['single', 'مجرد'],
                    ['married', 'متأهل'],
                    ['relationship', 'در رابطه'],
                  ].map(([value, label]) => (
                    <Pressable key={value} onPress={() => updateRoleQuestionnaire({ relationshipStatus: value as RelationshipStatus })} style={[styles.templateChip, roleQuestionnaire.relationshipStatus === value && styles.templateChipActive]}>
                      <Text style={[styles.templateChipText, roleQuestionnaire.relationshipStatus === value && styles.templateChipTextActive]}>{label}</Text>
                    </Pressable>
                  ))}
                </View>
                <FieldLabel text={bi('۴ تا ۷. مسئولیت مراقبت داری؟', '4 to 7. Care responsibilities')} />
                <View style={styles.templateWrap}>
                  <Pressable onPress={() => updateRoleQuestionnaire({ caresForFather: !roleQuestionnaire.caresForFather })} style={[styles.templateChip, roleQuestionnaire.caresForFather && styles.templateChipActive]}><Text style={[styles.templateChipText, roleQuestionnaire.caresForFather && styles.templateChipTextActive]}>{bi('پدر', 'Father')}</Text></Pressable>
                  <Pressable onPress={() => updateRoleQuestionnaire({ caresForMother: !roleQuestionnaire.caresForMother })} style={[styles.templateChip, roleQuestionnaire.caresForMother && styles.templateChipActive]}><Text style={[styles.templateChipText, roleQuestionnaire.caresForMother && styles.templateChipTextActive]}>{bi('مادر', 'Mother')}</Text></Pressable>
                  <Pressable onPress={() => updateRoleQuestionnaire({ caresForChild: !roleQuestionnaire.caresForChild })} style={[styles.templateChip, roleQuestionnaire.caresForChild && styles.templateChipActive]}><Text style={[styles.templateChipText, roleQuestionnaire.caresForChild && styles.templateChipTextActive]}>{bi('فرزند', 'Child')}</Text></Pressable>
                  <Pressable onPress={() => updateRoleQuestionnaire({ caresForPet: !roleQuestionnaire.caresForPet })} style={[styles.templateChip, roleQuestionnaire.caresForPet && styles.templateChipActive]}><Text style={[styles.templateChipText, roleQuestionnaire.caresForPet && styles.templateChipTextActive]}>{bi('حیوان خانگی', 'Pet')}</Text></Pressable>
                  <Pressable onPress={() => updateRoleQuestionnaire({ caresForPlants: !roleQuestionnaire.caresForPlants })} style={[styles.templateChip, roleQuestionnaire.caresForPlants && styles.templateChipActive]}><Text style={[styles.templateChipText, roleQuestionnaire.caresForPlants && styles.templateChipTextActive]}>{bi('گل و گیاه', 'Plants')}</Text></Pressable>
                </View>
                {roleQuestionnaire.caresForChild ? <TextInput value={roleQuestionnaire.childrenCount} onChangeText={(childrenCount) => updateRoleQuestionnaire({ childrenCount })} placeholder={bi('تعداد فرزندان', 'Number of children')} placeholderTextColor={theme.colors.muted} keyboardType="number-pad" style={[styles.input, localizedInputStyle]} /> : null}
                {roleQuestionnaire.caresForChild ? childNameFields.map((name, index) => (
                  <TextInput key={`child-name-${index}`} value={name} onChangeText={(value) => updateChildName(index, value)} placeholder={bi(`نام فرزند ${index + 1}`, `Child ${index + 1} name`)} placeholderTextColor={theme.colors.muted} style={[styles.input, localizedInputStyle]} />
                )) : null}
                {roleQuestionnaire.caresForPet ? <TextInput value={roleQuestionnaire.petsCount} onChangeText={(petsCount) => updateRoleQuestionnaire({ petsCount })} placeholder={bi('تعداد حیوانات خانگی', 'Number of pets')} placeholderTextColor={theme.colors.muted} keyboardType="number-pad" style={[styles.input, localizedInputStyle]} /> : null}
                <FieldLabel text={bi('۸. مسئولیت اصلی امور خانه با توست؟', '8. Are you responsible for home management?')} />
                <View style={styles.templateWrap}>
                  <Pressable onPress={() => updateRoleQuestionnaire({ managesHome: true })} style={[styles.templateChip, roleQuestionnaire.managesHome && styles.templateChipActive]}><Text style={[styles.templateChipText, roleQuestionnaire.managesHome && styles.templateChipTextActive]}>{bi('بله', 'Yes')}</Text></Pressable>
                  <Pressable onPress={() => updateRoleQuestionnaire({ managesHome: false })} style={[styles.templateChip, !roleQuestionnaire.managesHome && styles.templateChipActive]}><Text style={[styles.templateChipText, !roleQuestionnaire.managesHome && styles.templateChipTextActive]}>{bi('خیر', 'No')}</Text></Pressable>
                </View>
                <FieldLabel text={bi('۹. مدیریت مالی یا بودجه‌بندی منظم داری؟', '9. Do you manage finances or budgeting?')} />
                <View style={styles.templateWrap}>
                  <Pressable onPress={() => updateRoleQuestionnaire({ managesFinance: true })} style={[styles.templateChip, roleQuestionnaire.managesFinance && styles.templateChipActive]}><Text style={[styles.templateChipText, roleQuestionnaire.managesFinance && styles.templateChipTextActive]}>{bi('بله', 'Yes')}</Text></Pressable>
                  <Pressable onPress={() => updateRoleQuestionnaire({ managesFinance: false })} style={[styles.templateChip, !roleQuestionnaire.managesFinance && styles.templateChipActive]}><Text style={[styles.templateChipText, !roleQuestionnaire.managesFinance && styles.templateChipTextActive]}>{bi('خیر', 'No')}</Text></Pressable>
                </View>
                <FieldLabel text={bi('۱۰. وضعیت اشتغال', '10. Employment status')} />
                <View style={styles.templateWrap}>
                  {[
                    ['employed', 'شاغل'],
                    ['unemployed', 'بدون شغل'],
                  ].map(([value, label]) => (
                    <Pressable key={value} onPress={() => updateRoleQuestionnaire({ employmentStatus: value as EmploymentStatus })} style={[styles.templateChip, roleQuestionnaire.employmentStatus === value && styles.templateChipActive]}>
                      <Text style={[styles.templateChipText, roleQuestionnaire.employmentStatus === value && styles.templateChipTextActive]}>{label}</Text>
                    </Pressable>
                  ))}
                </View>
                <FieldLabel text={bi('۱۱. برنامه مشترک با دوست یا همکار داری؟', '11. Shared plans with friends or teammates?')} />
                <View style={styles.templateWrap}>
                  <Pressable onPress={() => updateRoleQuestionnaire({ hasSharedPlans: true })} style={[styles.templateChip, roleQuestionnaire.hasSharedPlans && styles.templateChipActive]}><Text style={[styles.templateChipText, roleQuestionnaire.hasSharedPlans && styles.templateChipTextActive]}>{bi('بله', 'Yes')}</Text></Pressable>
                  <Pressable onPress={() => updateRoleQuestionnaire({ hasSharedPlans: false })} style={[styles.templateChip, !roleQuestionnaire.hasSharedPlans && styles.templateChipActive]}><Text style={[styles.templateChipText, !roleQuestionnaire.hasSharedPlans && styles.templateChipTextActive]}>{bi('خیر', 'No')}</Text></Pressable>
                </View>
                <ActionButton label={bi('ساخت نقش‌ها بر اساس پاسخ‌ها', 'Generate roles from answers')} onPress={generateRolesFromQuestionnaire} />
              </View>
            ) : null}

            {onboardingMode === 'roleList' ? (
              <View style={styles.onboardingPanel}>
                <Text style={styles.rolePerformanceTitle}>{bi('فهرست نقش‌ها', 'Role list')}</Text>
                <Text style={styles.productDecisionText}>{bi('در این مسیر فقط نقشی که انتخاب می‌کنی اضافه می‌شود.', 'Only the role you select is added.')}</Text>
                <View style={styles.homeRoleGrid}>
                  {inactiveRoles.map((role) => (
                    <Pressable
                      key={`inactive-${role.key}`}
                      onPress={() => {
                        addActiveHomeRole(role.key);
                        setOnboardingMode('none');
                        setRoleQuestionnaireSummary(bi(`نقش «${role.titleFa}» اضافه شد.`, `${role.titleEn} role was added.`));
                      }}
                      style={[styles.homeRoleTile, { backgroundColor: `${role.color}14`, borderColor: `${role.color}35` }]}
                    >
                      <View style={[styles.homeRoleImageWrap, { backgroundColor: `${role.color}22` }]}>
                        <Image source={roleImageFor(role.key)} style={styles.homeRoleImage} resizeMode="contain" />
                      </View>
                      <Text style={styles.lifeRoleTitle}>{bi(role.titleFa, role.titleEn)}</Text>
                      <Text style={styles.lifeRoleSubtitle}>{bi(role.responsibilityFa, role.responsibilityEn)}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.customRoleBox}>
                  <FieldLabel text={bi('نقش سفارشی', 'Custom role')} />
                  <View style={styles.customRoleLogoPlaceholder}>
                    <Text style={styles.homeAddPlus}>{customRoleDraft.title.trim().slice(0, 1) || '+'}</Text>
                  </View>
                  <TextInput value={customRoleDraft.title} onChangeText={(title) => setCustomRoleDraft((current) => ({ ...current, title }))} placeholder={bi('نام نقش، مثلا خواهر/برادر', 'Role name')} placeholderTextColor={theme.colors.muted} style={[styles.input, localizedInputStyle]} />
                  <TextInput value={customRoleDraft.description} onChangeText={(description) => setCustomRoleDraft((current) => ({ ...current, description }))} placeholder={bi('هدف این نقش', 'Role purpose')} placeholderTextColor={theme.colors.muted} style={[styles.input, localizedInputStyle]} />
                  <Text style={styles.productDecisionText}>{bi('فعلاً لوگوی نقش سفارشی با حرف اول نام نقش نمایش داده می‌شود. بارگذاری لوگو در مرحله بعد به فایل/دیتابیس نیاز دارد.', 'For now, custom role logo uses the first letter.')}</Text>
                  <ActionButton label={bi('افزودن نقش سفارشی', 'Add custom role')} onPress={addCustomRole} />
                </View>
              </View>
            ) : null}
          </View>

          <SectionCard>
            <SectionTitle title={bi('چرخ زندگی', 'Life Wheel')} subtitle={bi('چرخ زندگی باید بچرخد', 'Your life wheel should spin')} />
            <Text style={styles.metricValue}>{bi(`چرخ زندگی شما با ${lifeBalance}٪ تعادل می‌چرخد`, `Your life wheel balance is ${lifeBalance}%`)}</Text>
            <View style={[styles.lifePie, { backgroundImage: `conic-gradient(${pieStops})` } as any]}>
              <View style={styles.lifePieCenter}>
                <Text style={styles.lifePieText}>{lifeBalance}%</Text>
              </View>
            </View>
            {visibleRoles.map((role) => (
              <View key={`legend-${role.key}`} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: role.color }]} />
                <Text style={styles.meta}>{bi(role.titleFa, role.titleEn)}</Text>
              </View>
            ))}
          </SectionCard>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Modal visible={photoReview !== null} transparent animationType="fade" onRequestClose={() => setPhotoReview(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.title}>{bi('پیش‌نمایش عکس نسخه', 'Prescription photo preview')}</Text>
            {photoReview ? <Image source={{ uri: photoReview.uri }} style={styles.modalPhoto} resizeMode="contain" /> : null}
            <Text style={styles.meta}>{bi('اگر عکس درست است، آن را تایید کن تا به نسخه بیمار اضافه شود.', 'If the photo looks correct, confirm it to attach it to the patient prescription.')}</Text>
            <View style={styles.modalActions}>
              <ActionButton
                label={bi('تایید عکس', 'Confirm photo')}
                onPress={() => {
                  if (!photoReview) return;
                  updatePrescriptionDraft(photoReview.patientId, {
                    photoUri: photoReview.uri,
                    photoUpdatedAt: photoReview.updatedAt,
                    extractionStatus: 'manual_review',
                  });
                  setPhotoReview(null);
                }}
              />
              <ActionButton label={bi('لغو', 'Cancel')} muted onPress={() => setPhotoReview(null)} />
            </View>
          </View>
        </View>
      </Modal>
      {state.currentSession.role === 'planner_member' ? null : (
        <View style={styles.topBar}>
          <View>
            <Text style={styles.eyebrow}>{formatDateLabel(new Date(), state.language)}</Text>
            <Text style={styles.title}>{activePanelTitle}</Text>
            <Text style={styles.meta}>{state.currentSession.role === 'patient' ? (currentUser as Patient)?.name : `${(currentUser as { name?: string })?.name ?? ''} • ${roleLabel(state.currentSession.role)}`}</Text>
          </View>
          <ActionButton label={bi('خروج', 'Logout')} muted onPress={logout} />
        </View>
      )}

      {state.currentSession.role === 'doctor_staff' ? (
        <>
          <View style={styles.nav}>
            <NavButton label={bi('امروز', 'Today')} active={state.currentRoute === 'doctor/dashboard'} onPress={() => navigate('doctor/dashboard')} />
            <NavButton label={bi('بیماران', 'Patients')} active={state.currentRoute === 'doctor/patients'} onPress={() => navigate('doctor/patients')} />
            <NavButton label={bi('بیمار جدید', 'New patient')} active={state.currentRoute === 'doctor/patients/new'} onPress={() => navigate('doctor/patients/new')} />
          </View>
          <ScrollView contentContainerStyle={[styles.content, isWide && styles.webMobileContent]}>
            {state.currentRoute === 'doctor/dashboard' ? (
              <View style={[styles.grid, isWide && styles.gridWide]}>
                <View style={styles.mainCol}>
                  <View style={styles.metricWrap}>
                    <Metric label={bi('کل بیماران فعال', 'Total active patients')} value={`${dashboardMetrics.totalActivePatients}`} />
                    <Metric label={bi('چک امروز', 'Checked in today')} value={`${dashboardMetrics.checkedInToday}`} />
                    <Metric label={bi('نیازمند پیگیری', 'Needs follow-up')} value={`${dashboardMetrics.needsFollowUp}`} />
                  </View>
                  <SectionCard>
                    <SectionTitle title={bi('اقدام بعدی', 'Next action')} subtitle={bi('اول بیمارهای نیازمند پیگیری را ببین', 'Start with patients who need attention.')} />
                    {followUpPatients[0] ? (
                      <>
                        <Text style={styles.itemTitle}>{followUpPatients[0].patient.name}</Text>
                        <Text style={styles.meta}>{translateReason(followUpPatients[0].summary.reason)} • {followUpPatients[0].summary.rate7d}%</Text>
                        <ActionButton label={bi('باز کردن بیمار', 'Open patient')} onPress={() => selectPatient(followUpPatients[0].patient.id, 'doctor/patients/detail')} />
                      </>
                    ) : (
                      <>
                        <Text style={styles.meta}>{bi('فعلا بیمار فوری در صف پیگیری نیست.', 'No urgent follow-up patient is queued right now.')}</Text>
                        <ActionButton label={bi('دیدن همه بیماران', 'View all patients')} muted onPress={() => navigate('doctor/patients')} />
                      </>
                    )}
                  </SectionCard>
                  <SectionCard>
                    <SectionTitle title={bi('نیازمند پیگیری', 'Needs follow-up')} subtitle={bi('بیمارانی که باید زودتر بررسی شوند', 'Patients who should be reviewed first.')} />
                    {followUpPatients.map((entry) => (
                      <Pressable key={entry.patient.id} style={styles.listRow} onPress={() => selectPatient(entry.patient.id, 'doctor/patients/detail')}>
                        <View style={styles.flex1}>
                          <Text style={styles.itemTitle}>{entry.patient.name}</Text>
                          <Text style={styles.meta}>{translateSeedText(entry.patient.condition)}</Text>
                        </View>
                        <View style={styles.end}>
                          <Pill label={bi(`پایبندی ${entry.summary.rate7d}٪`, `${entry.summary.rate7d}% adherence`)} tone={entry.summary.rate7d < 40 ? 'danger' : 'warning'} />
                          <Text style={styles.meta}>{entry.summary.reason}</Text>
                        </View>
                      </Pressable>
                    ))}
                  </SectionCard>
                </View>
                <View style={styles.sideCol}>
                  <SectionCard>
                    <SectionTitle title={bi('بیماران اخیر', 'Recent patients')} />
                    {dashboardMetrics.recentPatients.map((patient) => (
                      <Pressable key={patient.id} style={styles.lineRow} onPress={() => selectPatient(patient.id, 'doctor/patients/detail')}>
                        <Text style={styles.itemTitle}>{patient.name}</Text>
                        <Text style={styles.meta}>{formatCompactDate(new Date(patient.joinedAt), state.language)}</Text>
                      </Pressable>
                    ))}
                  </SectionCard>
                </View>
              </View>
            ) : null}

            {state.currentRoute === 'doctor/patients' ? (
              <SectionCard>
                <SectionTitle title={bi('بیماران', 'Patients')} subtitle={bi('فهرست بیماران با نمای سریع پایبندی', 'Doctor/staff patient list with adherence snapshot.')} />
                {patientSummaries.map((entry) => (
                  <Pressable key={entry.patient.id} style={styles.tableRow} onPress={() => selectPatient(entry.patient.id, 'doctor/patients/detail')}>
                    <Text style={[styles.cell, styles.flex2]}>{entry.patient.name}</Text>
                    <Text style={styles.cell}>{translateSeedText(entry.patient.condition)}</Text>
                    <Text style={styles.cell}>{entry.summary.rate7d}%</Text>
                    <View style={styles.cellPill}><Pill label={entry.summary.needsFollowUp ? bi('پیگیری', 'Follow-up') : bi('پایدار', 'Stable')} tone={entry.summary.needsFollowUp ? 'danger' : 'success'} /></View>
                  </Pressable>
                ))}
              </SectionCard>
            ) : null}

            {state.currentRoute === 'doctor/patients/new' ? (
              <SectionCard>
                <SectionTitle title={bi('افزودن بیمار', 'Add patient')} subtitle={bi('بیمار جدید را با فرم سبک زیر بساز', 'Create a new patient in a single lightweight form.')} />
                <TextInput value={state.drafts.newPatient.name} onChangeText={(value) => updateNewPatientDraft({ name: value })} placeholder={bi('نام کامل', 'Full name')} placeholderTextColor={theme.colors.muted} style={[styles.input, localizedInputStyle]} />
                <TextInput value={state.drafts.newPatient.phone} onChangeText={(value) => updateNewPatientDraft({ phone: value })} placeholder={bi('شماره تماس', 'Phone')} placeholderTextColor={theme.colors.muted} style={[styles.input, localizedInputStyle]} />
                <TextInput value={state.drafts.newPatient.age} onChangeText={(value) => updateNewPatientDraft({ age: value })} placeholder={bi('سن', 'Age')} placeholderTextColor={theme.colors.muted} style={[styles.input, localizedInputStyle]} keyboardType="number-pad" />
                <TextInput value={state.drafts.newPatient.condition} onChangeText={(value) => updateNewPatientDraft({ condition: value })} placeholder={bi('شرح مشکل اصلی', 'Primary condition')} placeholderTextColor={theme.colors.muted} style={[styles.input, localizedInputStyle]} />
                <TextInput value={state.drafts.newPatient.notes} onChangeText={(value) => updateNewPatientDraft({ notes: value })} placeholder={bi('یادداشت', 'Notes')} placeholderTextColor={theme.colors.muted} style={[styles.input, styles.multi, localizedInputStyle]} multiline />
                <ActionButton
                  label={bi('ایجاد بیمار', 'Create patient')}
                  onPress={() => {
                    if (!addPatient()) Alert.alert(bi('فرم ناقص است', 'Incomplete form'), bi('نام، شماره، سن و شرح مشکل لازم است', 'Name, phone, age, and condition are required.'));
                  }}
                />
              </SectionCard>
            ) : null}

            {state.currentRoute === 'doctor/patients/detail' && selectedPatient ? (
              <View style={[styles.grid, isWide && styles.gridWide]}>
                <View style={styles.mainCol}>
                  <SectionCard>
                    <SectionTitle title={selectedPatient.name} subtitle={`${translateSeedText(selectedPatient.condition)} • ${selectedPatient.phone}`} />
                    <Text style={styles.meta}>{bi('یادداشت', 'Notes')}: {selectedPatient.notes ? translateSeedText(selectedPatient.notes) : bi('بدون یادداشت', 'No notes')}</Text>
                    <ActionButton label={bi('ایجاد یا ویرایش پلن', 'Create or edit plan')} onPress={() => navigate('doctor/patients/plan')} />
                  </SectionCard>
                  <SectionCard>
                    <SectionTitle title={bi('خلاصه پایبندی', 'Adherence summary')} />
                    <MetricRow label={bi('پایبندی ۷ روزه', '7-day adherence')} value={`${selectedPatientSummary?.rate7d ?? 0}%`} />
                    <MetricRow label={bi('چک امروز', 'Checks today')} value={`${selectedPatientSummary?.checksToday ?? 0}`} />
                    <MetricRow label={bi('چک در ۷ روز', 'Checks in 7 days')} value={`${selectedPatientSummary?.checks7d ?? 0}`} />
                    <MetricRow label={bi('نیاز به پیگیری', 'Needs follow-up')} value={selectedPatientSummary?.needsFollowUp ? bi('بله', 'Yes') : bi('خیر', 'No')} />
                    <Text style={styles.meta}>{translateReason(selectedPatientSummary?.reason)}</Text>
                  </SectionCard>
                </View>
                <View style={styles.sideCol}>
                  <SectionCard>
                    <SectionTitle title={bi('پلن فعال', 'Active plan')} />
                    <Text style={styles.itemTitle}>{selectedPatientPlan.plan?.title ? translateSeedText(selectedPatientPlan.plan.title) : bi('هنوز پلن فعالی ندارد', 'No active plan yet')}</Text>
                    {selectedPatientPlan.items.map((item) => (
                      <View key={item.id} style={styles.lineRow}>
                        <Text style={styles.itemTitle}>{translateSeedText(item.label)}</Text>
                        <Text style={styles.meta}>{item.timeOfDay}</Text>
                      </View>
                    ))}
                  </SectionCard>
                </View>
              </View>
            ) : null}

            {state.currentRoute === 'doctor/patients/plan' && selectedPatient && patientPlanDraft && patientPrescriptionDraft ? (
              <SectionCard>
                <SectionTitle title={bi(`پلن برای ${selectedPatient.name}`, `Plan for ${selectedPatient.name}`)} subtitle={bi('در این MVP فقط یک پلن فعال برای هر بیمار داریم', 'One active plan per patient in this MVP.')} />
                <View style={styles.planItemCard}>
                  <View style={styles.prescriptionHeader}>
                    <Text style={styles.itemTitle}>{bi('ورود نسخه دارویی', 'Prescription intake')}</Text>
                    <View style={styles.pillRow}>
                      <Pill label={bi('آفلاین', 'Offline')} tone="warning" />
                      <Pill label={patientPrescriptionDraft.extractionStatus === 'approved' ? bi('تایید شده', 'Approved') : bi('در بازبینی', 'Under review')} tone={patientPrescriptionDraft.extractionStatus === 'approved' ? 'success' : 'warning'} />
                    </View>
                  </View>
                  <Text style={styles.meta}>{bi('این مسیر آفلاین و بدون AI خارجی است: نسخه یا عکس آن را بررسی کن، داروها را ویرایش کن، سپس پلن را بساز.', 'This flow is offline-friendly: review the prescription or its photo, edit medications, then generate the patient plan.')}</Text>
                  <Text style={styles.helperText}>{bi('پیشنهاد کار: ۱) عکس نسخه را نگاه کن ۲) داروها را دقیق بازنویسی کن ۳) پلن را بساز ۴) پلن را ذخیره کن', 'Suggested flow: review the prescription, rewrite medications carefully, generate the plan, then save it.')}</Text>
                  <FieldLabel text={bi('الگوهای سریع', 'Quick templates')} />
                  <View style={styles.templateWrap}>
                    <Pressable onPress={() => applyPrescriptionTemplate(selectedPatient.id, 'burn_pack')} style={styles.templateChip}><Text style={styles.templateChipText}>{bi('پک سوختگی', 'Burn pack')}</Text></Pressable>
                    <Pressable onPress={() => applyPrescriptionTemplate(selectedPatient.id, 'ointment')} style={styles.templateChip}><Text style={styles.templateChipText}>{bi('پماد', 'Ointment')}</Text></Pressable>
                    <Pressable onPress={() => applyPrescriptionTemplate(selectedPatient.id, 'dressing')} style={styles.templateChip}><Text style={styles.templateChipText}>{bi('پانسمان', 'Dressing')}</Text></Pressable>
                    <Pressable onPress={() => applyPrescriptionTemplate(selectedPatient.id, 'tablet')} style={styles.templateChip}><Text style={styles.templateChipText}>{bi('قرص', 'Tablet')}</Text></Pressable>
                    <Pressable onPress={() => applyPrescriptionTemplate(selectedPatient.id, 'syrup')} style={styles.templateChip}><Text style={styles.templateChipText}>{bi('شربت', 'Syrup')}</Text></Pressable>
                  </View>
                  <View style={styles.photoActionRow}>
                    <ActionButton label={bi('گرفتن عکس نسخه', 'Take prescription photo')} muted onPress={() => { void attachPrescriptionPhoto('camera'); }} />
                    <ActionButton label={bi('انتخاب از گالری', 'Choose from gallery')} muted onPress={() => { void attachPrescriptionPhoto('library'); }} />
                  </View>
                  {patientPrescriptionDraft.photoUri ? (
                    <View style={styles.photoCard}>
                      <Image source={{ uri: patientPrescriptionDraft.photoUri }} style={styles.photoPreview} resizeMode="cover" />
                      <Text style={styles.meta}>{bi('عکس نسخه ثبت شد و فقط برای بازبینی دستی استفاده می‌شود.', 'Prescription photo attached for manual review only.')}</Text>
                      <Text style={styles.meta}>{patientPrescriptionDraft.photoUpdatedAt ? formatCompactDate(new Date(patientPrescriptionDraft.photoUpdatedAt), state.language) : ''}</Text>
                      <ActionButton
                        label={bi('حذف عکس نسخه', 'Remove prescription photo')}
                        muted
                        onPress={() => updatePrescriptionDraft(selectedPatient.id, { photoUri: null, photoUpdatedAt: null, extractionStatus: 'manual_review' })}
                      />
                    </View>
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Text style={styles.meta}>{bi('هنوز عکس نسخه اضافه نشده است.', 'No prescription photo attached yet.')}</Text>
                    </View>
                  )}
                  <FieldLabel text={bi('منبع نسخه', 'Prescription source')} />
                  <TextInput
                    value={patientPrescriptionDraft.sourceNote}
                    onChangeText={(value) => updatePrescriptionDraft(selectedPatient.id, { sourceNote: value, extractionStatus: 'manual_review' })}
                    placeholder={bi('منبع نسخه: عکس موبایل، نسخه کاغذی، یا متن تایپ‌شده', 'Prescription source note')}
                    placeholderTextColor={theme.colors.muted}
                    style={[styles.input, styles.multi, localizedInputStyle]}
                    multiline
                  />
                  <FieldLabel text={bi('متن بازنویسی‌شده نسخه', 'Transcribed prescription text')} />
                  <TextInput
                    value={patientPrescriptionDraft.transcriptText}
                    onChangeText={(value) => updatePrescriptionDraft(selectedPatient.id, { transcriptText: value, extractionStatus: 'manual_review' })}
                    placeholder={bi('هر دارو را در یک خط بنویس. مثال: Mupirocin | thin layer | روزی دو بار | 08:00 | 7 | روی زخم تمیز', 'Write one medication per line. Example: Mupirocin | thin layer | twice daily | 08:00 | 7 | apply on clean wound')}
                    placeholderTextColor={theme.colors.muted}
                    style={[styles.input, styles.multi, localizedInputStyle]}
                    multiline
                  />
                  <Text style={styles.helperText}>
                    {bi(
                      'فرمت پیشنهادی: نام دارو | دوز | تناوب | ساعت | تعداد روز | یادداشت. اگر این قالب را رعایت نکنی هم اپ تلاش می‌کند نام و تناوب و ساعت را از متن حدس بزند.',
                      'Suggested format: medication | dose | frequency | time | days | note. Even without this format, the app will still try to infer name, frequency, and time.',
                    )}
                  </Text>
                  <ActionButton
                    label={bi('استخراج اولیه از متن', 'Extract draft from text')}
                    muted
                    onPress={() => {
                      if (!parsePrescriptionTranscriptForPatient(selectedPatient.id)) {
                        Alert.alert(
                          bi('متن کافی نیست', 'Not enough text'),
                          bi('حداقل یک خط شامل نام دارو یا دستور درمان وارد کن.', 'Enter at least one line with a medication or treatment instruction.'),
                        );
                      }
                    }}
                  />

                  {patientPrescriptionDraft.medications.map((medication, index) => (
                    <View key={`rx-${selectedPatient.id}-${index}`} style={styles.prescriptionCard}>
                      <Text style={styles.itemTitle}>{bi(`دارو ${index + 1}`, `Medication ${index + 1}`)}</Text>
                      <FieldLabel text={bi('نام دارو', 'Medication name')} />
                      <TextInput value={medication.medicationName} onChangeText={(value) => updatePrescriptionMedication(selectedPatient.id, index, { medicationName: value })} placeholder={bi('مثلا موپیروسین', 'For example Mupirocin')} placeholderTextColor={theme.colors.muted} style={[styles.input, localizedInputStyle]} />
                      <FieldLabel text={bi('دوز', 'Dose')} />
                      <TextInput value={medication.dose} onChangeText={(value) => updatePrescriptionMedication(selectedPatient.id, index, { dose: value })} placeholder={bi('مثلا یک لایه نازک', 'For example 1 thin layer')} placeholderTextColor={theme.colors.muted} style={[styles.input, localizedInputStyle]} />
                      <FieldLabel text={bi('تناوب مصرف', 'Frequency')} />
                      <TextInput value={medication.frequency} onChangeText={(value) => updatePrescriptionMedication(selectedPatient.id, index, { frequency: value })} placeholder={bi('مثلا روزی دو بار', 'For example twice daily')} placeholderTextColor={theme.colors.muted} style={[styles.input, localizedInputStyle]} />
                      <FieldLabel text={bi('ساعت اجرا', 'Time')} />
                      <TextInput value={medication.times} onChangeText={(value) => updatePrescriptionMedication(selectedPatient.id, index, { times: value })} placeholder={bi('مثلا 08:00', 'For example 08:00')} placeholderTextColor={theme.colors.muted} style={[styles.input, localizedInputStyle]} />
                      <FieldLabel text={bi('مدت مصرف به روز', 'Duration in days')} />
                      <TextInput value={medication.durationDays} onChangeText={(value) => updatePrescriptionMedication(selectedPatient.id, index, { durationDays: value })} placeholder={bi('مثلا 7', 'For example 7')} placeholderTextColor={theme.colors.muted} style={[styles.input, localizedInputStyle]} keyboardType="number-pad" />
                      <FieldLabel text={bi('یادداشت تکمیلی', 'Additional note')} />
                      <TextInput value={medication.note} onChangeText={(value) => updatePrescriptionMedication(selectedPatient.id, index, { note: value })} placeholder={bi('مثلا بعد از غذا یا روی زخم تمیز', 'For example after meals')} placeholderTextColor={theme.colors.muted} style={[styles.input, localizedInputStyle]} />
                    </View>
                  ))}

                  <ActionButton label={bi('افزودن داروی دیگر', 'Add another medication')} muted onPress={() => addPrescriptionMedication(selectedPatient.id)} />
                  <ActionButton
                    label={bi('ساخت پلن از روی داروها', 'Generate plan from medications')}
                    onPress={() => {
                      if (!generatePlanFromPrescription(selectedPatient.id)) {
                        Alert.alert(bi('نسخه ناقص است', 'Prescription is incomplete'), bi('حداقل یک دارو با نام و زمان لازم است.', 'At least one medication with a name and time is required.'));
                      }
                    }}
                  />
                </View>

                <TextInput value={patientPlanDraft.title} onChangeText={(value) => updatePlanDraft(selectedPatient.id, { title: value })} placeholder={bi('عنوان پلن', 'Plan title')} placeholderTextColor={theme.colors.muted} style={[styles.input, localizedInputStyle]} />
                <TextInput value={patientPlanDraft.startDate} onChangeText={(value) => updatePlanDraft(selectedPatient.id, { startDate: value })} placeholder={bi('تاریخ شروع YYYY-MM-DD', 'Start date YYYY-MM-DD')} placeholderTextColor={theme.colors.muted} style={[styles.input, localizedInputStyle]} />
                <TextInput value={patientPlanDraft.endDate} onChangeText={(value) => updatePlanDraft(selectedPatient.id, { endDate: value })} placeholder={bi('تاریخ پایان اختیاری', 'End date optional')} placeholderTextColor={theme.colors.muted} style={[styles.input, localizedInputStyle]} />

                {patientPlanDraft.items.map((item, index) => (
                  <View key={`${selectedPatient.id}-${index}`} style={styles.planItemCard}>
                    <Text style={styles.itemTitle}>{bi(`آیتم پلن ${index + 1}`, `Plan item ${index + 1}`)}</Text>
                    <TextInput value={item.label} onChangeText={(value) => updatePlanDraftItem(selectedPatient.id, index, { label: value })} placeholder={bi('عنوان', 'Label')} placeholderTextColor={theme.colors.muted} style={[styles.input, localizedInputStyle]} />
                    <TextInput value={item.instructions} onChangeText={(value) => updatePlanDraftItem(selectedPatient.id, index, { instructions: value })} placeholder={bi('دستور', 'Instructions')} placeholderTextColor={theme.colors.muted} style={[styles.input, localizedInputStyle]} />
                    <TextInput value={item.timeOfDay} onChangeText={(value) => updatePlanDraftItem(selectedPatient.id, index, { timeOfDay: value })} placeholder={bi('زمان 08:00', 'Time 08:00')} placeholderTextColor={theme.colors.muted} style={[styles.input, localizedInputStyle]} />
                  </View>
                ))}

                <ActionButton label={bi('افزودن آیتم جدید', 'Add another item')} muted onPress={() => addPlanDraftItem(selectedPatient.id)} />
                <ActionButton
                  label={bi('ذخیره پلن فعال', 'Save active plan')}
                  onPress={() => {
                    if (!savePlan(selectedPatient.id)) Alert.alert(bi('پلن ناقص است', 'Plan is incomplete'), bi('عنوان پلن و عنوان و زمان معتبر برای آیتم‌ها لازم است', 'A title and valid item labels/times are required.'));
                  }}
                />
              </SectionCard>
            ) : null}
          </ScrollView>
        </>
      ) : null}

      {state.currentSession.role === 'patient' ? (
        <>
          <View style={styles.nav}>
            <NavButton label={bi('امروز', 'Today')} active={state.currentRoute === 'patient/today'} onPress={() => navigate('patient/today')} />
            <NavButton label={bi('پلن کامل', 'Full plan')} active={state.currentRoute === 'patient/plan'} onPress={() => navigate('patient/plan')} />
            <NavButton label={bi('تاریخچه', 'History')} active={state.currentRoute === 'patient/history'} onPress={() => navigate('patient/history')} />
          </View>
          <ScrollView contentContainerStyle={[styles.content, isWide && styles.webMobileContent]}>
            {state.currentRoute === 'patient/today' ? (
              <View style={[styles.grid, isWide && styles.gridWide]}>
                <View style={styles.mainCol}>
                  <SectionCard>
                    <SectionTitle title={bi('پلن امروز', "Today's plan")} subtitle={bi('ثبت وضعیت آیتم‌ها با یک لمس', 'One-tap adherence updates for the patient.')} />
                    <ProgressBar value={patientProgress} />
                    {patientTodayRows.map((row) => (
                      <View key={row.planItem.id} style={styles.planRow}>
                        <View style={styles.flex1}>
                          <Text style={styles.itemTitle}>{translateSeedText(row.planItem.label)}</Text>
                          <Text style={styles.meta}>{translateSeedText(row.planItem.instructions)}</Text>
                        </View>
                        <View style={styles.end}>
                          <Pill label={row.latestStatus ? bi(statusFa(row.latestStatus), row.latestStatus) : bi('در انتظار', 'pending')} tone={getStatusTone(row.latestStatus)} />
                          <Text style={styles.meta}>{row.planItem.timeOfDay}</Text>
                        </View>
                        <View style={styles.statusActions}>
                          {(['done', 'not_done', 'later'] as PlanItemStatus[]).map((status) => (
                            <Pressable key={status} onPress={() => submitDailyCheck(row.planItem.id, status)} style={styles.statusButton}>
                              <Text style={styles.statusButtonText}>{bi(statusFa(status), status)}</Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    ))}
                  </SectionCard>
                </View>
                <View style={styles.sideCol}>
                  <SectionCard>
                    <SectionTitle title={bi('پیشرفت', 'Progress')} />
                    <MetricRow label={bi('انجام‌شده امروز', 'Completed today')} value={`${patientTodayRows.filter((row) => row.latestStatus === 'done').length}`} />
                    <MetricRow label={bi('پیشرفت', 'Progress')} value={`${patientProgress}%`} />
                  </SectionCard>
                </View>
              </View>
            ) : null}

            {state.currentRoute === 'patient/plan' ? (
              <SectionCard>
                <SectionTitle title={bi('پلن کامل', 'Full plan')} subtitle={selectedPatientPlan.plan?.title ? translateSeedText(selectedPatientPlan.plan.title) : bi('پلن فعالی ندارد', 'No active plan')} />
                {selectedPatientPlan.items.map((item) => (
                  <View key={item.id} style={styles.lineRow}>
                    <View style={styles.flex1}>
                      <Text style={styles.itemTitle}>{translateSeedText(item.label)}</Text>
                      <Text style={styles.meta}>{translateSeedText(item.instructions)}</Text>
                    </View>
                    <Text style={styles.metaStrong}>{item.timeOfDay}</Text>
                  </View>
                ))}
              </SectionCard>
            ) : null}

            {state.currentRoute === 'patient/history' ? (
              <SectionCard>
                <SectionTitle title={bi('تاریخچه اخیر', 'Recent history')} subtitle={bi('آخرین ثبت‌های بیمار', 'Latest patient check-ins.')} />
                {patientHistory.map((entry) => (
                  <View key={entry.id} style={styles.lineRow}>
                    <View style={styles.flex1}>
                      <Text style={styles.itemTitle}>{resolvePlanItemLabel(entry.planItemId, state.dailyChecks, state.plans, state.planItems)}</Text>
                      <Text style={styles.meta}>{entry.checkDate}</Text>
                    </View>
                    <Pill label={bi(statusFa(entry.status), entry.status)} tone={getStatusTone(entry.status)} />
                  </View>
                ))}
              </SectionCard>
            ) : null}
          </ScrollView>
        </>
      ) : null}

      {plannerSession ? (
        <>
          {plannerSession.role === 'planner_observer' ? (
            <View style={styles.nav}>
              <NavButton label={bi('صف بررسی', 'Review queue')} active={state.currentRoute === 'planner/dashboard'} onPress={() => navigate('planner/dashboard')} />
              <NavButton label={bi('تایید کارها', 'Review')} active={state.currentRoute === 'planner/reviews'} onPress={() => navigate('planner/reviews')} />
              <NavButton label={bi('افراد', 'People')} active={state.currentRoute === 'planner/network'} onPress={() => navigate('planner/network')} />
            </View>
          ) : null}
          <ScrollView contentContainerStyle={[styles.content, isWide && styles.webMobileContent]}>
            {plannerSession.role === 'planner_member' ? (
              <View style={[styles.rolePageFrame, { borderColor: activeRoleColor }]}>
                {renderAppHeader('role')}

                <View style={styles.roleIdentityRow}>
                  <Image source={roleImageFor(selectedHomeRoleKey)} style={[styles.roleHeaderIcon, { borderColor: activeRoleColor, backgroundColor: `${activeRoleColor}22` }]} resizeMode="contain" />
                  <Text style={styles.roleIdentityText}>{bi(activeHomeRole.titleFa, activeHomeRole.titleEn)} ({bi(activeHomeRole.responsibilityFa, activeHomeRole.responsibilityEn)})</Text>
                </View>

                {selectedHomeRoleKey === 'programBuilder' ? renderProgramBuilderPanel() : null}

                {selectedHomeRoleKey !== 'programBuilder' && selectedRolePlanId === null ? <Pressable onPress={() => setAddPlanMode(addPlanMode === 'none' ? 'existing' : 'none')} style={[styles.addPlanBanner, { backgroundColor: activeRoleColor }]}>
                  <Text style={styles.addPlanBannerText}>{bi('افزودن برنامه جدید +', '+ Add new plan')}</Text>
                </Pressable> : null}

                {selectedHomeRoleKey !== 'programBuilder' && selectedRolePlanId === null && addPlanMode !== 'none' ? (
                  <View style={styles.templateWrap}>
                    <Pressable onPress={() => setAddPlanMode('existing')} style={[styles.templateChip, addPlanMode === 'existing' && { backgroundColor: activeRoleColor, borderColor: activeRoleColor }]}>
                      <Text style={[styles.templateChipText, addPlanMode === 'existing' && styles.templateChipTextActive]}>{bi('انتخاب از برنامه‌های آماده', 'Choose ready plan')}</Text>
                    </Pressable>
                    <Pressable onPress={() => setAddPlanMode('custom')} style={[styles.templateChip, addPlanMode === 'custom' && { backgroundColor: activeRoleColor, borderColor: activeRoleColor }]}>
                      <Text style={[styles.templateChipText, addPlanMode === 'custom' && styles.templateChipTextActive]}>{bi('ساخت برنامه شخصی', 'Create personal plan')}</Text>
                    </Pressable>
                  </View>
                ) : null}

                {selectedHomeRoleKey !== 'programBuilder' && addPlanMode === 'existing' ? (
                  <View style={styles.sampleTable}>
                    <Text style={styles.productDecisionText}>{selectedHomeRoleKey === 'programBuilder' ? bi('این جدول برنامه‌های قبلی دکتر منصوری برای کپی و ویرایش است.', 'Previous programs for copy/edit.') : bi('برنامه‌های آماده فعلاً از برنامه‌ساز نمونه، دکتر منصوری، نمایش داده می‌شوند.', 'Ready-made programs currently come from Dr. Mansouri sample builder.')}</Text>
                    <View style={styles.sampleTableRow}>
                      <TextInput value={programFilters.code} onChangeText={(code) => setProgramFilters((current) => ({ ...current, code }))} placeholder={bi('کد', 'Code')} placeholderTextColor={theme.colors.muted} style={styles.sampleFilterCell} />
                      <TextInput value={programFilters.category} onChangeText={(category) => setProgramFilters((current) => ({ ...current, category }))} placeholder={bi('دسته', 'Category')} placeholderTextColor={theme.colors.muted} style={styles.sampleFilterCell} />
                      <TextInput value={programFilters.name} onChangeText={(name) => setProgramFilters((current) => ({ ...current, name }))} placeholder={bi('نام', 'Name')} placeholderTextColor={theme.colors.muted} style={styles.sampleFilterCell} />
                      <TextInput value={programFilters.provider} onChangeText={(provider) => setProgramFilters((current) => ({ ...current, provider }))} placeholder={bi('ارائه‌دهنده', 'Provider')} placeholderTextColor={theme.colors.muted} style={styles.sampleFilterCell} />
                      <TextInput value={programFilters.cost} onChangeText={(cost) => setProgramFilters((current) => ({ ...current, cost }))} placeholder={bi('هزینه', 'Cost')} placeholderTextColor={theme.colors.muted} style={styles.sampleFilterCell} />
                    </View>
                    <View style={styles.costRangeRow}>
                      <TextInput value={costRange.min} onChangeText={(min) => setCostRange((current) => ({ ...current, min }))} placeholder="حداقل تومان" placeholderTextColor={theme.colors.muted} keyboardType="number-pad" style={[styles.input, styles.costRangeInput, localizedInputStyle]} />
                      <TextInput value={costRange.max} onChangeText={(max) => setCostRange((current) => ({ ...current, max }))} placeholder="حداکثر تومان" placeholderTextColor={theme.colors.muted} keyboardType="number-pad" style={[styles.input, styles.costRangeInput, localizedInputStyle]} />
                    </View>
                    <View style={[styles.sampleTableRow, styles.sampleTableHeader]}>
                      {['کد برنامه', 'دسته', 'نام برنامه', 'ارائه‌دهنده', 'هزینه یک دوره'].map((header) => (
                        <Text key={header} style={styles.sampleTableCell}>{header}</Text>
                      ))}
                    </View>
                    {filteredPrograms.map((row) => (
                      <Pressable key={row[0]} onPress={() => addRolePlan(row[2], 'sample', createSampleTasks())} style={styles.sampleTableRow}>
                        {row.map((cell) => <Text key={`${row[0]}-${cell}`} style={styles.sampleTableCell}>{cell}</Text>)}
                      </Pressable>
                    ))}
                  </View>
                ) : null}

                {selectedHomeRoleKey !== 'programBuilder' && addPlanMode === 'custom' ? (
                  <View style={styles.planItemCard}>
                    <TextInput value={customPlanName} onChangeText={setCustomPlanName} placeholder={bi('نام برنامه', 'Plan name')} placeholderTextColor={theme.colors.muted} style={[styles.input, localizedInputStyle]} />
                    <ActionButton label={bi('ایجاد تب برنامه', 'Create plan tab')} onPress={() => customPlanName.trim() ? addRolePlan(customPlanName.trim(), 'custom') : Alert.alert(bi('نام برنامه لازم است', 'Plan name required'))} />
                  </View>
                ) : null}

                {selectedHomeRoleKey !== 'programBuilder' && selectedRolePlanId === null ? <View style={styles.performanceBlock}>
                  <Text style={styles.rolePerformanceTitle}>{bi(`گزارش عملکرد ${activeHomeRole.titleFa}`, `${activeHomeRole.titleEn} performance`)}</Text>
                  <Text style={styles.rolePerformanceTitle}>{bi(`درصد پایبندی کل برنامه‌ها: ${roleAdherence()}٪`, `Total adherence: ${roleAdherence()}%`)}</Text>
                  <View style={styles.templateWrap}>
                    {([
                      ['daily', 'روزانه'],
                      ['weekly', 'هفتگی'],
                      ['monthly', 'ماهانه'],
                      ['all', 'از شروع'],
                    ] as Array<[AdherenceWindow, string]>).map(([value, label]) => (
                      <Pressable key={value} onPress={() => setAdherenceWindow(value)} style={[styles.templateChip, adherenceWindow === value && { backgroundColor: activeRoleColor, borderColor: activeRoleColor }]}>
                        <Text style={[styles.templateChipText, adherenceWindow === value && styles.templateChipTextActive]}>{label}</Text>
                      </Pressable>
                    ))}
                  </View>
                  {(['overdue', 'done', 'upcoming'] as RoleTaskStatus[]).map((status) => (
                    <View key={status} style={styles.flex1}>
                      <Pressable onPress={() => setExpandedTaskStatus(expandedTaskStatus === status ? null : status)} style={styles.metricLink}>
                        <Text style={styles.metricLinkText}>{status === 'overdue' ? bi('کارهای عقب مانده', 'Overdue tasks') : status === 'done' ? bi('کارهای انجام شده', 'Completed tasks') : bi('کارهای پیش رو', 'Upcoming tasks')}</Text>
                      </Pressable>
                      {expandedTaskStatus === status ? (
                        <View style={styles.expandedTaskList}>
                          {aggregatedRoleTasks.filter(({ task }) => task.status === status).length === 0 ? (
                            <Text style={styles.meta}>{bi('موردی برای نمایش وجود ندارد.', 'Nothing to show.')}</Text>
                          ) : aggregatedRoleTasks.filter(({ task }) => task.status === status).map(({ plan, task }) => (
                            <Pressable key={`${plan.id}-${task.id}`} onPress={() => completeRoleTask(plan.id, task.id)} style={styles.lineRow}>
                              <Text style={[styles.itemTitle, task.status === 'done' && styles.doneTaskText]}>{task.title}</Text>
                              <Text style={styles.meta}>{plan.title} • {task.endTime}</Text>
                            </Pressable>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View> : null}

                {selectedHomeRoleKey !== 'programBuilder' && selectedRolePlan ? (
                  <View style={styles.planDetailBlock}>
                    <View style={[styles.planTitleBanner, { backgroundColor: activeRoleColor }]}>
                      <Text style={styles.planTitleBannerText}>{selectedRolePlan.title}</Text>
                      <Pressable onPress={() => togglePlanPin(selectedRolePlan.id)} style={styles.pinButton}>
                        <Image source={pinImage} style={[styles.pinIconSmall, { tintColor: selectedRolePlan.pinned ? '#d92d20' : theme.colors.muted }]} resizeMode="contain" />
                      </Pressable>
                    </View>
                    <View style={styles.planActionRow}>
                      <Pressable onPress={() => setIsPlanEditing((value) => !value)} style={[styles.editPlanButton, { borderColor: activeRoleColor }]}>
                        <Text style={[styles.editPlanButtonText, { color: activeRoleColor }]}>{isPlanEditing ? bi('پایان ویرایش', 'Finish editing') : bi('ویرایش برنامه', 'Edit plan')}</Text>
                      </Pressable>
                      <Pressable onPress={() => archiveRolePlan(selectedRolePlan.id)} style={[styles.editPlanButton, { borderColor: theme.colors.warning }]}>
                        <Text style={[styles.editPlanButtonText, { color: theme.colors.warning }]}>{bi('آرشیو برنامه', 'Archive')}</Text>
                      </Pressable>
                      <Pressable onPress={() => deleteRolePlan(selectedRolePlan.id)} style={[styles.editPlanButton, { borderColor: theme.colors.danger }]}>
                        <Text style={[styles.editPlanButtonText, { color: theme.colors.danger }]}>{bi('حذف برنامه', 'Delete')}</Text>
                      </Pressable>
                    </View>
                    <View style={styles.taskTable}>
                    <View style={[styles.taskTableRow, { backgroundColor: activeRoleColor }]}>
                      <Text style={styles.taskTableHeaderCell}>کار</Text>
                      <Text style={styles.taskTableTimeHeaderCell}>زمان</Text>
                      <Text style={styles.taskTableQualityHeaderCell}>کیفیت</Text>
                    </View>
                    {selectedRolePlan.tasks.map((task) => (
                      <Pressable key={task.id} onPress={() => completeRoleTask(selectedRolePlan.id, task.id)} style={[styles.taskTableRow, task.status === 'done' && styles.doneTaskRow]}>
                        <Text style={[styles.taskTableCell, task.status === 'done' && styles.doneTaskText]}>{task.title}</Text>
                        <Text style={[styles.taskTableTimeCell, task.status === 'done' && styles.doneTaskText]}>{task.frequency}{task.status === 'done' ? `، انجام: ${task.completedAt ?? ''}` : ''}</Text>
                        <View style={styles.taskTableQualityCell}>
                          {task.status === 'done' ? (
                            <>
                              <Pressable onPress={() => setOpenQualityTaskId(openQualityTaskId === task.id ? null : task.id)} style={styles.qualityDropdownButton}>
                                <Text style={styles.metaStrong}>{qualityEmojis[task.quality ?? 'بسیار خوب']} {task.quality ?? 'بسیار خوب'}</Text>
                              </Pressable>
                              {openQualityTaskId === task.id ? (
                                <View style={styles.qualityMenu}>
                                  {(Object.keys(qualityScores) as QualityLabel[]).map((quality) => (
                                    <Pressable key={`${task.id}-${quality}`} onPress={() => { updateRoleTaskQuality(selectedRolePlan.id, task.id, quality); setOpenQualityTaskId(null); }} style={styles.qualityMenuItem}>
                                      <Text style={styles.qualityChipText}>{qualityEmojis[quality]} {quality}</Text>
                                    </Pressable>
                                  ))}
                                </View>
                              ) : null}
                            </>
                          ) : (
                            <Text style={styles.disabledQualityText}>{bi('بعد از انجام', 'After done')}</Text>
                          )}
                        </View>
                      </Pressable>
                    ))}
                    {isPlanEditing && selectedRolePlan.source === 'custom' ? (
                      <View style={[styles.tableEditPanel, { borderColor: `${activeRoleColor}55` }]}>
                        <TextInput value={taskDraft.title} onChangeText={(title) => setTaskDraft((current) => ({ ...current, title }))} placeholder={bi('نام فعالیت', 'Task')} placeholderTextColor={theme.colors.muted} style={[styles.input, localizedInputStyle]} />
                        <View style={styles.scheduleGrid}>
                          <TextInput value={taskDraft.repeatCount} onChangeText={(repeatCount) => setTaskDraft((current) => ({ ...current, repeatCount }))} placeholder={bi('چند بار؟ (پیش‌فرض: 1)', 'How many times?')} placeholderTextColor={theme.colors.muted} keyboardType="number-pad" style={[styles.input, styles.scheduleInput, localizedInputStyle]} />
                          <TextInput value={taskDraft.windowQuantity} onChangeText={(windowQuantity) => setTaskDraft((current) => ({ ...current, windowQuantity }))} placeholder={bi('چند روز یکبار؟ (پیش‌فرض: هر روز)', 'Every how many days?')} placeholderTextColor={theme.colors.muted} keyboardType="number-pad" style={[styles.input, styles.scheduleInput, localizedInputStyle]} />
                          <TextInput value={taskDraft.durationQuantity} onChangeText={(durationQuantity) => setTaskDraft((current) => ({ ...current, durationQuantity }))} placeholder={bi('تا چند روز؟ (پیش‌فرض: تا همیشه)', 'For how many days?')} placeholderTextColor={theme.colors.muted} keyboardType="number-pad" style={[styles.input, styles.scheduleInput, localizedInputStyle]} />
                          <TextInput value={taskDraft.firstDate} onChangeText={(firstDate) => setTaskDraft((current) => ({ ...current, firstDate }))} placeholder={bi('اولین بار چه روزی انجام می‌دی؟ (پیش‌فرض: امروز) - TODO: Jalali date picker', 'First date?')} placeholderTextColor={theme.colors.muted} style={[styles.input, styles.scheduleInput, localizedInputStyle]} />
                          <TextInput value={taskDraft.deadlineTime === '24:00' ? '' : taskDraft.deadlineTime} onChangeText={(deadlineTime) => setTaskDraft((current) => ({ ...current, deadlineTime }))} onBlur={() => setTaskDraft((current) => ({ ...current, deadlineTime: current.deadlineTime.trim() ? normalizeTimeInput(current.deadlineTime) : '' }))} placeholder={bi('مهلت انجام (پیش‌فرض: تا آخر شب)', 'Deadline time?')} placeholderTextColor={theme.colors.muted} keyboardType="number-pad" style={[styles.input, styles.scheduleInput, localizedInputStyle]} />
                        </View>
                        <View style={styles.templateWrap}>
                          {persianWeekdays.map((day) => (
                            <Pressable key={day} onPress={() => setTaskDraft((current) => {
                              if (current.weekdays.includes(day) && current.weekdays.length === 1) return current;
                              return { ...current, weekdays: current.weekdays.includes(day) ? current.weekdays.filter((item) => item !== day) : [...current.weekdays, day] };
                            })} style={[styles.qualityChip, taskDraft.weekdays.includes(day) && { backgroundColor: activeRoleColor }]}>
                              <Text style={[styles.qualityChipText, taskDraft.weekdays.includes(day) && styles.bottomPlanTabTextActive]}>{day}</Text>
                            </Pressable>
                          ))}
                        </View>
                        <Pressable onPress={addTaskToSelectedPlan} style={[styles.taskAddWideButton, { backgroundColor: activeRoleColor }]}>
                          <Text style={styles.taskAddText}>{bi('افزودن فعالیت', 'Add task')}</Text>
                        </Pressable>
                      </View>
                    ) : null}
                    {isPlanEditing ? (
                      <>
                        <View style={[styles.taskTableRow, styles.tableEditRow]}>
                          <Text style={styles.taskTableCell}>{bi('اشتراک‌گذاری', 'Share')}</Text>
                          <Pressable onPress={() => setShowContactPicker(!showContactPicker)} style={styles.taskInputCell}>
                            <Text style={styles.metaStrong}>{shareDraft.name || bi('انتخاب مخاطب', 'Choose contact')}</Text>
                          </Pressable>
                          <View style={styles.shareRoleCell}>
                            <Pressable onPress={() => setShowShareRoleMenu((value) => !value)} style={styles.qualityDropdownButton}>
                              <Text style={styles.metaStrong}>{shareDraft.role} ▾</Text>
                            </Pressable>
                            {showShareRoleMenu ? (
                              <View style={styles.shareRoleMenu}>
                                {(['ناظر', 'مدیر', 'همکار', 'انجام‌دهنده'] as ShareAccessRole[]).map((role) => (
                                  <Pressable key={role} onPress={() => { setShareDraft((current) => ({ ...current, role })); setShowShareRoleMenu(false); }} style={styles.qualityMenuItem}>
                                    <Text style={styles.qualityChipText}>{role}</Text>
                                  </Pressable>
                                ))}
                              </View>
                            ) : null}
                            <Text style={styles.shareRoleHint}>{shareAccessDescriptions[shareDraft.role]}</Text>
                          </View>
                          <Pressable onPress={addSharedPerson} style={[styles.taskAddCell, { backgroundColor: activeRoleColor }]}>
                            <Text style={styles.taskAddText}>{bi('افزودن', 'Add')}</Text>
                          </Pressable>
                        </View>
                        {showContactPicker ? (
                          <View style={styles.contactPicker}>
                            <Text style={styles.productDecisionText}>{bi('TODO: اتصال به مخاطبین گوشی نیازمند مجوز و ماژول Contacts است. فعلاً دوستان Life Maker نمایش داده می‌شوند.', 'TODO: phone contacts require Contacts permission/module. Life Maker friends are shown for now.')}</Text>
                            {lifeMakerContacts.map((contact) => (
                              <Pressable key={contact} onPress={() => { setShareDraft((current) => ({ ...current, name: contact })); setShowContactPicker(false); }} style={styles.contactPickerItem}>
                                <Text style={styles.itemTitle}>{contact}</Text>
                              </Pressable>
                            ))}
                          </View>
                        ) : null}
                      </>
                    ) : null}
                    {sharedPeople.map((person) => (
                      <View key={person.id} style={styles.sharedPersonRow}>
                        <Text style={styles.taskTableCell}>{person.name}</Text>
                        <Text style={styles.taskTableCell}>{person.role}</Text>
                      </View>
                    ))}
                    </View>
                  </View>
                ) : null}

                {selectedHomeRoleKey !== 'programBuilder' ? <View style={styles.chartWrap}>
                  {adherenceChartValues.map((value, index) => (
                    <View key={`role-chart-${index}`} style={styles.chartColumn}>
                      <View style={[styles.chartBar, { height: Math.max(8, value), backgroundColor: activeRoleColor }]} />
                      <Text style={styles.chartDayLabel}>{adherenceChartLabels[index]}</Text>
                    </View>
                  ))}
                </View> : null}
                {selectedHomeRoleKey !== 'programBuilder' ? <Text style={styles.meta}>{selectedRolePlan ? bi(`نمودار ۷ روز گذشته برنامه ${selectedRolePlan.title}`, `Last 7 days for ${selectedRolePlan.title}`) : bi('نمودار ۷ روز گذشته نقش', 'Last 7 days for role')}</Text> : null}

                {selectedHomeRoleKey !== 'programBuilder' && selectedRolePlan ? (
                  <Text style={styles.rolePerformanceTitle}>{bi(`درصد پایبندی به این برنامه: ${planAdherence(selectedRolePlan)}٪`, `This plan adherence: ${planAdherence(selectedRolePlan)}%`)}</Text>
                ) : null}
                {selectedHomeRoleKey !== 'programBuilder' ? <View style={styles.bottomPlanTabs}>
                  <Pressable onPress={() => { setSelectedRolePlanId(null); setIsPlanEditing(false); }} style={[styles.bottomPlanTab, selectedRolePlanId === null && { backgroundColor: activeRoleColor, borderColor: activeRoleColor }]}>
                    <Text style={[styles.bottomPlanTabText, selectedRolePlanId === null && styles.bottomPlanTabTextActive]}>{bi('خانه', 'Home')}</Text>
                  </Pressable>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bottomPlanTabsScroll}>
                    {currentRolePlans.map((plan) => (
                      <Pressable key={plan.id} onPress={() => { setSelectedRolePlanId(plan.id); setIsPlanEditing(false); }} onLongPress={() => deleteRolePlan(plan.id)} style={[styles.bottomPlanTab, selectedRolePlan?.id === plan.id && { backgroundColor: activeRoleColor, borderColor: activeRoleColor }]}>
                        <Text style={[styles.bottomPlanTabText, selectedRolePlan?.id === plan.id && styles.bottomPlanTabTextActive]}>{plan.title}</Text>
                      </Pressable>
                    ))}
                    <Pressable onPress={() => { setSelectedRolePlanId(null); setAddPlanMode('existing'); setIsPlanEditing(false); }} style={[styles.bottomPlanTabAdd, { borderColor: activeRoleColor }]}>
                      <Text style={[styles.bottomPlanTabText, { color: activeRoleColor }]}>+</Text>
                    </Pressable>
                  </ScrollView>
                </View> : null}
              </View>
            ) : null}

            {false && plannerSession && routinePlanDraft && state.currentRoute === 'planner/plans' && plannerSession?.role === 'planner_member' ? (
              <View style={[styles.rolePageFrame, { borderColor: activeRoleColor }]}>
                <View style={styles.rolePageHeader}>
                  <Text style={styles.dateText}>{formatDateLabel(new Date(), state.language)}</Text>
                  <View style={styles.brandBlock}>
                    <Text style={styles.logoText}>logo</Text>
                    <Text style={styles.heroTitle}>Life Maker</Text>
                  </View>
                  <Pressable onPress={() => navigate('planner/dashboard')} style={[styles.homeIconButton, { backgroundColor: activeRoleColor }]}>
                    <Text style={styles.homeIconText}>⌂</Text>
                  </Pressable>
                </View>
                <View style={styles.roleHero}>
                  <Image source={roleImageFor(activeLifeRole)} style={styles.roleHeroImage} resizeMode="contain" />
                  <Text style={styles.lifeRoleTitle}>{activeLifeRole === 'mission' ? bi('انجام وظایف شغلی', 'Employee') : bi('مراقبت از خود', 'Self-care')}</Text>
                </View>

                <View style={styles.addPlanBanner}>
                  <Text style={styles.addPlanBannerText}>{bi('افزودن برنامه جدید +', '+ Add new plan')}</Text>
                </View>
                <View style={styles.templateWrap}>
                  <Pressable onPress={() => setPlanBuilderMode('existing')} style={[styles.templateChip, planBuilderMode === 'existing' && styles.templateChipActive]}>
                    <Text style={[styles.templateChipText, planBuilderMode === 'existing' && styles.templateChipTextActive]}>{bi('از برنامه‌های موجود', 'Existing plans')}</Text>
                  </Pressable>
                  <Pressable onPress={() => setPlanBuilderMode('custom')} style={[styles.templateChip, planBuilderMode === 'custom' && styles.templateChipActive]}>
                    <Text style={[styles.templateChipText, planBuilderMode === 'custom' && styles.templateChipTextActive]}>{bi('خودم برنامه می‌سازم', 'Create custom plan')}</Text>
                  </Pressable>
                </View>

                {planBuilderMode === 'choice' ? (
                  <Text style={styles.productDecisionText}>{bi('یکی از دو مسیر افزودن برنامه را انتخاب کن.', 'Choose one add-plan path.')}</Text>
                ) : null}

                {planBuilderMode === 'existing' ? (
                  <View style={styles.sampleTable}>
                    <View style={[styles.sampleTableRow, styles.sampleTableHeader]}>
                      {['کد برنامه', 'دسته', 'نام برنامه', 'ارائه دهنده', 'هزینه یک دوره'].map((header) => (
                        <Text key={header} style={styles.sampleTableCell}>{header}</Text>
                      ))}
                    </View>
                    {drMansouriProgramSamples.map((row) => (
                      <Pressable key={row[0]} onPress={() => setActivePlanTab('skin')} style={styles.sampleTableRow}>
                        {row.map((cell) => <Text key={`${row[0]}-${cell}`} style={styles.sampleTableCell}>{cell}</Text>)}
                      </Pressable>
                    ))}
                  </View>
                ) : null}

                {planBuilderMode === 'custom' ? (
                  <>
                    <TextInput value={routinePlanDraft!.title} onChangeText={(value) => updateRoutinePlanDraft(plannerSession!.userId, { title: value })} placeholder={bi('نام برنامه', 'Plan name')} placeholderTextColor={theme.colors.muted} style={[styles.input, localizedInputStyle]} />
                    <View style={styles.taskTable}>
                      <View style={[styles.taskTableRow, { backgroundColor: activeRoleColor }]}>
                        <Text style={styles.taskTableHeaderCell}>کار</Text>
                        <Text style={styles.taskTableTimeHeaderCell}>زمان</Text>
                        <Text style={styles.taskTableQualityHeaderCell}>کیفیت</Text>
                      </View>
                      {skincareTaskSamples.map((row) => (
                        <View key={`${row[0]}-${row[2]}`} style={styles.taskTableRow}>
                          <Text style={styles.taskTableCell}>{row[0]}</Text>
                          <Text style={styles.taskTableTimeCell}>{row[1]}{row[2] ? `، تا ${row[2]}` : ''}</Text>
                          <Text style={styles.taskTableQualityCell}>{row[3]}</Text>
                        </View>
                      ))}
                      <View style={styles.taskTableRow}>
                        <TextInput value={routinePlanDraft!.tasks[0]?.title ?? ''} onChangeText={(value) => updateRoutineTaskDraft(plannerSession!.userId, 0, { title: value })} placeholder={bi('کار', 'Task')} placeholderTextColor={theme.colors.muted} style={[styles.taskInputCell, localizedInputStyle]} />
                        <View style={styles.taskTimeInputCell}>
                          <TextInput value={routinePlanDraft!.tasks[0]?.recurrenceDaysText || '۱'} onChangeText={(value) => updateRoutineTaskDraft(plannerSession!.userId, 0, { recurrenceDaysText: value })} placeholder={bi('چند روز یکبار؟', 'Every X days')} placeholderTextColor={theme.colors.muted} style={[styles.taskInputCell, localizedInputStyle]} />
                          <TextInput value={routinePlanDraft!.tasks[0]?.dueTime || '12:00'} onChangeText={(value) => updateRoutineTaskDraft(plannerSession!.userId, 0, { dueTime: value })} placeholder={bi('ساعت پایان کار', 'End time')} placeholderTextColor={theme.colors.muted} style={[styles.taskInputCell, localizedInputStyle]} />
                        </View>
                        <Pressable onPress={() => addRoutineTaskDraft(plannerSession!.userId)} style={styles.taskAddCell}>
                          <Text style={styles.taskAddText}>{bi('افزودن +', 'Add +')}</Text>
                        </Pressable>
                      </View>
                    </View>
                    <View style={styles.shareStrip}>
                      <Text style={styles.itemTitle}>{bi('اشتراک گذاشته شده برای', 'Shared with')}</Text>
                      <Text style={styles.meta}>{bi('افزودن مخاطب +', 'Add contact +')}</Text>
                      <Text style={styles.metaStrong}>{bi('برای چه این برنامه را با این فرد به اشتراک می‌گذاری؟', 'Why are you sharing this?')}</Text>
                      {shareAccessRoles.map(([role, desc]) => (
                        <View key={role} style={styles.lineRow}>
                          <Text style={styles.itemTitle}>{role}</Text>
                          <Text style={[styles.meta, styles.flex1]}>{desc}</Text>
                        </View>
                      ))}
                    </View>
                    <ActionButton
                      label={bi('ذخیره پلن', 'Save plan')}
                      onPress={() => {
                        if (!saveRoutinePlan(plannerSession!.userId)) {
                          Alert.alert(bi('پلن ناقص است', 'Incomplete plan'), bi('عنوان پلن و عنوان و زمان هر کار لازم است.', 'The plan title plus each task title and time are required.'));
                        }
                      }}
                    />
                  </>
                ) : null}
              </View>
            ) : null}

            {false && plannerSession && state.currentRoute === 'planner/reviews' && plannerSession?.role === 'planner_member' ? (
              <SectionCard>
                <SectionTitle title={bi('وضعیت تایید ناظر', 'Observer decisions')} subtitle={bi('مشاهده تایید یا رد آخرین ثبت‌های تو', 'See how observers responded to your latest task updates.')} />
                {plannerTodayRows.map((row) => (
                  <View key={`member-review-${row.task.id}`} style={styles.lineRow}>
                    <View style={styles.flex1}>
                      <Text style={styles.itemTitle}>{row.task.title}</Text>
                      <Text style={styles.meta}>{resolveUserName(row.task.observerUserId)}</Text>
                      <Text style={styles.meta}>{row.latestReview?.note ?? (row.needsReview ? bi('هنوز ناظر پاسخ نداده است', 'Observer has not reviewed this update yet.') : bi('برای این ثبت نظری ثبت نشده است', 'No observer comment yet.'))}</Text>
                    </View>
                    {row.latestReview ? <Pill label={reviewDecisionLabel(row.latestReview.decision)} tone={row.latestReview.decision === 'approved' ? 'success' : 'danger'} /> : <Pill label={bi('در انتظار', 'Pending')} tone="warning" />}
                  </View>
                ))}
              </SectionCard>
            ) : null}

            {state.currentRoute === 'planner/dashboard' && plannerSession.role === 'planner_observer' ? (
              <View style={[styles.grid, isWide && styles.gridWide]}>
                <View style={styles.mainCol}>
                  <SectionCard>
                    <SectionTitle title={bi('صف بررسی ناظر', 'Observer queue')} subtitle={bi('ثبت‌های جدید اعضا که باید تایید یا رد شوند', 'Recent member submissions waiting for your review.')} />
                    {observerQueue.slice(0, 6).map((entry) => (
                      <View key={`observer-dashboard-${entry.check.id}`} style={styles.planRow}>
                        <View style={styles.flex1}>
                          <Text style={styles.itemTitle}>{entry.task?.title ?? bi('کار نامشخص', 'Unknown task')}</Text>
                          <Text style={styles.meta}>{entry.owner?.name} • {entry.check.checkDate}</Text>
                          <Text style={styles.meta}>{entry.check.note || bi('بدون یادداشت', 'No note')}</Text>
                        </View>
                        {entry.latestReview ? <Pill label={reviewDecisionLabel(entry.latestReview.decision)} tone={entry.latestReview.decision === 'approved' ? 'success' : 'danger'} /> : <Pill label={bi('نیازمند بررسی', 'Needs review')} tone="warning" />}
                      </View>
                    ))}
                  </SectionCard>
                </View>
                <View style={styles.sideCol}>
                  <SectionCard>
                    <SectionTitle title={bi('افراد تحت نظارت', 'Members you observe')} />
                    {plannerManagedMembers.map((entry) => (
                      <View key={entry.link.id} style={styles.lineRow}>
                        <View style={styles.flex1}>
                          <Text style={styles.itemTitle}>{entry.member?.name}</Text>
                          <Text style={styles.meta}>{relationKindLabel(entry.link.relationKind)}</Text>
                        </View>
                        <Text style={styles.metaStrong}>{entry.summary.rate7d}%</Text>
                      </View>
                    ))}
                    <ActionButton label={bi('رفتن به تاییدها', 'Open reviews')} muted onPress={() => navigate('planner/reviews')} />
                  </SectionCard>
                </View>
              </View>
            ) : null}

            {state.currentRoute === 'planner/reviews' && plannerSession.role === 'planner_observer' ? (
              <SectionCard>
                <SectionTitle title={bi('تایید یا رد کارها', 'Approve or reject updates')} subtitle={bi('اینجا همان نقش دوست، ناظر تیمی یا مدیر را بازی می‌کنی.', 'This is the shared observer flow for friends, team observers, and managers.')} />
                {observerQueue.map((entry) => (
                  <View key={entry.check.id} style={styles.planItemCard}>
                    <Text style={styles.itemTitle}>{entry.task?.title ?? bi('کار نامشخص', 'Unknown task')}</Text>
                    <Text style={styles.meta}>{entry.owner?.name} • {entry.check.checkDate} • {entry.task ? recurrenceLabel(entry.task.recurrence, entry.task.recurrenceDays, entry.task.customRuleText) : ''}</Text>
                    <Text style={styles.meta}>{bi('وضعیت ثبت‌شده', 'Logged status')}: {bi(statusFa(entry.check.status), entry.check.status)}</Text>
                    <Text style={styles.meta}>{bi('یادداشت عضو', 'Member note')}: {entry.check.note || bi('ندارد', 'None')}</Text>
                    <TextInput
                      value={routineReviewNotes[entry.check.id] ?? entry.latestReview?.note ?? ''}
                      onChangeText={(value) => setRoutineReviewNotes((current) => ({ ...current, [entry.check.id]: value }))}
                      placeholder={bi('یادداشت ناظر', 'Observer note')}
                      placeholderTextColor={theme.colors.muted}
                      style={[styles.input, localizedInputStyle]}
                    />
                    <View style={styles.photoActionRow}>
                      <ActionButton
                        label={bi('تایید', 'Approve')}
                        onPress={() => {
                          reviewRoutineCheck(entry.check.id, 'approved', routineReviewNotes[entry.check.id] ?? '');
                        }}
                      />
                      <ActionButton
                        label={bi('رد', 'Reject')}
                        muted
                        onPress={() => {
                          reviewRoutineCheck(entry.check.id, 'rejected', routineReviewNotes[entry.check.id] ?? '');
                        }}
                      />
                    </View>
                    {entry.latestReview ? <Pill label={reviewDecisionLabel(entry.latestReview.decision)} tone={entry.latestReview.decision === 'approved' ? 'success' : 'danger'} /> : null}
                  </View>
                ))}
              </SectionCard>
            ) : null}

            {state.currentRoute === 'planner/network' ? (
              <SectionCard>
                <SectionTitle title={bi('شبکه ناظرها و اعضا', 'Observer and member network')} subtitle={bi('اگر ساختار رسمی مدیر/کارمند نباشد، همین مفهوم ناظر استفاده می‌شود.', 'When there is no formal manager/employee structure, the same observer role is used.')} />
                {plannerLinks.map((link) => (
                  <View key={link.id} style={styles.lineRow}>
                    <View style={styles.flex1}>
                      <Text style={styles.itemTitle}>{link.title}</Text>
                      <Text style={styles.meta}>
                        {plannerSession.role === 'planner_member' ? resolveUserName(link.observerUserId) : resolveUserName(link.memberUserId)}
                      </Text>
                    </View>
                    <Pill label={relationKindLabel(link.relationKind)} tone={link.relationKind === 'manager' ? 'danger' : link.relationKind === 'team_observer' ? 'warning' : 'success'} />
                  </View>
                ))}
              </SectionCard>
            ) : null}
          </ScrollView>
        </>
      ) : null}

      {state.currentSession.role === 'admin' ? (
        <>
          <View style={styles.nav}>
            <NavButton label={bi('داشبورد', 'Dashboard')} active={state.currentRoute === 'admin/dashboard'} onPress={() => navigate('admin/dashboard')} />
            <NavButton label={bi('کلینیک‌ها', 'Clinics')} active={state.currentRoute === 'admin/clinics'} onPress={() => navigate('admin/clinics')} />
            <NavButton label={bi('کاربران', 'Users')} active={state.currentRoute === 'admin/users'} onPress={() => navigate('admin/users')} />
            <NavButton label={bi('بیماران', 'Patients')} active={state.currentRoute === 'admin/patients'} onPress={() => navigate('admin/patients')} />
          </View>
          <ScrollView contentContainerStyle={[styles.content, isWide && styles.webMobileContent]}>
            {state.currentRoute === 'admin/dashboard' ? (
              <View style={styles.metricWrap}>
                <Metric label={bi('کلینیک‌ها', 'Clinics')} value={`${adminMetrics.clinics}`} />
                <Metric label={bi('کاربران', 'Users')} value={`${adminMetrics.users}`} />
                <Metric label={bi('بیماران', 'Patients')} value={`${adminMetrics.patients}`} />
                <Metric label={bi('پلن‌های فعال', 'Active plans')} value={`${adminMetrics.activePlans}`} />
              </View>
            ) : null}

            {state.currentRoute === 'admin/clinics' ? (
              <SectionCard>
                <SectionTitle title={bi('کلینیک‌ها', 'Clinics')} />
                {state.clinics.map((clinic) => (
                  <View key={clinic.id} style={styles.lineRow}>
                    <Text style={styles.itemTitle}>{clinic.name}</Text>
                    <Text style={styles.meta}>{clinic.city}</Text>
                  </View>
                ))}
              </SectionCard>
            ) : null}

            {state.currentRoute === 'admin/users' ? (
              <SectionCard>
                <SectionTitle title={bi('کاربران', 'Users')} />
                {state.users.map((user) => (
                  <View key={user.id} style={styles.lineRow}>
                    <Text style={styles.itemTitle}>{user.name}</Text>
                    <Text style={styles.meta}>{roleLabel(user.role)}</Text>
                  </View>
                ))}
              </SectionCard>
            ) : null}

            {state.currentRoute === 'admin/patients' ? (
              <SectionCard>
                <SectionTitle title={bi('بیماران', 'Patients')} />
                {patientSummaries.map((entry) => (
                  <View key={entry.patient.id} style={styles.tableRow}>
                    <Text style={[styles.cell, styles.flex2]}>{entry.patient.name}</Text>
                    <Text style={styles.cell}>{translateSeedText(entry.patient.condition)}</Text>
                    <Text style={styles.cell}>{entry.summary.rate7d}%</Text>
                    <View style={styles.cellPill}><Pill label={entry.summary.needsFollowUp ? bi('پیگیری', 'Follow-up') : bi('پایدار', 'Stable')} tone={entry.summary.needsFollowUp ? 'danger' : 'success'} /></View>
                  </View>
                ))}
              </SectionCard>
            ) : null}
          </ScrollView>
        </>
      ) : null}
    </SafeAreaView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.meta}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.lineRow}>
      <Text style={styles.meta}>{label}</Text>
      <Text style={styles.metaStrong}>{value}</Text>
    </View>
  );
}

function CredentialLine({ label, value }: { label: string; value: string }) {
  return <MetricRow label={label} value={value} />;
}

function FieldLabel({ text }: { text: string }) {
  return <Text style={styles.fieldLabel}>{text}</Text>;
}

function statusFa(status: PlanItemStatus) {
  if (status === 'done') return 'انجام شد';
  if (status === 'not_done') return 'انجام نشد';
  return 'بعدا';
}

function translateReason(reason?: string) {
  if (!reason) return '';
  if (currentLanguage === 'en') return reason;

  const dictionary: Record<string, string> = {
    Stable: 'پایدار',
    'Active plan with no first check-in yet': 'پلن فعال دارد اما هنوز اولین چک ثبت نشده است',
    'No DailyCheck in the last 2 days': 'در ۲ روز اخیر هیچ چکی ثبت نشده است',
    '7-day adherence below 40%': 'پایبندی ۷ روزه کمتر از ۴۰٪ است',
  };

  return dictionary[reason] ?? reason;
}

function priorityLabel(priority: 1 | 2 | 3) {
  if (priority === 3) return bi('اولویت بالا', 'High priority');
  if (priority === 2) return bi('اولویت متوسط', 'Medium priority');
  return bi('اولویت پایین', 'Low priority');
}

function scopeLabel(scope: 'personal' | 'team' | 'work') {
  if (scope === 'personal') return bi('شخصی', 'Personal');
  if (scope === 'team') return bi('تیمی', 'Team');
  return bi('کاری', 'Work');
}

function recurrenceLabel(recurrence: 'daily' | 'weekly' | 'specific_days' | 'custom', days: number[], customText: string) {
  if (recurrence === 'daily') return bi('روزانه', 'Daily');
  if (recurrence === 'weekly') return bi(`هفتگی ${days[0] ?? ''}`, `Weekly ${days[0] ?? ''}`);
  if (recurrence === 'specific_days') return bi(`روزهای خاص ${days.join(',')}`, `Specific days ${days.join(',')}`);
  return customText || bi('سفارشی', 'Custom');
}

function NavButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.navItem, active && styles.navActive]}>
      <Text style={[styles.navText, active && styles.navTextActive]}>{label}</Text>
    </Pressable>
  );
}

function resolvePlanItemLabel(planItemId: string, _checks: DailyCheck[], _plans: unknown[], planItems: { id: string; label: string }[]) {
  return planItems.find((item) => item.id === planItemId)?.label ?? 'Plan item';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(47,36,29,0.45)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: theme.colors.surface, borderRadius: 24, padding: 16, gap: 12, borderWidth: 1, borderColor: theme.colors.border },
  modalPhoto: { width: '100%', height: 320, borderRadius: 16, backgroundColor: theme.colors.surfaceAlt },
  modalActions: { gap: 8 },
  content: { padding: 16, gap: 16 },
  webMobileContent: { width: '30%', minWidth: 360, maxWidth: 460, alignSelf: 'center' },
  authContent: { flexGrow: 1, justifyContent: 'center', padding: 18 },
  authCard: { gap: 12, padding: 18, borderRadius: 28, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  authModeRow: { flexDirection: 'row-reverse', gap: 8 },
  authModeButton: { flex: 1, minHeight: 42, borderRadius: 999, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  authModeButtonActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  authModeText: { color: theme.colors.text, fontWeight: '900' },
  appHeaderWrap: { gap: 6, zIndex: 10 },
  appHeader: { minHeight: 38, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 6, paddingHorizontal: 2 },
  headerIconButton: { width: 34, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.border },
  headerIconText: { color: theme.colors.text, fontSize: 12, fontWeight: '900' },
  headerDate: { flex: 1.25, color: theme.colors.text, fontSize: 11, fontWeight: '700', textAlign: 'right' },
  headerBrand: { flex: 0.9, color: theme.colors.text, fontSize: 14, fontWeight: '900', textAlign: 'center' },
  headerAccount: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'flex-start', gap: 4 },
  headerUserName: { flexShrink: 1, color: theme.colors.text, fontSize: 11, fontWeight: '800', textAlign: 'right' },
  cartIcon: { width: 30, color: theme.colors.text, fontSize: 16, textAlign: 'left' },
  accountMenu: { alignSelf: 'flex-start', minWidth: 210, gap: 4, padding: 8, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: '#fff' },
  accountMenuItem: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, backgroundColor: theme.colors.surfaceAlt },
  accountDetails: { gap: 4, padding: 8, borderRadius: 10, backgroundColor: '#fff' },
  landingTop: { alignItems: 'flex-end', paddingHorizontal: 4 },
  languageMini: { width: 34, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.border },
  languageMiniText: { color: theme.colors.text, fontSize: 11, fontWeight: '800' },
  hero: { margin: 16, padding: 24, borderRadius: 28, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, gap: 12 },
  heroTitle: { fontSize: 28, fontWeight: '800', color: theme.colors.text },
  heroText: { color: theme.colors.subtext, lineHeight: 22 },
  quoteText: { color: theme.colors.text, fontSize: 13, lineHeight: 22, textAlign: 'right' },
  eyebrow: { color: theme.colors.secondary, fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '800', color: theme.colors.text },
  topBar: { paddingHorizontal: 16, paddingTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grid: { gap: 16 },
  gridWide: { flexDirection: 'row', alignItems: 'flex-start' },
  mainCol: { flex: 1.5, gap: 16 },
  sideCol: { flex: 1, gap: 16 },
  metricWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metric: { minWidth: 160, flexGrow: 1, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, padding: 16, borderRadius: 18 },
  metricValue: { marginTop: 4, fontSize: 24, fontWeight: '800', color: theme.colors.primary },
  shortcutGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  shortcutCard: { minWidth: 150, flexGrow: 1, borderRadius: 12, borderWidth: 1, padding: 12, gap: 6, alignItems: 'center' },
  shortcutTitle: { fontWeight: '800', fontSize: 13, textAlign: 'right' },
  todayTasksShortcut: { width: '100%', borderWidth: 1, borderRadius: 14, backgroundColor: '#fff', padding: 12, gap: 4 },
  todayTasksTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '900', textAlign: 'right' },
  todayTaskList: { gap: 4 },
  todayTaskGroupRow: { flexDirection: 'row-reverse', alignItems: 'stretch', gap: 4 },
  todayTaskRow: { flex: 1, minHeight: 34, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, gap: 6 },
  todayVerticalBar: { width: 28, minHeight: 34, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  todayPlanBar: { width: 22, backgroundColor: '#fff' },
  todayVerticalSpacer: { width: 28, minHeight: 34 },
  todayPlanSpacer: { width: 22 },
  todayRoleIcon: { width: 14, height: 14 },
  todayVerticalText: { color: theme.colors.text, fontSize: 8, fontWeight: '900', transform: [{ rotate: '90deg' }], minWidth: 44, textAlign: 'center' },
  todayQualityButton: { minWidth: 64, alignItems: 'center' },
  pinIconSmall: { width: 18, height: 18 },
  nav: { marginHorizontal: 16, marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  navItem: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: theme.colors.surfaceAlt },
  navActive: { backgroundColor: theme.colors.primary },
  navText: { color: theme.colors.text, fontWeight: '700' },
  navTextActive: { color: '#fff' },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  lifeRoleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  lifeRoleTile: { width: '30%', minWidth: 118, flexGrow: 1, alignItems: 'center', gap: 8, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: 'transparent', backgroundColor: 'transparent' },
  lifeRoleActive: { backgroundColor: 'rgba(38,92,75,0.08)', borderColor: theme.colors.primary },
  lifeRoleImageWrap: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e7e7ef', overflow: 'hidden', borderWidth: 2 },
  lifeRoleImage: { width: 66, height: 66 },
  lifeRoleTitle: { color: theme.colors.text, fontWeight: '900', fontSize: 12, textAlign: 'center' },
  lifeRoleSubtitle: { color: theme.colors.subtext, fontSize: 10, fontWeight: '700', textAlign: 'center', lineHeight: 14, minHeight: 28 },
  activeRolePreview: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  activeRoleImage: { width: 58, height: 58, borderRadius: 29, backgroundColor: theme.colors.surfaceAlt, borderWidth: 2 },
  addRoleCircle: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: theme.colors.border, backgroundColor: '#fff' },
  addRolePlus: { color: theme.colors.primary, fontSize: 38, fontWeight: '300' },
  wheelTrack: { height: 18, flexDirection: 'row', overflow: 'hidden', borderRadius: 999, backgroundColor: theme.colors.surfaceAlt },
  wheelSegment: { height: '100%' },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  roleChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: '#fff' },
  roleChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  roleChipText: { color: theme.colors.text, fontWeight: '700' },
  roleChipTextActive: { color: '#fff' },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 16, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 12, color: theme.colors.text },
  inputRtl: { textAlign: 'right', writingDirection: 'rtl' },
  inputLtr: { textAlign: 'left', writingDirection: 'ltr' },
  multi: { minHeight: 96, textAlignVertical: 'top' },
  meta: { color: theme.colors.subtext, fontSize: 12 },
  metaStrong: { color: theme.colors.text, fontSize: 13, fontWeight: '700' },
  itemTitle: { color: theme.colors.text, fontWeight: '700' },
  fieldLabel: { color: theme.colors.text, fontSize: 12, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  helperText: { color: theme.colors.secondary, fontSize: 12, lineHeight: 18 },
  roleHomeFrame: { gap: 14, padding: 12, backgroundColor: theme.colors.surface },
  compactHomeHeader: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  compactBrandRow: { flex: 1.1, flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'flex-start' },
  compactBrand: { color: theme.colors.text, fontSize: 14, fontWeight: '900', textAlign: 'left' },
  compactUserName: { flex: 1, color: theme.colors.text, fontSize: 12, fontWeight: '800', textAlign: 'right' },
  compactDate: { flex: 1.4, color: theme.colors.text, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  roleHomeHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  dateBlock: { flex: 1, alignItems: 'flex-start', gap: 4 },
  dateText: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
  brandBlock: { flex: 1, alignItems: 'center', gap: 4 },
  logoMark: { minWidth: 54, minHeight: 28, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
  homeShortcutArea: { minHeight: 64, alignItems: 'center', justifyContent: 'center' },
  emptyShortcutBox: { borderWidth: 1, borderStyle: 'dashed', borderColor: theme.colors.border, paddingHorizontal: 14, paddingVertical: 12, minHeight: 54, justifyContent: 'center', width: '100%', borderRadius: 18, backgroundColor: theme.colors.surfaceAlt },
  emptyShortcutText: { color: theme.colors.subtext, textAlign: 'center', fontSize: 13, lineHeight: 22, fontWeight: '700' },
  roleGridHeading: { color: theme.colors.text, fontSize: 15, fontWeight: '900', textAlign: 'right' },
  onboardingChoiceRow: { flexDirection: 'row-reverse', gap: 8 },
  onboardingChoiceButton: { flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  onboardingChoicePrimary: { flex: 1.25, backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  onboardingChoiceText: { color: theme.colors.text, fontWeight: '800' },
  onboardingChoicePrimaryText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  homeRoleGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  homeRoleTile: { width: '31%', minWidth: 94, maxWidth: 128, alignItems: 'center', gap: 6, padding: 8, borderRadius: 22, borderWidth: 1 },
  addRoleTile: { marginRight: 'auto' },
  homeRoleImageWrap: { width: '100%', aspectRatio: 1, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  homeRoleImage: { width: '58%', height: '58%' },
  homeAddRoleBox: { borderColor: theme.colors.primary, backgroundColor: theme.colors.surface },
  homeAddPlus: { color: theme.colors.primary, fontSize: 58, fontWeight: '400' },
  programBuilderTile: { width: '100%', borderWidth: 1, borderRadius: 24, padding: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  programBuilderIconWrap: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  programBuilderIcon: { width: 42, height: 42 },
  productDecisionText: { color: theme.colors.secondary, fontSize: 12, lineHeight: 18, textAlign: 'right' },
  userSetupCard: { gap: 8, padding: 12, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt },
  lifePie: { width: 180, height: 180, borderRadius: 90, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surfaceAlt },
  lifePieCenter: { width: 82, height: 82, borderRadius: 41, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  lifePieText: { color: theme.colors.text, fontWeight: '900', fontSize: 20 },
  onboardingPanel: { gap: 12, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt, direction: 'rtl' },
  customRoleBox: { gap: 8, padding: 10, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, backgroundColor: '#fff' },
  customRoleLogoPlaceholder: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', backgroundColor: theme.colors.surfaceAlt, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.colors.border },
  customRoleInitial: { color: theme.colors.text, fontSize: 26, fontWeight: '900', textAlign: 'center' },
  rolePageFrame: { gap: 18, padding: 14, borderWidth: 1, borderRadius: 24, backgroundColor: theme.colors.surface, minHeight: 680 },
  rolePageHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  rolePageHeaderCompact: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  roleTopRight: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  roleHeaderIcon: { width: 34, height: 34, borderRadius: 12, borderWidth: 1 },
  roleIdentityRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: -6, marginBottom: -4 },
  roleIdentityText: { color: theme.colors.text, fontSize: 14, fontWeight: '900', textAlign: 'center' },
  rolePageActions: { alignItems: 'center', gap: 8 },
  homeIconButton: { width: 38, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  homeIconText: { color: '#fff', fontSize: 24, fontWeight: '800' },
  roleHero: { alignItems: 'center', gap: 6 },
  roleHeroImage: { width: 96, height: 96 },
  addPlanBanner: { paddingVertical: 14, paddingHorizontal: 12, borderRadius: 18, backgroundColor: theme.colors.success, alignItems: 'center' },
  addPlanBannerText: { color: '#fff', fontSize: 18, fontWeight: '900', textAlign: 'center' },
  planTitleBanner: { minHeight: 52, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  planTitleBannerText: { flex: 1, color: '#fff', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  pinButton: { width: 40, minHeight: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.65)' },
  planActionRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 },
  performanceBlock: { alignItems: 'center', gap: 8, paddingVertical: 18 },
  rolePerformanceTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '900', textAlign: 'right' },
  metricLink: { paddingVertical: 2 },
  metricLinkText: { color: theme.colors.text, fontSize: 15, textAlign: 'center' },
  expandedTaskList: { alignSelf: 'stretch', gap: 6, padding: 10, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: '#fff' },
  doneTaskText: { textDecorationLine: 'line-through', color: theme.colors.subtext },
  doneTaskRow: { opacity: 0.72, backgroundColor: theme.colors.surfaceAlt },
  bottomPlanTabs: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'flex-start', marginTop: 6, padding: 5, borderRadius: 24, backgroundColor: theme.colors.surfaceAlt, gap: 6 },
  bottomPlanTabsScroll: { flexDirection: 'row-reverse', gap: 6, paddingLeft: 4 },
  bottomPlanTab: { width: 74, minHeight: 42, paddingHorizontal: 8, paddingVertical: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 999 },
  bottomPlanTabAdd: { width: 44, minHeight: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderStyle: 'dashed', borderRadius: 999 },
  bottomPlanTabText: { color: theme.colors.text, fontSize: 10, fontWeight: '800', textAlign: 'center' },
  bottomPlanTabTextActive: { color: '#fff' },
  sampleTable: { borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' },
  sampleTableRow: { flexDirection: 'row-reverse', backgroundColor: '#eef1f7', borderBottomWidth: 1, borderBottomColor: '#fff' },
  sampleTableHeader: { backgroundColor: '#dce2ef' },
  sampleTableCell: { flex: 1, paddingVertical: 8, paddingHorizontal: 4, color: theme.colors.text, fontSize: 11, textAlign: 'center', borderLeftWidth: 1, borderLeftColor: '#fff' },
  sampleFilterCell: { flex: 1, minHeight: 42, paddingHorizontal: 4, color: theme.colors.text, fontSize: 11, textAlign: 'center', borderLeftWidth: 1, borderLeftColor: '#fff', backgroundColor: '#fff' },
  costRangeRow: { flexDirection: 'row-reverse', gap: 8, padding: 8, backgroundColor: theme.colors.surfaceAlt },
  costRangeInput: { flex: 1, minHeight: 40, paddingVertical: 8 },
  planDetailBlock: { gap: 8 },
  editPlanButton: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, backgroundColor: '#fff' },
  editPlanButtonText: { fontSize: 12, fontWeight: '900' },
  taskTable: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 18, overflow: 'hidden', backgroundColor: '#fff' },
  taskTableRow: { flexDirection: 'row-reverse', minHeight: 42, borderBottomWidth: 1, borderBottomColor: theme.colors.border, alignItems: 'stretch', backgroundColor: '#fff' },
  tableEditRow: { backgroundColor: theme.colors.surfaceAlt },
  tableEditPanel: { gap: 8, padding: 10, borderWidth: 1, backgroundColor: theme.colors.surfaceAlt },
  taskTableHeaderCell: { flex: 1, color: '#fff', fontWeight: '900', textAlign: 'center', padding: 8 },
  taskTableCell: { flex: 1, color: theme.colors.text, textAlign: 'center', padding: 8 },
  taskTableTimeHeaderCell: { flex: 1.9, color: '#fff', fontWeight: '900', textAlign: 'center', padding: 8 },
  taskTableTimeCell: { flex: 1.9, color: theme.colors.text, textAlign: 'right', padding: 8, fontSize: 11, lineHeight: 16 },
  taskTableQualityHeaderCell: { flex: 0.62, color: '#fff', fontWeight: '900', textAlign: 'center', paddingVertical: 8, paddingHorizontal: 3, fontSize: 11 },
  taskTableQualityCell: { flex: 0.62, color: theme.colors.text, textAlign: 'center', paddingVertical: 8, paddingHorizontal: 3, fontSize: 10, justifyContent: 'center' },
  taskInputCell: { flex: 1, minHeight: 58, color: theme.colors.text, textAlign: 'center', padding: 6 },
  taskTimeInputCell: { flex: 1.9, gap: 4, padding: 4 },
  taskAddCell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  taskAddText: { color: theme.colors.text, fontWeight: '900', textAlign: 'center' },
  taskAddWideButton: { minHeight: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  scheduleGrid: { gap: 8 },
  scheduleInput: { minWidth: 110 },
  scheduleUnitRow: { flexDirection: 'row-reverse', gap: 6, flexWrap: 'wrap' },
  qualityRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 4, justifyContent: 'center', marginTop: 4 },
  disabledQualityText: { color: theme.colors.muted, fontSize: 11, textAlign: 'center' },
  shareRoleCell: { flex: 1.4, flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 4, alignItems: 'center', justifyContent: 'center', padding: 4 },
  shareRoleMenu: { width: '100%', gap: 4, padding: 6, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.border },
  shareRoleHint: { width: '100%', color: theme.colors.subtext, fontSize: 9, lineHeight: 13, textAlign: 'right' },
  sharedPersonRow: { flexDirection: 'row-reverse', minHeight: 38, borderBottomWidth: 1, borderBottomColor: theme.colors.border, alignItems: 'center', backgroundColor: theme.colors.surfaceAlt },
  contactPicker: { gap: 6, padding: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.border },
  contactPickerItem: { padding: 10, borderRadius: 10, backgroundColor: theme.colors.surfaceAlt },
  qualityChip: { paddingHorizontal: 6, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: '#fff' },
  qualityChipText: { color: theme.colors.text, fontSize: 10, fontWeight: '700' },
  qualityDropdownButton: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center' },
  qualityMenu: { gap: 4, marginTop: 4, padding: 4, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.border },
  qualityMenuItem: { gap: 2, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 10, backgroundColor: theme.colors.surfaceAlt },
  programBuilderPanel: { gap: 10, padding: 12, borderRadius: 20, backgroundColor: theme.colors.surfaceAlt },
  builderItemGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  builderItemCard: { width: '31%', minWidth: 96, flexGrow: 1, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: '#fff', padding: 10, minHeight: 92, justifyContent: 'center', gap: 6 },
  builderAddCard: { borderStyle: 'dashed', alignItems: 'center' },
  builderItemTitle: { color: theme.colors.text, fontWeight: '900', fontSize: 13, textAlign: 'center' },
  builderItemDescription: { color: theme.colors.subtext, fontWeight: '700', fontSize: 10, textAlign: 'center', lineHeight: 14 },
  builderWorkspace: { flexDirection: 'row-reverse', gap: 10, alignItems: 'stretch' },
  builderSideTabs: { width: 66, gap: 6 },
  builderSideTab: { minHeight: 74, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center', padding: 6, backgroundColor: '#fff' },
  builderSideTabText: { color: theme.colors.text, fontWeight: '900', fontSize: 10, textAlign: 'center' },
  builderMainPane: { flex: 1, gap: 10 },
  builderLearnerHomeCard: { gap: 8, padding: 10, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.border },
  builderRelatedPrograms: { gap: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: theme.colors.border },
  builderItemHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  builderItemPageTitle: { flex: 1, color: theme.colors.text, fontSize: 22, fontWeight: '900', textAlign: 'right' },
  builderBackButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.border },
  builderDropdownButton: { minHeight: 42, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  builderDropdownMenu: { gap: 4, padding: 6, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: '#fff' },
  commentCard: { gap: 4, padding: 10, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.border },
  builderLearnerProgramCard: { gap: 8, padding: 10, borderRadius: 14, backgroundColor: theme.colors.surfaceAlt, borderWidth: 1, borderColor: theme.colors.border },
  programCategoryCard: { gap: 6, padding: 10, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.border },
  learnerDashboardCard: { gap: 4, padding: 10, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderStyle: 'dashed', borderColor: theme.colors.border },
  learnerRow: { gap: 6, padding: 10, borderRadius: 14 },
  shareStrip: { gap: 8, padding: 10, backgroundColor: '#b9dca4', borderWidth: 1, borderColor: theme.colors.text },
  roleAccent: { width: 8, alignSelf: 'stretch', borderRadius: 999 },
  planTabs: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  planTab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.border },
  planTabAdd: { borderStyle: 'dashed' },
  planTabText: { color: theme.colors.text, fontSize: 12, fontWeight: '700' },
  performanceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chartWrap: { height: 104, flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingTop: 12 },
  chartColumn: { flex: 1, height: 100, justifyContent: 'flex-end', alignItems: 'center', borderRadius: 10, backgroundColor: theme.colors.surfaceAlt, overflow: 'hidden' },
  chartBar: { width: '100%', borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  chartDayLabel: { color: theme.colors.subtext, fontSize: 10, paddingVertical: 2 },
  prescriptionHeader: { gap: 8 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  templateWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 },
  templateChip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.border },
  templateChipText: { color: theme.colors.text, fontWeight: '700', fontSize: 12 },
  templateChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  templateChipTextActive: { color: '#fff' },
  prescriptionCard: { gap: 10, padding: 14, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 16, backgroundColor: '#fff' },
  photoActionRow: { gap: 8 },
  photoCard: { gap: 10, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: '#fff' },
  photoPreview: { width: '100%', height: 180, borderRadius: 14, backgroundColor: theme.colors.surfaceAlt },
  photoPlaceholder: { padding: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt },
  flex1: { flex: 1, gap: 4 },
  flex2: { flex: 2 },
  end: { alignItems: 'flex-end', gap: 6 },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  cell: { flex: 1, color: theme.colors.text },
  cellPill: { flex: 1, alignItems: 'flex-start' },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  planItemCard: { gap: 10, padding: 14, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 16, backgroundColor: theme.colors.surfaceAlt },
  planRow: { gap: 10, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  statusActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statusButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: theme.colors.surfaceAlt },
  statusButtonText: { color: theme.colors.text, fontWeight: '700', fontSize: 12 },
});
