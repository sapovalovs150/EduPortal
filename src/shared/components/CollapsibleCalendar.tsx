import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const normalizeDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseDate = (value: string) => {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
};

interface CollapsibleCalendarProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  markedDates?: Record<string, any>;
  theme?: any;
  minDate?: string;
  maxDate?: string;
  closeOnSelect?: boolean;
}

export const CollapsibleCalendar: React.FC<CollapsibleCalendarProps> = ({
  selectedDate,
  onDateSelect,
  markedDates = {},
  theme = {},
  minDate,
  maxDate,
  closeOnSelect = true,
}) => {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [expanded, setExpanded] = useState(false);
  const isSmall = width < 380;

  const weekDays = useMemo(() => {
    const base = parseDate(selectedDate);
    const day = base.getDay();
    const mondayShift = day === 0 ? -6 : 1 - day;
    const monday = new Date(base);
    monday.setDate(base.getDate() + mondayShift);
    monday.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [selectedDate]);

  const handleSelect = (date: string) => {
    onDateSelect(date);
    if (expanded && closeOnSelect) setExpanded(false);
  };

  return (
    <View style={[s.wrap, { borderColor: colors.common.border, backgroundColor: colors.common.card }]}>
      <View style={s.header}>
        <Text style={[s.month, { color: colors.text.primary }]}>
          {parseDate(selectedDate).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
        </Text>
        <TouchableOpacity onPress={() => setExpanded((v) => !v)} style={s.btn}>
          <Ionicons name={expanded ? 'chevron-up' : 'calendar-outline'} size={18} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {!expanded && (
        <View style={s.week}>
          {weekDays.map((d) => {
            const ds = normalizeDate(d);
            const active = ds === selectedDate;
            const marked = !!markedDates?.[ds]?.marked;
            return (
              <TouchableOpacity key={ds} onPress={() => handleSelect(ds)} style={[s.day, active && { backgroundColor: theme.selectedDayBackgroundColor || colors.admin.primary }]}>
                <Text style={[s.dow, { color: active ? '#fff' : colors.text.secondary }]}>{d.toLocaleDateString('ru-RU', { weekday: 'short' }).slice(0, 2)}</Text>
                <Text style={[s.num, isSmall && s.numSmall, { color: active ? '#fff' : colors.text.primary }]}>{d.getDate()}</Text>
                {marked && !active && <View style={[s.dot, { backgroundColor: theme.todayTextColor || colors.admin.primary }]} />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {expanded && (
        <Calendar
          current={selectedDate}
          onDayPress={(d: any) => handleSelect(d.dateString)}
          markedDates={{
            ...markedDates,
            [selectedDate]: {
              ...(markedDates[selectedDate] || {}),
              selected: true,
              selectedColor: theme.selectedDayBackgroundColor || colors.admin.primary,
              selectedTextColor: '#fff',
            },
          }}
          firstDay={1}
          monthFormat="MMMM yyyy"
          hideExtraDays
          enableSwipeMonths
          theme={{
            calendarBackground: 'transparent',
            textSectionTitleColor: colors.text.secondary,
            todayTextColor: theme.todayTextColor || colors.admin.primary,
            selectedDayBackgroundColor: theme.selectedDayBackgroundColor || colors.admin.primary,
            selectedDayTextColor: '#fff',
            dayTextColor: colors.text.primary,
            textDisabledColor: colors.text.tertiary,
            monthTextColor: colors.text.primary,
            arrowColor: colors.admin.primary,
            textDayFontSize: isSmall ? 14 : 16,
            textMonthFontSize: isSmall ? 14 : 16,
            textDayHeaderFontSize: isSmall ? 11 : 12,
            ...theme,
          }}
          minDate={minDate}
          maxDate={maxDate}
          style={s.calendar}
        />
      )}
    </View>
  );
};

const s = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 },
  month: { fontSize: 16, fontWeight: '800', textTransform: 'capitalize' },
  btn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  week: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6, paddingBottom: 8 },
  day: { flex: 1, marginHorizontal: 2, borderRadius: 12, alignItems: 'center', paddingVertical: 6 },
  dow: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  num: { fontSize: 26, lineHeight: 28, fontWeight: '800' },
  numSmall: { fontSize: 20, lineHeight: 22 },
  dot: { marginTop: 3, width: 4, height: 4, borderRadius: 2 },
  calendar: { borderRadius: 12, overflow: 'hidden' },
});

