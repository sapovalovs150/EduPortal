import React from 'react';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { Colors } from '../constants/colors';

export const ProfileHeaderButton = () => {
  const navigation = useNavigation();
  return (
    <Pressable onPress={() => navigation.navigate('Profile' as never)} hitSlop={10}>
      <Ionicons name="person-circle-outline" size={24} color={Colors.common.white} />
    </Pressable>
  );
};
