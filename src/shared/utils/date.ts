const RU_LOCALE = 'ru-RU';

const parseIsoDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

export const toLocalIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDateRu = (value?: string | null) => {
  if (!value) return '';
  return parseIsoDate(value).toLocaleDateString(RU_LOCALE);
};

export const formatDateTimeRu = (date?: string | null, time?: string | null) => {
  const formattedDate = formatDateRu(date);
  if (!formattedDate) return time || '';
  return time ? `${formattedDate} ${time}` : formattedDate;
};

export const formatDateRangeRu = (startDate?: string | null, endDate?: string | null) => {
  const formattedStart = formatDateRu(startDate);
  const formattedEnd = formatDateRu(endDate);

  if (!formattedStart && !formattedEnd) return '';
  if (!formattedEnd || startDate === endDate) return formattedStart;
  if (!formattedStart) return formattedEnd;

  return `${formattedStart} - ${formattedEnd}`;
};
