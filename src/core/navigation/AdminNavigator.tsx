import { useMemo } from 'react';
import { useWindowDimensions, Platform, View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AdminDashboardScreen } from '../../modules/admin/screens/AdminDashboardScreen';
import { RoomsScreen } from '../../modules/admin/screens/RoomsScreen';
import { ScheduleSearchScreen } from '../../modules/admin/screens/ScheduleSearchScreen';
import { ConsultationsScreen } from '../../modules/admin/screens/ConsultationsScreen';
import { RoomBlockScreen } from '../../modules/admin/screens/RoomBlockScreen';
import { ConsultationFormScreen } from '../../modules/teacher/screens/ConsultationFormScreen';
import { SettingsScreen } from '../../modules/common/screens/SettingsScreen';
import { ConsultationEditScreen } from '../../modules/common/screens/ConsultationEditScreen';
import { useTheme } from '../../shared/contexts/ThemeContext';
import { AdminStackParamList } from './types';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<AdminStackParamList>();

const AdminTabs = () => {
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
  const iconSize = isNarrow ? fs(16, 18, 22) : fs(17, 20, 24);

  return (
    <Tab.Navigator
      screenOptions={({ route }: { route: any }) => ({
        tabBarIcon: ({ focused, color }: { focused: boolean; color: string }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'Dashboard') iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          else if (route.name === 'Rooms') iconName = focused ? 'business' : 'business-outline';
          else if (route.name === 'Consultations') iconName = focused ? 'calendar' : 'calendar-outline';
          else if (route.name === 'ScheduleSearch') iconName = focused ? 'search' : 'search-outline';
          else if (route.name === 'AdminSettings') iconName = focused ? 'settings' : 'settings-outline';

          return (
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                height: iconSize + (isNarrow ? 3 : 8),
              }}
            >
              <Ionicons name={iconName} size={iconSize} color={color} />
            </View>
          );
        },
        tabBarActiveTintColor: colors.admin.primary,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarShowLabel: !isNarrow,
        tabBarLabelStyle: {
          fontSize: fs(6, 8, 10),
          fontWeight: '700',
          marginTop: 1,
        },
        tabBarItemStyle: {
          paddingHorizontal: 1,
        },
        tabBarStyle: {
          height: tabHeight,
          backgroundColor: colors.common.white,
          borderTopWidth: 1,
          borderTopColor: colors.common.border + '30',
          paddingTop: isNarrow ? 0 : sp(4, 6, 8),
          paddingBottom: isLandscape ? 4 : bottomSpace,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 10,
        },
        tabBarHideOnKeyboard: true,
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={AdminDashboardScreen} options={{ title: 'Главная' }} />
      <Tab.Screen name="ScheduleSearch" component={ScheduleSearchScreen} options={{ title: 'Поиск' }} />
      <Tab.Screen name="Rooms" component={RoomsScreen} options={{ title: 'Аудитории' }} />
      <Tab.Screen
        name="Consultations"
        component={ConsultationsScreen}
        options={{
          tabBarLabel: ({ color }) => (
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={{ color, fontSize: fs(6, 8, 10), fontWeight: '700' }}
            >
              Консультации
            </Text>
          ),
          title: 'Консультации',
        }}
      />
      <Tab.Screen name="AdminSettings" component={SettingsScreen} options={{ title: 'Настройки' }} />
    </Tab.Navigator>
  );
};

export const AdminNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminTabs" component={AdminTabs} />
      <Stack.Screen name="ConsultationForm" component={ConsultationFormScreen} />
      <Stack.Screen name="ConsultationEdit" component={ConsultationEditScreen} />
      <Stack.Screen name="RoomBlock" component={RoomBlockScreen} />
    </Stack.Navigator>
  );
};
