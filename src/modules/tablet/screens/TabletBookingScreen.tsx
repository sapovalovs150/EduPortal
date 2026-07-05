import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import '../../../shared/utils/calendarLocale';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { useAuth } from '../../../core/auth/AuthContext';
import { UniversityLogo } from '../../../shared/components/UniversityLogo';
import { ConsultationDraft } from '../../../shared/types';
import { STANDARD_TIME_SLOTS, getSlotTimes } from '../../../shared/constants/timeSlots';

const normalizeDate = (d: Date | string): string => {
  const date = new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatMonthRu = (value: string) => {
  const d = new Date(value);
  return d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
};

type SlotState = {
  id: string;
  start: string;
  end: string;
  available: boolean;
  reason: string;
};

export const TabletBookingScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { width, height } = useWindowDimensions();
  const {
    schedule,
    consultations,
    isTeacherFree,
    isGroupFree,
    getAvailableRooms,
    createConsultation,
    loadRoomSchedule,
    loadConsultations,
  } = useAuth();

  const teacherName = route?.params?.teacherName || '';
  const roomNumber = String(route?.params?.roomNumber || '');
  const building = String(route?.params?.building || '');

  const [date, setDate] = useState<string>(normalizeDate(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);
  const [groupName, setGroupName] = useState('');
  const [topic, setTopic] = useState('Консультация');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (roomNumber) {
      loadRoomSchedule(roomNumber, building);
      loadConsultations();
    }
  }, [roomNumber, building, loadRoomSchedule, loadConsultations]);

  const fit = useMemo(() => {
    const fw = width / 1366;
    const fh = height / 768;
    return Math.max(0.42, Math.min(1.22, Math.min(fw, fh)));
  }, [width, height]);

  const isLowH = height < 440;
  const isVeryLow = height < 330;
  const f = (min: number, base: number, max: number) => Math.max(min, Math.min(max, Math.round(base * fit)));
  const sp = (min: number, base: number, max: number) => Math.max(min, Math.min(max, Math.round(base * fit)));

  const logoSize = Math.max(36, Math.round(68 * fit));
  const roomNumSize = Math.max(18, Math.round(34 * fit));
  const roomBadgePadV = isVeryLow ? 3 : sp(4, 10, 14);
  const roomBadgePadH = sp(8, 14, 18);

  const markedDates = useMemo(() => {
    const map: Record<string, any> = {};
    const roomScheduleDates = schedule
      .filter((s) => s.room === roomNumber && (!building || s.building === building))
      .map((s) => normalizeDate(s.date));
    const roomConsultationDates = consultations
      .filter((c) => c.status === 'scheduled' && c.room === roomNumber && (!building || c.building === building))
      .map((c) => normalizeDate(c.date));
    [...roomScheduleDates, ...roomConsultationDates].forEach((ds) => {
      map[ds] = { marked: true, dotColor: colors.admin.primary };
    });
    map[date] = {
      ...(map[date] || {}),
      selected: true,
      selectedColor: colors.admin.primary,
      selectedTextColor: '#fff',
    };
    return map;
  }, [schedule, consultations, roomNumber, building, date, colors.admin.primary]);

  const slots = useMemo<SlotState[]>(() => {
    return STANDARD_TIME_SLOTS.map((slot) => {
      const times = getSlotTimes(slot, building);
      if (!date) {
        return { id: slot.id, start: times.start, end: times.end, available: false, reason: 'Выберите дату' };
      }
      const teacherFree = teacherName ? isTeacherFree(teacherName, date, times.start, times.end) : false;
      if (!teacherFree) {
        return { id: slot.id, start: times.start, end: times.end, available: false, reason: 'Преподаватель занят' };
      }
      if (groupName.trim() && !isGroupFree(groupName.trim(), date, times.start, times.end)) {
        return { id: slot.id, start: times.start, end: times.end, available: false, reason: 'Группа занята' };
      }
      const roomFree = getAvailableRooms(building, date, times.start, times.end).some((r) => r.number === roomNumber);
      if (!roomFree) {
        return { id: slot.id, start: times.start, end: times.end, available: false, reason: 'Аудитория занята' };
      }
      return { id: slot.id, start: times.start, end: times.end, available: true, reason: 'Свободно' };
    });
  }, [date, teacherName, groupName, building, roomNumber, isTeacherFree, isGroupFree, getAvailableRooms]);

  useEffect(() => {
    if (!selectedSlot) return;
    const stillValid = slots.some((s) => s.start === selectedSlot.start && s.end === selectedSlot.end && s.available);
    if (!stillValid) setSelectedSlot(null);
  }, [slots, selectedSlot]);

  const onSlotPress = (slot: SlotState) => {
    if (!slot.available) {
      Alert.alert('Слот недоступен', slot.reason);
      return;
    }
    setSelectedSlot({ start: slot.start, end: slot.end });
  };

  const onSubmit = async () => {
    if (!teacherName) return Alert.alert('Ошибка', 'Преподаватель не определён');
    if (!date) return Alert.alert('Ошибка', 'Выберите дату');
    if (!selectedSlot) return Alert.alert('Ошибка', 'Выберите время');
    if (!groupName.trim()) return Alert.alert('Ошибка', 'Введите группу');

    const draft: ConsultationDraft = {
      teacherName,
      studentNames: [],
      groupName: groupName.trim(),
      date,
      startTime: selectedSlot.start,
      endTime: selectedSlot.end,
      room: roomNumber,
      building,
    };

    setCreating(true);
    try {
      const result = await createConsultation(draft, topic.trim() || 'Консультация');
      if (!result.success) {
        Alert.alert('Ошибка', result.message || 'Не удалось создать бронирование');
        return;
      }
      Alert.alert('Готово', 'Аудитория успешно забронирована', [
        { text: 'ОК', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.common.background }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: sp(8, 16, 24),
          paddingTop: isLowH ? 6 : sp(8, 14, 20),
          paddingBottom: sp(8, 14, 22),
          minHeight: height,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.header}>
          <TouchableOpacity
            style={[s.backBtn, { backgroundColor: colors.admin.primary + '14', width: sp(30, 44, 52), height: sp(30, 44, 52) }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={f(14, 22, 28)} color={colors.admin.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[s.title, { fontSize: f(17, 48, 56), color: colors.text.primary }]}>Бронирование аудитории</Text>
            <Text style={[s.subtitle, { fontSize: f(10, 26, 30), color: colors.text.secondary }]} numberOfLines={1}>
              {teacherName || 'Преподаватель'}
            </Text>
          </View>
          <View style={[s.headerRight, { gap: sp(8, 14, 18) }]}>
            <UniversityLogo size={logoSize} />
            <View style={[s.roomBadge, {
              backgroundColor: colors.admin.primary + '10',
              borderColor: colors.admin.primary + '35',
              paddingVertical: roomBadgePadV,
              paddingHorizontal: roomBadgePadH,
            }]}>
              <Text style={[s.badgeBuilding, { color: colors.admin.primary, fontSize: f(9, 18, 20) }]}>Корпус {building}</Text>
              <Text style={[s.badgeRoom, { color: colors.admin.primary, fontSize: roomNumSize }]}>{roomNumber}</Text>
            </View>
          </View>
        </View>

        <View style={[s.grid, { gap: sp(8, 16, 24) }]}>
          <View style={[s.colCard, { borderColor: colors.common.border, padding: sp(8, 12, 18), flex: 0.92 }]}>
            <Text style={[s.sectionTitle, { color: colors.text.secondary, fontSize: f(9, 20, 24) }]}>ДАТА</Text>
            <Calendar
              current={date}
              onDayPress={(d) => setDate(d.dateString)}
              markedDates={markedDates}
              firstDay={1}
              hideExtraDays
              enableSwipeMonths
              monthFormat="MMMM yyyy"
              style={{ marginTop: sp(3, 8, 12), borderRadius: 12 }}
              theme={{
                calendarBackground: 'transparent',
                textSectionTitleColor: colors.text.secondary,
                todayTextColor: colors.admin.primary,
                selectedDayBackgroundColor: colors.admin.primary,
                selectedDayTextColor: '#fff',
                dayTextColor: colors.text.primary,
                monthTextColor: colors.text.primary,
                arrowColor: colors.admin.primary,
                textDisabledColor: colors.text.tertiary,
                textDayFontSize: f(8, 20, 23),
                textMonthFontSize: f(11, 30, 34),
                textDayHeaderFontSize: f(8, 18, 20),
              }}
            />
            <Text style={[s.monthHint, { color: colors.text.tertiary, fontSize: f(9, 20, 24) }]} numberOfLines={1}>
              {formatMonthRu(date)}
            </Text>
          </View>

          <View style={[s.colCard, { borderColor: colors.common.border, padding: sp(8, 12, 18), flex: 1.08 }]}>
            <Text style={[s.sectionTitle, { color: colors.text.secondary, fontSize: f(9, 20, 24) }]}>ВРЕМЯ И ДАННЫЕ</Text>

            <View style={[s.slotGrid, { marginTop: sp(4, 8, 12), rowGap: sp(6, 10, 14), columnGap: sp(6, 10, 14) }]}>
              {slots.map((slot) => {
                const selected = selectedSlot?.start === slot.start && selectedSlot?.end === slot.end;
                return (
                  <TouchableOpacity
                    key={slot.id}
                    onPress={() => onSlotPress(slot)}
                    style={[s.slotCard, {
                      borderColor: selected ? colors.admin.primary : colors.common.border,
                      backgroundColor: selected
                        ? colors.admin.primary + '16'
                        : slot.available
                        ? colors.common.background
                        : colors.common.border + '45',
                      minHeight: isLowH ? sp(32, 62, 78) : sp(44, 78, 94),
                    }]}
                  >
                    <Text style={[s.slotTime, { color: colors.text.secondary, fontSize: f(10, 27, 31) }]}>
                      {slot.start}-{slot.end}
                    </Text>
                    <Text style={[s.slotReason, { color: slot.available ? colors.admin.primary : colors.status.error, fontSize: f(9, 20, 24) }]}>
                      {slot.reason}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              value={groupName}
              onChangeText={setGroupName}
              placeholder="бпо-221"
              placeholderTextColor={colors.text.tertiary}
              style={[s.input, {
                borderColor: colors.common.border,
                color: colors.text.primary,
                marginTop: sp(8, 12, 16),
                minHeight: isLowH ? sp(30, 46, 56) : sp(36, 56, 64),
                fontSize: f(10, 25, 28),
              }]}
            />
            <TextInput
              value={topic}
              onChangeText={setTopic}
              placeholder="Консультация"
              placeholderTextColor={colors.text.tertiary}
              style={[s.input, {
                borderColor: colors.common.border,
                color: colors.text.primary,
                marginTop: sp(6, 10, 14),
                minHeight: isLowH ? sp(30, 46, 56) : sp(36, 56, 64),
                fontSize: f(10, 25, 28),
              }]}
            />

            <TouchableOpacity
              onPress={onSubmit}
              disabled={creating}
              style={[s.submit, {
                backgroundColor: colors.admin.primary,
                marginTop: sp(8, 12, 16),
                minHeight: isLowH ? sp(34, 52, 62) : sp(40, 62, 72),
                opacity: creating ? 0.72 : 1,
              }]}
            >
              <Text style={[s.submitTxt, { color: colors.common.white, fontSize: f(11, 28, 32) }]}>
                {creating ? 'Сохранение...' : 'Забронировать'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  title: { fontWeight: '900', letterSpacing: 0 },
  subtitle: { marginTop: 1, fontWeight: '500' },
  headerRight: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  roomBadge: { borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  badgeBuilding: { textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.4 },
  badgeRoom: { fontWeight: '900', lineHeight: 38 },
  grid: { flexDirection: 'row', alignItems: 'stretch', marginTop: 8 },
  colCard: { borderWidth: 1, borderRadius: 18 },
  sectionTitle: { textTransform: 'uppercase', fontWeight: '700', letterSpacing: 1.2 },
  monthHint: { marginTop: 6, fontWeight: '500' },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  slotCard: { width: '48.8%', borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  slotTime: { fontWeight: '700', textAlign: 'center' },
  slotReason: { marginTop: -2, fontWeight: '500', textAlign: 'center' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontWeight: '500', paddingVertical: 0 },
  submit: { borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  submitTxt: { fontWeight: '900' },
});
