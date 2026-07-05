import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type BrandBarProps = {
  primaryColor: string;
  textColor: string;
  subtitleColor: string;
  compact?: boolean;
};

export const BrandBar = ({ primaryColor, textColor, subtitleColor, compact = false }: BrandBarProps) => {
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={[styles.mark, { borderColor: primaryColor + '35' }]}>
        <Text style={[styles.markText, { color: primaryColor }]}>ВГТУ</Text>
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: textColor }]}>EduPortal</Text>
        <Text style={[styles.subtitle, { color: subtitleColor }]}>Воронежский государственный технический университет</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wrapCompact: { gap: 8 },
  mark: {
    minWidth: 54,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  markText: { fontWeight: '900', fontSize: 12 },
  textWrap: { flexShrink: 1 },
  title: { fontWeight: '900', fontSize: 16, lineHeight: 18 },
  subtitle: { fontWeight: '600', fontSize: 10, lineHeight: 12 },
});
