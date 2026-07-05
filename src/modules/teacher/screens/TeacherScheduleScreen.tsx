import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView, useWindowDimensions, ActivityIndicator } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../../core/auth/AuthContext';
import { TeacherScheduleStackParamList } from '../../../core/navigation/types';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { CollapsibleCalendar } from '../../../shared/components/CollapsibleCalendar';
import { UniversityLogo } from '../../../shared/components/UniversityLogo';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../core/supabase/client';
import { formatPairLabel, formatTimeNoSeconds, formatTimeRange } from '../../../shared/utils/time';
import { Consultation } from '../../../shared/types';

const normalizeDate = (date: string | Date): string => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTodayStr = () => normalizeDate(new Date());

export const TeacherScheduleScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<TeacherScheduleStackParamList>>();
  const { colors } = useTheme();
  const {
    user,
    schedule,
    consultations,
    isLoading,
    cancelConsultation,
  } = useAuth();
  const { width, height } = useWindowDimensions();

  const shortSide = Math.min(width, height);
  const baseH = 340;
  const scale = useMemo(() => Math.max(0.65, Math.min(shortSide / baseH, 1.4)), [shortSide]);
  const fs = (min: number, ideal: number, max: number) => Math.min(Math.max(Math.round(ideal * scale), min), max);
  const sp = (min: number, ideal: number, max: number) => Math.min(Math.max(Math.round(ideal * scale), min), max);

  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [dailyPin, setDailyPin] = useState('');
  const [pinExpires, setPinExpires] = useState('');
  const [isLoadingPin, setIsLoadingPin] = useState(true);

  const scheduleEvents = useMemo(() => {
    if (!user?.name) return [];
    return schedule.filter((item) => item.teacherName === user.name);
  }, [schedule, user]);

  const filteredEvents = useMemo(() => {
    const normalizedSelected = normalizeDate(selectedDate);
    const dayEvents = scheduleEvents.filter((event) => normalizeDate(event.date) === normalizedSelected);
    const consultationsForDay = consultations.filter(
      (c) => normalizeDate(c.date) === normalizedSelected && c.teacherName === user?.name && c.status === 'scheduled'
    );

    const combined = [
      ...dayEvents.map((item) => ({
        ...item,
        type: 'pair',
        isConsultation: false,
        displayTime: formatTimeRange(item.startTime, item.endTime),
      })),
      ...consultationsForDay.map((c) => ({
        id: c.id,
        subject: c.topic,
        topic: c.topic,
        teacherName: c.teacherName,
        groupName: c.groupName,
        studentNames: c.studentNames,
        date: c.date,
        startTime: formatTimeNoSeconds(c.startTime),
        endTime: formatTimeNoSeconds(c.endTime),
        room: c.room,
        building: c.building,
        isConsultation: true,
        type: 'consultation',
        displayTime: formatTimeRange(c.startTime, c.endTime),
      })),
    ];
    return combined.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [scheduleEvents, consultations, selectedDate, user]);

  const markedDates = useMemo(() => {
    const dates: Record<string, any> = {};
    scheduleEvents.forEach((event) => {
      const dateKey = normalizeDate(event.date);
      dates[dateKey] = { marked: true, dotColor: colors.teacher.primary };
    });
    consultations
      .filter(
        (c) =>
          c.status === 'scheduled' &&
          c.teacherName === user?.name
      )
      .forEach((c) => {
        const dateKey = normalizeDate(c.date);
        dates[dateKey] = { ...dates[dateKey], marked: true, dotColor: colors.teacher.primary };
      });
    return dates;
  }, [scheduleEvents, consultations, colors.teacher.primary, user]);

  const beginReschedule = (c: Consultation) => {
    navigation.navigate('ConsultationEdit', { consultationId: c.id, role: 'teacher' });
  };

  const handleCancelConsultation = (consultationId: string) => {
    Alert.alert(
      'Подтверждение',
      'Отменить консультацию?',
      [
        { text: 'Нет', style: 'cancel' },
        {
          text: 'Да, отменить',
          style: 'destructive',
          onPress: async () => {
            const result = await cancelConsultation(consultationId);
            if (!result.success) {
              Alert.alert('Ошибка', result.message || 'Не удалось отменить консультацию');
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    const fetchPin = async () => {
      if (!user?.name) {
        setIsLoadingPin(false);
        return;
      }
      try {
        const { data, error } = await supabase.from('teachers').select('daily_pin, pin_expires_at').eq('name', user.name).maybeSingle();
        if (error) throw error;
        const now = new Date();
        const expiresAt = data?.pin_expires_at ? new Date(data.pin_expires_at) : null;
        const isExpired = expiresAt && expiresAt < now;
        if (data?.daily_pin && !isExpired && expiresAt) {
          setDailyPin(data.daily_pin);
          const diffMs = expiresAt.getTime() - now.getTime();
          const hoursLeft = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
          setPinExpires(`Действует до конца дня (еще ${hoursLeft} ч.)`);
        } else {
          const { data: newPin, error: genError } = await supabase.rpc('update_teacher_pin', { teacher_name: user.name });
          if (genError) throw genError;
          if (newPin) {
            setDailyPin(newPin);
            setPinExpires('Действует до конца дня');
          }
        }
      } catch {
        // noop
      } finally {
        setIsLoadingPin(false);
      }
    };
    fetchPin();
  }, [user]);

  if (isLoading || isLoadingPin) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.common.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.teacher.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.common.background }]}>
      <View style={[styles.header, { height: sp(44, 56, 70), paddingHorizontal: sp(16, 24, 32) }]}>
        <Text style={[styles.headerTitle, { color: colors.text.primary, fontSize: fs(18, 22, 28) }]}>Расписание</Text>
        <UniversityLogo size={sp(40, 52, 64)} />
      </View>

      <KeyboardAwareScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingHorizontal: sp(16, 20, 24), paddingVertical: sp(8, 12, 18) }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={[styles.calendarCard, { backgroundColor: colors.common.white, marginBottom: sp(16, 20, 24) }]}>
          <CollapsibleCalendar selectedDate={selectedDate} onDateSelect={setSelectedDate} markedDates={markedDates} theme={{ selectedDayBackgroundColor: colors.teacher.primary, todayTextColor: colors.teacher.primary, calendarBackground: 'transparent' }} />
        </View>

        <View style={styles.list}>
          {filteredEvents.length > 0 ? (
            filteredEvents.map((item: any) => (
              <View key={item.id} style={[styles.card, { backgroundColor: colors.common.white, padding: sp(12, 16, 20), marginBottom: sp(8, 12, 16) }]}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.pairTopText, { color: '#D92D20', fontSize: fs(14, 17, 22) }]}>{formatPairLabel(item.startTime, item.endTime)}</Text>
                  <Text style={[styles.timeTopText, { color: colors.teacher.primary, fontSize: fs(15, 19, 24) }]}>{item.displayTime}</Text>
                </View>
                <Text style={[styles.subjectText, { color: colors.text.primary, fontSize: fs(15, 18, 22) }]}>{item.subject}</Text>
                <View style={styles.detailsGrid}>
                  <View style={styles.detailLine}>
                    <View style={styles.detailItem}>
                      <Ionicons name="business-outline" size={fs(12, 14, 16)} color={colors.text.tertiary} />
                      <Text style={[styles.detailText, { color: colors.text.secondary, fontSize: fs(12, 14, 16) }]}>Ауд. {item.room}, корпус {item.building}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name={item.isConsultation ? 'bookmark-outline' : 'school-outline'} size={fs(12, 14, 16)} color={colors.text.tertiary} />
                      <Text style={[styles.detailText, { color: colors.text.secondary, fontSize: fs(12, 14, 16), fontWeight: '700' }]}>{item.isConsultation ? 'Консультация' : 'Занятие'}</Text>
                    </View>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name={item.isConsultation ? 'people-outline' : 'school-outline'} size={fs(12, 14, 16)} color={colors.text.tertiary} />
                    <Text style={[styles.detailText, { color: colors.text.secondary, fontSize: fs(12, 14, 16) }]}>{item.groupName || (item.studentNames && item.studentNames.length > 0 ? item.studentNames.join(', ') : '-')}</Text>
                  </View>
                </View>

                {item.isConsultation && (
                  <View style={styles.consultationActions}>
                    <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.status.warning }]} onPress={() => beginReschedule(item as Consultation)}>
                      <Text style={[styles.actionText, { color: colors.status.warning }]}>Перенести</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.status.error }]} onPress={() => handleCancelConsultation(item.id)}>
                      <Text style={[styles.actionText, { color: colors.status.error }]}>Отменить</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyBox}>
              <Ionicons name="cafe-outline" size={fs(32, 44, 56)} color={colors.text.tertiary} />
              <Text style={[styles.emptyText, { color: colors.text.secondary, fontSize: fs(12, 14, 17) }]}>На этот день ничего не запланировано</Text>
            </View>
          )}
        </View>

        <TouchableOpacity activeOpacity={0.9} onPress={() => { if (dailyPin) Alert.alert('PIN скопирован', dailyPin); }} style={[styles.pinCard, { backgroundColor: colors.teacher.primary, marginTop: sp(12, 16, 20) }]}>
          <View style={styles.pinInfo}>
            <Text style={[styles.pinLabel, { fontSize: fs(11, 13, 15) }]}>Ваш PIN для бронирования</Text>
            <Text style={[styles.pinValue, { fontSize: fs(32, 44, 56) }]}>{dailyPin || '----'}</Text>
            {pinExpires ? <Text style={[styles.pinExpiry, { fontSize: fs(10, 11, 12) }]}>{pinExpires}</Text> : null}
          </View>
          <View style={styles.pinIconBox}><Ionicons name="key" size={fs(28, 36, 44)} color="#FFFFFF40" /></View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.upgradeBtn,
            {
              backgroundColor: colors.teacher.primary,
              marginTop: sp(16, 20, 24),
              marginBottom: 20,
            },
          ]}
          onPress={() => navigation.navigate('ConsultationForm')}
        >
          <Ionicons name="add-circle" size={fs(18, 22, 26)} color="#fff" />
          <Text style={[styles.upgradeBtnText, { fontSize: fs(14, 16, 18) }]}>
            Назначить консультацию
          </Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontWeight: '900', letterSpacing: -0.5 },
  container: { flex: 1 },
  content: { flexGrow: 1 },
  calendarCard: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#f0f0f0' },
  list: { width: '100%' },
  card: { borderRadius: 22, borderWidth: 1, borderColor: '#f0f0f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  pairTopText: { fontWeight: '800' },
  timeTopText: { fontWeight: '800' },
  subjectText: { fontWeight: '800', marginBottom: 12 },
  detailsGrid: { gap: 4 },
  detailLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontWeight: '600' },
  consultationActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  actionBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  actionText: { fontWeight: '700', fontSize: 13 },
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, opacity: 0.5 },
  emptyText: { fontWeight: '600', marginTop: 12, textAlign: 'center' },
  pinCard: { borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' },
  pinInfo: { flex: 1 },
  pinLabel: { color: '#FFFFFFCC', fontWeight: '600', marginBottom: 4 },
  pinValue: { color: '#FFF', fontWeight: '800', letterSpacing: 6 },
  pinExpiry: { color: '#FFFFFF99', marginTop: 4 },
  pinIconBox: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFFFFF20', justifyContent: 'center', alignItems: 'center' },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 18,
    gap: 8,
  },
  upgradeBtnText: { color: '#fff', fontWeight: '700' },
});

