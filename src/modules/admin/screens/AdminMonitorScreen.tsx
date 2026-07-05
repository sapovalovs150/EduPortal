import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from '../../../core/auth/AuthContext';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { Card } from '../../../shared/components/Card';
import { formatDateRu } from '../../../shared/utils/date';
import { Consultation, ConsultationDraft, ScheduleItem } from '../../../shared/types';

export const AdminMonitorScreen = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { consultations, rooms, schedule, setConsultations, setSchedule, getConsultationConflicts } = useAuth();
  const [groupFilter, setGroupFilter] = useState('ИТ-201');
  const [teacherEdits, setTeacherEdits] = useState<Record<string, string>>({});
  const [roomEdits, setRoomEdits] = useState<Record<string, string>>({});

  const activeConsultations = consultations.filter((c) => c.status === 'scheduled');
  const freeRooms = rooms.filter((r) => !r.underRepair && !schedule.some((s) => s.room === r.number)).length;
  const filteredGroupSchedule = schedule.filter((item) =>
    item.groupName.toLowerCase().includes(groupFilter.trim().toLowerCase())
  );

  const conflicts = useMemo(() => {
    return activeConsultations
      .map((consultation) => {
        const draft: ConsultationDraft = {
          teacherName: consultation.teacherName,
          studentNames: consultation.studentNames,
          groupName: consultation.groupName,
          date: consultation.date,
          startTime: consultation.startTime,
          endTime: consultation.endTime,
          room: consultation.room,
          building: consultation.building,
        };
        const issues = getConsultationConflicts(draft, consultation.id);
        return { consultation, issues };
      })
      .filter((entry) => entry.issues.length > 0);
  }, [activeConsultations, getConsultationConflicts]);

  const cancelConsultation = (id: string) => {
    setConsultations((prev: Consultation[]) => prev.map((c) => (c.id === id ? { ...c, status: 'cancelled' as const } : c)));
  };

  const updateScheduleEntry = (id: string) => {
    setSchedule((prev: ScheduleItem[]) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              teacherName: teacherEdits[id]?.trim() || item.teacherName,
              room: roomEdits[id]?.trim() || item.room,
            }
          : item
      )
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.common.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text.primary }]}>Дашборд</Text>
      <View style={styles.row}>
        <Card>
          <Text style={[styles.metric, { color: colors.admin.primary }]}>{activeConsultations.length}</Text>
          <Text style={[styles.metricLabel, { color: colors.text.secondary }]}>Консультаций</Text>
        </Card>
        <Card>
          <Text style={[styles.metric, { color: colors.admin.primary }]}>{conflicts.length}</Text>
          <Text style={[styles.metricLabel, { color: colors.text.secondary }]}>Конфликтов</Text>
        </Card>
        <Card>
          <Text style={[styles.metric, { color: colors.admin.primary }]}>{freeRooms}</Text>
          <Text style={[styles.metricLabel, { color: colors.text.secondary }]}>Своб. аудиторий</Text>
        </Card>
      </View>

      <Pressable style={[styles.addButton, { backgroundColor: colors.admin.primary }]} onPress={() => navigation.navigate('ConsultationForm' as never)}>
        <Text style={styles.addButtonText}>Назначить консультацию</Text>
      </Pressable>

      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Конфликты</Text>
      {conflicts.map(({ consultation, issues }) => (
        <Card key={consultation.id}>
          <Text style={[styles.itemTitle, { color: colors.text.primary }]}>
            {formatDateRu(consultation.date)} {consultation.startTime}-{consultation.endTime}
          </Text>
          <Text style={[styles.itemMeta, { color: colors.text.secondary }]}>Преподаватель: {consultation.teacherName}</Text>
          <Text style={[styles.itemMeta, { color: colors.text.secondary }]}>Аудитория: {consultation.room}</Text>
          {issues.map((issue: string, index: number) => (
            <Text key={`${consultation.id}-${index}`} style={[styles.conflictText, { color: colors.status.error }]}>
              - {issue}
            </Text>
          ))}
          <Pressable style={[styles.resolveButton, { backgroundColor: colors.status.warning }]} onPress={() => cancelConsultation(consultation.id)}>
            <Text style={styles.resolveText}>Решить (отменить)</Text>
          </Pressable>
        </Card>
      ))}
      {!conflicts.length && <Text style={[styles.empty, { color: colors.text.secondary }]}>Конфликтов не найдено.</Text>}

      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Все консультации</Text>
      {consultations.map((item) => (
        <Card key={item.id}>
          <Text style={[styles.itemTitle, { color: colors.text.primary }]}>{item.topic}</Text>
          <Text style={[styles.itemMeta, { color: colors.text.secondary }]}>
            {formatDateRu(item.date)} {item.startTime}-{item.endTime}
          </Text>
          <Text style={[styles.itemMeta, { color: colors.text.secondary }]}>Преподаватель: {item.teacherName}</Text>
          <Text style={[styles.itemMeta, { color: colors.text.secondary }]}>Статус: {item.status}</Text>
        </Card>
      ))}
      {!consultations.length && <Text style={[styles.empty, { color: colors.text.secondary }]}>Пока нет консультаций.</Text>}

      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Расписание группы</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.common.white, borderColor: colors.common.border, color: colors.text.primary }]}
        value={groupFilter}
        onChangeText={setGroupFilter}
        placeholder="Введите группу"
        placeholderTextColor={colors.text.tertiary}
      />
      {filteredGroupSchedule.map((item) => (
        <Card key={`schedule-${item.id}`}>
          <Text style={[styles.itemTitle, { color: colors.text.primary }]}>
            {formatDateRu(item.date)} {item.startTime}-{item.endTime}
          </Text>
          <Text style={[styles.itemMeta, { color: colors.text.secondary }]}>Предмет: {item.subject}</Text>
          <Text style={[styles.itemMeta, { color: colors.text.secondary }]}>Группа: {item.groupName}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.common.white, borderColor: colors.common.border, color: colors.text.primary }]}
            value={teacherEdits[item.id] ?? item.teacherName}
            onChangeText={(value) => setTeacherEdits((prev) => ({ ...prev, [item.id]: value }))}
            placeholder="Преподаватель"
            placeholderTextColor={colors.text.tertiary}
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.common.white, borderColor: colors.common.border, color: colors.text.primary }]}
            value={roomEdits[item.id] ?? item.room}
            onChangeText={(value) => setRoomEdits((prev) => ({ ...prev, [item.id]: value }))}
            placeholder="Аудитория"
            placeholderTextColor={colors.text.tertiary}
          />
          <Pressable style={[styles.resolveButton, { backgroundColor: colors.status.warning }]} onPress={() => updateScheduleEntry(item.id)}>
            <Text style={styles.resolveText}>Сохранить изменения</Text>
          </Pressable>
        </Card>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  metric: { fontSize: 20, fontWeight: '700' },
  metricLabel: { marginTop: 4 },
  addButton: { borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginVertical: 14 },
  addButtonText: { color: '#FFFFFF', fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10, marginTop: 4 },
  itemTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  itemMeta: { marginBottom: 2 },
  conflictText: { marginTop: 2 },
  resolveButton: { marginTop: 8, borderRadius: 8, alignItems: 'center', paddingVertical: 8 },
  resolveText: { color: '#FFFFFF', fontWeight: '600' },
  empty: { marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
});
