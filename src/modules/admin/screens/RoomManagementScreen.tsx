import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput } from 'react-native';

import { useAuth } from '../../../core/auth/AuthContext';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { Card } from '../../../shared/components/Card';
import { Room } from '../../../shared/types';

export const RoomManagementScreen = () => {
  const { colors } = useTheme();
  const { rooms, setRooms } = useAuth();
  const [number, setNumber] = useState('');
  const [building, setBuilding] = useState('');
  const [capacity, setCapacity] = useState('20');

  const addRoom = () => {
    if (!number.trim() || !building.trim()) {
      return;
    }
    const room: Room = {
      id: Date.now().toString(),
      number: number.trim(),
      building: building.trim(),
      capacity: Number(capacity) || 20,
      hasProjector: false,
      hasComputers: false,
      underRepair: false,
    };
    setRooms((prev) => [...prev, room]);
    setNumber('');
    setBuilding('');
    setCapacity('20');
  };

  const toggleRepair = (id: string) => {
    setRooms((prev) => prev.map((room) => (room.id === id ? { ...room, underRepair: !room.underRepair } : room)));
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.common.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text.primary }]}>Управление аудиториями</Text>

      <Card>
        <Text style={[styles.label, { color: colors.text.primary }]}>Номер аудитории</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.common.white, borderColor: colors.common.border, color: colors.text.primary }]} value={number} onChangeText={setNumber} />
        <Text style={[styles.label, { color: colors.text.primary }]}>Корпус</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.common.white, borderColor: colors.common.border, color: colors.text.primary }]} value={building} onChangeText={setBuilding} />
        <Text style={[styles.label, { color: colors.text.primary }]}>Вместимость</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.common.white, borderColor: colors.common.border, color: colors.text.primary }]} value={capacity} onChangeText={setCapacity} keyboardType="numeric" />
        <Pressable style={[styles.button, { backgroundColor: colors.admin.primary }]} onPress={addRoom}>
          <Text style={styles.buttonText}>Добавить аудиторию</Text>
        </Pressable>
      </Card>

      {rooms.map((room) => (
        <Card key={room.id}>
          <Text style={[styles.roomTitle, { color: colors.text.primary }]}>Ауд. {room.number}, корпус {room.building}</Text>
          <Text style={[styles.meta, { color: colors.text.secondary }]}>Вместимость: {room.capacity}</Text>
          <Text style={[styles.meta, { color: colors.text.secondary }]}>Проектор: {room.hasProjector ? 'Да' : 'Нет'}</Text>
          <Text style={[styles.meta, { color: colors.text.secondary }]}>Компьютеры: {room.hasComputers ? 'Да' : 'Нет'}</Text>
          <Text style={[styles.meta, { color: colors.text.secondary }]}>На ремонте: {room.underRepair ? 'Да' : 'Нет'}</Text>
          <Switch value={room.underRepair} onValueChange={() => toggleRepair(room.id)} />
        </Card>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 16 },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
  },
  button: {
    marginTop: 16,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 14,
  },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  roomTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  meta: { fontSize: 14, marginBottom: 4 },
});
