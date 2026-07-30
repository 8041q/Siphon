import i18n from '../i18n';

const DAY_ORDER = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export interface TimeWindow {
  open: string;
  close: string;
  overnight: boolean;
  is24h: boolean;
}

export interface ScheduleSegment {
  days: string[];
  windows: TimeWindow[];
}

function normalizeTime(t: string): string {
  const parts = t.trim().split(':');
  return `${parts[0]!.padStart(2, '0')}:${parts[1]!.padStart(2, '0')}`;
}

function expandDayRange(code: string): string[] {
  if (code.includes('-')) {
    const [start, end] = code.split('-');
    const si = DAY_ORDER.indexOf(start);
    const ei = DAY_ORDER.indexOf(end);
    if (si <= ei) {
      return DAY_ORDER.slice(si, ei + 1);
    }
    return [...DAY_ORDER.slice(si), ...DAY_ORDER.slice(0, ei + 1)];
  }
  return [code];
}

function parseTimewindow(window: string): TimeWindow | null {
  const trimmed = window.trim();
  if (trimmed === '24H') {
    return { open: '00:00', close: '00:00', overnight: false, is24h: true };
  }
  const dashIdx = trimmed.indexOf('-');
  if (dashIdx < 0) return null;
  const open = normalizeTime(trimmed.slice(0, dashIdx));
  const close = normalizeTime(trimmed.slice(dashIdx + 1));
  return {
    open,
    close,
    overnight: close < open && close !== '00:00',
    is24h: false,
  };
}

export function parseSchedule(schedule: string): ScheduleSegment[] {
  const segments = schedule.split(';').map((s) => s.trim()).filter(Boolean);
  return segments.map((segment) => {
    const colonIdx = segment.indexOf(':');
    const daycode = colonIdx >= 0 ? segment.slice(0, colonIdx).trim() : segment;
    const timePart = colonIdx >= 0 ? segment.slice(colonIdx + 1).trim() : '';

    const days = expandDayRange(daycode);

    const windowParts = timePart.split(/\s+y\s+/);
    const windows: TimeWindow[] = [];
    for (const wp of windowParts) {
      const tw = parseTimewindow(wp);
      if (tw) windows.push(tw);
    }

    return { days, windows };
  });
}

function dayLabel(code: string): string {
  return i18n.t(`station.day_${code.toLowerCase()}`, { defaultValue: code });
}

function formatDayRange(codes: string[]): string {
  if (codes.length === 1) return dayLabel(codes[0]);
  if (codes.length === 7) {
    return `${dayLabel('L')}\u2013${dayLabel('D')}`;
  }
  return `${dayLabel(codes[0])}\u2013${dayLabel(codes[codes.length - 1])}`;
}

function formatWindow(window: TimeWindow): string {
  if (window.is24h) return '24h';
  if (window.overnight) return `${window.open}\u2013${window.close} (+1)`;
  return `${window.open}\u2013${window.close}`;
}

export function formatSchedule(schedule: string): string {
  const segments = parseSchedule(schedule);
  return segments
    .map((seg) => {
      const dayRange = formatDayRange(seg.days);
      if (seg.windows.length === 0) return dayRange;
      const windows = seg.windows
        .map(formatWindow)
        .join(` ${i18n.t('common.and')} `);
      return `${dayRange}: ${windows}`;
    })
    .join('; ');
}

export function marginLabel(margin: string): string {
  return i18n.t(`station.margin_${margin.toLowerCase()}`, {
    defaultValue: margin,
  });
}
