import { useMemo, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton, Pill, ProgressBar, SectionCard, SectionTitle } from './components/ui';
import { usePersistentAppState } from './hooks/usePersistentAppState';
import { theme } from './theme';
import { DailyCheck, Patient, PlanItemStatus, Role } from './types/domain';
import { formatCompactDate, formatDateLabel, formatTime, toDateKey } from './utils/date';
import { getStatusTone } from './utils/scoring';

const demoCredentials = {
  admin: { email: 'admin@lifemaker.local', password: 'admin123' },
  doctor_staff: { email: 'doctor@lifemaker.local', password: 'doctor123' },
  patient: { phone: '09120000001' },
};

let currentLanguage: 'fa' | 'en' = 'fa';
const bi = (fa: string, en: string) => (currentLanguage === 'fa' ? fa : en);
const roleLabel = (role: Role) => {
  if (role === 'admin') return bi('ادمین', 'Admin');
  if (role === 'doctor_staff') return bi('پزشک یا منشی', 'Doctor / Staff');
  return bi('بیمار', 'Patient');
};

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
  const [selectedRole, setSelectedRole] = useState<Role>('doctor_staff');
  const [email, setEmail] = useState(demoCredentials.doctor_staff.email);
  const [password, setPassword] = useState(demoCredentials.doctor_staff.password);
  const [patientPhone, setPatientPhone] = useState(demoCredentials.patient.phone);
  const [photoReview, setPhotoReview] = useState<{ patientId: string; uri: string; updatedAt: string } | null>(null);
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
    getPlanDraft,
    getPrescriptionDraft,
    getPatientSummary,
    getActivePlanForPatient,
  } = usePersistentAppState();
  currentLanguage = state.language;

  const patientPlanDraft = selectedPatient ? getPlanDraft(selectedPatient.id) : null;
  const patientPrescriptionDraft = selectedPatient ? getPrescriptionDraft(selectedPatient.id) : null;
  const selectedPatientPlan = selectedPatient ? getActivePlanForPatient(selectedPatient.id) : { plan: null, items: [] };
  const selectedPatientSummary = selectedPatient ? getPatientSummary(selectedPatient.id) : null;

  const patientProgress = useMemo(() => {
    if (patientTodayRows.length === 0) return 0;
    return Math.round((patientTodayRows.filter((row) => row.latestStatus === 'done').length / patientTodayRows.length) * 100);
  }, [patientTodayRows]);
  const localizedInputStyle = state.language === 'fa' ? styles.inputRtl : styles.inputLtr;

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

  if (!isReady) {
    return <SafeAreaView style={styles.safe}><View style={styles.center}><Text style={styles.title}>{bi('در حال بارگذاری لایف میکر', 'Loading Life Maker')}</Text></View></SafeAreaView>;
  }

  if (!state.currentSession) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>{formatDateLabel(new Date())}</Text>
            <Text style={styles.heroTitle}>Life Maker</Text>
            <Text style={styles.heroText}>{bi('نسخه دمو برای پایش پایبندی درمان در کلینیک، پزشک و بیمار', 'Healthcare adherence MVP for clinics, staff, and patients.')}</Text>
            <View style={styles.metricWrap}>
              <Metric label={bi('بیمار فعال', 'Active patients')} value={`${dashboardMetrics.totalActivePatients}`} />
              <Metric label={bi('چک امروز', 'Check-ins today')} value={`${dashboardMetrics.checkedInToday}`} />
              <Metric label={bi('نیازمند پیگیری', 'Needs follow-up')} value={`${dashboardMetrics.needsFollowUp}`} />
            </View>
          </View>

          <View style={[styles.grid, isWide && styles.gridWide]}>
            <View style={styles.mainCol}>
              <SectionCard>
                <SectionTitle title={bi('انتخاب نقش', 'Choose role')} subtitle={bi('برای دمو از اطلاعات آماده زیر استفاده کن', 'Use the seeded demo credentials below.')} />
                <View style={styles.roleRow}>
                  <Pressable onPress={() => setLanguage('fa')} style={[styles.roleChip, state.language === 'fa' && styles.roleChipActive]}>
                    <Text style={[styles.roleChipText, state.language === 'fa' && styles.roleChipTextActive]}>فارسی</Text>
                  </Pressable>
                  <Pressable onPress={() => setLanguage('en')} style={[styles.roleChip, state.language === 'en' && styles.roleChipActive]}>
                    <Text style={[styles.roleChipText, state.language === 'en' && styles.roleChipTextActive]}>English</Text>
                  </Pressable>
                </View>
                <View style={styles.roleRow}>
                  {(['doctor_staff', 'patient', 'admin'] as Role[]).map((role) => (
                    <Pressable
                      key={role}
                      onPress={() => {
                        setSelectedRole(role);
                        if (role === 'admin') {
                          setEmail(demoCredentials.admin.email);
                          setPassword(demoCredentials.admin.password);
                        } else if (role === 'doctor_staff') {
                          setEmail(demoCredentials.doctor_staff.email);
                          setPassword(demoCredentials.doctor_staff.password);
                        } else {
                          setPatientPhone(demoCredentials.patient.phone);
                        }
                      }}
                      style={[styles.roleChip, selectedRole === role && styles.roleChipActive]}
                    >
                      <Text style={[styles.roleChipText, selectedRole === role && styles.roleChipTextActive]}>{roleLabel(role)}</Text>
                    </Pressable>
                  ))}
                </View>

                {selectedRole === 'patient' ? (
                  <>
                    <TextInput value={patientPhone} onChangeText={setPatientPhone} placeholder={bi('شماره موبایل بیمار', 'Patient phone')} placeholderTextColor={theme.colors.muted} style={[styles.input, localizedInputStyle]} />
                    <ActionButton
                      label={bi('ورود بیمار', 'Patient sign in')}
                      onPress={() => {
                        if (!loginAsPatient(patientPhone)) Alert.alert(bi('ورود ناموفق', 'Sign in failed'), bi('شماره بیمار پیدا نشد', 'Patient phone was not found.'));
                      }}
                    />
                  </>
                ) : (
                  <>
                    <TextInput autoCapitalize="none" value={email} onChangeText={setEmail} placeholder={bi('ایمیل', 'Email')} placeholderTextColor={theme.colors.muted} style={[styles.input, localizedInputStyle]} />
                    <TextInput secureTextEntry value={password} onChangeText={setPassword} placeholder={bi('رمز عبور', 'Password')} placeholderTextColor={theme.colors.muted} style={[styles.input, localizedInputStyle]} />
                    <ActionButton
                      label={selectedRole === 'admin' ? bi('ورود ادمین', 'Admin sign in') : bi('ورود پزشک یا منشی', 'Doctor/staff sign in')}
                      onPress={() => {
                        if (!loginAsStaff(email, password, selectedRole as 'admin' | 'doctor_staff')) {
                          Alert.alert(bi('ورود ناموفق', 'Sign in failed'), bi('ایمیل یا رمز عبور درست نیست', 'Email or password was not correct.'));
                        }
                      }}
                    />
                  </>
                )}
              </SectionCard>
            </View>

            <View style={styles.sideCol}>
              <SectionCard>
                <SectionTitle title={bi('اطلاعات ورود دمو', 'Demo credentials')} />
                <CredentialLine label={bi('ادمین', 'Admin')} value="admin@lifemaker.local / admin123" />
                <CredentialLine label={bi('پزشک یا منشی', 'Doctor/staff')} value="doctor@lifemaker.local / doctor123" />
                <CredentialLine label={bi('بیمار', 'Patient')} value="09120000001" />
              </SectionCard>
              <SectionCard>
                <SectionTitle title={bi('قاعده پیگیری', 'Follow-up rule')} />
                <Text style={styles.meta}>{bi('اگر در ۲ روز اخیر چکی ثبت نشده، پایبندی ۷ روزه زیر ۴۰٪ باشد، یا پلن فعال هنوز اولین چک نداشته باشد، بیمار نیازمند پیگیری است.', 'Flag a patient when there is no DailyCheck in 2 days, 7-day adherence is below 40%, or an active plan has no first check-in yet.')}</Text>
              </SectionCard>
            </View>
          </View>
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
      <View style={styles.topBar}>
        <View>
          <Text style={styles.eyebrow}>{formatDateLabel(new Date())}</Text>
          <Text style={styles.title}>{bi('پنل درمان', 'Care Panel')}</Text>
          <Text style={styles.meta}>{state.currentSession.role === 'patient' ? (currentUser as Patient)?.name : `${(currentUser as { name?: string })?.name ?? ''} • ${roleLabel(state.currentSession.role)}`}</Text>
        </View>
        <ActionButton label={bi('خروج', 'Logout')} muted onPress={logout} />
      </View>

      {state.currentSession.role === 'doctor_staff' ? (
        <>
          <View style={styles.nav}>
            <NavButton label={bi('داشبورد', 'Dashboard')} active={state.currentRoute === 'doctor/dashboard'} onPress={() => navigate('doctor/dashboard')} />
            <NavButton label={bi('بیماران', 'Patients')} active={state.currentRoute === 'doctor/patients'} onPress={() => navigate('doctor/patients')} />
            <NavButton label={bi('افزودن بیمار', 'Add patient')} active={state.currentRoute === 'doctor/patients/new'} onPress={() => navigate('doctor/patients/new')} />
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            {state.currentRoute === 'doctor/dashboard' ? (
              <View style={[styles.grid, isWide && styles.gridWide]}>
                <View style={styles.mainCol}>
                  <View style={styles.metricWrap}>
                    <Metric label={bi('کل بیماران فعال', 'Total active patients')} value={`${dashboardMetrics.totalActivePatients}`} />
                    <Metric label={bi('چک امروز', 'Checked in today')} value={`${dashboardMetrics.checkedInToday}`} />
                    <Metric label={bi('نیازمند پیگیری', 'Needs follow-up')} value={`${dashboardMetrics.needsFollowUp}`} />
                  </View>
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
                        <Text style={styles.meta}>{formatCompactDate(new Date(patient.joinedAt))}</Text>
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
                      <Text style={styles.meta}>{patientPrescriptionDraft.photoUpdatedAt ? formatCompactDate(new Date(patientPrescriptionDraft.photoUpdatedAt)) : ''}</Text>
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
          <ScrollView contentContainerStyle={styles.content}>
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

      {state.currentSession.role === 'admin' ? (
        <>
          <View style={styles.nav}>
            <NavButton label={bi('داشبورد', 'Dashboard')} active={state.currentRoute === 'admin/dashboard'} onPress={() => navigate('admin/dashboard')} />
            <NavButton label={bi('کلینیک‌ها', 'Clinics')} active={state.currentRoute === 'admin/clinics'} onPress={() => navigate('admin/clinics')} />
            <NavButton label={bi('کاربران', 'Users')} active={state.currentRoute === 'admin/users'} onPress={() => navigate('admin/users')} />
            <NavButton label={bi('بیماران', 'Patients')} active={state.currentRoute === 'admin/patients'} onPress={() => navigate('admin/patients')} />
          </View>
          <ScrollView contentContainerStyle={styles.content}>
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
  hero: { margin: 16, padding: 24, borderRadius: 28, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, gap: 12 },
  heroTitle: { fontSize: 34, fontWeight: '800', color: theme.colors.text },
  heroText: { color: theme.colors.subtext, lineHeight: 22 },
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
  nav: { marginHorizontal: 16, marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  navItem: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: theme.colors.surfaceAlt },
  navActive: { backgroundColor: theme.colors.primary },
  navText: { color: theme.colors.text, fontWeight: '700' },
  navTextActive: { color: '#fff' },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  fieldLabel: { color: theme.colors.text, fontSize: 12, fontWeight: '700' },
  helperText: { color: theme.colors.secondary, fontSize: 12, lineHeight: 18 },
  prescriptionHeader: { gap: 8 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  templateWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  templateChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.border },
  templateChipText: { color: theme.colors.text, fontWeight: '700', fontSize: 12 },
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
