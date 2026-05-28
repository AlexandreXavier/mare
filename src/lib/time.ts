const ptDateFmt = new Intl.DateTimeFormat('pt-PT', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Lisbon',
});

export const formatTime = (date: Date): string => {
  const parts = new Intl.DateTimeFormat('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Lisbon',
  }).formatToParts(date);
  const h = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const m = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return `${h}h${m}`;
};

export const formatDate = (date: Date): string => {
  const text = ptDateFmt.format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const next5Days = (today: string): string[] => {
  const out: string[] = [];
  for (let i = 0; i < 5; i++) {
    const t = new Date(`${today}T00:00:00Z`);
    t.setUTCDate(t.getUTCDate() + i);
    out.push(t.toISOString().slice(0, 10));
  }
  return out;
};

export const lisbonMidnight = (date: string): Date => {
  const candidate = new Date(`${date}T00:00:00Z`);
  const lisbonHour = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Lisbon',
    hour: '2-digit',
    hour12: false,
  }).format(candidate);
  if (lisbonHour === '00') return candidate;
  return new Date(candidate.getTime() - 3600 * 1000);
};

export const isoDate = (date: Date): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Europe/Lisbon',
  }).formatToParts(date);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const d = parts.find((p) => p.type === 'day')?.value;
  return `${y}-${m}-${d}`;
};
