import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

type UniversityLogoProps = {
  size?: number;
};

export const UniversityLogo = ({ size = 30 }: UniversityLogoProps) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Image
        source={
          theme === 'dark'
            ? require('../../../assets/VSTU-logo-white.png')
            : require('../../../assets/VSTU-logo-cropped.png')
        }
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
