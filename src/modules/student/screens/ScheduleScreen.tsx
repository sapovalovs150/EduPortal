import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  useWindowDimensions,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../core/auth/AuthContext';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { SuggestionInput } from '../../../shared/components/SuggestionInput';
import { CollapsibleCalendar } from '../../../shared/components/CollapsibleCalendar';
import { UniversityLogo } from '../../../shared/components/UniversityLogo';
import { formatPairLabel, formatTimeNoSeconds, formatTimeRange } from '../../../shared/utils/time';

const normalizeDate = (date: string | Date): string => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTodayLocalStr = (): string => normalizeDate(new Date());
const normalizeGroupName = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

export const ScheduleScreen = () => {
  const { colors } = useTheme();
  const { user, schedule, consultations, searchTeachers, isLoading } = useAuth();
  const { width, height } = useWindowDimensions();

  const shortSide = Math.min(width, height);
  const baseH = 340;
  const scale = useMemo(() => Math.max(0.65, Math.min(shortSide / baseH, 1.4)), [shortSide]);
  const fs = (min: number, ideal: number, max: number) => Math.min(Math.max(Math.round(ideal * scale), min), max);
  const sp = (min: number, ideal: number, max: number) => Math.min(Math.max(Math.round(ideal * scale), min), max);

  const [selectedDate, setSelectedDate] = useState(getTodayLocalStr());
  const [teacherQuery, setTeacherQuery] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [teacherSelectedDate, setTeacherSelectedDate] = useState(getTodayLocalStr());

  const selectedTeacherName = (selectedTeacher || teacherQuery).trim();
  const normalizedGroupName = useMemo(
    () => (user?.groupName ? normalizeGroupName(user.groupName) : ''),
    [user?.groupName]
  );

  const daySchedule = useMemo(() => {
    if (!normalizedGroupName) return [];
    return schedule.filter(
      (item) =>
        normalizeGroupName(item.groupName) === normalizedGroupName &&
        normalizeDate(item.date) === normalizeDate(selectedDate)
    );
  }, [schedule, selectedDate, normalizedGroupName]);

  const groupConsultations = useMemo(() => {
    if (!normalizedGroupName) return [];
    return consultations.filter(
      (c) =>
        c.status === 'scheduled' &&
        normalizeDate(c.date) === normalizeDate(selectedDate) &&
        normalizeGroupName(c.groupName ?? '') === normalizedGroupName
    );
  }, [consultations, selectedDate, normalizedGroupName]);

  const studentMarkedDates = useMemo(() => {
    const dates: Record<string, any> = {};
    if (!normalizedGroupName) return dates;

    schedule
      .filter((item) => normalizeGroupName(item.groupName) === normalizedGroupName)
      .forEach((item) => {
        dates[normalizeDate(item.date)] = { marked: true, dotColor: colors.student.primary };
      });

    consultations
      .filter((c) => c.status === 'scheduled' && normalizeGroupName(c.groupName ?? '') === normalizedGroupName)
      .forEach((c) => {
        const key = normalizeDate(c.date);
        dates[key] = { ...dates[key], marked: true, dotColor: colors.student.primary };
      });

    return dates;
  }, [schedule, consultations, normalizedGroupName, colors.student.primary]);

  const scheduleEvents = useMemo(() => {
    const pairs = daySchedule.map((item) => ({
      ...item,
      isConsultation: false,
      displayTime: formatTimeRange(item.startTime, item.endTime),
    }));

    const consults = groupConsultations.map((c) => ({
      id: c.id,
      subject: c.topic,
      teacherName: c.teacherName,
      room: c.room,
      building: c.building,
      startTime: formatTimeNoSeconds(c.startTime),
      endTime: formatTimeNoSeconds(c.endTime),
      isConsultation: true,
      displayTime: formatTimeRange(c.startTime, c.endTime),
    }));

    return [...pairs, ...consults].sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [daySchedule, groupConsultations]);

  const teacherSuggestions = useMemo(
    () => searchTeachers(teacherQuery).map((t) => t.name),
    [teacherQuery, searchTeachers]
  );

  const teacherMarkedDates = useMemo(() => {
    const dates: Record<string, any> = {};
    if (!selectedTeacherName) return dates;
    const q = selectedTeacherName.toLowerCase();

    schedule
      .filter((item) => item.teacherName.toLowerCase().includes(q))
      .forEach((item) => {
        dates[normalizeDate(item.date)] = { marked: true, dotColor: colors.student.primary };
      });

    return dates;
  }, [schedule, selectedTeacherName, colors.student.primary]);

  const teacherSchedule = useMemo(() => {
    if (!selectedTeacherName) return [];
    const q = selectedTeacherName.toLowerCase();
    const day = normalizeDate(teacherSelectedDate);

    return schedule
      .filter((item) => normalizeDate(item.date) === day)
      .filter((item) => item.teacherName.toLowerCase().includes(q))
      .sort((a, b) => formatTimeNoSeconds(a.startTime).localeCompare(formatTimeNoSeconds(b.startTime)));
  }, [schedule, teacherSelectedDate, selectedTeacherName]);

  if (isLoading) {
    return (
      <SafeAreaView
        style={[
          styles.safe,
          { backgroundColor: colors.common.background, justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <ActivityIndicator size="large" color={colors.student.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.common.background }]}>
      <View
        style={[
          styles.header,
          { height: sp(44, 56, 70), paddingHorizontal: sp(16, 24, 32) },
        ]}
      >
        <Text
          style={[
            styles.headerTitle,
            { color: colors.text.primary, fontSize: fs(18, 22, 28) },
          ]}
        >
          Расписание
        </Text>
        <UniversityLogo size={sp(40, 52, 64)} />
      </View>

      <KeyboardAwareScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: sp(16, 20, 24), paddingVertical: sp(8, 12, 18) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.calendarCard,
            { backgroundColor: colors.common.white, marginBottom: sp(16, 20, 24) },
          ]}
        >
          <CollapsibleCalendar
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            markedDates={studentMarkedDates}
            theme={{
              selectedDayBackgroundColor: colors.student.primary,
              todayTextColor: colors.student.primary,
              calendarBackground: 'transparent',
            }}
          />
        </View>

        <View style={styles.eventsList}>
          {scheduleEvents.length > 0 ? (
            scheduleEvents.map((item: any) => (
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
                  <Text style={[styles.timeTopText, { color: colors.student.primary, fontSize: fs(15, 19, 24) }]}>
                    {item.displayTime}
                  </Text>
                </View>
                <Text style={[styles.subjectText, { color: colors.text.primary, fontSize: fs(15, 18, 22) }]}>
                  {item.subject}
                </Text>
                <View style={styles.detailsLine}>
                  <View style={styles.detailsRow}>
                    <Ionicons name="person-outline" size={fs(12, 14, 16)} color={colors.text.tertiary} />
                    <Text style={[styles.detailText, { color: colors.text.secondary, fontSize: fs(12, 14, 16) }]}>
                      {item.teacherName}
                    </Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Ionicons name={item.isConsultation ? 'bookmark-outline' : 'school-outline'} size={fs(12, 14, 16)} color={colors.text.tertiary} />
                    <Text style={[styles.detailText, { color: colors.text.secondary, fontSize: fs(12, 14, 16), fontWeight: '700' }]}>
                      {item.isConsultation ? 'Консультация' : 'Занятие'}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailsRow}>
                  <Ionicons name="business-outline" size={fs(12, 14, 16)} color={colors.text.tertiary} />
                  <Text style={[styles.detailText, { color: colors.text.secondary, fontSize: fs(12, 14, 16) }]}>
                    Ауд. {item.room}, корпус {item.building}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyBox}>
              <Ionicons name="cafe-outline" size={fs(32, 44, 56)} color={colors.text.tertiary} />
              <Text style={[styles.emptyText, { color: colors.text.secondary, fontSize: fs(12, 14, 17) }]}>
                На этот день нет занятий
              </Text>
            </View>
          )}
        </View>

        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.text.primary,
              fontSize: fs(14, 16, 18),
              marginTop: sp(20, 28, 36),
              marginBottom: sp(8, 10, 12),
            },
          ]}
        >
          Расписание преподавателя
        </Text>

        <View
          style={[
            styles.searchCard,
            {
              backgroundColor: colors.common.white,
              padding: sp(12, 16, 20),
              marginBottom: sp(12, 16, 20),
            },
          ]}
        >
          <SuggestionInput
            placeholder="Введите фамилию"
            value={teacherQuery}
            onChangeText={(value: string) => {
              setTeacherQuery(value);
              setSelectedTeacher('');
            }}
            suggestions={teacherSuggestions}
            onSelect={(value) => {
              setSelectedTeacher(value);
              setTeacherQuery(value);
            }}
            icon="search"
            maxSuggestions={5}
          />
        </View>

        {selectedTeacherName ? (
          <>
            <View
              style={[
                styles.calendarCard,
                { backgroundColor: colors.common.white, marginBottom: sp(16, 20, 24) },
              ]}
            >
              <CollapsibleCalendar
                selectedDate={teacherSelectedDate}
                onDateSelect={setTeacherSelectedDate}
                markedDates={teacherMarkedDates}
                theme={{
                  selectedDayBackgroundColor: colors.student.primary,
                  todayTextColor: colors.student.primary,
                  calendarBackground: 'transparent',
                }}
              />
            </View>

            <View style={styles.eventsList}>
              {teacherSchedule.length > 0 ? (
                teacherSchedule.map((item) => (
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
                    <View style={styles.timeBadge}>
                      <Text style={[styles.timeText, { color: colors.student.primary, fontSize: fs(11, 13, 16) }]}>
                        {formatTimeRange(item.startTime, item.endTime)} · {formatPairLabel(item.startTime, item.endTime)}
                      </Text>
                    </View>
                    <Text style={[styles.subjectText, { color: colors.text.primary, fontSize: fs(15, 18, 22) }]}>
                      {item.subject}
                    </Text>
                    <View style={styles.detailsRow}>
                      <Ionicons name="person-outline" size={fs(12, 14, 16)} color={colors.text.tertiary} />
                      <Text style={[styles.detailText, { color: colors.text.secondary, fontSize: fs(12, 14, 16) }]}>
                        {item.teacherName}
                      </Text>
                    </View>
                    <View style={styles.detailsRow}>
                      <Ionicons name="people-outline" size={fs(12, 14, 16)} color={colors.text.tertiary} />
                      <Text style={[styles.detailText, { color: colors.text.secondary, fontSize: fs(12, 14, 16) }]}>
                        Группа: {item.groupName}
                      </Text>
                    </View>
                    <View style={styles.detailsRow}>
                      <Ionicons name="business-outline" size={fs(12, 14, 16)} color={colors.text.tertiary} />
                      <Text style={[styles.detailText, { color: colors.text.secondary, fontSize: fs(12, 14, 16) }]}>
                        Ауд. {item.room}, корпус {item.building}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyBox}>
                  <Text style={[styles.emptyText, { color: colors.text.secondary, fontSize: fs(12, 14, 17) }]}>
                    У преподавателя нет пар на этот день
                  </Text>
                </View>
              )}
            </View>
          </>
        ) : null}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontWeight: '900' },
  container: { flex: 1 },
  content: { flexGrow: 1 },
  calendarCard: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#f0f0f0' },
  eventsList: { width: '100%' },
  card: { borderRadius: 22, borderWidth: 1, borderColor: '#f0f0f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  pairTopText: { fontWeight: '800' },
  timeTopText: { fontWeight: '800' },
  timeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: '#EEF1FF', marginBottom: 8 },
  timeText: { fontWeight: '700' },
  subjectText: { fontWeight: '800', marginBottom: 8 },
  detailsLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  detailText: { fontWeight: '600' },
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, opacity: 0.6 },
  emptyText: { fontWeight: '600', marginTop: 12, textAlign: 'center' },
  sectionTitle: { fontWeight: '800' },
  searchCard: { borderRadius: 20, borderWidth: 1, borderColor: '#f0f0f0' },
});
