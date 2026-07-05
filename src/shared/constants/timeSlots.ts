// src/shared/constants/timeSlots.ts

export interface TimeSlot {
  id: string;
  start: string;
  end: string;
  startBuilding: string;
  endBuilding: string;
}

// Стандартные тайм-слоты для обычных корпусов (А, Б, В)
export const STANDARD_TIME_SLOTS: TimeSlot[] = [
  { id: '1', start: '08:00', end: '09:35', startBuilding: '08:30', endBuilding: '10:05' },
  { id: '2', start: '09:45', end: '11:20', startBuilding: '10:15', endBuilding: '11:50' },
  { id: '3', start: '11:30', end: '13:05', startBuilding: '12:00', endBuilding: '13:35' },
  { id: '4', start: '13:30', end: '15:05', startBuilding: '14:00', endBuilding: '15:35' },
  { id: '5', start: '15:15', end: '16:50', startBuilding: '15:45', endBuilding: '17:20' },
  { id: '6', start: '17:00', end: '18:35', startBuilding: '17:30', endBuilding: '19:05' },
  { id: '7', start: '18:40', end: '20:05', startBuilding: '19:10', endBuilding: '20:35' },
];

// Дни недели для отображения
export const WEEKDAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

// Номера дней недели для PostgreSQL (1=ПН, 2=ВТ, 3=СР, 4=ЧТ, 5=ПТ, 6=СБ, 7=ВС)
export const DAY_NUMBERS: Record<string, number> = {
  'Понедельник': 1,
  'Вторник': 2,
  'Среда': 3,
  'Четверг': 4,
  'Пятница': 5,
  'Суббота': 6,
  'Воскресенье': 7,
};

// Получить время для конкретного корпуса
export const getSlotTimes = (slot: TimeSlot, building: string): { start: string; end: string } => {
  // Строительный блок (4-значные аудитории)
  if (building === 'Строительный блок') {
    return { start: slot.startBuilding, end: slot.endBuilding };
  }
  return { start: slot.start, end: slot.end };
};

// Получить время для аудитории по её формату
export const getTimesForAuditorium = (auditorium: string, slot: TimeSlot): { start: string; end: string } => {
  if (/^\d{4}$/.test(auditorium)) {
    return { start: slot.startBuilding, end: slot.endBuilding };
  }
  return { start: slot.start, end: slot.end };
};

// Проверка, является ли аудитория строительным блоком
export const isBuildingBlock = (auditorium: string): boolean => {
  return /^\d{4}$/.test(auditorium);
};

// Получить все временные слоты для отображения
export const getAllTimeSlots = (building: string): { start: string; end: string; id: string }[] => {
  return STANDARD_TIME_SLOTS.map(slot => ({
    id: slot.id,
    start: getSlotTimes(slot, building).start,
    end: getSlotTimes(slot, building).end,
  }));
};