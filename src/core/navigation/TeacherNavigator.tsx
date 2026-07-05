import React, { useMemo } from 'react';
import { useWindowDimensions, Platform, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ConsultationFormScreen } from '../../modules/teacher/screens/ConsultationFormScreen';
import { TeacherScheduleScreen } from '../../modules/teacher/screens/TeacherScheduleScreen';
import { ProfileScreen } from '../../modules/common/screens/ProfileScreen';
import { SettingsScreen } from '../../modules/common/screens/SettingsScreen';
import { ConsultationEditScreen } from '../../modules/common/screens/ConsultationEditScreen';
import { Colors } from '../../shared/constants/colors';
import { useTheme } from '../../shared/contexts/ThemeContext';
import { TeacherScheduleStackParamList, TeacherSettingsStackParamList } from './types';

const Tab = createBottomTabNavigator();
const ScheduleNativeStack = createNativeStackNavigator<TeacherScheduleStackParamList>();
const SettingsNativeStack = createNativeStackNavigator<TeacherSettingsStackParamList>();

const ScheduleStack = () => (
  <ScheduleNativeStack.Navigator screenOptions={{ headerShown: false }}>
    <ScheduleNativeStack.Screen name="TeacherScheduleMain" component={TeacherScheduleScreen} />
    <ScheduleNativeStack.Screen name="ConsultationForm" component={ConsultationFormScreen} />
    <ScheduleNativeStack.Screen name="ConsultationEdit" component={ConsultationEditScreen} />
    <ScheduleNativeStack.Screen name="Profile" component={ProfileScreen} />
  </ScheduleNativeStack.Navigator>
);

const SettingsStack = () => (
  <SettingsNativeStack.Navigator screenOptions={{ headerShown: false }}>
    <SettingsNativeStack.Screen name="TeacherSettingsMain" component={SettingsScreen} />
    <SettingsNativeStack.Screen name="Profile" component={ProfileScreen} />
  </SettingsNativeStack.Navigator>
);

export const TeacherNavigator = () => {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const shortSide = Math.min(width, height);
  const baseH = 340;
  const scale = useMemo(() => Math.max(0.65, Math.min(shortSide / baseH, 1.3)), [shortSide]);

  const fs = useMemo(
    () => (min: number, ideal: number, max: number) => Math.min(Math.max(Math.round(ideal * scale), min), max),
    [scale]
  );

  const sp = useMemo(
    () => (min: number, ideal: number, max: number) => Math.min(Math.max(Math.round(ideal * scale), min), max),
    [scale]
  );

  const isLandscape = width > height;
  const isNarrow = width < 285;
  const hasHomeIndicator = Platform.OS === 'ios' && insets.bottom > 0;
  const bottomSpace = hasHomeIndicator ? insets.bottom : sp(6, 10, 14);

  const tabHeight = (isNarrow ? sp(44, 50, 56) : sp(52, 62, 78)) + (isLandscape ? 0 : bottomSpace);
  const iconSize = isNarrow ? fs(18, 20, 24) : fs(18, 22, 26);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: Colors.teacher.primary,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarShowLabel: !isNarrow,
        tabBarLabelStyle: {
          fontSize: fs(7, 10, 12),
          fontWeight: '700',
          marginTop: isNarrow ? 0 : 2,
        },
        tabBarStyle: {
          height: tabHeight,
          backgroundColor: colors.common.white,
          borderTopWidth: 1,
          borderTopColor: colors.common.border + '30',
          paddingTop: isNarrow ? 0 : sp(4, 6, 8),
          paddingBottom: isLandscape ? 4 : bottomSpace,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
        },
        tabBarIcon: ({ focused, color }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'calendar';
          if (route.name === 'TeacherSchedule') iconName = focused ? 'calendar' : 'calendar-outline';
          else if (route.name === 'TeacherSettings') iconName = focused ? 'settings' : 'settings-outline';

          return (
            <View style={{ alignItems: 'center', justifyContent: 'center', height: iconSize + 10 }}>
              <Ionicons name={iconName} size={iconSize} color={color} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="TeacherSchedule" component={ScheduleStack} options={{ title: 'Расписание' }} />
      <Tab.Screen name="TeacherSettings" component={SettingsStack} options={{ title: 'Настройки' }} />
    </Tab.Navigator>
  );
};

