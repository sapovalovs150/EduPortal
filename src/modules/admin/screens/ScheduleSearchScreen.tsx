import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, useWindowDimensions, TouchableOpacity } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../core/auth/AuthContext';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { SuggestionInput } from '../../../shared/components/SuggestionInput';
import { CollapsibleCalendar } from '../../../shared/components/CollapsibleCalendar';
import { formatPairLabel, formatTimeRange } from '../../../shared/utils/time';

const normalizeSearchText = (value: string) =>
  value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const normalizeDate = (date: string | Date): string => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const ScheduleSearchScreen = () => {
  const { colors } = useTheme();
  const { schedule, groups, searchTeachers } = useAuth();
  const { width, height } = useWindowDimensions();

  const shortSide = Math.min(width, height);
  const baseH = 340;
  const scale = useMemo(() => Math.max(0.65, Math.min(shortSide / baseH, 1.4)), [shortSide]);
  const fs = (min: number, ideal: number, max: number) => Math.min(Math.max(Math.round(ideal * scale), min), max);
  const sp = (min: number, ideal: number, max: number) => Math.min(Math.max(Math.round(ideal * scale), min), max);

  const [searchType, setSearchType] = useState<'group' | 'teacher'>('group');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [teacherQuery, setTeacherQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(normalizeDate(new Date()));

  const effectiveTeacherName = (selectedTeacher || teacherQuery).trim();
  const normalizedSelectedGroup = normalizeSearchText(selectedGroup);
  const normalizedTeacherQuery = normalizeSearchText(effectiveTeacherName);

  const groupSuggestions = useMemo(
    () =>
      [...new Set([...groups.map((g) => g.name), ...schedule.map((s) => s.groupName)])]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'ru')),
    [groups, schedule]
  );

  const teacherSuggestions = useMemo(
    () =>
      [
        ...new Set([
          ...searchTeachers(teacherQuery).map((t) => t.name),
          ...schedule
            .map((s) => s.teacherName)
            .filter((name) => normalizeSearchText(name).includes(normalizeSearchText(teacherQuery))),
        ]),
      ]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'ru')),
    [searchTeachers, teacherQuery, schedule]
  );

  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};

    if (searchType === 'group' && normalizedSelectedGroup) {
      schedule
        .filter((s) => normalizeSearchText(s.groupName) === normalizedSelectedGroup)
        .forEach((s) => {
          const key = normalizeDate(s.date);
          marks[key] = { ...(marks[key] || {}), marked: true, dotColor: colors.admin.primary };
        });
    }

    if (searchType === 'teacher' && normalizedTeacherQuery) {
      schedule
        .filter((s) => normalizeSearchText(s.teacherName).includes(normalizedTeacherQuery))
        .forEach((s) => {
          const key = normalizeDate(s.date);
          marks[key] = { ...(marks[key] || {}), marked: true, dotColor: colors.admin.primary };
        });
    }

    return marks;
  }, [searchType, normalizedSelectedGroup, normalizedTeacherQuery, schedule, colors.admin.primary]);

  const filteredSchedule = useMemo(() => {
    const day = normalizeDate(selectedDate);

    if (searchType === 'group' && normalizedSelectedGroup) {
      return schedule
        .filter((s) => normalizeSearchText(s.groupName) === normalizedSelectedGroup && normalizeDate(s.date) === day)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
    }

    if (searchType === 'teacher' && normalizedTeacherQuery) {
      return schedule
        .filter((s) => normalizeSearchText(s.teacherName).includes(normalizedTeacherQuery) && normalizeDate(s.date) === day)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
    }

    return [];
  }, [schedule, searchType, normalizedSelectedGroup, normalizedTeacherQuery, selectedDate]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.common.background }]}>
      <KeyboardAwareScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: sp(16, 20, 24), paddingVertical: sp(8, 12, 16) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: colors.text.primary, fontSize: fs(22, 28, 32) }]}>
          Поиск расписания
        </Text>

        <View style={[styles.searchTypeRow, { marginBottom: sp(12, 14, 16) }]}>
          <TouchableOpacity
            style={[
              styles.searchTypeButton,
              {
                backgroundColor: searchType === 'group' ? colors.admin.primary : colors.common.white,
                borderColor: colors.common.border,
              },
            ]}
            onPress={() => {
              setSearchType('group');
              setSelectedTeacher('');
              setTeacherQuery('');
            }}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.82}
              style={[
                styles.searchTypeText,
                {
                  color: searchType === 'group' ? colors.common.white : colors.text.secondary,
                  fontSize: fs(12, 14, 16),
                },
              ]}
            >
              По группе
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.searchTypeButton,
              {
                backgroundColor: searchType === 'teacher' ? colors.admin.primary : colors.common.white,
                borderColor: colors.common.border,
              },
            ]}
            onPress={() => {
              setSearchType('teacher');
              setSelectedGroup('');
            }}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={[
                styles.searchTypeText,
                {
                  color: searchType === 'teacher' ? colors.common.white : colors.text.secondary,
                  fontSize: fs(12, 14, 16),
                },
              ]}
            >
              По преподавателю
            </Text>
          </TouchableOpacity>
        </View>

        {searchType === 'group' ? (
          <SuggestionInput
            placeholder="Введите группу"
            value={selectedGroup}
            onChangeText={setSelectedGroup}
            suggestions={groupSuggestions}
            onSelect={setSelectedGroup}
            icon="people-outline"
            maxSuggestions={5}
          />
        ) : (
          <SuggestionInput
            placeholder="Введите фамилию преподавателя"
            value={teacherQuery}
            onChangeText={(value) => {
              setTeacherQuery(value);
              setSelectedTeacher('');
            }}
            suggestions={teacherSuggestions}
            onSelect={(value) => {
              setSelectedTeacher(value);
              setTeacherQuery(value);
            }}
            icon="person-outline"
            maxSuggestions={5}
          />
        )}

        <View
          style={[
            styles.calendarContainer,
            { backgroundColor: colors.common.white, marginBottom: sp(16, 20, 24) },
          ]}
        >
          <CollapsibleCalendar
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            markedDates={markedDates}
            theme={{
              selectedDayBackgroundColor: colors.admin.primary,
              todayTextColor: colors.admin.primary,
              calendarBackground: 'transparent',
            }}
          />
        </View>

        {(selectedGroup || effectiveTeacherName) && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text.primary, fontSize: fs(16, 18, 20) }]}>
              Расписание на {new Date(selectedDate).toLocaleDateString('ru-RU')}
            </Text>

            {filteredSchedule.length > 0 ? (
              filteredSchedule.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.common.white,
                      padding: sp(12, 16, 20),
                      marginBottom: sp(8, 12, 16),
                    },
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <Text style={[styles.pairTopText, { color: '#D92D20', fontSize: fs(14, 17, 22) }]}>
                      {formatPairLabel(item.startTime, item.endTime)}
                    </Text>
                    <Text style={[styles.timeTopText, { color: colors.admin.primary, fontSize: fs(15, 19, 24) }]}>
                      {formatTimeRange(item.startTime, item.endTime)}
                    </Text>
                  </View>

                  <Text style={[styles.subjectText, { color: colors.text.primary, fontSize: fs(15, 18, 22) }]}>
                    {item.subject}
                  </Text>

                  <View style={styles.detailsLine}>
                    <View style={styles.detailItem}>
                      <Ionicons name="person-outline" size={fs(12, 14, 16)} color={colors.text.tertiary} />
                      <Text style={[styles.detailText, { color: colors.text.secondary, fontSize: fs(12, 14, 16) }]}>
                        {item.teacherName}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="people-outline" size={fs(12, 14, 16)} color={colors.text.tertiary} />
                      <Text style={[styles.detailText, { color: colors.text.secondary, fontSize: fs(12, 14, 16) }]}>
                        Группа: {item.groupName}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailItem}>
                    <Ionicons name="business-outline" size={fs(12, 14, 16)} color={colors.text.tertiary} />
                    <Text style={[styles.detailText, { color: colors.text.secondary, fontSize: fs(12, 14, 16) }]}>
                      Ауд. {item.room}, корпус {item.building}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyBox}>
                <Ionicons name="calendar-clear-outline" size={fs(30, 40, 52)} color={colors.text.tertiary} />
                <Text style={[styles.empty, { color: colors.text.secondary, fontSize: fs(14, 16, 18) }]}>
                  На выбранный день занятий нет
                </Text>
              </View>
            )}
          </>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  scrollContent: { paddingBottom: 30 },
  title: { fontWeight: '900', marginBottom: 16 },
  searchTypeRow: { flexDirection: 'row', gap: 10 },
  searchTypeButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  searchTypeText: { fontWeight: '700', textAlign: 'center', includeFontPadding: false },
  calendarContainer: { borderRadius: 24, borderWidth: 1, borderColor: '#f0f0f0', overflow: 'hidden' },
  sectionTitle: { fontWeight: '800', marginBottom: 10, marginTop: 2 },
  card: { borderRadius: 22, borderWidth: 1, borderColor: '#f0f0f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  pairTopText: { fontWeight: '800' },
  timeTopText: { fontWeight: '800' },
  subjectText: { fontWeight: '800', marginBottom: 10 },
  detailsLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 8 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontWeight: '600' },
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, opacity: 0.6 },
  empty: { marginTop: 8, textAlign: 'center', fontWeight: '600' },
});
