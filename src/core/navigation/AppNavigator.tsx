import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import { useAuth } from '../auth/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { StudentNavigator } from './StudentNavigator';
import { TeacherNavigator } from './TeacherNavigator';
import { AdminNavigator } from './AdminNavigator';
import { RoomDisplayScreen } from '../../modules/tablet/screens/RoomDisplayScreen';
import { TabletBookingScreen } from '../../modules/tablet/screens/TabletBookingScreen';

const Stack = createNativeStackNavigator();

const parseRoomUrl = (url: string) => {
  const parsed = Linking.parse(url);
  const path = [parsed.hostname, parsed.path]
    .filter(Boolean)
    .join('/')
    .replace(/^--\//, '');
  const match = path.match(/(?:^|\/)room\/([^/?#]+)/);
  const building = typeof parsed.queryParams?.building === 'string' ? parsed.queryParams.building : '';
  if (!match || !building) return null;
  return {
    roomNumber: decodeURIComponent(match[1]),
    building,
  };
};

export const AppNavigator = () => {
  const { user } = useAuth();
  const [initialRoute, setInitialRoute] = useState<string | null>(null);
  const [roomParams, setRoomParams] = useState<{ roomNumber: string; building: string } | null>(null);
  const [isTabletMode, setIsTabletMode] = useState(false);

  useEffect(() => {
    const checkInitialUrl = async () => {
      const url = await Linking.getInitialURL();
      if (url) {
        const params = parseRoomUrl(url);
        if (params) {
          setRoomParams(params);
          setIsTabletMode(true);
          setInitialRoute('RoomDisplay');
          return;
        }
      }

      setInitialRoute(user ? (user.role === 'student' ? 'Student' : user.role === 'teacher' ? 'Teacher' : 'Admin') : 'Auth');
    };

    checkInitialUrl();

    const subscription = Linking.addEventListener('url', (event) => {
      const params = parseRoomUrl(event.url);
      if (!params) return;
      setRoomParams(params);
      setIsTabletMode(true);
      setInitialRoute('RoomDisplay');
    });

    return () => subscription.remove();
  }, [user]);

  if (initialRoute === null) {
    return null;
  }

  if (isTabletMode && initialRoute === 'RoomDisplay' && roomParams) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="RoomDisplay" component={RoomDisplayScreen} initialParams={roomParams} />
        <Stack.Screen
          name="TabletBooking"
          component={TabletBookingScreen}
          options={{ title: 'Бронирование аудитории', headerShown: false }}
        />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : user.role === 'student' ? (
        <Stack.Screen name="Student" component={StudentNavigator} />
      ) : user.role === 'teacher' ? (
        <Stack.Screen name="Teacher" component={TeacherNavigator} />
      ) : (
        <Stack.Screen name="Admin" component={AdminNavigator} />
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
