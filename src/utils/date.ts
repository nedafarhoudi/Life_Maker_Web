const dayMs = 24 * 60 * 60 * 1000;

export function formatDateLabel(date: Date) {
  return new Intl.DateTimeFormat('fa-IR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
}

export function formatTime(date: Date) {
  return new Intl.DateTimeFormat('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatCompactDate(date: Date) {
  return new Intl.DateTimeFormat('fa-IR', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function parseTimeOfDay(time = '09:00') {
  const [hours, minutes] = time.split(':').map(Number);
  return {
    hours: Number.isFinite(hours) ? hours : 9,
    minutes: Number.isFinite(minutes) ? minutes : 0,
  };
}

export function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function diffInDays(a: Date, b: Date) {
  return Math.floor((startOfDay(a).getTime() - startOfDay(b).getTime()) / dayMs);
}

export function addDays(date: Date, amount: number) {
  return new Date(date.getTime() + amount * dayMs);
}

export function addMonths(date: Date, amount: number) {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + amount);
  return copy;
}

export function setTime(date: Date, time?: string) {
  const copy = new Date(date);
  const { hours, minutes } = parseTimeOfDay(time);
  copy.setHours(hours, minutes, 0, 0);
  return copy;
}

export function formatDuration(ms: number) {
  const absolute = Math.abs(ms);
  const totalMinutes = Math.round(absolute / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const sign = ms < 0 ? '-' : '';

  if (hours > 0) {
    return `${sign}${hours}س ${minutes}د`;
  }

  return `${sign}${minutes} دقیقه`;
}

export function minutesToLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours > 0 && rest > 0) {
    return `${hours}س ${rest}د`;
  }

  if (hours > 0) {
    return `${hours} ساعت`;
  }

  return `${rest} دقیقه`;
}
