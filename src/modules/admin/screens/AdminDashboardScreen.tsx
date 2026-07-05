import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, SafeAreaView, Modal } from 'react-native';
import { useAuth } from '../../../core/auth/AuthContext';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { UniversityLogo } from '../../../shared/components/UniversityLogo';

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const AdminDashboardScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const { consultations, rooms, schedule } = useAuth();
  const { width, height } = useWindowDimensions();
  const [now, setNow] = useState(new Date());
  const [isFreeRoomsModalVisible, setFreeRoomsModalVisible] = useState(false);
  const [selectedBuildings, setSelectedBuildings] = useState<string[]>([]);

  const shortSide = Math.min(width, height);
  const vScale = useMemo(() => Math.min(height / 340, 1.5), [height]);
  const scale = useMemo(() => Math.min(shortSide / 340, 1.6), [shortSide]);

  const fs = useMemo(
    () => (min: number, ideal: number, max: number) => Math.min(Math.max(Math.round(ideal * scale), min), max),
    [scale]
  );
  const sp = useMemo(
    () => (min: number, ideal: number, max: number) => Math.min(Math.max(Math.round(ideal * vScale), min), max),
    [vScale]
  );

  const isLandscape = width > height;
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const nowDate = useMemo(() => formatLocalDate(now), [now]);
  const nowTime = useMemo(
    () => `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    [now]
  );

  const isOverlapNow = (start: string, end: string) => start <= nowTime && end > nowTime;

  const freeRoomsNow = useMemo(() => {
    const normalized = rooms
      .filter((room) => {
        const blockedByRepair = room.underRepair || (room.blocks || []).some((b) =>
          b.type === 'repair' && b.startDate && b.endDate && nowDate >= b.startDate && nowDate <= b.endDate
        );
        if (blockedByRepair) return false;

        const blockedByEvent = (room.blocks || []).some((b) =>
          b.type === 'event' &&
          b.date === nowDate &&
          !!b.startTime &&
          !!b.endTime &&
          isOverlapNow(b.startTime, b.endTime)
        );
        if (blockedByEvent) return false;

        const busyBySchedule = schedule.some((s) =>
          s.date === nowDate &&
          s.room === room.number &&
          s.building === room.building &&
          isOverlapNow(s.startTime, s.endTime)
        );
        if (busyBySchedule) return false;

        const busyByConsultation = consultations.some((c) =>
          c.status === 'scheduled' &&
          c.date === nowDate &&
          c.room === room.number &&
          c.building === room.building &&
          isOverlapNow(c.startTime, c.endTime)
        );
        if (busyByConsultation) return false;

        return true;
      })
      .sort((a, b) => {
        const byBuilding = String(a.building).localeCompare(String(b.building), 'ru', { numeric: true });
        if (byBuilding !== 0) return byBuilding;
        return String(a.number).localeCompare(String(b.number), 'ru', { numeric: true });
      });

    return normalized;
  }, [rooms, schedule, consultations, nowDate, nowTime]);

  const buildings = useMemo(
    () => [...new Set(rooms.map((r) => String(r.building)))].sort((a, b) => a.localeCompare(b, 'ru', { numeric: true })),
    [rooms]
  );

  useEffect(() => {
    if (selectedBuildings.length === 0 && buildings.length > 0) {
      setSelectedBuildings(buildings);
    }
  }, [buildings, selectedBuildings.length]);

  const filteredFreeRoomsNow = useMemo(
    () => freeRoomsNow.filter((room) => selectedBuildings.includes(String(room.building))),
    [freeRoomsNow, selectedBuildings]
  );

  const toggleBuilding = (building: string) => {
    setSelectedBuildings((prev) =>
      prev.includes(building) ? prev.filter((b) => b !== building) : [...prev, building]
    );
  };

  const stats = [
    { title: 'Свободно аудиторий', value: freeRoomsNow.length, icon: 'business', color: colors.status.success, key: 'freeRooms' },
  ];

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.common.background }]}>
      <View style={[s.root, { paddingHorizontal: sp(16, 24, 40), paddingVertical: sp(10, 16, 24) }]}>
        <View style={[s.header, { marginBottom: sp(12, 20, 28) }]}>
          <View>
            <Text style={[s.title, { color: colors.text.primary, fontSize: fs(22, 28, 38) }]}>Дашборд</Text>
            <Text style={[s.subtitle, { color: colors.text.secondary, fontSize: fs(10, 13, 16) }]}>Панель администратора</Text>
          </View>
          <UniversityLogo size={sp(48, 62, 76)} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={{ flexGrow: 1, gap: sp(12, 20, 28) }}>
          <View style={[s.statsGrid, { gap: sp(6, 12, 16) }]}>
            {stats.map((stat, i) => (
              <TouchableOpacity
                key={i}
                activeOpacity={stat.key === 'freeRooms' ? 0.8 : 1}
                disabled={stat.key !== 'freeRooms'}
                onPress={() => setFreeRoomsModalVisible(true)}
                style={[s.statCard, { backgroundColor: colors.common.white, padding: sp(6, 10, 14) }]}
              >
                <View style={[s.statIconBox, { backgroundColor: stat.color + '15', width: sp(32, 40, 50), height: sp(32, 40, 50), marginBottom: sp(4, 8, 12) }]}>
                  <Ionicons name={stat.icon as any} size={fs(16, 20, 26)} color={stat.color} />
                </View>
                <View style={s.statContent}>
                  <Text style={[s.statValue, { color: colors.text.primary, fontSize: fs(16, 22, 30) }]}>{stat.value}</Text>
                  <Text style={[s.statLabel, { color: colors.text.secondary, fontSize: fs(6, 8, 10) }]} numberOfLines={2}>
                    {stat.title}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ gap: sp(10, 12, 16), flex: 1, justifyContent: 'center' }}>
            <TouchableOpacity style={[s.mainBtn, { backgroundColor: colors.admin.primary, paddingVertical: sp(10, 14, 18) }]} onPress={() => navigation.navigate('ConsultationForm')}>
              <Ionicons name="add-circle" size={fs(18, 22, 26)} color="#fff" />
              <Text style={[s.btnText, { color: '#fff', fontSize: fs(12, 15, 18) }]}>Назначить консультацию</Text>
            </TouchableOpacity>

            <View style={[s.actionGrid, { flexDirection: isLandscape ? 'row' : 'column', gap: sp(8, 10, 14) }]}>
              <TouchableOpacity style={[s.subBtn, { backgroundColor: colors.common.white, borderColor: colors.admin.primary + '30', paddingVertical: sp(8, 12, 16) }]} onPress={() => navigation.navigate('Rooms')}>
                <Ionicons name="business" size={fs(16, 20, 24)} color={colors.admin.primary} />
                <Text style={[s.subBtnText, { color: colors.text.primary, fontSize: fs(10, 13, 16) }]}>Аудитории</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[s.subBtn, { backgroundColor: colors.common.white, borderColor: colors.admin.primary + '30', paddingVertical: sp(8, 12, 16) }]} onPress={() => navigation.navigate('Consultations')}>
                <Ionicons name="calendar" size={fs(16, 20, 24)} color={colors.admin.primary} />
                <Text style={[s.subBtnText, { color: colors.text.primary, fontSize: fs(10, 13, 16) }]}>Консультации</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>

      <Modal visible={isFreeRoomsModalVisible} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { backgroundColor: colors.common.white }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: colors.text.primary }]}>Свободные аудитории сейчас</Text>
              <TouchableOpacity onPress={() => setFreeRoomsModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <Text style={[s.modalSubTitle, { color: colors.text.tertiary }]}>
              {new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </Text>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              <View style={s.flagsWrap}>
                {buildings.map((building) => {
                  const active = selectedBuildings.includes(building);
                  return (
                    <TouchableOpacity
                      key={building}
                      onPress={() => toggleBuilding(building)}
                      style={[
                        s.flagChip,
                        {
                          backgroundColor: active ? colors.admin.primary : colors.common.white,
                          borderColor: active ? colors.admin.primary : colors.common.border,
                        },
                      ]}
                    >
                      <Text style={{ color: active ? '#fff' : colors.text.secondary, fontWeight: '700' }}>
                        Корпус {building}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {filteredFreeRoomsNow.length === 0 ? (
                <Text style={[s.emptyText, { color: colors.text.secondary }]}>Сейчас свободных аудиторий нет</Text>
              ) : (
                filteredFreeRoomsNow.map((room) => (
                  <View key={room.id} style={[s.roomRow, { borderBottomColor: colors.common.border + '55' }]}>
                    <Text style={[s.roomMain, { color: colors.text.primary }]}>Ауд. {room.number}</Text>
                    <Text style={[s.roomSecondary, { color: colors.text.secondary }]}>Корпус {room.building}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1 },
  root: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { fontWeight: '500', opacity: 0.6, marginTop: 1 },
  statsGrid: { flexDirection: 'row', width: '100%' },
  statCard: {
    flex: 1,
    borderRadius: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  statIconBox: { borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  statContent: { alignItems: 'center' },
  statValue: { fontWeight: '800' },
  statLabel: { fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3, textAlign: 'center' },
  mainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  btnText: { fontWeight: '800', letterSpacing: 0.2 },
  actionGrid: { width: '100%' },
  subBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 8,
  },
  subBtnText: { fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 18,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  modalSubTitle: {
    fontSize: 12,
    marginBottom: 10,
  },
  flagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  flagChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  roomRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  roomMain: {
    fontSize: 16,
    fontWeight: '700',
  },
  roomSecondary: {
    marginTop: 2,
    fontSize: 13,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 18,
    fontSize: 14,
    fontWeight: '600',
  },
});
