import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../../core/auth/AuthContext';
import { AdminStackParamList } from '../../../core/navigation/types';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { Card } from '../../../shared/components/Card';
import { RoomBlock } from '../../../shared/types';
import { formatDateRangeRu, formatDateRu, toLocalIsoDate } from '../../../shared/utils/date';

const todayIso = () => toLocalIsoDate(new Date());

export const RoomsScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const { colors } = useTheme();
  const { rooms, removeRoomBlock } = useAuth();
  const { width, height } = useWindowDimensions();

  const shortSide = Math.min(width, height);
  const scale = useMemo(() => Math.max(0.65, Math.min(shortSide / 340, 1.35)), [shortSide]);
  const fs = (min: number, ideal: number, max: number) => Math.min(Math.max(Math.round(ideal * scale), min), max);
  const sp = (min: number, ideal: number, max: number) => Math.min(Math.max(Math.round(ideal * scale), min), max);

  const buildings = useMemo(() => [...new Set(rooms.map((room) => room.building))].sort(), [rooms]);
  const [selectedBuilding, setSelectedBuilding] = useState<string>(buildings[0] || '1');
  const [selectedRoomForQr, setSelectedRoomForQr] = useState<typeof rooms[0] | null>(null);

  const effectiveBuilding = buildings.includes(selectedBuilding) ? selectedBuilding : buildings[0];
  const filteredRooms = useMemo(
    () => rooms.filter((room) => room.building === effectiveBuilding),
    [rooms, effectiveBuilding]
  );

  const getQRCodeUrl = (room: typeof rooms[number]) => {
    const hostUri = Constants.expoConfig?.hostUri;
    const encodedBuilding = encodeURIComponent(room.building);

    if (hostUri) {
      return `exp://${hostUri}/--/room/${room.number}?building=${encodedBuilding}`;
    }

    const metroIp = '192.168.0.2';
    return `exp://${metroIp}:8081/--/room/${room.number}?building=${encodedBuilding}`;
  };

  const getWebUrl = (room: typeof rooms[number]) => {
    const encodedBuilding = encodeURIComponent(room.building);
    return `http://localhost:8081/--/room/${room.number}?building=${encodedBuilding}`;
  };

  const shareQR = async (room: typeof rooms[number]) => {
    const url = getQRCodeUrl(room);
    const webUrl = getWebUrl(room);

    try {
      await Share.share({
        message:
          `QR-код для аудитории ${room.number}\n` +
          `Ссылка для телефона (Expo Go): ${url}\n` +
          `Ссылка для браузера: ${webUrl}`,
        title: `QR-код ${room.number}`,
      });
    } catch {
      Alert.alert('Ошибка', 'Не удалось поделиться ссылкой');
    }
  };

  const roomStatus = (room: typeof rooms[number]) => {
    const nowDate = todayIso();
    const nowTime = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', hour12: false });
    const activeBlock = (room.blocks || []).some((block) => {
      if (block.type === 'repair' && block.startDate && block.endDate) {
        return nowDate >= block.startDate && nowDate <= block.endDate;
      }
      if (block.type === 'event' && block.date && block.startTime && block.endTime) {
        return block.date === nowDate && block.startTime <= nowTime && block.endTime > nowTime;
      }
      return false;
    });
    return activeBlock || room.underRepair ? 'blocked' : 'free';
  };

  const handleRemoveBlock = async (roomId: string, blockId: string) => {
    const result = await removeRoomBlock(roomId, blockId);
    if (!result.success) {
      Alert.alert('Ошибка', result.message || 'Не удалось удалить блокировку');
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.common.background }]}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: sp(20, 28, 36) }}>
        <View style={[styles.content, { paddingHorizontal: sp(14, 16, 20), paddingTop: sp(6, 10, 14) }]}>
          <Text style={[styles.title, { color: colors.text.primary, fontSize: fs(24, 30, 34) }]}>Аудитории</Text>

          <View style={[styles.buildingRow, { marginBottom: sp(14, 18, 22) }]}>
            {buildings.map((building) => (
              <TouchableOpacity
                key={building}
                style={[
                  styles.buildingChip,
                  {
                    borderColor: colors.common.border,
                    backgroundColor: effectiveBuilding === building ? colors.admin.primary : colors.common.white,
                    paddingHorizontal: sp(16, 20, 24),
                    paddingVertical: sp(8, 10, 12),
                  },
                ]}
                onPress={() => setSelectedBuilding(building)}
              >
                <Text
                  style={[
                    styles.buildingText,
                    { color: effectiveBuilding === building ? colors.common.white : colors.text.secondary, fontSize: fs(14, 16, 18) },
                  ]}
                >
                  Корпус {building}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {filteredRooms.map((room) => (
            <Card key={room.id}>
              <View style={styles.roomHeader}>
                <Text style={[styles.roomNumber, { color: colors.text.primary, fontSize: fs(18, 20, 24) }]}>Ауд. {room.number}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: roomStatus(room) === 'blocked' ? colors.status.errorLight : colors.status.successLight,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color: roomStatus(room) === 'blocked' ? colors.status.error : colors.status.success,
                        fontSize: fs(11, 12, 13),
                      },
                    ]}
                  >
                    {roomStatus(room) === 'blocked' ? 'Заблокирована' : 'Доступна'}
                  </Text>
                </View>
              </View>

              <View style={styles.roomDetails}>
                <Text style={[styles.roomInfo, { color: colors.text.secondary, fontSize: fs(13, 14, 16) }]}>Вместимость: {room.capacity} мест</Text>
                <Text style={[styles.roomInfo, { color: colors.text.secondary, fontSize: fs(13, 14, 16) }]}>Корпус: {room.building}</Text>
              </View>

              <View style={styles.blockList}>
                {(room.blocks || []).length === 0 ? (
                  <Text style={[styles.roomInfo, { color: colors.text.tertiary, fontSize: fs(12, 13, 14) }]}>Блокировок нет</Text>
                ) : (
                  (room.blocks || []).map((block: RoomBlock) => (
                    <View key={block.id} style={styles.blockItem}>
                      <Text style={[styles.blockText, { color: colors.text.secondary, fontSize: fs(12, 13, 15) }]}>
                        {block.type === 'repair'
                          ? `${block.title}: ${formatDateRangeRu(block.startDate, block.endDate)}`
                          : `${block.title}: ${formatDateRu(block.date)} ${block.startTime}-${block.endTime}`}
                      </Text>
                      <TouchableOpacity onPress={() => handleRemoveBlock(room.id, block.id)}>
                        <Ionicons name="trash-outline" size={18} color={colors.status.error} />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.admin.primary }]}
                onPress={() => navigation.navigate('RoomBlock', { roomId: room.id })}
              >
                <Text style={[styles.primaryButtonText, { color: colors.common.white, fontSize: fs(14, 16, 18) }]}>Заблокировать аудиторию</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.admin.primary }]}
                onPress={() => setSelectedRoomForQr(room)}
              >
                <Text style={[styles.primaryButtonText, { color: colors.common.white, fontSize: fs(14, 16, 18) }]}>Показать QR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: colors.admin.primary }]}
                onPress={() => shareQR(room)}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.admin.primary, fontSize: fs(13, 14, 16) }]}>Поделиться ссылкой</Text>
              </TouchableOpacity>
            </Card>
          ))}
        </View>
      </ScrollView>

      <Modal visible={!!selectedRoomForQr} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.common.background, borderColor: colors.common.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>QR-код для аудитории {selectedRoomForQr?.number}</Text>

            {selectedRoomForQr ? (
              <View style={styles.qrContainer}>
                <QRCode
                  value={getQRCodeUrl(selectedRoomForQr)}
                  size={240}
                  backgroundColor={colors.common.white}
                  color={colors.text.primary}
                />
              </View>
            ) : null}

            <Text style={[styles.sectionLabel, { color: colors.text.secondary, marginTop: 8 }]}>Ссылка для телефона (Expo Go):</Text>
            <Text style={[styles.qrLink, { color: colors.text.primary }]} selectable>
              {selectedRoomForQr ? getQRCodeUrl(selectedRoomForQr) : ''}
            </Text>

            <Text style={[styles.sectionLabel, { color: colors.text.secondary, marginTop: 12 }]}>Ссылка для браузера (компьютер):</Text>
            <Text style={[styles.webLink, { color: colors.text.primary }]} selectable>
              {selectedRoomForQr ? getWebUrl(selectedRoomForQr) : ''}
            </Text>

            <Text style={[styles.qrHint, { color: colors.text.tertiary, marginTop: 12 }]}>
              Отсканируйте QR-код камерой телефона для открытия в Expo Go
            </Text>
            <Text style={[styles.qrHint, { color: colors.text.tertiary }]}>
              Скопируйте веб-ссылку для открытия в браузере на компьютере
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.admin.primary }]}
                onPress={() => selectedRoomForQr && shareQR(selectedRoomForQr)}
              >
                <Text style={[styles.modalButtonText, { color: colors.common.white }]}>Поделиться</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.status.error }]}
                onPress={() => setSelectedRoomForQr(null)}
              >
                <Text style={[styles.modalButtonText, { color: colors.common.white }]}>Закрыть</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  content: { flex: 1 },
  title: { fontWeight: '900', marginBottom: 12 },
  buildingRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  buildingChip: { borderRadius: 30, borderWidth: 1 },
  buildingText: { fontWeight: '700' },
  roomHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  roomNumber: { fontWeight: '800' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontWeight: '700' },
  roomDetails: { marginBottom: 12 },
  roomInfo: { marginBottom: 2, fontWeight: '600' },
  blockList: { marginBottom: 10, gap: 6 },
  blockItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  blockText: { flex: 1, marginRight: 10, fontWeight: '600' },
  qrContainer: { marginVertical: 18, alignItems: 'center', justifyContent: 'center', borderRadius: 20, padding: 16 },
  primaryButton: { marginTop: 10, borderRadius: 18, paddingVertical: 14, alignItems: 'center' },
  primaryButtonText: { fontWeight: '800' },
  secondaryButton: { marginTop: 10, borderRadius: 18, paddingVertical: 12, alignItems: 'center', borderWidth: 1 },
  secondaryButtonText: { fontWeight: '700' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  modalContent: { width: '90%', borderRadius: 24, padding: 20, borderWidth: 1, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 16 },
  sectionLabel: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  qrLink: { fontSize: 12, textAlign: 'center', marginBottom: 4 },
  webLink: { fontSize: 12, textAlign: 'center', marginBottom: 4 },
  qrHint: { fontSize: 11, textAlign: 'center', marginBottom: 4 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalButton: { flex: 1, borderRadius: 18, paddingVertical: 12, alignItems: 'center' },
  modalButtonText: { fontSize: 16, fontWeight: '700' },
});
