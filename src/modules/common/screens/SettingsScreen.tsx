import React from 'react';
import { ScrollView, StyleSheet, Switch, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from '../../../core/auth/AuthContext';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { useLanguage } from '../../../shared/contexts/LanguageContext';
import { Card } from '../../../shared/components/Card';

export const SettingsScreen = () => {
  const { colors, theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const { settings, updateSettings, user } = useAuth();
  const navigation = useNavigation<any>();

  const role = user?.role;
  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';
  const primaryColor = isTeacher ? colors.teacher.primary : isStudent ? colors.student.primary : colors.admin.primary;
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.common.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t('settings')}</Text>
        {isStudent && (
          <TouchableOpacity
            onPress={() => navigation.navigate('Profile')}
            style={[styles.profileButton, { borderColor: colors.common.border }]}
          >
            <Ionicons name="person" size={20} color={primaryColor} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card>
          <View style={styles.switchRow}>
            <View style={styles.switchLabelGroup}>
              <Ionicons name="moon-outline" size={20} color={primaryColor} />
              <Text style={[styles.label, { color: colors.text.primary, marginBottom: 0 }]}>{t('darkMode')}</Text>
            </View>
            <Switch
              value={theme === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: '#ddd', true: primaryColor + '50' }}
              thumbColor={theme === 'dark' ? primaryColor : '#f4f3f4'}
            />
          </View>
          <Text style={[styles.hint, { color: colors.text.tertiary }]}>
            {theme === 'light' ? 'Использовать светлое оформление' : 'Использовать тёмное оформление'}
          </Text>
        </Card>

        <Card>
          <View style={styles.switchRow}>
            <View style={styles.switchLabelGroup}>
              <Ionicons name="notifications-outline" size={20} color={primaryColor} />
              <Text style={[styles.label, { color: colors.text.primary, marginBottom: 0 }]}>{t('notifications')}</Text>
            </View>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={(value) => updateSettings({ notificationsEnabled: value })}
              trackColor={{ false: '#ddd', true: primaryColor + '50' }}
              thumbColor={settings.notificationsEnabled ? primaryColor : '#f4f3f4'}
            />
          </View>
          <Text style={[styles.hint, { color: colors.text.tertiary }]}>
            Уведомления о начале пар и консультациях
          </Text>
        </Card>

        <View style={styles.footer}>
          <Text style={[styles.version, { color: colors.text.tertiary }]}>EduPortal v{appVersion}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  profileButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 16, fontWeight: '700' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchLabelGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hint: { fontSize: 12, marginTop: 8, fontWeight: '500' },
  footer: { marginTop: 20, alignItems: 'center' },
  version: { fontSize: 12, fontWeight: '500' },
});
