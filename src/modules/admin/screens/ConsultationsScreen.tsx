import React, { useMemo, useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../../../core/auth/AuthContext';
import { AdminStackParamList } from '../../../core/navigation/types';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { formatDateRu } from '../../../shared/utils/date';
import { formatPairLabel, formatTimeNoSeconds } from '../../../shared/utils/time';

export const ConsultationsScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const { colors } = useTheme();
  const { consultations, cancelConsultation } = useAuth();
  const { width, height } = useWindowDimensions();
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'cancelled'>('all');

  const shortSide = Math.min(width, height);
  const scale = useMemo(() => Math.max(0.65, Math.min(shortSide / 340, 1.4)), [shortSide]);
  const fs = useMemo(
    () => (min: number, ideal: number, max: number) => Math.min(Math.max(Math.round(ideal * scale), min), max),
    [scale]
  );
  const sp = useMemo(
    () => (min: number, ideal: number, max: number) => Math.min(Math.max(Math.round(ideal * scale), min), max),
    [scale]
  );

  const filteredConsultations = useMemo(
    () => consultations.filter((consultation) => (filter === 'all' ? true : consultation.status === filter)),
    [consultations, filter]
  );

  const handleCancel = (id: string) => {
    Alert.alert('Подтверждение', 'Отменить консультацию?', [
      { text: 'Нет', style: 'cancel' },
      {
        text: 'Да, отменить',
        style: 'destructive',
        onPress: async () => {
          const result = await cancelConsultation(id);
          if (!result.success) {
            Alert.alert('Ошибка', result.message || 'Не удалось отменить консультацию');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.common.background }]}>
      <View style={[s.root, { paddingHorizontal: sp(12, 18, 28), paddingVertical: sp(8, 12, 18) }]}>
        <View style={[s.header, { marginBottom: sp(12, 18, 24) }]}>
          <Text style={[s.title, { color: colors.text.primary, fontSize: fs(22, 28, 38) }]}>Консультации</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.filterRow, { gap: sp(6, 8, 12) }]}>
            {[
              { label: 'Все', value: 'all' as const },
              { label: 'Запланированы', value: 'scheduled' as const },
              { label: 'Отменены', value: 'cancelled' as const },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  s.filterChip,
                  {
                    borderColor: colors.common.border,
                    backgroundColor: filter === option.value ? colors.admin.primary : colors.common.white,
                    paddingHorizontal: sp(14, 20, 26),
                    paddingVertical: sp(6, 10, 14),
                  },
                ]}
                onPress={() => setFilter(option.value)}
              >
                <Text
                  style={[
                    s.filterText,
                    { color: filter === option.value ? colors.common.white : colors.text.secondary, fontSize: fs(11, 13, 16) },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: sp(10, 14, 20), paddingBottom: 20 }}>
          {filteredConsultations.length > 0 ? (
            filteredConsultations.map((consultation) => (
              <View key={consultation.id} style={[s.card, { backgroundColor: colors.common.white, padding: sp(12, 16, 22) }]}>
                <View style={s.cardHeader}>
                  <Text style={[s.topic, { color: colors.text.primary, fontSize: fs(15, 18, 22) }]}>{consultation.topic}</Text>
                  <View
                    style={[
                      s.statusBadge,
                      { backgroundColor: (consultation.status === 'scheduled' ? colors.status.success : colors.status.error) + '15' },
                    ]}
                  >
                    <Text
                      style={[
                        s.statusText,
                        { color: consultation.status === 'scheduled' ? colors.status.success : colors.status.error, fontSize: fs(9, 11, 13) },
                      ]}
                    >
                      {consultation.status === 'scheduled' ? 'Запланирована' : 'Отменена'}
                    </Text>
                  </View>
                </View>
                <View style={[s.divider, { backgroundColor: colors.common.border + '50' }]} />
                <Text style={[s.infoText, { color: colors.text.secondary }]}>
                  {formatDateRu(consultation.date)} • {formatTimeNoSeconds(consultation.startTime)}-{formatTimeNoSeconds(consultation.endTime)} • {formatPairLabel(consultation.startTime, consultation.endTime)}
                </Text>
                <Text style={[s.infoText, { color: colors.text.secondary }]}>Преподаватель: {consultation.teacherName}</Text>
                <Text style={[s.infoText, { color: colors.text.secondary }]}>Ауд. {consultation.room}, корпус {consultation.building}</Text>
                <Text style={[s.infoText, { color: colors.text.secondary }]}>
                  {consultation.studentNames.length > 0 ? consultation.studentNames.join(', ') : consultation.groupName || '-'}
                </Text>

                {consultation.status === 'scheduled' && (
                  <View style={s.actionsRow}>
                    <TouchableOpacity
                      style={[s.actionBtn, { borderColor: colors.status.warning }]}
                      onPress={() => navigation.navigate('ConsultationEdit', { consultationId: consultation.id, role: 'admin' })}
                    >
                      <Text style={[s.actionText, { color: colors.status.warning }]}>Редактировать</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.actionBtn, { borderColor: colors.status.error }]} onPress={() => handleCancel(consultation.id)}>
                      <Text style={[s.actionText, { color: colors.status.error }]}>Отменить</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          ) : (
            <View style={[s.emptyState, { marginTop: sp(40, 60, 80) }]}>
              <Ionicons name="calendar-outline" size={fs(40, 54, 70)} color={colors.text.tertiary} />
              <Text style={[s.emptyText, { color: colors.text.secondary, fontSize: fs(14, 17, 20) }]}>Нет консультаций</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1 },
  root: { flex: 1 },
  header: { gap: 12 },
  title: { fontWeight: '900' },
  filterRow: { flexDirection: 'row', paddingRight: 20 },
  filterChip: { borderRadius: 30, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  filterText: { fontWeight: '700' },
  card: { borderRadius: 24, borderWidth: 1, borderColor: '#f0f0f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  topic: { fontWeight: '800', flex: 1, marginRight: 10 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  statusText: { fontWeight: '700' },
  divider: { height: 1, width: '100%', marginVertical: 10 },
  infoText: { fontSize: 13, fontWeight: '500', marginBottom: 4 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  actionBtn: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  actionText: { fontSize: 14, fontWeight: '700' },
  emptyState: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontWeight: '800', marginTop: 8 },
});
