import React, { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export const Card = ({ children }: PropsWithChildren) => {
  const { colors } = useTheme();
  return <View style={[styles.card, { backgroundColor: colors.common.card, borderColor: colors.common.border }]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
});
