import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  SafeAreaView,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import Modal from 'react-native-modal';
import { Calendar } from 'react-native-calendars';
import '../../../shared/utils/calendarLocale';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useAuth } from '../../../core/auth/AuthContext';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../core/supabase/client';
import { Consultation } from '../../../shared/types';
import { formatPairLabel, formatTimeNoSeconds } from '../../../shared/utils/time';
import { UniversityLogo } from '../../../shared/components/UniversityLogo';

type RoomDisplayRouteParams = {
  params: { roomNumber: string; building?: string };
};

type DisplayItem = {
  id: string;
  startTime: string;
  endTime: string;
  subject: string;
  teacherName: string;
  groupName: string;
  isConsultation: boolean;
};

const parseMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const normalizeParam = (value?: string) => {
  if (!value) return '';
  try {
    let d = value, p = '';
    while (d !== p) { p = d; d = decodeURIComponent(d); }
    return d;
  } catch { return value; }
};

const normalizeDate = (date: string | Date): string => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTodayStr = (): string => normalizeDate(new Date());

type PinVerificationResult =
  | { status: 'valid'; teacherName: string }
  | { status: 'expired' | 'invalid' | 'error' };

const verifyPin = async (pin: string): Promise<PinVerificationResult> => {
  try {
    const { data, error } = await supabase
      .from('teachers')
      .select('name, pin_expires_at')
      .eq('daily_pin', pin)
      .limit(1);
    if (error) {
      console.error('PIN verification error:', error);
      return { status: 'error' };
    }
    if (data && data.length > 0) {
      const expiresAt = data[0].pin_expires_at ? new Date(data[0].pin_expires_at) : null;
      if (!expiresAt || expiresAt <= new Date()) return { status: 'expired' };
      return { status: 'valid', teacherName: data[0].name };
    }
    return { status: 'invalid' };
  } catch (error) {
    console.error('PIN verification error:', error);
    return { status: 'error' };
  }
};

