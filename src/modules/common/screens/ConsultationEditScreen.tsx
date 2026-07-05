import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../../core/auth/AuthContext';
import { AdminStackParamList, TeacherScheduleStackParamList } from '../../../core/navigation/types';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { CollapsibleCalendar } from '../../../shared/components/CollapsibleCalendar';
import { STANDARD_TIME_SLOTS, getSlotTimes } from '../../../shared/constants/timeSlots';
import { ConsultationDraft } from '../../../shared/types';
import { formatTimeNoSeconds } from '../../../shared/utils/time';

type ConsultationEditRoute =
  | RouteProp<AdminStackParamList, 'ConsultationEdit'>
  | RouteProp<TeacherScheduleStackParamList, 'ConsultationEdit'>;

export const ConsultationEditScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<ConsultationEditRoute>();
  const { colors } = useTheme();
  const {
    user,
    consultations,
    schedule,
    rescheduleConsultation,
    checkConflicts,
    isTeacherFree,
    isGroupFree,
    getAvailableBuildings,
    getAvailableRooms,
  } = useAuth();
  const { width, height } = useWindowDimensions();
  const params = route.params;
  const role = params?.role || user?.role || 'admin';
  const primaryColor = role === 'teacher' ? colors.teacher.primary : colors.admin.primary;

  const shortSide = Math.min(width, height);
  const scale = useMemo(() => Math.max(0.62, Math.min(shortSide / 340, 1.35)), [shortSide]);
  const fs = (min: number, ideal: number, max: number) => Math.min(Math.max(Math.round(ideal * scale), min), max);
  const sp = (min: number, ideal: number, max: number) => Math.min(Math.max(Math.round(ideal * scale), min), max);

  const consultation = consultations.find((item) => item.id === params?.consultationId);
  const [newDate, setNewDate] = useState(consultation?.date || new Date().toISOString().slice(0, 10));
  const [newSlotId, setNewSlotId] = useState<string>(STANDARD_TIME_SLOTS[0]?.id || '1');
  const [newBuilding, setNewBuilding] = useState(consultation?.building || '');
  const [newRoom, setNewRoom] = useState(consultation?.room || '');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!consultation) return;
    setNewDate(consultation.date);
    setNewBuilding(consultation.building);
    setNewRoom(consultation.room);
    const matched = STANDARD_TIME_SLOTS.find((slot) => {
      const times = getSlotTimes(slot, consultation.building);
      return formatTimeNoSeconds(times.start) === formatTimeNoSeconds(consultation.startTime)
        && formatTimeNoSeconds(times.end) === formatTimeNoSeconds(consultation.endTime);
    });
    setNewSlotId(matched?.id || STANDARD_TIME_SLOTS[0]?.id || '1');
  }, [consultation]);

  const selectedSlot = useMemo(
    () => STANDARD_TIME_SLOTS.find((slot) => slot.id === newSlotId),
    [newSlotId]
  );

  const teacherMarkedDates = useMemo(() => {
    if (!consultation) return {};
    const marks: Record<string, any> = {};
    schedule
      .filter((item) => item.teacherName === consultation.teacherName)
      .forEach((item) => {
        marks[item.date] = { ...(marks[item.date] || {}), marked: true, dotColor: primaryColor };
      });
    return marks;
  }, [consultation, schedule, primaryColor]);

  const slotAvailability = useMemo(() => {
    if (!consultation) return [];
    return STANDARD_TIME_SLOTS.map((slot) => {
      const buildingCandidate = newBuilding || consultation.building;
      const times = getSlotTimes(slot, buildingCandidate);
      const sameOriginalSlot =
        newDate === consultation.date &&
        formatTimeNoSeconds(times.start) === formatTimeNoSeconds(consultation.startTime) &&
        formatTimeNoSeconds(times.end) === formatTimeNoSeconds(consultation.endTime);

      const teacherFree = sameOriginalSlot || isTeacherFree(consultation.teacherName, newDate, times.start, times.end);
      if (!teacherFree) return { id: slot.id, start: times.start, end: times.end, available: false, reason: 'Преподаватель занят' };

      if (consultation.groupName) {
        const groupFree = sameOriginalSlot || isGroupFree(consultation.groupName, newDate, times.start, times.end);
        if (!groupFree) return { id: slot.id, start: times.start, end: times.end, available: false, reason: 'Группа занята' };
      }

      const freeBuildings = getAvailableBuildings(newDate, times.start, times.end);
      if (newBuilding) {
        const sameOriginalRoom = sameOriginalSlot && newBuilding === consultation.building && newRoom === consultation.room;
        if (!sameOriginalRoom && !freeBuildings.includes(newBuilding)) {
          return { id: slot.id, start: times.start, end: times.end, available: false, reason: 'Нет свободных аудиторий в корпусе' };
        }

        const freeRooms = getAvailableRooms(newBuilding, newDate, times.start, times.end, consultation.id);
        if (newRoom) {
          const selectedRoomFree = sameOriginalRoom || freeRooms.some((room) => room.number === newRoom);
          return {
            id: slot.id,
            start: times.start,
            end: times.end,
            available: selectedRoomFree,
            reason: selectedRoomFree ? '' : 'Выбранная аудитория занята',
          };
        }

        return {
          id: slot.id,
          start: times.start,
          end: times.end,
          available: freeRooms.length > 0,
          reason: freeRooms.length > 0 ? '' : 'Нет свободных аудиторий в корпусе',
        };
      }

      return {
        id: slot.id,
        start: times.start,
        end: times.end,
        available: freeBuildings.length > 0,
        reason: freeBuildings.length > 0 ? '' : 'Нет свободных аудиторий',
      };
    });
  }, [consultation, newDate, newBuilding, newRoom, isTeacherFree, isGroupFree, getAvailableBuildings, getAvailableRooms]);

  const availableBuildings = useMemo(() => {
    if (!consultation || !selectedSlot) return [];
    const baseBuilding = newBuilding || consultation.building;
    const times = getSlotTimes(selectedSlot, baseBuilding);
    const buildings = getAvailableBuildings(newDate, times.start, times.end);
    return buildings.includes(consultation.building) ? buildings : [consultation.building, ...buildings];
  }, [consultation, selectedSlot, newDate, newBuilding, getAvailableBuildings]);

  const availableRooms = useMemo(() => {
    if (!consultation || !selectedSlot || !newBuilding) return [];
    const times = getSlotTimes(selectedSlot, newBuilding);
    const rooms = getAvailableRooms(newBuilding, newDate, times.start, times.end, consultation.id);
    const originalRoom = { id: consultation.id, number: consultation.room, building: consultation.building };
    if (newBuilding === consultation.building && !rooms.some((room) => room.number === consultation.room)) {
      return [originalRoom as any, ...rooms];
    }
    return rooms;
  }, [consultation, selectedSlot, newBuilding, newDate, getAvailableRooms]);

  useEffect(() => {
    if (!newRoom) return;
    const stillAvailable = availableRooms.some((room) => room.number === newRoom && room.building === newBuilding);
    if (!stillAvailable) setNewRoom('');
  }, [availableRooms, newRoom, newBuilding]);

  const canSave = !!consultation && !!selectedSlot && !!newBuilding && !!newRoom && !!newSlotId;

  const handleSave = async () => {
    if (!consultation || !selectedSlot || !newBuilding || !newRoom) return;
    const times = getSlotTimes(selectedSlot, newBuilding);
    const draft: ConsultationDraft = {
      teacherName: consultation.teacherName,
      studentNames: consultation.studentNames,
      groupName: consultation.groupName,
      date: newDate,
      startTime: times.start,
      endTime: times.end,
      room: newRoom,
      building: newBuilding,
    };

    const conflicts = checkConflicts(draft, consultation.id);
    if (conflicts.length > 0) {
      Alert.alert('Невозможно сохранить', conflicts[0]);
      return;
    }

    setPending(true);
    try {
      const result = await rescheduleConsultation(consultation.id, draft, consultation.topic);
      if (!result.success) {
        Alert.alert('Ошибка', result.message || 'Не удалось перенести консультацию');
        return;
      }
      navigation.goBack();
    } finally {
      setPending(false);
    }
  };

  if (!consultation) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: colors.common.background }]}>
        <View style={s.center}>
          <Text style={[s.empty, { color: colors.text.secondary }]}>Консультация не найдена</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.common.background }]}>
      <ScrollView contentContainerStyle={[s.content, { padding: sp(14, 18, 26) }]} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[s.iconButton, { backgroundColor: primaryColor + '12' }]}
          >
            <Ionicons name="arrow-back" size={22} color={primaryColor} />
          </TouchableOpacity>
          <View style={s.headerText}>
            <Text style={[s.title, { color: colors.text.primary, fontSize: fs(22, 28, 34) }]}>
              {role === 'teacher' ? 'Перенос консультации' : 'Редактирование консультации'}
            </Text>
            <Text style={[s.subtitle, { color: colors.text.secondary, fontSize: fs(12, 14, 16) }]} numberOfLines={2}>
              {consultation.topic}
            </Text>
          </View>
        </View>

        <View style={[s.card, { backgroundColor: colors.common.white, borderColor: colors.common.border }]}>
          <Text style={[s.sectionTitle, { color: colors.text.primary }]}>Дата</Text>
          <View style={s.calendarWrap}>
            <CollapsibleCalendar
              selectedDate={newDate}
              onDateSelect={setNewDate}
              markedDates={teacherMarkedDates}
              theme={{
                selectedDayBackgroundColor: primaryColor,
                todayTextColor: primaryColor,
                calendarBackground: colors.common.white,
              }}
            />
          </View>

          <Text style={[s.sectionTitle, { color: colors.text.primary }]}>Время</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={s.slotRow}>
              {slotAvailability.map((slot) => (
                <TouchableOpacity
                  key={slot.id}
                  style={[
                    s.slotChip,
                    {
                      backgroundColor: newSlotId === slot.id ? primaryColor : colors.common.white,
                      borderColor: slot.available ? colors.common.border : colors.status.error + '40',
                      opacity: slot.available ? 1 : 0.5,
                    },
                  ]}
                  onPress={() => {
                    if (slot.available) {
                      setNewSlotId(slot.id);
                    } else {
                      Alert.alert('Слот недоступен', slot.reason || 'Этот слот недоступен');
                    }
                  }}
                >
                  <Text style={{ color: newSlotId === slot.id ? '#fff' : colors.text.primary }}>
                    {formatTimeNoSeconds(slot.start)}-{formatTimeNoSeconds(slot.end)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={[s.sectionTitle, { color: colors.text.primary }]}>Корпус</Text>
          <View style={s.wrapRow}>
            {availableBuildings.map((building) => (
              <TouchableOpacity
                key={building}
                style={[
                  s.choiceChip,
                  {
                    backgroundColor: newBuilding === building ? primaryColor : colors.common.white,
                    borderColor: colors.common.border,
                  },
                ]}
                onPress={() => {
                  setNewBuilding(building);
                  setNewRoom('');
                }}
              >
                <Text style={{ color: newBuilding === building ? '#fff' : colors.text.primary }}>Корпус {building}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[s.sectionTitle, { color: colors.text.primary }]}>Аудитория</Text>
          <View style={s.wrapRow}>
            {availableRooms.map((room) => (
              <TouchableOpacity
                key={`${room.building}-${room.number}`}
                style={[
                  s.choiceChip,
                  {
                    backgroundColor: newRoom === room.number ? primaryColor : colors.common.white,
                    borderColor: colors.common.border,
                  },
                ]}
                onPress={() => setNewRoom(room.number)}
              >
                <Text style={{ color: newRoom === room.number ? '#fff' : colors.text.primary }}>Ауд. {room.number}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[s.saveButton, { backgroundColor: primaryColor, opacity: canSave && !pending ? 1 : 0.6 }]}
          onPress={handleSave}
          disabled={!canSave || pending}
        >
          <Text style={s.saveText}>Сохранить изменения</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1 },
  content: { gap: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { fontSize: 16, fontWeight: '700' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  title: { fontWeight: '900' },
  subtitle: { marginTop: 2, fontWeight: '600' },
  card: { borderRadius: 24, borderWidth: 1, padding: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '900', marginBottom: 8, marginTop: 6 },
  calendarWrap: { borderRadius: 16, overflow: 'hidden', marginBottom: 10 },
  slotRow: { flexDirection: 'row', gap: 8, paddingBottom: 6 },
  slotChip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  choiceChip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  saveButton: { borderRadius: 18, paddingVertical: 15, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});
