import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SuggestedSlot } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { formatDateRu } from '../utils/date';

interface ConsultationSlotCardProps {
  slot: SuggestedSlot;
  onSelect: (slot: SuggestedSlot) => void;
}

export const ConsultationSlotCard: React.FC<ConsultationSlotCardProps> = ({ slot, onSelect }) => {
  const { colors } = useTheme();

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return colors.status.success;
    if (confidence >= 60) return colors.status.warning;
    return colors.status.error;
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 80) return 'Отличный вариант';
    if (confidence >= 60) return 'Хороший вариант';
    return 'Возможны конфликты';
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.common.white, borderColor: colors.common.border }]}
      onPress={() => onSelect(slot)}
    >
      <View style={styles.header}>
        <View style={[styles.confidenceBadge, { backgroundColor: getConfidenceColor(slot.confidence) + '20' }]}>
          <Text style={[styles.confidenceText, { color: getConfidenceColor(slot.confidence) }]}>
            {getConfidenceText(slot.confidence)}
          </Text>
        </View>
        <View style={[styles.rankBadge, { backgroundColor: colors.teacher.primary }]}>
          <Text style={styles.rankText}>#{slot.id}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="calendar-outline" size={18} color={colors.text.secondary} />
        <Text style={[styles.infoText, { color: colors.text.primary }]}>
          {formatDateRu(slot.date)} {slot.startTime}-{slot.endTime}
        </Text>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="business-outline" size={18} color={colors.text.secondary} />
        <Text style={[styles.infoText, { color: colors.text.primary }]}>
          Корпус {slot.building}, ауд. {slot.room}
        </Text>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="information-circle-outline" size={18} color={colors.text.secondary} />
        <Text style={[styles.reasonText, { color: colors.text.tertiary }]}>{slot.reason}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  reasonText: {
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
  },
});
