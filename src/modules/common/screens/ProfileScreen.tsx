import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from '../../../core/auth/AuthContext';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { Card } from '../../../shared/components/Card';

export const ProfileScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { user, updateProfile, signOut } = useAuth();

  const [name, setName] = useState(user?.name ?? '');
  const [groupName, setGroupName] = useState(user?.groupName ?? '');
  const [department, setDepartment] = useState(user?.department ?? '');

  const roleLabel =
    user?.role === 'student'
      ? 'Студент'
      : user?.role === 'admin'
        ? 'Администратор'
        : 'Преподаватель';

  const save = async () => {
    try {
      await updateProfile({ name, groupName, department });
      Alert.alert('Сохранено', 'Профиль обновлен');
    } catch {
      Alert.alert('Ошибка', 'Не удалось обновить профиль');
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.common.background }]}>
      <View style={styles.customHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { borderColor: colors.common.border }]}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Настройки профиля</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.pageTitle, { color: colors.text.primary }]}>Профиль</Text>

        <Card>
          <View style={styles.cardHeader}>
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.admin.primary + '15' }]}>
              <Ionicons name="person" size={40} color={colors.admin.primary} />
            </View>
            <View style={styles.accountInfo}>
              <Text style={[styles.title, { color: colors.text.primary }]}>Аккаунт</Text>
              <Text style={[styles.meta, { color: colors.text.secondary }]}>Роль: {roleLabel}</Text>
              {Boolean(user?.login) && <Text style={[styles.meta, { color: colors.text.secondary }]}>ID: {user?.login}</Text>}
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={[styles.label, { color: colors.text.primary }]}>Имя</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.common.white, borderColor: colors.common.border, color: colors.text.primary }]}
            value={name}
            onChangeText={setName}
            placeholder="Введите ваше имя"
            placeholderTextColor={colors.text.tertiary}
          />

          {user?.role === 'student' && (
            <View>
              <Text style={[styles.label, { color: colors.text.primary }]}>Группа</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.common.white, borderColor: colors.common.border, color: colors.text.primary }]}
                value={groupName}
                onChangeText={setGroupName}
                placeholder="Например, БПИ-21"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>
          )}

          {user?.role === 'teacher' && (
            <View>
              <Text style={[styles.label, { color: colors.text.primary }]}>Кафедра</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.common.white, borderColor: colors.common.border, color: colors.text.primary }]}
                value={department}
                onChangeText={setDepartment}
                placeholder="Название кафедры"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>
          )}

          <Pressable style={[styles.primaryButton, { backgroundColor: colors.admin.primary }]} onPress={save}>
            <Text style={styles.primaryText}>Сохранить изменения</Text>
          </Pressable>

          <Pressable style={[styles.dangerButton, { backgroundColor: colors.status.error + '15' }]} onPress={signOut}>
            <Text style={[styles.dangerText, { color: colors.status.error }]}>Выйти из аккаунта</Text>
          </Pressable>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  customHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backButton: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  pageTitle: { fontSize: 32, fontWeight: '800', marginBottom: 24 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  accountInfo: { flex: 1 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  meta: { fontSize: 14, fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 8 },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 8, marginTop: 16, textTransform: 'uppercase' },
  input: { borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  primaryButton: { borderRadius: 18, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  dangerButton: { borderRadius: 18, paddingVertical: 16, alignItems: 'center', marginTop: 12 },
  primaryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  dangerText: { fontWeight: '700', fontSize: 16 },
});
