import React, { useMemo } from 'react';
import { useWindowDimensions, Platform, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ScheduleScreen } from '../../modules/student/screens/ScheduleScreen';
import { SettingsScreen } from '../../modules/common/screens/SettingsScreen';
import { ProfileScreen } from '../../modules/common/screens/ProfileScreen';
import { Colors } from '../../shared/constants/colors';
import { useTheme } from '../../shared/contexts/ThemeContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const ScheduleStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="StudentScheduleMain" component={ScheduleScreen} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
  </Stack.Navigator>
);

const SettingsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="StudentSettingsMain" component={SettingsScreen} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
  </Stack.Navigator>
);

export const StudentNavigator = () => {
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
        tabBarActiveTintColor: Colors.student.primary,
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
          if (route.name === 'StudentSchedule') iconName = focused ? 'calendar' : 'calendar-outline';
          else if (route.name === 'StudentSettings') iconName = focused ? 'settings' : 'settings-outline';

          return (
            <View style={{ alignItems: 'center', justifyContent: 'center', height: iconSize + 10 }}>
              <Ionicons name={iconName} size={iconSize} color={color} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="StudentSchedule" component={ScheduleStack} options={{ title: 'Расписание' }} />
      <Tab.Screen name="StudentSettings" component={SettingsStack} options={{ title: 'Настройки' }} />
    </Tab.Navigator>
  );
};

