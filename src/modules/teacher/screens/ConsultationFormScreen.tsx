// src/modules/teacher/screens/ConsultationFormScreen.tsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../../core/auth/AuthContext';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { SuggestionInput } from '../../../shared/components/SuggestionInput';
import { CollapsibleCalendar } from '../../../shared/components/CollapsibleCalendar';
import { formatDateRu } from '../../../shared/utils/date';
import { ConsultationDraft, SuggestedSlot } from '../../../shared/types';
import { STANDARD_TIME_SLOTS, getSlotTimes } from '../../../shared/constants/timeSlots';

const getTodayStr = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

interface TimeSlotWithAvailability {
  id: string;
  start: string;
  end: string;
  available: boolean;
  conflictReason?: string;
}

export const ConsultationFormScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const routeParams = route.params as any;

  const {
    user,
    teachers,
    groups,
    rooms,
    schedule,
    consultations,
    isLoading,
    getTeacherGroups,
    suggestSlots,
    getAvailableRooms,
    getAvailableBuildings,
    createConsultation,
    isTeacherFree,
    isGroupFree,
  } = useAuth();

  const isAdmin = user?.role === 'admin';
  const initialTeacherName = routeParams?.teacherName || (isAdmin ? '' : user?.name || '');

  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [topic, setTopic] = useState('Консультация по проекту');
  const [selectedTeacher, setSelectedTeacher] = useState<any>(
    !isAdmin && !routeParams?.teacherName ? user : null
  );
  const [teacherSearch, setTeacherSearch] = useState(initialTeacherName);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [groupSearch, setGroupSearch] = useState('');
  const [suggestedSlots, setSuggestedSlots] = useState<SuggestedSlot[]>([]);
  const [allRooms, setAllRooms] = useState<{ room: any; available: boolean; reason?: string }[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [building, setBuilding] = useState('');
  const [availableBuildings, setAvailableBuildings] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlotWithAvailability[]>([]);

  const teacherSuggestions = useMemo(() => {
    if (!isAdmin) return [];
    if (!teacherSearch.trim()) return [];
    return teachers
      .filter(t => t.name.toLowerCase().includes(teacherSearch.toLowerCase()))
      .map(t => t.name);
  }, [teachers, teacherSearch, isAdmin]);

  const effectiveTeacherName = useMemo(() => {
    if (isAdmin) return selectedTeacher?.name || '';
    return user?.name || '';
  }, [isAdmin, selectedTeacher, user]);

  const teacherGroupNames = useMemo(() => {
    if (!effectiveTeacherName) return [];
    return getTeacherGroups(effectiveTeacherName);
  }, [effectiveTeacherName, getTeacherGroups]);

  const groupSuggestions = useMemo(() => {
    if (!groupSearch.trim()) return [];
    let filteredGroups = groups;
    if (teacherGroupNames.length > 0) {
      filteredGroups = groups.filter(g => teacherGroupNames.includes(g.name));
    }
    return filteredGroups
      .filter(g => g.name.toLowerCase().includes(groupSearch.toLowerCase()))
      .map(g => g.name);
  }, [groups, groupSearch, teacherGroupNames]);

  // Проверка доступности таймслота (показываем всегда, если преподаватель выбран)
  const checkTimeSlotAvailability = (slot: typeof STANDARD_TIME_SLOTS[0]): TimeSlotWithAvailability => {
    const buildingForCheck = building || 'А';
    const times = getSlotTimes(slot, buildingForCheck);

    if (!effectiveTeacherName) {
      return {
        id: slot.id,
        start: times.start,
        end: times.end,
        available: false,
        conflictReason: 'Выберите преподавателя',
      };
    }

    const teacherFree = isTeacherFree(effectiveTeacherName, selectedDate, times.start, times.end);
    if (!teacherFree) {
      return {
        id: slot.id, start: times.start, end: times.end,
        available: false, conflictReason: 'Преподаватель занят',
      };
    }

    if (!selectedGroup) {
      return {
        id: slot.id,
        start: times.start,
        end: times.end,
        available: true,
      };
    }

    const groupFree = isGroupFree(selectedGroup.name, selectedDate, times.start, times.end);
    if (!groupFree) {
      return {
        id: slot.id, start: times.start, end: times.end,
        available: false, conflictReason: 'Группа занята',
      };
    }

    const anyAvailableRoom = getAvailableBuildings(selectedDate, times.start, times.end).length > 0;
    if (!anyAvailableRoom) {
      return {
        id: slot.id, start: times.start, end: times.end,
        available: false, conflictReason: 'Нет свободных аудиторий',
      };
    }

    return {
      id: slot.id, start: times.start, end: times.end,
      available: true,
    };
  };

  // Проверка доступности уже выбранного времени при изменении группы
  const isSelectedTimeStillValid = () => {
    if (!startTime || !endTime) return true;
    if (!effectiveTeacherName || !selectedGroup) return true;

    const teacherFree = isTeacherFree(effectiveTeacherName, selectedDate, startTime, endTime);
    if (!teacherFree) return false;

    const groupFree = isGroupFree(selectedGroup.name, selectedDate, startTime, endTime);
    if (!groupFree) return false;

    const anyAvailableRoom = getAvailableBuildings(selectedDate, startTime, endTime).length > 0;
    if (!anyAvailableRoom) return false;

    return true;
  };

  useEffect(() => {
    if (!isLoading && selectedDate && effectiveTeacherName) {
      const dayOfWeek = new Date(selectedDate).getDay(); // 0 = воскресенье
      if (dayOfWeek === 0) {
        setAvailableTimeSlots([]);
        return;
      }
      const slotsWithAvailability = STANDARD_TIME_SLOTS.map(checkTimeSlotAvailability);
      setAvailableTimeSlots(slotsWithAvailability);
    } else if (!isLoading && selectedDate && !effectiveTeacherName) {
      const defaultSlots = STANDARD_TIME_SLOTS.map(slot => {
        const times = getSlotTimes(slot, building || 'А');
        return {
          id: slot.id,
          start: times.start,
          end: times.end,
          available: false,
          conflictReason: 'Выберите преподавателя',
        };
      });
      setAvailableTimeSlots(defaultSlots);
    } else {
      setAvailableTimeSlots([]);
    }
  }, [selectedDate, selectedGroup, effectiveTeacherName, building, isLoading]);

  // Проверка выбранного времени при изменении группы
  useEffect(() => {
    if (selectedGroup && startTime && endTime) {
      if (!isSelectedTimeStillValid()) {
        setStartTime('');
        setEndTime('');
        Alert.alert(
          'Время недоступно',
          'Выбранное время стало недоступно для этой группы. Пожалуйста, выберите другое время.',
          [{ text: 'OK' }]
        );
      }
    }
  }, [selectedGroup, selectedDate, effectiveTeacherName]);

  const handleTeacherSelect = (teacherName: string) => {
    if (!isAdmin) return;
    const teacher = teachers.find(t => t.name === teacherName);
    if (teacher) {
      setSelectedTeacher(teacher);
      setTeacherSearch(teacherName);
      setSelectedGroup(null);
      setGroupSearch('');
      setStartTime('');
      setEndTime('');
    }
  };

  const handleGroupSelect = (groupName: string) => {
    if (!groupName) {
      setSelectedGroup(null);
      setGroupSearch('');
      return;
    }
    const group = groups.find(g => g.name === groupName);
    if (group) {
      setSelectedGroup(group);
      setGroupSearch(groupName);
      // Проверка выбранного времени произойдёт в useEffect
    }
  };

  const handleTimeSelect = (slot: TimeSlotWithAvailability) => {
    if (!slot.available) {
      Alert.alert('Время недоступно', slot.conflictReason);
      return;
    }
    setStartTime(slot.start);
    setEndTime(slot.end);
  };

  const handleFindSlots = async () => {
    if (!selectedDate || !startTime || !endTime) {
      Alert.alert('Внимание', 'Укажите дату и время');
      return;
    }
    if (!effectiveTeacherName) {
      Alert.alert('Внимание', isAdmin ? 'Выберите преподавателя' : 'Преподаватель не найден');
      return;
    }
    if (!selectedGroup) {
      Alert.alert('Внимание', 'Выберите группу');
      return;
    }

    setIsCreating(true);
    try {
      const slots = suggestSlots({
        teacherName: effectiveTeacherName,
        studentNames: [],
        groupName: selectedGroup.name,
        date: selectedDate,
        startTime,
        endTime,
      });
      setSuggestedSlots(slots);
      setStep(2);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectSlot = (slot: SuggestedSlot) => {
    setSelectedDate(slot.date);
    setStartTime(slot.startTime);
    setEndTime(slot.endTime);
    setBuilding(slot.building);
    if (slot.room) {
      setSelectedRoom({ number: slot.room, building: slot.building });
      setStep(4);
    } else {
      const buildingRooms = rooms.filter(r => r.building === slot.building);
      const availableRoomNumbers = new Set(
        getAvailableRooms(slot.building, slot.date, slot.startTime, slot.endTime).map(r => r.number)
      );
      const roomsWithStatus = buildingRooms.map(room => ({
        room,
        available: availableRoomNumbers.has(room.number),
        reason: availableRoomNumbers.has(room.number) ? undefined : 'Занято в это время',
      }));
      setAllRooms(roomsWithStatus);
      setSelectedRoom(null);
      setStep(3);
    }
  };

  const handleManualFind = () => {
    const allBuildings = Array.from(new Set(rooms.map(r => r.building)));
    setAvailableBuildings(allBuildings);
    setStep(3);
  };

  const handleBuildingSelect = (b: string) => {
    setBuilding(b);
    const buildingRooms = rooms.filter(r => r.building === b);
    const availableRoomNumbers = new Set(
      getAvailableRooms(b, selectedDate, startTime, endTime).map(r => r.number)
    );
    const roomsWithStatus = buildingRooms.map(room => ({
      room,
      available: availableRoomNumbers.has(room.number),
      reason: availableRoomNumbers.has(room.number) ? undefined : 'Занято (пара или другая консультация)',
    }));
    setAllRooms(roomsWithStatus);
    setSelectedRoom(null);
  };

  const handleCreateConsultation = async () => {
    if (!selectedRoom) return;
    if (!effectiveTeacherName) return;

    const draft: ConsultationDraft = {
      teacherName: effectiveTeacherName,
      studentNames: [],
      groupName: selectedGroup?.name || null,
      date: selectedDate,
      startTime,
      endTime,
      room: selectedRoom.number,
      building: selectedRoom.building || building,
    };
    setIsCreating(true);
    try {
      const result = await createConsultation(draft, topic);
      if (result.success) {
        Alert.alert('Готово', 'Консультация создана', [
          {
            text: 'OK',
            onPress: () => {
              if (isAdmin) {
                navigation.navigate('AdminTabs', { screen: 'Dashboard' });
              } else {
                navigation.navigate('TeacherScheduleMain');
              }
            },
          },
        ]);
      } else {
        Alert.alert('Ошибка', result.message || 'Не удалось создать консультацию');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.progressContainer}>
      {[1, 2, 3, 4].map((s) => (
        <View key={s} style={styles.stepWrapper}>
          <View
            style={[
              styles.stepCircle,
              step >= s && {
                backgroundColor: isAdmin ? colors.admin.primary : colors.teacher.primary,
                borderColor: isAdmin ? colors.admin.primary : colors.teacher.primary,
              },
            ]}
          >
            <Text style={[styles.stepText, step >= s && { color: '#fff' }]}>
              {s}
            </Text>
          </View>
          {s < 4 && (
            <View
              style={[
                styles.stepLine,
                step > s && { backgroundColor: isAdmin ? colors.admin.primary : colors.teacher.primary },
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );

  const primaryColor = isAdmin ? colors.admin.primary : colors.teacher.primary;
  const isSunday = new Date(selectedDate).getDay() === 0; // надёжная проверка воскресенья

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.common.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={primaryColor} />
        <Text style={{ marginTop: 16, color: colors.text.secondary }}>
          {isLoading ? 'Загрузка расписания…' : 'Расписание не загружено. Проверьте подключение.'}
        </Text>
      </SafeAreaView>
    );
  }

  const renderRoomCard = (item: { room: any; available: boolean; reason?: string }) => {
    const isSelected = selectedRoom?.number === item.room.number;
    return (
      <TouchableOpacity
        key={item.room.id}
        style={[
          styles.roomCard,
          {
            borderColor: item.available ? (isSelected ? primaryColor : colors.common.border) : colors.common.border,
            backgroundColor: item.available ? (isSelected ? primaryColor + '05' : colors.common.white) : colors.common.border + '30',
            opacity: item.available ? 1 : 0.6,
          },
        ]}
        onPress={() => {
          if (item.available) {
            setSelectedRoom(item.room);
          } else {
            Alert.alert('Аудитория недоступна', item.reason || 'Невозможно выбрать эту аудиторию');
          }
        }}
        disabled={!item.available}
      >
        <View>
          <Text style={[styles.roomNum, { color: item.available ? colors.text.primary : colors.text.tertiary }]}>
            Аудитория {item.room.number}
          </Text>
          <Text style={{ color: item.available ? colors.text.secondary : colors.text.tertiary }}>
            {item.room.capacity} мест
          </Text>
          {!item.available && item.reason && (
            <Text style={{ fontSize: 11, color: colors.status.error, marginTop: 4 }}>
              {item.reason}
            </Text>
          )}
        </View>
        <Ionicons
          name={isSelected ? 'checkmark-circle' : item.available ? 'ellipse-outline' : 'lock-closed'}
          size={26}
          color={item.available ? primaryColor : colors.text.tertiary}
        />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.common.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (step > 1 ? setStep(step - 1) : navigation.goBack())}
          style={[styles.backBtn, { borderColor: colors.common.border }]}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
          {isAdmin ? 'Назначение консультации (админ)' : 'Назначение консультации'}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {renderStepIndicator()}

      <KeyboardAwareScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && (
          <View style={styles.form}>
            <Text style={[styles.label, { color: colors.text.secondary }]}>ДАТА</Text>
            <CollapsibleCalendar
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              theme={{
                selectedDayBackgroundColor: primaryColor,
                todayTextColor: primaryColor,
              }}
            />

            {isSunday && (
              <Text style={[styles.sundayWarning, { color: colors.status.error }]}>
                ⚠️ В воскресенье занятия не проводятся. Выберите другой день.
              </Text>
            )}

            <Text style={[styles.label, { color: colors.text.secondary }]}>ВРЕМЯ</Text>
            <View style={styles.timeSlotsGrid}>
              {availableTimeSlots.map((slot) => (
                <TouchableOpacity
                  key={slot.id}
                  style={[
                    styles.timeSlotCard,
                    {
                      backgroundColor: slot.available ? colors.common.white : colors.common.border + '50',
                      borderColor: startTime === slot.start ? primaryColor : colors.common.border,
                      borderWidth: startTime === slot.start ? 2 : 1,
                      opacity: slot.available ? 1 : 0.6,
                    },
                  ]}
                  onPress={() => handleTimeSelect(slot)}
                  disabled={!slot.available || isSunday}
                >
                  <Text style={[
                    styles.timeSlotTime,
                    {
                      color: startTime === slot.start ? primaryColor : colors.text.primary,
                      fontWeight: startTime === slot.start ? 'bold' : 'normal',
                    }
                  ]}>
                    {slot.start} — {slot.end}
                  </Text>
                  {!slot.available && slot.conflictReason && (
                    <Text style={[styles.timeSlotReason, { color: colors.status.error }]}>
                      {slot.conflictReason}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {isAdmin && (
              <SuggestionInput
                placeholder="Преподаватель"
                value={teacherSearch}
                onChangeText={setTeacherSearch}
                suggestions={teacherSuggestions}
                onSelect={handleTeacherSelect}
                icon="person-outline"
              />
            )}

            <SuggestionInput
              placeholder="Номер группы"
              value={groupSearch}
              suggestions={groupSuggestions}
              onSelect={handleGroupSelect}
              onChangeText={(text) => {
                setGroupSearch(text);
                if (!text) handleGroupSelect('');
              }}
              icon="people-outline"
            />

            {effectiveTeacherName && teacherGroupNames.length === 0 && (
              <Text style={[styles.hintText, { color: colors.status.error }]}>
                У выбранного преподавателя нет групп для консультаций
              </Text>
            )}

            <TextInput
              style={[
                styles.input,
                { borderColor: colors.common.border, color: colors.text.primary },
              ]}
              placeholder="Тема встречи"
              placeholderTextColor={colors.text.tertiary}
              value={topic}
              onChangeText={setTopic}
            />

            <TouchableOpacity
              style={[styles.mainBtn, {
                backgroundColor: primaryColor,
                opacity: (!startTime || !endTime || !effectiveTeacherName || !selectedGroup || isSunday) ? 0.5 : 1
              }]}
              onPress={handleFindSlots}
              disabled={!startTime || !endTime || !effectiveTeacherName || !selectedGroup || isCreating || isSunday}
            >
              {isCreating ? <ActivityIndicator color="#fff" /> : <Text style={styles.mainBtnText}>Подобрать аудиторию</Text>}
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={[styles.stepTitle, { color: colors.text.primary }]}>Рекомендуемые аудитории</Text>
            {suggestedSlots.length > 0 ? (
              suggestedSlots.map((slot) => (
                <TouchableOpacity
                  key={slot.id}
                  style={[
                    styles.slotCard,
                    {
                      backgroundColor: colors.common.white,
                      borderColor: colors.common.border,
                      opacity: slot.confidence < 50 ? 0.7 : 1,
                    },
                  ]}
                  onPress={() => handleSelectSlot(slot)}
                >
                  <View style={styles.slotMain}>
                    <View style={styles.slotHeader}>
                      <View
                        style={[
                          styles.confidenceBadge,
                          {
                            backgroundColor:
                              slot.confidence >= 80 ? colors.status.success + '20' :
                                slot.confidence >= 50 ? colors.status.warning + '20' :
                                  colors.status.error + '20'
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.confidenceText,
                            {
                              color:
                                slot.confidence >= 80 ? colors.status.success :
                                  slot.confidence >= 50 ? colors.status.warning :
                                    colors.status.error
                            },
                          ]}
                        >
                          {slot.confidence}%
                        </Text>
                      </View>
                      <Text style={[styles.slotTime, { color: colors.text.primary }]}>
                        {slot.startTime} — {slot.endTime}
                      </Text>
                    </View>
                    <Text style={[styles.slotDate, { color: colors.text.secondary }]}>
                      {formatDateRu(slot.date)}
                    </Text>
                    <View style={styles.slotLoc}>
                      <Ionicons name="business-outline" size={16} color={primaryColor} />
                      <Text style={{ color: colors.text.secondary, marginLeft: 6 }}>
                        Корпус {slot.building}, ауд. {slot.room}
                      </Text>
                    </View>
                    <Text style={[styles.reasonText, { color: colors.text.tertiary }]}>
                      {slot.reason}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color={primaryColor} />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={48} color={colors.text.tertiary} />
                <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
                  Нет доступных аудиторий
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.text.tertiary }]}>
                  Попробуйте выбрать другое время или дату
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.manualBtn, { borderColor: primaryColor }]}
              onPress={handleManualFind}
            >
              <Text style={{ color: primaryColor, fontWeight: '800' }}>Выбрать аудиторию самостоятельно</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={[styles.stepTitle, { color: colors.text.primary }]}>Выбор аудитории</Text>
            {availableBuildings.length > 0 && !building && (
              <View style={{ marginBottom: 20 }}>
                <Text style={[styles.label, { color: colors.text.secondary }]}>ВЫБЕРИТЕ КОРПУС</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {availableBuildings.map((b) => (
                    <TouchableOpacity
                      key={b}
                      style={[
                        styles.timeChip,
                        { borderColor: colors.common.border },
                        building === b && { backgroundColor: primaryColor },
                      ]}
                      onPress={() => handleBuildingSelect(b)}
                    >
                      <Text style={{ color: building === b ? '#fff' : colors.text.primary }}>Корпус {b}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            {building && (
              <View>
                <View style={[styles.summary, { backgroundColor: primaryColor + '10' }]}>
                  <Text style={{ color: primaryColor, fontWeight: '700' }}>Корпус {building} | {startTime}-{endTime}</Text>
                  <TouchableOpacity onPress={() => setBuilding('')}>
                    <Text style={{ color: primaryColor, fontSize: 12 }}>Изменить корпус</Text>
                  </TouchableOpacity>
                </View>
                {allRooms.map(renderRoomCard)}
                <TouchableOpacity
                  style={[styles.mainBtn, { backgroundColor: primaryColor, marginTop: 20 }]}
                  onPress={() => selectedRoom && setStep(4)}
                  disabled={!selectedRoom}
                >
                  <Text style={styles.mainBtnText}>Продолжить</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {step === 4 && (
          <View>
            <Text style={[styles.stepTitle, { color: colors.text.primary }]}>Всё верно?</Text>
            <View style={[styles.confirmCard, { backgroundColor: colors.common.white }]}>
              {isAdmin && (
                <View style={styles.confRow}>
                  <Ionicons name="person-outline" size={20} color={primaryColor} />
                  <Text style={[styles.confText, { color: colors.text.primary }]}>{selectedTeacher?.name}</Text>
                </View>
              )}
              <View style={styles.confRow}>
                <Ionicons name="calendar-outline" size={20} color={primaryColor} />
                <Text style={[styles.confText, { color: colors.text.primary }]}>{formatDateRu(selectedDate)}</Text>
              </View>
              <View style={styles.confRow}>
                <Ionicons name="time-outline" size={20} color={primaryColor} />
                <Text style={[styles.confText, { color: colors.text.primary }]}>{startTime} — {endTime}</Text>
              </View>
              <View style={styles.confRow}>
                <Ionicons name="location-outline" size={20} color={primaryColor} />
                <Text style={[styles.confText, { color: colors.text.primary }]}>Ауд. {selectedRoom?.number}, Корпус {selectedRoom?.building || building}</Text>
              </View>
              <View style={styles.confRow}>
                <Ionicons name="people-outline" size={20} color={primaryColor} />
                <Text style={[styles.confText, { color: colors.text.primary }]}>Группа {selectedGroup?.name}</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.common.border }]} />
              <Text style={[styles.confTopic, { color: colors.text.primary }]}>{topic}</Text>
            </View>
            <TouchableOpacity
              style={[styles.mainBtn, { backgroundColor: primaryColor, marginTop: 30, opacity: isCreating ? 0.7 : 1 }]}
              onPress={handleCreateConsultation}
              disabled={isCreating}
            >
              {isCreating ? <ActivityIndicator color="#fff" /> : <Text style={styles.mainBtnText}>Создать консультацию</Text>}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '900' },
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 10,
  },
  stepWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  stepText: { fontSize: 13, fontWeight: '900', color: '#999' },
  stepLine: {
    flex: 1,
    height: 3,
    backgroundColor: '#E0E0E0',
    marginHorizontal: -2,
    zIndex: 1,
  },
  form: { gap: 16 },
  label: {
    fontSize: 11,
    fontWeight: '800',
    opacity: 0.6,
    letterSpacing: 1,
    marginBottom: 2,
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  timeSlotCard: {
    flexBasis: '31%',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  timeSlotTime: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  timeSlotReason: {
    fontSize: 9,
    marginTop: 4,
    textAlign: 'center',
  },
  sundayWarning: {
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 8,
  },
  timeScroll: { paddingVertical: 4 },
  timeChip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    marginRight: 10,
  },
  timeChipText: { fontWeight: '700', fontSize: 15 },
  input: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  mainBtn: {
    height: 58,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  mainBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  stepTitle: { fontSize: 26, fontWeight: '900', marginBottom: 20 },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 28,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  slotMain: { flex: 1 },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '700',
  },
  slotTime: { fontSize: 20, fontWeight: '900' },
  slotDate: { fontSize: 15, fontWeight: '600', marginTop: 2, opacity: 0.7 },
  slotLoc: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 6 },
  reasonText: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  manualBtn: {
    paddingVertical: 18,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    marginTop: 10,
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    marginBottom: 20,
  },
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 22,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  roomNum: { fontSize: 19, fontWeight: '900' },
  confirmCard: {
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  confRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  confText: { fontSize: 17, fontWeight: '700' },
  divider: { height: 1, marginVertical: 20 },
  confTopic: { fontSize: 20, fontWeight: '900', textAlign: 'center' },
  hintText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});
