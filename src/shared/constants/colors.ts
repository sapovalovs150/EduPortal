// src/shared/constants/colors.ts
export const LightColors = {
  common: {
    white: '#FFFFFF',
    background: '#F7F4FF',
    border: '#E6DEFF',
    card: '#FFFFFF',
  },
  text: {
    primary: '#211F3D',
    secondary: '#6D6998',
    tertiary: '#9A91C4',
    inverse: '#FFFFFF',
  },
  student: {
    primary: '#6D5DFB',
    primaryLight: '#EEF0FF',
    primaryDark: '#4F46E5',
    secondary: '#F4F3FF',
    headerBg: '#6D5DFB',
    headerText: '#FFFFFF',
  },
  teacher: {
    primary: '#F472B6',
    primaryLight: '#FFF0F7',
    primaryDark: '#C0265D',
    secondary: '#FDF2F8',
    headerBg: '#F472B6',
    headerText: '#FFFFFF',
  },
  admin: {
    primary: '#FB7185',
    primaryLight: '#FFF1F3',
    primaryDark: '#BE185D',
    secondary: '#FFF3F5',
    headerBg: '#FB7185',
    headerText: '#FFFFFF',
  },
  status: {
    success: '#34D399',
    successLight: '#ECFDF5',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    error: '#EF4444',
    errorLight: '#FEE2E2',
    info: '#38BDF8',
    infoLight: '#DBEAFE',
  },
};

export const DarkColors = {
  common: {
    white: '#1F1738',
    background: '#110D23',
    border: '#3A2E63',
    card: '#20183E',
  },
  text: {
    primary: '#F3EEFF',
    secondary: '#D6CDF7',
    tertiary: '#B9ABDB',
    inverse: '#0F1027',
  },
  student: {
    primary: '#A78BFA',
    primaryLight: '#2D1A76',
    primaryDark: '#7C3AED',
    secondary: '#312A54',
    headerBg: '#3D2F6B',
    headerText: '#F3EEFF',
  },
  teacher: {
    primary: '#FB7185',
    primaryLight: '#5B2E46',
    primaryDark: '#BE185D',
    secondary: '#3C2031',
    headerBg: '#5B2E46',
    headerText: '#F3EEFF',
  },
  admin: {
    primary: '#F472B6',
    primaryLight: '#62324B',
    primaryDark: '#C0267A',
    secondary: '#42243A',
    headerBg: '#62324B',
    headerText: '#F3EEFF',
  },
  status: {
    success: '#4ADE80',
    successLight: '#064E3B',
    warning: '#FBBF24',
    warningLight: '#78350F',
    error: '#F87171',
    errorLight: '#581C1C',
    info: '#60A5FA',
    infoLight: '#1E3A8A',
  },
};

export const Colors = LightColors;

export const getColors = (theme: 'light' | 'dark') => {
  return theme === 'light' ? LightColors : DarkColors;
};