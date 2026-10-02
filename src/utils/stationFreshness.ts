/** Source timestamps have no offset. Compare calendar days in Portugal's timezone. */
export function stationAgeDays(timestamp: string | undefined, now = new Date()): number | null {
  const match = timestamp?.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!match) return null;
  if (Number(match[4] ?? 0) > 23 || Number(match[5] ?? 0) > 59 || Number(match[6] ?? 0) > 59) return null;
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  const updated = new Date(Date.UTC(year, month - 1, day));
  if (updated.getUTCFullYear() !== year || updated.getUTCMonth() !== month - 1 || updated.getUTCDate() !== day) return null;
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const value = (type: string) => Number(parts.find(part => part.type === type)?.value);
  const today = Date.UTC(value('year'), value('month') - 1, value('day'));
  const age = Math.round((today - updated.getTime()) / 86400000);
  return age < 0 ? null : age;
}
