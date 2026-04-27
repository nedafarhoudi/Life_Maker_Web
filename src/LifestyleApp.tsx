import { useMemo, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';

import { ActionButton, Pill, ProgressBar, SectionCard, SectionTitle } from './components/ui';
import { usePersistentAppState } from './hooks/usePersistentAppState';
import { theme } from './theme';
import { ScreenKey, TaskStatus } from './types/domain';
import { formatCompactDate, formatDateLabel, formatDuration, formatTime, minutesToLabel, toDateKey } from './utils/date';

const labels: Record<ScreenKey, string> = { dashboard: 'داشبورد', today: 'امروز', roles: 'نقش ها', insights: 'تحلیل' };
const help: Record<ScreenKey, string> = {
  dashboard: 'خلاصه روز، بیلبورد کارها، امتیاز و توزیع زمان.',
  today: 'فهرست اولویت بندی شده کارهای امروز با رنگ فوریت.',
  roles: 'مدیریت نقش ها، ابعاد و افزودن سریع مورد جدید.',
  insights: 'روند امتیاز، تناوب و گواهی های پایداری.',
};

export function LifestyleApp() {
  const { width } = useWindowDimensions();
  const [screen, setScreen] = useState<ScreenKey>('dashboard');
  const [showHelp, setShowHelp] = useState(false);
  const [draftRoles, setDraftRoles] = useState<string[]>([]);
  const [roleTitle, setRoleTitle] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [dimensionTitle, setDimensionTitle] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const { isReady, state, statuses, selectedRoles, finishOnboarding, completeTask, addRole, addDimension, addTask } = usePersistentAppState();

  const activeRoleIds = useMemo(() => {
    if (state.settings.selectedRoleIds.length) return state.settings.selectedRoleIds;
    if (draftRoles.length) return draftRoles;
    return state.roles.map((role) => role.id);
  }, [draftRoles, state.roles, state.settings.selectedRoleIds]);

  const todayStatuses = useMemo(() => {
    const toneOrder = { danger: 0, warning: 1, success: 2, muted: 3 };
    return statuses
      .filter((entry) => activeRoleIds.includes(entry.task.roleId))
      .sort((a, b) => {
        if (a.isCompletedToday !== b.isCompletedToday) return Number(a.isCompletedToday) - Number(b.isCompletedToday);
        if (a.tone !== b.tone) return toneOrder[a.tone] - toneOrder[b.tone];
        return a.remainingMs - b.remainingMs;
      });
  }, [activeRoleIds, statuses]);

  const dailyScore = state.dailyScores.find((entry) => entry.date === toDateKey(new Date()))?.score ?? 0;
  const completedToday = todayStatuses.filter((entry) => entry.isCompletedToday).length;
  const progress = todayStatuses.length ? (completedToday / todayStatuses.length) * 100 : 0;
  const minutesToday = state.completions.filter((entry) => entry.completedAt.startsWith(toDateKey(new Date()))).reduce((sum, entry) => sum + entry.actualMinutes, 0);
  const quote = state.quotes.find((item) => item.kind === 'quote');
  const poem = state.quotes.find((item) => item.kind === 'poem');
  const isWide = width >= 980;

  const timeByRole = selectedRoles.map((role) => {
    const taskIds = state.tasks.filter((task) => task.roleId === role.id).map((task) => task.id);
    const minutes = state.completions.filter((entry) => taskIds.includes(entry.taskId) && entry.completedAt.startsWith(toDateKey(new Date()))).reduce((sum, entry) => sum + entry.actualMinutes, 0);
    return { role, minutes };
  });

  if (!isReady) {
    return <SafeAreaView style={styles.safe}><View style={styles.center}><Text style={styles.title}>در حال آماده سازی ریتم زندگی...</Text></View></SafeAreaView>;
  }

  if (!state.settings.onboarded) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <SectionCard>
            <SectionTitle title="شروع شخصی سازی" subtitle="نقش های فعال از روز اول را انتخاب کنید." />
            {state.roles.map((role) => {
              const active = activeRoleIds.includes(role.id);
              return (
                <Pressable
                  key={role.id}
                  onPress={() => setDraftRoles((current) => current.length === 0 ? state.roles.map((item) => item.id).filter((id) => id !== (active ? role.id : '')) : active ? current.filter((id) => id !== role.id) : [...current, role.id])}
                  style={[styles.toggle, active && { borderColor: role.color, backgroundColor: `${role.color}18` }]}
                >
                  <View style={styles.flex1}>
                    <Text style={styles.itemTitle}>{role.title}</Text>
                    <Text style={styles.meta}>{role.description}</Text>
                  </View>
                  <Text style={[styles.metaStrong, active && { color: role.color }]}>{active ? 'فعال' : 'غیرفعال'}</Text>
                </Pressable>
              );
            })}
            <ActionButton label="ورود به اپ" onPress={() => finishOnboarding(activeRoleIds)} />
          </SectionCard>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>{formatDateLabel(new Date())}</Text>
        <Text style={styles.heroTitle}>Life Rhythm</Text>
        <Text style={styles.meta}>مدیریت نقش ها، تناوب ها و تعادل روزانه</Text>
        <View style={styles.metricWrap}>
          <Metric label="امتیاز امروز" value={`${dailyScore}`} color={theme.colors.primary} />
          <Metric label="زمان ثبت شده" value={minutesToLabel(minutesToday)} color={theme.colors.secondary} />
          <Metric label="پیشرفت" value={`${Math.round(progress)}٪`} color={theme.colors.accent} />
        </View>
      </View>

      <View style={styles.nav}>
        {Object.entries(labels).map(([key, value]) => (
          <Pressable key={key} onPress={() => setScreen(key as ScreenKey)} style={[styles.navItem, screen === key && styles.navActive]}>
            <Text style={[styles.navText, screen === key && styles.navTextActive]}>{value}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => setShowHelp((v) => !v)} style={styles.helpBtn}><Text style={styles.helpBtnText}>راهنما</Text></Pressable>
      </View>
      {showHelp ? <View style={styles.helpPanel}><Text style={styles.helpText}>{help[screen]}</Text></View> : null}

      <ScrollView contentContainerStyle={[styles.content, isWide && styles.contentWide]}>
        {screen === 'dashboard' ? (
          <View style={[styles.grid, isWide && styles.gridWide]}>
            <View style={styles.mainCol}>
              <SectionCard>
                <SectionTitle title="بیلبورد کارهای روزانه" subtitle="کارهای انجام نشده بالا می مانند." />
                <ProgressBar value={progress} />
                {todayStatuses.slice(0, 6).map((status) => <TaskRow key={status.task.id} status={status} onPress={() => completeTask(status.task.id)} />)}
              </SectionCard>
              <SectionCard>
                <SectionTitle title="توزیع زمان امروز" subtitle="زمان صرف شده در هر نقش" />
                {timeByRole.map(({ role, minutes }) => (
                  <View key={role.id} style={styles.analyticsRow}>
                    <Text style={styles.analyticsLabel}>{role.title}</Text>
                    <View style={styles.barTrack}><View style={[styles.barFill, { width: `${Math.min(100, minutes || 8)}%`, backgroundColor: role.color }]} /></View>
                    <Text style={styles.analyticsValue}>{minutesToLabel(minutes)}</Text>
                  </View>
                ))}
              </SectionCard>
            </View>
            <View style={styles.sideCol}>
              <SectionCard>
                <SectionTitle title="وضعیت تناوب" subtitle="سبز در ریتم، نارنجی نزدیک موعد، قرمز عقب افتاده" />
                <View style={styles.pillWrap}>
                  <Pill label={`${todayStatuses.filter((item) => item.tone === 'success').length} در ریتم`} tone="success" />
                  <Pill label={`${todayStatuses.filter((item) => item.tone === 'warning').length} نزدیک`} tone="warning" />
                  <Pill label={`${todayStatuses.filter((item) => item.tone === 'danger').length} عقب`} tone="danger" />
                </View>
              </SectionCard>
              <SectionCard>
                <SectionTitle title="گواهی های پایداری" subtitle="برای هر 5 ثبت پیوسته یک گواهی" />
                {state.certificates.length === 0 ? <Text style={styles.meta}>هنوز گواهی ثبت نشده است.</Text> : state.certificates.slice(0, 4).map((item) => <Text key={item.id} style={styles.itemTitle}>{item.title}</Text>)}
              </SectionCard>
              {quote ? <SectionCard><SectionTitle title="Quote of the Day" /><Text style={styles.quote}>{quote.text}</Text><Text style={styles.metaStrong}>{quote.author}</Text></SectionCard> : null}
              {poem ? <SectionCard><SectionTitle title="شعر فارسی" /><Text style={styles.quote}>{poem.text}</Text><Text style={styles.metaStrong}>{poem.author}</Text></SectionCard> : null}
            </View>
          </View>
        ) : null}

        {screen === 'today' ? (
          <SectionCard>
            <SectionTitle title="فهرست اجرایی امروز" subtitle="موعد، عنوان کار و زمان باقی مانده" />
            <View style={styles.tableHead}><Text style={styles.headCell}>موعد</Text><Text style={[styles.headCell, styles.flex2]}>کار</Text><Text style={styles.headCell}>باقی مانده</Text></View>
            {todayStatuses.map((status) => <TaskTableRow key={status.task.id} status={status} onPress={() => completeTask(status.task.id)} />)}
          </SectionCard>
        ) : null}

        {screen === 'roles' ? (
          <View style={[styles.grid, isWide && styles.gridWide]}>
            <View style={styles.mainCol}>
              {selectedRoles.map((role) => (
                <SectionCard key={role.id}>
                  <SectionTitle title={role.title} subtitle={role.description} />
                  {state.dimensions.filter((item) => item.roleId === role.id).map((dimension) => (
                    <View key={dimension.id} style={styles.block}>
                      <Text style={styles.itemTitle}>{dimension.title}</Text>
                      <Text style={styles.meta}>{dimension.description}</Text>
                      {state.tasks.filter((task) => task.dimensionId === dimension.id).map((task) => (
                        <View key={task.id} style={styles.bullet}>
                          <Text style={styles.itemTitle}>{task.title}</Text>
                          <Text style={styles.meta}>{task.recurrenceType === 'interval' ? `هر ${task.intervalDays} روز` : task.recurrenceType === 'weekly' ? 'هفتگی' : 'روزانه'} • {minutesToLabel(task.estimatedMinutes)}</Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </SectionCard>
              ))}
            </View>
            <View style={styles.sideCol}>
              <SectionCard>
                <SectionTitle title="افزودن نقش" />
                <TextInput value={roleTitle} onChangeText={setRoleTitle} placeholder="عنوان نقش" placeholderTextColor={theme.colors.muted} style={styles.input} />
                <TextInput value={roleDescription} onChangeText={setRoleDescription} placeholder="توضیح کوتاه" placeholderTextColor={theme.colors.muted} style={[styles.input, styles.multi]} multiline />
                <ActionButton label="ثبت نقش" onPress={() => {
                  if (!roleTitle.trim()) return Alert.alert('نقش ناقص است', 'عنوان نقش را وارد کنید.');
                  addRole(roleTitle.trim(), roleDescription.trim()); setRoleTitle(''); setRoleDescription('');
                }} />
              </SectionCard>
              <SectionCard>
                <SectionTitle title="افزودن بعد و تسک سریع" />
                <TextInput value={dimensionTitle} onChangeText={setDimensionTitle} placeholder="عنوان بعد" placeholderTextColor={theme.colors.muted} style={styles.input} />
                <ActionButton label="ثبت بعد برای اولین نقش فعال" muted onPress={() => {
                  if (!dimensionTitle.trim()) return Alert.alert('بعد ناقص است', 'عنوان بعد را وارد کنید.');
                  addDimension(selectedRoles[0].id, dimensionTitle.trim(), 'بعد اضافه شده توسط کاربر'); setDimensionTitle('');
                }} />
                <TextInput value={taskTitle} onChangeText={setTaskTitle} placeholder="عنوان تسک سریع" placeholderTextColor={theme.colors.muted} style={styles.input} />
                <ActionButton label="ثبت تسک روزانه" onPress={() => {
                  const firstDimension = state.dimensions.find((item) => item.roleId === selectedRoles[0].id);
                  if (!firstDimension || !taskTitle.trim()) return Alert.alert('تسک ناقص است', 'اول عنوان تسک را بنویسید.');
                  addTask({ title: taskTitle.trim(), roleId: selectedRoles[0].id, dimensionId: firstDimension.id, estimatedMinutes: 30, recurrenceType: 'daily', dueTime: '18:00', priority: 2, baseScore: 10, qualityWeight: 0.1, autoSchedule: true }); setTaskTitle('');
                }} />
              </SectionCard>
            </View>
          </View>
        ) : null}

        {screen === 'insights' ? (
          <View style={[styles.grid, isWide && styles.gridWide]}>
            <View style={styles.mainCol}>
              <SectionCard>
                <SectionTitle title="روند امتیاز" subtitle="ثبت های اخیر" />
                {state.dailyScores.length === 0 ? <Text style={styles.meta}>با انجام اولین کارها این بخش پر می شود.</Text> : state.dailyScores.slice(0, 7).map((entry) => (
                  <View key={entry.date} style={styles.analyticsRow}>
                    <Text style={styles.analyticsLabel}>{formatCompactDate(new Date(entry.date))}</Text>
                    <View style={styles.barTrack}><View style={[styles.barFill, { width: `${Math.min(100, entry.score)}%` }]} /></View>
                    <Text style={styles.analyticsValue}>{entry.score}</Text>
                  </View>
                ))}
              </SectionCard>
              <SectionCard>
                <SectionTitle title="پیش نمایش امتیاز" subtitle="اگر همین الان ثبت شود" />
                {todayStatuses.map((status) => (
                  <View key={status.task.id} style={styles.previewRow}>
                    <View style={styles.flex1}><Text style={styles.itemTitle}>{status.task.title}</Text><Text style={styles.meta}>{status.tone === 'success' ? 'در ریتم' : status.tone === 'warning' ? 'نزدیک موعد' : status.tone === 'danger' ? 'خارج از تناوب' : 'انجام شده'}</Text></View>
                    <Pill label={`${status.pointsPreview} امتیاز`} tone={status.tone} />
                  </View>
                ))}
              </SectionCard>
            </View>
            <View style={styles.sideCol}>
              <SectionCard>
                <SectionTitle title="گزارش کلی" />
                <InsightLine label="کارهای کل" value={`${state.tasks.length}`} />
                <InsightLine label="انجام شده امروز" value={`${completedToday}`} />
                <InsightLine label="عقب افتاده" value={`${todayStatuses.filter((item) => item.tone === 'danger').length}`} />
                <InsightLine label="نزدیک موعد" value={`${todayStatuses.filter((item) => item.tone === 'warning').length}`} />
                <InsightLine label="به روزرسانی" value={formatTime(new Date())} />
              </SectionCard>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return <View style={[styles.metric, { borderColor: `${color}50` }]}><Text style={styles.meta}>{label}</Text><Text style={[styles.metricValue, { color }]}>{value}</Text></View>;
}

function TaskRow({ status, onPress }: { status: TaskStatus; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.row, status.isCompletedToday && styles.done]}>
      <View style={styles.flex1}><Text style={[styles.itemTitle, status.isCompletedToday && styles.line]}>{status.task.title}</Text><Text style={styles.meta}>{formatTime(status.dueAt)} • {minutesToLabel(status.task.estimatedMinutes)}</Text></View>
      <View style={styles.end}><Pill label={status.isCompletedToday ? 'ثبت شد' : status.tone === 'success' ? 'در ریتم' : status.tone === 'warning' ? 'نزدیک' : 'عقب'} tone={status.tone} /><Text style={styles.meta}>{status.isCompletedToday ? 'انجام شده' : formatDuration(status.remainingMs)}</Text></View>
    </Pressable>
  );
}

function TaskTableRow({ status, onPress }: { status: TaskStatus; onPress: () => void }) {
  const color = status.tone === 'success' ? theme.colors.success : status.tone === 'warning' ? theme.colors.warning : status.tone === 'danger' ? theme.colors.danger : theme.colors.muted;
  return <Pressable onPress={onPress} style={[styles.tableRow, status.isCompletedToday && styles.done]}><Text style={[styles.cell, { color }]}>{formatTime(status.dueAt)}</Text><Text style={[styles.cell, styles.flex2]}>{status.task.title}</Text><Text style={[styles.cell, { color }]}>{status.isCompletedToday ? 'ثبت شد' : formatDuration(status.remainingMs)}</Text></Pressable>;
}

function InsightLine({ label, value }: { label: string; value: string }) {
  return <View style={styles.lineRow}><Text style={styles.meta}>{label}</Text><Text style={styles.metaStrong}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 16 },
  contentWide: { maxWidth: 1320, width: '100%', alignSelf: 'center' },
  hero: { margin: 16, padding: 20, borderRadius: 28, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, gap: 12 },
  eyebrow: { color: theme.colors.secondary, textAlign: 'right' },
  heroTitle: { fontSize: 32, fontWeight: '800', color: theme.colors.text, textAlign: 'right' },
  title: { fontSize: 18, fontWeight: '700', color: theme.colors.text, textAlign: 'right' },
  metricWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 12 },
  metric: { minWidth: 140, flexGrow: 1, backgroundColor: theme.colors.background, borderWidth: 1, borderRadius: 16, padding: 14 },
  metricValue: { marginTop: 4, fontSize: 22, fontWeight: '800', textAlign: 'right' },
  nav: { marginHorizontal: 16, flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  navItem: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: theme.colors.surfaceAlt },
  navActive: { backgroundColor: theme.colors.primary },
  navText: { color: theme.colors.text, fontWeight: '700' },
  navTextActive: { color: '#fff' },
  helpBtn: { marginRight: 'auto', paddingHorizontal: 12, paddingVertical: 10 },
  helpBtnText: { color: theme.colors.secondary, fontWeight: '700' },
  helpPanel: { marginHorizontal: 16, marginTop: 12, padding: 16, borderRadius: 16, backgroundColor: '#f6e7d4', borderWidth: 1, borderColor: '#e8d3b6' },
  helpText: { color: theme.colors.text, textAlign: 'right' },
  grid: { gap: 16 },
  gridWide: { flexDirection: 'row-reverse', alignItems: 'flex-start' },
  mainCol: { flex: 1.4, gap: 16 },
  sideCol: { flex: 1, gap: 16 },
  row: { flexDirection: 'row-reverse', justifyContent: 'space-between', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  done: { opacity: 0.52 },
  line: { textDecorationLine: 'line-through' },
  flex1: { flex: 1, gap: 4 },
  flex2: { flex: 2 },
  end: { alignItems: 'flex-end', gap: 8 },
  itemTitle: { color: theme.colors.text, textAlign: 'right', fontWeight: '700' },
  meta: { color: theme.colors.subtext, textAlign: 'right', fontSize: 12 },
  metaStrong: { color: theme.colors.text, textAlign: 'right', fontWeight: '700', fontSize: 12 },
  analyticsRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  analyticsLabel: { width: 110, color: theme.colors.text, textAlign: 'right' },
  analyticsValue: { width: 70, color: theme.colors.subtext, textAlign: 'left', fontSize: 12 },
  barTrack: { flex: 1, height: 12, borderRadius: 999, overflow: 'hidden', backgroundColor: theme.colors.surfaceAlt },
  barFill: { height: '100%', borderRadius: 999, backgroundColor: theme.colors.primary },
  pillWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  quote: { color: theme.colors.text, textAlign: 'right', lineHeight: 26, fontSize: 16 },
  tableHead: { flexDirection: 'row-reverse', borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingBottom: 8 },
  headCell: { flex: 1, color: theme.colors.subtext, textAlign: 'right', fontWeight: '700', fontSize: 12 },
  tableRow: { flexDirection: 'row-reverse', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  cell: { flex: 1, color: theme.colors.text, textAlign: 'right' },
  block: { paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.colors.border, gap: 6 },
  bullet: { backgroundColor: theme.colors.background, borderRadius: 16, padding: 12, gap: 4 },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 16, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 12, color: theme.colors.text, textAlign: 'right' },
  multi: { minHeight: 90, textAlignVertical: 'top' },
  previewRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingBottom: 12 },
  lineRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  toggle: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 16, padding: 16, backgroundColor: '#fff' },
});
