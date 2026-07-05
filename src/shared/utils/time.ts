import { STANDARD_TIME_SLOTS } from '../constants/timeSlots';

const toMinutes = (time: string): number | null => {
  if (!time) return null;
  const normalized = time.trim().slice(0, 5);
  const parts = normalized.split(':');
  if (parts.length !== 2) return null;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

export const formatTimeNoSeconds = (time: string): string => {
  if (!time) return '';
  const trimmed = time.trim();
  if (trimmed.length >= 5 && trimmed[2] === ':') {
    return trimmed.slice(0, 5);
  }
  return time;
};

export const formatTimeRange = (startTime: string, endTime: string): string => {
  return `${formatTimeNoSeconds(startTime)}-${formatTimeNoSeconds(endTime)}`;
};

export const getPairNumberByRange = (startTime: string, endTime: string): number | null => {
  const start = toMinutes(formatTimeNoSeconds(startTime));
  const end = toMinutes(formatTimeNoSeconds(endTime));
  if (start === null || end === null) return null;

  for (const slot of STANDARD_TIME_SLOTS) {
    const slotStart = toMinutes(slot.start);
    const slotEnd = toMinutes(slot.end);
    const slotStartBuilding = toMinutes(slot.startBuilding);
    const slotEndBuilding = toMinutes(slot.endBuilding);
    if (slotStart === null || slotEnd === null) continue;
    if (start === slotStart && end === slotEnd) return Number(slot.id);
    if (slotStartBuilding !== null && slotEndBuilding !== null) {
      if (start === slotStartBuilding && end === slotEndBuilding) return Number(slot.id);
    }
  }
  return null;
};

export const formatPairLabel = (startTime: string, endTime: string): string => {
  const pairNo = getPairNumberByRange(startTime, endTime);
  return pairNo ? `${pairNo}-я пара` : 'Вне сетки пар';
};
