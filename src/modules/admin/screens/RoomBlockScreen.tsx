import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../../core/auth/AuthContext';
import { AdminStackParamList } from '../../../core/navigation/types';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { CollapsibleCalendar } from '../../../shared/components/CollapsibleCalendar';
import { STANDARD_TIME_SLOTS, getSlotTimes } from '../../../shared/constants/timeSlots';
import { formatDateRangeRu, toLocalIsoDate } from '../../../shared/utils/date';
import { formatTimeNoSeconds } from '../../../shared/utils/time';

const todayIso = () => toLocalIsoDate(new Date());

export const RoomBlockScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const route = useRoute<RouteProp<AdminStackParamList, 'RoomBlock'>>();
  const { colors } = useTheme();
  const { rooms, addRoomBlock } = useAuth();
  const { width, height } = useWindowDimensions();

  const shortSide = Math.min(width, height);
  const scale = useMemo(() => Math.max(0.62, Math.min(shortSide / 340, 1.35)), [shortSide]);
  const fs = (min: number, ideal: number, max: number) => Math.min(Math.max(Math.round(ideal * scale), min), max);
  const sp = (min: number, ideal: number, max: number) => Math.min(Math.max(Math.round(ideal * scale), min), max);

  const room = rooms.find((item) => item.id === route.params.roomId);
  const [blockType, setBlockType] = useState<'repair' | 'event'>('repair');
  const [repairStartDate, setRepairStartDate] = useState(todayIso());
  const [repairEndDate, setRepairEndDate] = useState(todayIso());
  const [repairRangeAnchor, setRepairRangeAnchor] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState(todayIso());
  const [eventSlotId, setEventSlotId] = useState(STANDARD_TIME_SLOTS[0]?.id || '1');
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const repairMarks = useMemo(() => {
    const marks: Record<string, any> = {};
    if (!repairStartDate) return marks;
    let cursor = new Date(repairStartDate);
    const end = new Date(repairEndDate || repairStartDate);
    while (cursor <= end) {
      const key = toLocalIsoDate(cursor);
      marks[key] = {
        color: colors.admin.primary + '18',
        marked: true,
        dotColor: colors.admin.primary,
        startingDay: key === repairStartDate,
        endingDay: key === (repairEndDate || repairStartDate),
      };
      cursor.setDate(cursor.getDate() + 1);
    }
    return marks;
  }, [repairStartDate, repairEndDate, colors.admin.primary]);

  const handleRepairDateSelect = (date: string) => {
    if (!repairRangeAnchor) {
      setRepairStartDate(date);
      setRepairEndDate(date);
      setRepairRangeAnchor(date);
      return;
    }

    if (date < repairRangeAnchor) {
      setRepairStartDate(date);
      setRepairEndDate(repairRangeAnchor);
    } else {
      setRepairStartDate(repairRangeAnchor);
      setRepairEndDate(date);
    }
    setRepairRangeAnchor(null);
  };

  const createBlock = async () => {
    if (!room) return;
    setIsSaving(true);

    if (blockType === 'repair') {
      if (!repairStartDate || !repairEndDate || repairEndDate < repairStartDate) {
        Alert.alert('Ошибка', 'Проверьте даты ремонта');
        setIsSaving(false);
        return;
      }

      const result = await addRoomBlock(room.id, {
        type: 'repair',
        title: title.trim() || 'Ремонт',
        startDate: repairStartDate,
        endDate: repairEndDate,
      });
      if (!result.success) {
        Alert.alert('РћС€РёР±РєР°', result.message || 'РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ Р±Р»РѕРєРёСЂРѕРІРєСѓ');
        setIsSaving(false);
        return;
      }
    } else {
      const slot = STANDARD_TIME_SLOTS.find((item) => item.id === eventSlotId);
      if (!slot || !eventDate) {
        Alert.alert('Ошибка', 'Выберите дату и слот мероприятия');
        setIsSaving(false);
        return;
      }

      const times = getSlotTimes(slot, room.building);
      const result = await addRoomBlock(room.id, {
        type: 'event',
        title: title.trim() || 'Мероприятие',
        date: eventDate,
        startTime: formatTimeNoSeconds(times.start),
        endTime: formatTimeNoSeconds(times.end),
      });
      if (!result.success) {
        Alert.alert('РћС€РёР±РєР°', result.message || 'РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ Р±Р»РѕРєРёСЂРѕРІРєСѓ');
        setIsSaving(false);
        return;
      }
    }

    setIsSaving(false);
    navigation.goBack();
  };

  if (!room) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: colors.common.background }]}>
        <View style={s.center}>
          <Text style={[s.empty, { color: colors.text.secondary }]}>Аудитория не найдена</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.common.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.safe}>
        <ScrollView contentContainerStyle={[s.content, { padding: sp(14, 18, 26) }]} keyboardShouldPersistTaps="handled">
          <View style={s.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[s.iconButton, { backgroundColor: colors.admin.primary + '12' }]}
            >
              <Ionicons name="arrow-back" size={22} color={colors.admin.primary} />
            </TouchableOpacity>
            <View style={s.headerText}>
              <Text style={[s.title, { color: colors.text.primary, fontSize: fs(22, 28, 34) }]}>Блокировка аудитории</Text>
              <Text style={[s.subtitle, { color: colors.text.secondary, fontSize: fs(12, 14, 16) }]}>
                Ауд. {room.number}, корпус {room.building}
              </Text>
            </View>
          </View>

          <View style={[s.card, { backgroundColor: colors.common.white, borderColor: colors.common.border }]}>
            <View style={s.typeRow}>
              {[
                { label: 'Ремонт', value: 'repair' as const },
                { label: 'Мероприятие', value: 'event' as const },
              ].map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={[
                    s.typeChip,
                    {
                      backgroundColor: blockType === item.value ? colors.admin.primary : colors.common.white,
                      borderColor: colors.common.border,
                    },
                  ]}
                  onPress={() => setBlockType(item.value)}
                >
                  <Text style={[s.typeText, { color: blockType === item.value ? '#fff' : colors.text.primary }]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[s.input, { borderColor: colors.common.border, color: colors.text.primary }]}
              placeholder="Название"
              placeholderTextColor={colors.text.tertiary}
              value={title}
              onChangeText={setTitle}
            />

            {blockType === 'repair' ? (
              <>
                <Text style={[s.label, { color: colors.text.secondary }]}>
                  Выберите начало и конец периода
                </Text>
                <View style={s.calendarWrap}>
                  <CollapsibleCalendar
                    selectedDate={repairRangeAnchor || repairEndDate || repairStartDate}
                    markedDates={repairMarks}
                    onDateSelect={handleRepairDateSelect}
                    theme={{
                      selectedDayBackgroundColor: colors.admin.primary,
                      todayTextColor: colors.admin.primary,
                      calendarBackground: colors.common.white,
                    }}
                  />
                </View>
                <Text style={[s.rangeText, { color: colors.text.secondary }]}>
                  {formatDateRangeRu(repairStartDate, repairEndDate)}
                </Text>
              </>
            ) : (
              <>
                <View style={s.calendarWrap}>
                  <CollapsibleCalendar
                    selectedDate={eventDate}
                    onDateSelect={setEventDate}
                    theme={{
                      selectedDayBackgroundColor: colors.admin.primary,
                      todayTextColor: colors.admin.primary,
                      calendarBackground: colors.common.white,
                    }}
                  />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={s.slotRow}>
                    {STANDARD_TIME_SLOTS.map((slot) => (
                      <TouchableOpacity
                        key={slot.id}
                        style={[
                          s.slotChip,
                          {
                            backgroundColor: eventSlotId === slot.id ? colors.admin.primary : colors.common.white,
                            borderColor: colors.common.border,
                          },
                        ]}
                        onPress={() => setEventSlotId(slot.id)}
                      >
                        <Text style={{ color: eventSlotId === slot.id ? '#fff' : colors.text.primary }}>
                          {slot.start}-{slot.end}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}
          </View>

          <TouchableOpacity
            style={[s.saveButton, { backgroundColor: colors.admin.primary, opacity: isSaving ? 0.7 : 1 }]}
            onPress={createBlock}
            disabled={isSaving}
          >
            <Text style={s.saveText}>Сохранить блокировку</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  card: { borderWidth: 1, borderRadius: 24, padding: 16 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typeChip: { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 11, alignItems: 'center' },
  typeText: { fontWeight: '800' },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 12, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  calendarWrap: { borderRadius: 16, overflow: 'hidden', marginBottom: 10 },
  rangeText: { fontWeight: '700' },
  slotRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  slotChip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  saveButton: { borderRadius: 18, paddingVertical: 15, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});
