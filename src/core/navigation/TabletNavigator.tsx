import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RoomDisplayScreen } from '../../modules/tablet/screens/RoomDisplayScreen';
import { TabletBookingScreen } from '../../modules/tablet/screens/TabletBookingScreen';

const Stack = createNativeStackNavigator();

export const TabletNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RoomDisplay" component={RoomDisplayScreen} />
      <Stack.Screen name="TabletBooking" component={TabletBookingScreen} />
    </Stack.Navigator>
  );
};