export const RoomDisplayScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RoomDisplayRouteParams, 'params'>>();
  const { rooms, schedule, consultations, loadRoomSchedule, loadConsultations } = useAuth();
  const { width, height } = useWindowDimensions();

  const shortSide = Math.min(width, height);
  const scale = useMemo(() => Math.min(shortSide / 320, 1.6), [shortSide]);
  const fs = useMemo(() => (min: number, ideal: number, max: number) =>
    Math.min(Math.max(Math.round(ideal * scale), min), max), [scale]);
  const vScale = useMemo(() => Math.min(height / 320, 1.5), [height]);
  const sp = useMemo(() => (min: number, ideal: number, max: number) =>
    Math.min(Math.max(Math.round(ideal * vScale), min), max), [vScale]);

  const isNarrow = width < 420;
  const isLowHeight = height < 420;
  const hPad = Math.min(Math.max(width * 0.035, 8), 28);

  const [now, setNow] = useState(new Date());
  const [isPinModalVisible, setPinVisible] = useState(false);
  const [isCalendarModalVisible, setCalVisible] = useState(false);
  const [selectedCalendarDate, setSelectedDate] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCalendarExpanded, setCalExpanded] = useState(false);
  const [schedCardInnerH, setSchedCardInnerH] = useState(0);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(true);

  const roomNumber = normalizeParam(route.params?.roomNumber);
  const building = normalizeParam(route.params?.building);

  useEffect(() => {
    if (roomNumber) {
      setLoadingSchedule(true);
      Promise.all([loadRoomSchedule(roomNumber, building), loadConsultations()])
        .finally(() => setLoadingSchedule(false));
    }
  }, [roomNumber, building, loadRoomSchedule, loadConsultations]);

  useEffect(() => {
    if (!roomNumber) return;
    const scheduleSub = supabase
      .channel(`room-schedule-${roomNumber}-${building || 'any'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedule' }, () => {
        loadRoomSchedule(roomNumber, building);
      })
      .subscribe();
    const consultationsSub = supabase
      .channel(`room-consultations-${roomNumber}-${building || 'any'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consultations' }, () => {
        loadConsultations();
      })
      .subscribe();
    return () => {
      scheduleSub.unsubscribe();
      consultationsSub.unsubscribe();
    };
  }, [roomNumber, building, loadRoomSchedule, loadConsultations]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { showSubscription.remove(); hideSubscription.remove(); };
  }, []);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    return () => { ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT); };
  }, []);

  const today = useMemo(() => getTodayStr(), [now]);
  const tomorrowDate = useMemo(() => {
    const d = new Date(now);
    d.setDate(now.getDate() + 1);
    return normalizeDate(d);
  }, [now]);

  const currentMinutes = useMemo(() => now.getHours() * 60 + now.getMinutes(), [now]);
  const currentTimeString = useMemo(() => now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }), [now]);
  const currentDateString = useMemo(() => now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }), [now]);
  const currentDayString = useMemo(() => now.toLocaleDateString('ru-RU', { weekday: 'short' }), [now]);

  const currentRoom = useMemo(
    () => rooms.find(r => r.number === roomNumber && (!building || r.building === building)),
    [rooms, roomNumber, building],
  );

  const getScheduleForDate = useCallback((date: string): DisplayItem[] => {
    const dateNorm = normalizeDate(date);
    const scheduleItems = schedule
      .filter(i =>
        normalizeDate(i.date) === dateNorm &&
        i.room === roomNumber &&
        (!building || i.building === building),
      )
      .map((i): DisplayItem => ({
        id: i.id,
        startTime: formatTimeNoSeconds(i.startTime),
        endTime: formatTimeNoSeconds(i.endTime),
        subject: i.subject,
        teacherName: i.teacherName,
        groupName: i.groupName,
        isConsultation: false,
      }));
    const consultationItems = consultations
      .filter((c: Consultation) =>
        c.status === 'scheduled' &&
        c.room === roomNumber &&
        (!building || c.building === building) &&
        normalizeDate(c.date) === dateNorm
      )
      .map((c): DisplayItem => ({
        id: `consultation-${c.id}`,
        startTime: formatTimeNoSeconds(c.startTime),
        endTime: formatTimeNoSeconds(c.endTime),
        subject: c.topic ? `Консультация: ${c.topic}` : 'Консультация',
        teacherName: c.teacherName,
        groupName: c.groupName || 'Индивидуально',
        isConsultation: true,
      }));

    return [...scheduleItems, ...consultationItems]
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [schedule, consultations, roomNumber, building]);

  const todaysSchedule = useMemo(() => getScheduleForDate(today), [getScheduleForDate, today]);
  const tomorrowSchedule = useMemo(() => getScheduleForDate(tomorrowDate), [getScheduleForDate, tomorrowDate]);

  const [currentDisplayDate, setCurrentDisplayDate] = useState(today);
  const currentSchedule = currentDisplayDate === today ? todaysSchedule : tomorrowSchedule;

  const currentLesson = currentSchedule.find(
    i => parseMinutes(i.startTime) <= currentMinutes && parseMinutes(i.endTime) > currentMinutes,
  );
  const nextLesson = currentSchedule.find(i => parseMinutes(i.startTime) > currentMinutes);

  const weekDays = useMemo(() => {
    let base = selectedCalendarDate ? new Date(selectedCalendarDate) : new Date();
    if (isNaN(base.getTime())) base = new Date();
    const start = new Date(base);
    const day = base.getDay();
    start.setDate(base.getDate() - day + (day === 0 ? -6 : 1));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [selectedCalendarDate]);

  const markedDates = useMemo(() => {
    const m: any = {};
    weekDays.forEach(day => {
      const ds = normalizeDate(day);
      if (getScheduleForDate(ds).length > 0)
        m[ds] = { marked: true, dotColor: colors.admin.primary };
    });
    if (selectedCalendarDate)
      m[selectedCalendarDate] = { ...m[selectedCalendarDate], selected: true, selectedColor: colors.admin.primary };
    return m;
  }, [weekDays, selectedCalendarDate, colors.admin.primary, getScheduleForDate]);

  const selectedSchedule = useMemo(() => {
    if (!selectedCalendarDate) return [] as DisplayItem[];
    return getScheduleForDate(selectedCalendarDate);
  }, [selectedCalendarDate, getScheduleForDate]);

  const openPin = () => { setPin(''); setPinVisible(true); };
  const closePin = () => { setPinVisible(false); setPin(''); Keyboard.dismiss(); };
  const openCal = () => { setSelectedDate(currentDisplayDate || today); setCalExpanded(false); setCalVisible(true); };
  const closeCal = () => { setCalVisible(false); setCalExpanded(false); };

  const handlePinSubmit = async () => {
    if (pin.length !== 4) {
      Alert.alert('Ошибка', 'PIN-код должен состоять из 4 цифр');
      return;
    }
    setLoading(true);
    const result = await verifyPin(pin);
    if (result.status === 'valid') {
      closePin();
      setTimeout(() => navigation.navigate('TabletBooking', { teacherName: result.teacherName, roomNumber, building }), 100);
    } else if (result.status === 'expired') {
      Alert.alert('Ошибка', 'PIN-код истек. Откройте расписание преподавателя и получите новый PIN.');
      setPin('');
    } else if (result.status === 'error') {
      Alert.alert('Ошибка', 'Не удалось проверить PIN. Попробуйте еще раз.');
      setPin('');
    } else {
      Alert.alert('Ошибка', 'Неверный PIN-код');
      setPin('');
    }
    setLoading(false);
  };

  const showToday = () => setCurrentDisplayDate(today);
  const showTomorrow = () => setCurrentDisplayDate(tomorrowDate);

  if (loadingSchedule) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: colors.common.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.admin.primary} />
      </SafeAreaView>
    );
  }

  if (!roomNumber || !currentRoom) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: colors.common.background }]}>
        <View style={s.errBox}>
          <Ionicons name="alert-circle-outline" size={fs(24, 32, 44)} color={colors.text.secondary} />
          <Text style={[s.errTitle, { color: colors.text.primary, fontSize: fs(14, 17, 22) }]}>Аудитория не найдена</Text>
          <Text style={[s.errSub, { color: colors.text.secondary, fontSize: fs(11, 13, 17) }]}>
            {roomNumber ? `Ауд. ${roomNumber}` : 'QR-код не распознан'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isBusy = !!currentLesson;
  const statusBg = isBusy ? '#FFF1F1' : '#F0FFF4';
  const statusBdr = isBusy ? '#FECACA' : '#BBF7D0';
  const statusColor = isBusy ? colors.status.error : colors.status.success;

  const cardPadV = isLowHeight ? sp(2, 4, 7) : sp(3, 6, 10);
  const cardPadH = Math.min(Math.max(width * 0.028, 8), 16);
  const gapMain = isLowHeight ? sp(3, 5, 8) : sp(4, 7, 11);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.common.background }]}>
      <View style={[s.root, { paddingHorizontal: hPad, paddingVertical: isLowHeight ? sp(3, 5, 8) : sp(5, 8, 12), gap: gapMain }]}>
        <View style={s.topBar}>
          <View style={s.topLeft}>
            <Text style={[s.time, { color: colors.text.primary, fontSize: fs(16, 21, 30) }]}>{currentTimeString}</Text>
            <Text style={[s.dateText, { color: colors.text.secondary, fontSize: fs(8, 10, 13) }]} numberOfLines={1}>{currentDayString}, {currentDateString}</Text>
          </View>
          <View style={[s.brandBox, { gap: sp(4, 6, 8) }]}>
            <UniversityLogo size={sp(30, 40, 52)} />
            {!isNarrow && (
              <Text style={[s.brandText, { color: colors.text.secondary, fontSize: fs(8, 10, 12) }]} numberOfLines={1}>
                ВГТУ
              </Text>
            )}
          </View>
          <View style={[s.roomBadge, {
            backgroundColor: colors.admin.primary + '14',
            borderColor: colors.admin.primary + '40',
            paddingHorizontal: sp(7, 10, 15),
            paddingVertical: sp(3, 5, 8),
          }]}>
            <Text style={[s.buildingLbl, { color: colors.admin.primary, fontSize: fs(8, 10, 13) }]}>Корпус {currentRoom.building}</Text>
            <Text style={[s.roomLbl, { color: colors.admin.primary, fontSize: fs(13, 17, 25) }]}>{roomNumber}</Text>
          </View>
        </View>

        <View style={[s.statusCard, {
          backgroundColor: statusBg,
          borderColor: statusBdr,
          paddingHorizontal: cardPadH,
          paddingVertical: isLowHeight ? sp(2, 3, 5) : sp(3, 4, 7),
        }]}>
          <View style={s.statusLeft}>
            <View style={[s.statusDot, { backgroundColor: statusColor, width: sp(6, 7, 9), height: sp(6, 7, 9), borderRadius: sp(3, 4, 5) }]} />
            <Text style={[s.statusLbl, { color: statusColor, fontSize: fs(10, 12, 16) }]}>{isBusy ? 'Занято' : 'Свободно'}</Text>
          </View>
          {isBusy && currentLesson ? (
            <View style={s.statusRight}>
              <Text style={[s.lessonTime, { color: colors.text.primary, fontSize: fs(9, 11, 14) }]} numberOfLines={1}>
                {currentLesson.startTime} – {currentLesson.endTime}
              </Text>
              <Text style={[s.lessonSubj, { color: colors.text.secondary, fontSize: fs(8, 10, 12) }]} numberOfLines={1}>
                {currentLesson.subject}
              </Text>
              {!isNarrow && (
                <Text style={[s.nextLbl, { color: colors.text.secondary, fontSize: fs(7, 8, 10) }]} numberOfLines={1}>
                  {formatPairLabel(currentLesson.startTime, currentLesson.endTime)}
                </Text>
              )}
            </View>
          ) : nextLesson ? (
            <View style={s.statusRight}>
              <Text style={[s.nextLbl, { color: colors.text.secondary, fontSize: fs(8, 10, 13) }]}>Следующее</Text>
              <Text style={[s.lessonTime, { color: colors.text.primary, fontSize: fs(9, 11, 14) }]}>{nextLesson.startTime}</Text>
            </View>
          ) : null}
        </View>

        <View style={[s.tabsRow, { gap: sp(6, 10, 16) }]}>
          {[
            { label: 'Сегодня', date: today, action: showToday },
            { label: 'Завтра', date: tomorrowDate, action: showTomorrow },
          ].map(btn => {
            const active = currentDisplayDate === btn.date;
            return (
              <TouchableOpacity
                key={btn.date}
                style={[s.tab, {
                  paddingHorizontal: sp(9, 14, 20),
                  paddingVertical: isLowHeight ? sp(3, 4, 6) : sp(4, 5, 8),
                  backgroundColor: active ? colors.admin.primary : 'transparent',
                  borderColor: active ? colors.admin.primary : colors.common.border,
                }]}
                onPress={btn.action}
              >
                <Text style={[s.tabText, { fontSize: fs(9, 11, 14), color: active ? colors.common.white : colors.text.secondary, fontWeight: active ? '700' : '500' }]}>
                  {btn.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View
          style={[s.schedCard, { borderColor: colors.common.border, paddingTop: cardPadV + 2, paddingBottom: cardPadV, paddingHorizontal: cardPadH, flex: 1 }]}
          onLayout={e => setSchedCardInnerH(e.nativeEvent.layout.height)}
        >
          <Text style={[s.schedTitle, { color: colors.text.secondary, fontSize: fs(8, 10, 13) }]}>РАСПИСАНИЕ</Text>
          {currentSchedule.length > 0 ? (
            (() => {
              const minRowHeight = fs(10, 12, 16) * 1.4 + sp(6, 10, 16);
              const titleLineH = fs(8, 10, 13) * 1.5 + 4;
              const availH = schedCardInnerH > 0 ? Math.max(0, schedCardInnerH - titleLineH - (cardPadV + 2) - cardPadV) : 0;
              const totalNeededH = currentSchedule.length * minRowHeight;
              const needsScroll = availH > 0 && totalNeededH > availH;
              const rowPadV = needsScroll ? sp(3, 5, 8) : availH > 0 ? Math.max(sp(3, 5, 8), Math.floor((availH / currentSchedule.length - fs(10, 12, 16) * 1.4) / 2)) : sp(4, 7, 11);
              const pillPadV = Math.max(1, Math.round(rowPadV * 0.4));

              const renderRow = (item: DisplayItem, idx: number, arr: DisplayItem[]) => {
                const isActive = parseMinutes(item.startTime) <= currentMinutes && parseMinutes(item.endTime) > currentMinutes;
                const isPast = parseMinutes(item.endTime) <= currentMinutes;
                return (
                  <View
                    key={item.id}
                    style={[
                      s.schedRow,
                      {
                        paddingVertical: rowPadV,
                        gap: sp(6, 9, 14),
                        ...(needsScroll ? {} : { flex: 1 }),
                      },
                      idx < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.common.border },
                      isActive && [s.schedRowActive, { backgroundColor: colors.admin.primary + '12' }],
                    ]}
                  >
                    <View style={[s.timePill, {
                      backgroundColor: isActive ? colors.admin.primary : colors.common.border + '70',
                      paddingHorizontal: sp(4, 6, 9),
                      paddingVertical: pillPadV,
                    }]}>
                      <Text style={[s.timePillTxt, { color: isActive ? '#fff' : colors.text.secondary, fontSize: fs(8, 10, 13) }]}>
                        {item.startTime}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.schedSubj, {
                        color: isPast ? colors.text.tertiary : colors.text.primary,
                        fontSize: fs(10, 12, 16),
                        fontWeight: isActive ? '600' : '400',
                      }]} numberOfLines={1}>
                        {item.subject}
                      </Text>
                      <Text style={[s.schedDetail, { color: colors.text.tertiary, fontSize: fs(7, 9, 11) }]} numberOfLines={1}>
                        {formatPairLabel(item.startTime, item.endTime)} · {item.groupName} · {item.teacherName}
                      </Text>
                    </View>
                    {isActive && (
                      <View style={[s.activeDot, {
                        backgroundColor: colors.admin.primary,
                        width: sp(4, 6, 8),
                        height: sp(4, 6, 8),
                      }]} />
                    )}
                  </View>
                );
              };

              return needsScroll ? (
                <View style={{ flex: 1 }}>
                  <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: 2 }}
                    showsVerticalScrollIndicator={true}
                    indicatorStyle="black"
                    bounces={false}
                  >
                    {currentSchedule.map((item, idx, arr) => renderRow(item, idx, arr))}
                  </ScrollView>
                  <View style={{ position: 'absolute', bottom: -cardPadV + 4, right: -4, opacity: 0.6 }}>
                    <Ionicons name="chevron-down" size={fs(12, 14, 18)} color={colors.text.tertiary} />
                  </View>
                </View>
              ) : (
                currentSchedule.map((item, idx, arr) => renderRow(item, idx, arr))
              );
            })()
          ) : (
            <View style={s.noSchedWrap}>
              <Ionicons name="calendar-outline" size={fs(16, 20, 26)} color={colors.text.tertiary} />
              <Text style={[s.noSched, { color: colors.text.tertiary, fontSize: fs(10, 12, 15) }]}>Нет занятий</Text>
            </View>
          )}
        </View>

        <View style={[s.actionRow, { gap: sp(8, 12, 18) }]}>
          <TouchableOpacity
            style={[s.actionBtn, s.actionOutline, { borderColor: colors.admin.primary, paddingVertical: isLowHeight ? sp(5, 7, 10) : sp(6, 8, 12), gap: sp(4, 5, 7) }]}
            onPress={openCal}
          >
            <Ionicons name="calendar-outline" size={fs(12, 14, 18)} color={colors.admin.primary} />
            <Text style={[s.actionTxt, { color: colors.admin.primary, fontSize: fs(9, 11, 14) }]}>Календарь</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: colors.admin.primary, paddingVertical: isLowHeight ? sp(5, 7, 10) : sp(6, 8, 12), gap: sp(4, 5, 7) }]}
            onPress={openPin}
          >
            <Ionicons name="lock-closed-outline" size={fs(12, 14, 18)} color={colors.common.white} />
            <Text style={[s.actionTxt, { color: colors.common.white, fontSize: fs(9, 11, 14) }]}>Забронировать</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        isVisible={isPinModalVisible}
        onBackdropPress={closePin}
        onBackButtonPress={closePin}
        backdropOpacity={0.55}
        animationIn="zoomIn"
        animationOut="zoomOut"
        animationInTiming={200}
        animationOutTiming={160}
        useNativeDriver
        style={s.modalWrap}
        avoidKeyboard
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={8}
          style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={[s.pinCard, {
              backgroundColor: colors.common.white,
              width: Math.min(width * 0.85, 300),
              padding: isKeyboardVisible && height < 400 ? sp(8, 12, 16) : sp(16, 22, 32),
              maxHeight: height - 20,
            }]}>
              {!(isKeyboardVisible && height < 400) && (
                <View style={[s.pinIconWrap, {
                  backgroundColor: colors.admin.primary + '18',
                  width: sp(36, 46, 58),
                  height: sp(36, 46, 58),
                  borderRadius: sp(10, 14, 18),
                  marginBottom: sp(8, 12, 18),
                }]}>
                  <Ionicons name="lock-closed" size={fs(15, 19, 25)} color={colors.admin.primary} />
                </View>
              )}
              <Text style={[s.pinTitle, {
                color: colors.text.primary,
                fontSize: fs(13, 16, 21),
                marginTop: isKeyboardVisible && height < 400 ? 0 : 4
              }]}>
                Введите PIN-код
              </Text>
              {!(isKeyboardVisible && height < 400) && (
                <Text style={[s.pinSub, {
                  color: colors.text.secondary,
                  fontSize: fs(9, 11, 14),
                  marginBottom: sp(10, 14, 20)
                }]}>
                  Ежедневный код для преподавателей
                </Text>
              )}
              <TextInput
                style={[s.pinInput, {
                  backgroundColor: colors.common.background,
                  borderColor: pin.length > 0 ? colors.admin.primary : colors.common.border,
                  color: colors.text.primary,
                  fontSize: fs(20, 26, 34),
                  width: Math.min(width * 0.55, 110),
                  height: sp(36, 48, 60),
                  marginTop: isKeyboardVisible && height < 400 ? 8 : 0,
                  marginBottom: isKeyboardVisible && height < 400 ? 12 : sp(12, 18, 24),
                }]}
                placeholder="••••"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
                value={pin}
                onChangeText={setPin}
                textAlign="center"
                autoFocus
              />
              <View style={[s.pinBtnRow, { gap: sp(8, 11, 16) }]}>
                <TouchableOpacity
                  style={[s.pinBtn, s.pinBtnCancel, {
                    borderColor: colors.common.border,
                    paddingVertical: isKeyboardVisible && height < 400 ? 6 : sp(7, 10, 14),
                  }]}
                  onPress={closePin}
                >
                  <Text style={[s.pinBtnTxt, { color: colors.text.secondary, fontSize: fs(11, 13, 16) }]}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.pinBtn, {
                    backgroundColor: colors.admin.primary,
                    paddingVertical: isKeyboardVisible && height < 400 ? 6 : sp(7, 10, 14),
                    opacity: loading ? 0.7 : 1,
                  }]}
                  onPress={handlePinSubmit}
                  disabled={loading}
                >
                  <Text style={[s.pinBtnTxt, { color: colors.common.white, fontSize: fs(11, 13, 16) }]}>
                    {loading ? '...' : 'Войти'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        isVisible={isCalendarModalVisible}
        onBackdropPress={closeCal}
        onBackButtonPress={closeCal}
        backdropOpacity={0.55}
        animationIn="fadeInUp"
        animationOut="fadeOutDown"
        animationInTiming={240}
        animationOutTiming={180}
        useNativeDriver
        style={s.modalWrap}
        key={`cal-${width}-${height}`}
      >
        <View style={[s.calCard, {
          backgroundColor: colors.common.white,
          width: Math.min(width * 0.94, 560),
          height: Math.min(height * 0.8, 600),
        }]}>
          <View style={[s.calHead, {
            paddingHorizontal: sp(12, 18, 24),
            paddingTop: sp(12, 16, 22),
            paddingBottom: sp(8, 12, 16),
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.common.border,
          }]}>
            <View>
              <Text style={[s.calHeadSub, { color: colors.text.secondary, fontSize: fs(8, 10, 13) }]}>АУДИТОРИЯ</Text>
              <Text style={[s.calHeadTitle, { color: colors.text.primary, fontSize: fs(15, 18, 24) }]}>{roomNumber}</Text>
            </View>
            <TouchableOpacity
              style={[s.calCloseBtn, {
                backgroundColor: colors.common.border + '50',
                width: sp(26, 32, 42),
                height: sp(26, 32, 42),
                borderRadius: sp(13, 16, 21),
              }]}
              onPress={closeCal}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={fs(13, 16, 20)} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: sp(12, 18, 24),
              paddingTop: sp(10, 14, 20),
              paddingBottom: sp(12, 16, 22),
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <View style={[s.weekStrip, { marginBottom: sp(8, 12, 18) }]}>
              {weekDays.map((day, idx) => {
                const ds = normalizeDate(day);
                const isSelected = ds === selectedCalendarDate;
                const hasEvent = markedDates[ds]?.marked;
                const isToday = ds === today;
                const innerW = Math.min(width * 0.94, 560) - sp(12, 18, 24) * 2;
                const cellW = Math.floor((innerW - 6) / 7);
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[s.weekCell, {
                      width: cellW,
                      paddingVertical: sp(5, 8, 12),
                      backgroundColor: isSelected
                        ? colors.admin.primary
                        : isToday
                        ? colors.admin.primary + '18'
                        : 'transparent',
                      borderWidth: isToday && !isSelected ? 1.5 : 0,
                      borderColor: colors.admin.primary,
                    }]}
                    onPress={() => setSelectedDate(ds)}
                  >
                    <Text style={[s.weekCellDay, {
                      fontSize: fs(7, 9, 12),
                      color: isSelected ? '#fff' : colors.text.secondary,
                    }]}>
                      {day.toLocaleDateString('ru-RU', { weekday: 'short' }).slice(0, 2)}
                    </Text>
                    <Text style={[s.weekCellNum, {
                      fontSize: fs(11, 14, 19),
                      color: isSelected ? '#fff' : isToday ? colors.admin.primary : colors.text.primary,
                      fontWeight: (isToday || isSelected) ? '700' : '500',
                    }]}>
                      {day.getDate()}
                    </Text>
                    {hasEvent && !isSelected && (
                      <View style={[s.weekDot, { backgroundColor: colors.admin.primary }]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={[s.expandToggle, {
                backgroundColor: colors.admin.primary + '10',
                paddingVertical: sp(6, 9, 13),
                marginBottom: sp(8, 12, 18),
              }]}
              onPress={() => setCalExpanded(v => !v)}
            >
              <Ionicons
                name={isCalendarExpanded ? 'chevron-up' : 'chevron-down'}
                size={fs(11, 13, 17)}
                color={colors.admin.primary}
              />
              <Text style={[s.expandTxt, { color: colors.admin.primary, fontSize: fs(10, 12, 15) }]}>
                {isCalendarExpanded ? 'Свернуть' : 'Показать полный календарь'}
              </Text>
            </TouchableOpacity>
            {isCalendarExpanded && (
              <View style={[s.fullCalWrap, { marginBottom: sp(8, 12, 18) }]}>
                <Calendar
                  current={selectedCalendarDate || today}
                  onDayPress={d => setSelectedDate(d.dateString)}
                  markedDates={markedDates}
                  firstDay={1}
                  hideExtraDays
                  enableSwipeMonths
                  monthFormat="MMMM yyyy"
                  theme={{
                    calendarBackground: colors.common.white,
                    textSectionTitleColor: colors.text.secondary,
                    todayTextColor: colors.admin.primary,
                    selectedDayBackgroundColor: colors.admin.primary,
                    selectedDayTextColor: '#FFF',
                    dayTextColor: colors.text.primary,
                    textDisabledColor: colors.text.tertiary,
                    monthTextColor: colors.text.primary,
                    arrowColor: colors.admin.primary,
                    textDayFontSize: fs(10, 12, 15),
                    textMonthFontSize: fs(11, 13, 17),
                    textDayHeaderFontSize: fs(9, 11, 14),
                  }}
                  style={s.fullCal}
                />
              </View>
            )}
            <View style={[s.calSchedSection, {
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: colors.common.border,
              paddingTop: sp(8, 12, 18),
            }]}>
              <Text style={[s.calSchedDate, {
                color: colors.text.primary,
                fontSize: fs(12, 14, 18),
                marginBottom: sp(6, 10, 14),
              }]}>
                {selectedCalendarDate
                  ? new Date(selectedCalendarDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' })
                  : 'Выберите дату'}
              </Text>
              {selectedSchedule.length > 0 ? (
                selectedSchedule.map((item, idx, arr) => (
                  <View key={item.id} style={[s.calSchedRow, {
                    paddingVertical: sp(6, 9, 13),
                    gap: sp(6, 9, 13),
                    borderBottomWidth: idx < arr.length - 1 ? StyleSheet.hairlineWidth : 0,
                    borderBottomColor: colors.common.border,
                  }]}>
                    <View style={[s.calTimePill, {
                      backgroundColor: colors.admin.primary + '15',
                      paddingHorizontal: sp(5, 7, 10),
                      paddingVertical: sp(2, 3, 5),
                    }]}>
                      <Text style={[s.calTimeTxt, { color: colors.admin.primary, fontSize: fs(8, 10, 13) }]}>
                        {item.startTime}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.calSchedSubj, { color: colors.text.primary, fontSize: fs(10, 12, 15) }]} numberOfLines={1}>
                        {item.subject}
                      </Text>
                      <Text style={[s.calSchedDetail, { color: colors.text.tertiary, fontSize: fs(8, 10, 12) }]} numberOfLines={1}>
                        {formatPairLabel(item.startTime, item.endTime)} · {item.groupName} · {item.teacherName}
                      </Text>
                    </View>
                  </View>
                ))
              ) : selectedCalendarDate ? (
                <View style={s.noSchedWrap}>
                  <Ionicons name="checkmark-circle-outline" size={fs(16, 20, 26)} color={colors.status.success} />
                  <Text style={[s.noSched, { color: colors.text.secondary, fontSize: fs(10, 12, 15) }]}>Нет занятий</Text>
                </View>
              ) : null}
            </View>
            <TouchableOpacity
              style={[s.calDoneBtn, {
                backgroundColor: colors.admin.primary,
                paddingVertical: sp(9, 12, 17),
                marginTop: sp(10, 14, 20),
              }]}
              onPress={closeCal}
            >
              <Text style={[s.calDoneTxt, { color: colors.common.white, fontSize: fs(11, 13, 17) }]}>Готово</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1 },
  errBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  errTitle: { fontWeight: '700', marginTop: 4 },
  errSub: {},
  root: { flex: 1, flexDirection: 'column' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  topLeft: { flex: 1, minWidth: 0 },
  brandBox: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  brandText: { fontWeight: '800', letterSpacing: 0 },
  time: { fontWeight: '800', letterSpacing: -0.5 },
  dateText: { marginTop: 1, letterSpacing: 0.2 },
  roomBadge: { alignItems: 'center', borderRadius: 14, borderWidth: 1 },
  buildingLbl: { letterSpacing: 0.4, textTransform: 'uppercase' },
  roomLbl: { fontWeight: '800', letterSpacing: -1, marginTop: 1 },
  statusCard: { minHeight: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, borderWidth: 1.2 },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: {},
  statusLbl: { fontWeight: '800', letterSpacing: 0 },
  statusRight: { flex: 1, minWidth: 0, marginLeft: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  lessonTime: { fontWeight: '700' },
  lessonSubj: { flexShrink: 1, maxWidth: 420 },
  nextLbl: {},
  tabsRow: { flexDirection: 'row', justifyContent: 'center' },
  tab: { borderRadius: 24, borderWidth: 1.5 },
  tabText: { letterSpacing: 0.2 },
  schedCard: { borderRadius: 14, borderWidth: 1 },
  schedTitle: { fontWeight: '700', letterSpacing: 1.2, marginBottom: 4, textTransform: 'uppercase' },
  schedRow: { flexDirection: 'row', alignItems: 'center' },
  schedRowActive: { borderRadius: 10, paddingHorizontal: 6, marginHorizontal: -6 },
  timePill: { borderRadius: 7 },
  timePillTxt: { fontWeight: '600', letterSpacing: 0.2 },
  schedSubj: {},
  schedDetail: { marginTop: 2 },
  activeDot: { borderRadius: 4 },
  noSchedWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, justifyContent: 'center', flex: 1 },
  noSched: {},
  actionRow: { flexDirection: 'row' },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  actionOutline: { borderWidth: 1.5 },
  actionTxt: { fontWeight: '700' },
  modalWrap: { justifyContent: 'center', alignItems: 'center', margin: 0 },
  pinCard: { borderRadius: 22, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 12 },
  pinIconWrap: { justifyContent: 'center', alignItems: 'center' },
  pinTitle: { fontWeight: '800', letterSpacing: -0.3, textAlign: 'center' },
  pinSub: { marginTop: 4, textAlign: 'center' },
  pinInput: { fontWeight: '700', textAlign: 'center', borderRadius: 14, borderWidth: 2, letterSpacing: 8 },
  pinBtnRow: { flexDirection: 'row', width: '100%' },
  pinBtn: { flex: 1, borderRadius: 12, alignItems: 'center' },
  pinBtnCancel: { borderWidth: 1.5 },
  pinBtnTxt: { fontWeight: '700' },
  calCard: { borderRadius: 22, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.17, shadowRadius: 24, elevation: 14 },
  calHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  calHeadSub: { fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase' },
  calHeadTitle: { fontWeight: '800', letterSpacing: -0.5, marginTop: 2 },
  calCloseBtn: { justifyContent: 'center', alignItems: 'center' },
  weekStrip: { flexDirection: 'row', justifyContent: 'space-between' },
  weekCell: { alignItems: 'center', borderRadius: 12 },
  weekCellDay: { marginBottom: 3 },
  weekCellNum: {},
  weekDot: { width: 4, height: 4, borderRadius: 2, marginTop: 3, backgroundColor: 'transparent' },
  expandToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 12 },
  expandTxt: { fontWeight: '600' },
  fullCalWrap: { borderRadius: 14, overflow: 'hidden' },
  fullCal: { borderRadius: 14 },
  calSchedSection: {},
  calSchedDate: { fontWeight: '700' },
  calSchedRow: { flexDirection: 'row', alignItems: 'center' },
  calTimePill: { borderRadius: 8 },
  calTimeTxt: { fontWeight: '700' },
  calSchedSubj: {},
  calSchedDetail: { marginTop: 2 },
  calDoneBtn: { borderRadius: 14, alignItems: 'center' },
  calDoneTxt: { fontWeight: '700' },
});

