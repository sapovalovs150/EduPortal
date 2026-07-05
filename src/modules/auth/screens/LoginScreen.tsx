import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  useWindowDimensions,
  Platform,
  SafeAreaView,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

import { useAuth } from '../../../core/auth/AuthContext';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { SuggestionInput } from '../../../shared/components/SuggestionInput';
import { UniversityLogo } from '../../../shared/components/UniversityLogo';
import { UserRole } from '../../../shared/types';

type LoginRouteParams = {
  params?: {
    redirectRoom?: {
      roomNumber: string;
      building: string;
    };
  };
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const LoginScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<LoginRouteParams, 'params'>>();
  const { signIn, groups } = useAuth();
  const { width, height } = useWindowDimensions();

  const [role, setRole] = useState<UserRole>('student');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [groupName, setGroupName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const shortSide = Math.min(width, height);
  const scale = clamp(shortSide / 390, 0.58, 1.22);
  const fs = (min: number, ideal: number, max: number) => clamp(Math.round(ideal * scale), min, max);
  const sp = (min: number, ideal: number, max: number) => clamp(Math.round(ideal * scale), min, max);

  const isUltraCompact = height <= 360 || width <= 260;
  const isCompact = !isUltraCompact && (height <= 520 || width <= 360);
  const isShort = height <= 620;
  const isWide = width >= 1160 && height >= 560;
  const isMedium = !isWide && width >= 720;

  const panelMaxWidth = isWide ? 1180 : isMedium ? 760 : 560;
  const formMaxWidth = isWide ? 560 : panelMaxWidth;
  const activeColor =
    role === 'student' ? colors.student.primary : role === 'teacher' ? colors.teacher.primary : colors.admin.primary;
  const groupSuggestions = useMemo(() => groups.map((g: any) => g.name), [groups]);

  const outerPaddingX = isUltraCompact ? 8 : isCompact ? 12 : sp(16, 24, 32);
  const outerPaddingY = isUltraCompact ? 4 : isCompact ? 12 : isShort ? 16 : sp(20, 28, 36);
  const panelGap = isWide ? sp(24, 40, 56) : isUltraCompact ? 6 : isCompact ? 10 : sp(14, 20, 26);
  const formGap = isUltraCompact ? 6 : isCompact ? 10 : sp(12, 16, 20);
  const cardPadding = isUltraCompact ? 10 : isCompact ? 16 : sp(18, 24, 30);
  const inputHeight = isUltraCompact ? 36 : isCompact ? 48 : sp(50, 56, 62);
  const buttonHeight = isUltraCompact ? 40 : isCompact ? 50 : sp(52, 58, 64);
  const tabsHeight = isUltraCompact ? 36 : isCompact ? 46 : sp(48, 54, 60);
  const logoSize = isWide
    ? clamp(Math.round(height * 0.19), 112, 152)
    : isUltraCompact
      ? 32
      : isCompact
        ? 52
        : isMedium
          ? 68
          : 76;
  const logoShellSize = logoSize + (isUltraCompact ? 10 : isCompact ? 14 : 18);

  const titleSize = isWide ? fs(34, 42, 54) : isUltraCompact ? 24 : isCompact ? 34 : fs(38, 46, 54);
  const subtitleSize = isUltraCompact ? 11 : isCompact ? 12 : fs(13, 16, 18);
  const labelSize = isUltraCompact ? 10 : 12;
  const bodySize = isUltraCompact ? 14 : isCompact ? 16 : 18;
  const hintSize = isUltraCompact ? 0 : isCompact ? 10 : 12;

  const showBrandDescription = isWide;
  const showSubtitle = !isUltraCompact;
  const showHint = !isUltraCompact;
  const compactSuggestion = isUltraCompact || isCompact;

  const handleEnter = async () => {
    if (role === 'student' && !groupName.trim()) {
      Alert.alert('Ошибка', 'Укажите группу');
      return;
    }

    if ((role === 'teacher' || role === 'admin') && (!login.trim() || !password.trim())) {
      Alert.alert('Ошибка', 'Введите логин и пароль');
      return;
    }

    setIsSigningIn(true);
    try {
      const result = await signIn({
        role,
        isGuest: role === 'student',
        name: role === 'student' ? 'Студент' : 'Пользователь',
        login: login.trim() || undefined,
        password: password.trim() || undefined,
        groupName: role === 'student' ? groupName.trim() : undefined,
      });

      if (!result.success) {
        Alert.alert('Ошибка входа', result.message ?? 'Не удалось войти');
        return;
      }

      if (route.params?.redirectRoom && navigation.canGoBack()) {
        navigation.goBack();
        return;
      }

      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch {
      Alert.alert('Ошибка', 'Произошла ошибка при входе');
    } finally {
      setIsSigningIn(false);
    }
  };

  const roleTabs = [
    { value: 'student' as const, label: isUltraCompact ? 'Студ.' : 'Студент' },
    { value: 'teacher' as const, label: isUltraCompact ? 'Препод.' : 'Преподаватель' },
    { value: 'admin' as const, label: 'Админ' },
  ];

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.common.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.safe}>
        <View
          style={[
            s.root,
            {
              paddingHorizontal: outerPaddingX,
              paddingVertical: outerPaddingY,
            },
          ]}
        >
          <View
            style={[
              s.panel,
              {
                width: '100%',
                maxWidth: panelMaxWidth,
                flexDirection: isWide ? 'row' : 'column',
                gap: panelGap,
                alignItems: isWide ? 'stretch' : 'center',
              },
            ]}
          >
            <View
              style={[
                s.brandColumn,
                isWide
                  ? {
                      flex: 1,
                      justifyContent: 'center',
                      alignItems: 'flex-start',
                    }
                  : {
                      width: '100%',
                      alignItems: 'center',
                    },
              ]}
            >
              <View
                style={[
                  s.logoShell,
                  {
                    width: logoShellSize,
                    height: logoShellSize,
                    borderRadius: clamp(Math.round(logoShellSize * 0.22), 12, 28),
                    marginBottom: isUltraCompact ? 6 : isCompact ? 8 : 12,
                    backgroundColor: activeColor + '10',
                  },
                ]}
              >
                <UniversityLogo size={logoSize} />
              </View>

              <Text
                style={[
                  s.title,
                  {
                    color: colors.text.primary,
                    fontSize: titleSize,
                    textAlign: isWide ? 'left' : 'center',
                    marginBottom: isUltraCompact ? 2 : 4,
                  },
                ]}
              >
                EduPortal
              </Text>

              {showSubtitle && (
                <Text
                  style={[
                    s.subtitle,
                    {
                      color: colors.text.secondary,
                      fontSize: subtitleSize,
                      textAlign: isWide ? 'left' : 'center',
                    },
                  ]}
                >
                  Учебный портал
                </Text>
              )}

              {showBrandDescription && (
                <Text
                  style={[
                    s.brandDescription,
                    {
                      color: colors.text.secondary,
                      fontSize: fs(18, 22, 26),
                      marginTop: 28,
                      maxWidth: 420,
                    },
                  ]}
                >
                  Вход в систему расписания, консультаций и бронирования аудиторий ВГТУ.
                </Text>
              )}
            </View>

            <View
              style={[
                s.formColumn,
                {
                  width: '100%',
                  maxWidth: formMaxWidth,
                  gap: formGap,
                },
              ]}
            >
              <View
                style={[
                  s.roles,
                  {
                    height: tabsHeight,
                    padding: 3,
                    borderRadius: Math.round(tabsHeight / 2),
                    backgroundColor: colors.common.border + '22',
                  },
                ]}
              >
                {roleTabs.map((item) => {
                  const active = role === item.value;
                  return (
                    <TouchableOpacity
                      key={item.value}
                      onPress={() => setRole(item.value)}
                      style={[
                        s.roleTab,
                        {
                          borderRadius: Math.round((tabsHeight - 6) / 2),
                        },
                        active && [
                          s.roleTabActive,
                          {
                            backgroundColor: colors.common.white,
                          },
                        ],
                      ]}
                    >
                      <Text
                        style={[
                          s.roleTabText,
                          {
                            fontSize: isUltraCompact ? 11 : isCompact ? 13 : 15,
                            color: active ? activeColor : colors.text.secondary,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View
                style={[
                  s.card,
                  {
                    backgroundColor: colors.common.white,
                    borderRadius: isUltraCompact ? 18 : 24,
                    padding: cardPadding,
                  },
                ]}
              >
                {role === 'student' ? (
                  <View>
                    <Text
                      style={[
                        s.label,
                        {
                          color: colors.text.secondary,
                          fontSize: labelSize,
                          marginBottom: compactSuggestion ? 6 : 8,
                        },
                      ]}
                    >
                      ВАША ГРУППА
                    </Text>
                    <SuggestionInput
                      placeholder="ИТ-201"
                      value={groupName}
                      onChangeText={setGroupName}
                      suggestions={groupSuggestions}
                      showAllOnFocus
                      compact={compactSuggestion}
                      onSelect={(value) => setGroupName(value)}
                      icon={isUltraCompact ? undefined : 'people'}
                      error={groupName && !groupSuggestions.includes(groupName) ? 'Группа не найдена' : undefined}
                    />
                  </View>
                ) : (
                  <View style={{ width: '100%' }}>
                    <View style={{ marginBottom: isUltraCompact ? 10 : 14 }}>
                      <Text
                        style={[
                          s.label,
                          {
                            color: colors.text.secondary,
                            fontSize: labelSize,
                            marginBottom: 8,
                          },
                        ]}
                      >
                        ЛОГИН
                      </Text>
                      <View
                        style={[
                          s.inputWrap,
                          {
                            minHeight: inputHeight,
                            borderRadius: isUltraCompact ? 16 : 20,
                            borderColor: colors.common.border,
                            backgroundColor: colors.common.background,
                            paddingHorizontal: isUltraCompact ? 12 : 16,
                          },
                        ]}
                      >
                        {!isUltraCompact && (
                          <Ionicons
                            name="person-outline"
                            size={isCompact ? 20 : 22}
                            color={colors.text.tertiary}
                            style={{ marginRight: 10 }}
                          />
                        )}
                        <TextInput
                          style={[
                            s.input,
                            {
                              color: colors.text.primary,
                              fontSize: bodySize,
                            },
                          ]}
                          placeholder="Логин"
                          placeholderTextColor={colors.text.tertiary}
                          value={login}
                          onChangeText={setLogin}
                          autoCapitalize="none"
                          underlineColorAndroid="transparent"
                        />
                      </View>
                    </View>

                    <View>
                      <Text
                        style={[
                          s.label,
                          {
                            color: colors.text.secondary,
                            fontSize: labelSize,
                            marginBottom: 8,
                          },
                        ]}
                      >
                        ПАРОЛЬ
                      </Text>
                      <View
                        style={[
                          s.inputWrap,
                          {
                            minHeight: inputHeight,
                            borderRadius: isUltraCompact ? 16 : 20,
                            borderColor: colors.common.border,
                            backgroundColor: colors.common.background,
                            paddingHorizontal: isUltraCompact ? 12 : 16,
                          },
                        ]}
                      >
                        {!isUltraCompact && (
                          <Ionicons
                            name="lock-closed-outline"
                            size={isCompact ? 20 : 22}
                            color={colors.text.tertiary}
                            style={{ marginRight: 10 }}
                          />
                        )}
                        <TextInput
                          style={[
                            s.input,
                            {
                              color: colors.text.primary,
                              fontSize: bodySize,
                            },
                          ]}
                          placeholder="Пароль"
                          placeholderTextColor={colors.text.tertiary}
                          value={password}
                          onChangeText={setPassword}
                          secureTextEntry={!showPassword}
                          autoCapitalize="none"
                          textContentType="password"
                          underlineColorAndroid="transparent"
                        />
                        <TouchableOpacity
                          onPress={() => setShowPassword((prev) => !prev)}
                          style={s.eyeBtn}
                          hitSlop={8}
                        >
                          <Ionicons
                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                            size={isCompact ? 21 : 23}
                            color={colors.text.secondary}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[
                  s.button,
                  {
                    minHeight: buttonHeight,
                    borderRadius: isUltraCompact ? 18 : 22,
                    backgroundColor: activeColor,
                    opacity: isSigningIn ? 0.72 : 1,
                  },
                ]}
                onPress={handleEnter}
                disabled={isSigningIn}
              >
                {isSigningIn ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={[s.buttonText, { fontSize: isUltraCompact ? 17 : isCompact ? 18 : 20 }]}>Войти</Text>
                    <Ionicons name="arrow-forward" size={isUltraCompact ? 22 : 26} color="#fff" style={{ marginLeft: 10 }} />
                  </>
                )}
              </TouchableOpacity>

              {showHint && (
                <Text
                  style={[
                    s.hint,
                    {
                      color: colors.text.tertiary,
                      fontSize: hintSize,
                    },
                  ]}
                  numberOfLines={1}
                >
                  petrova / sidorov / admin (123456)
                </Text>
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1 },
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    alignSelf: 'center',
  },
  brandColumn: {
    flexShrink: 1,
  },
  formColumn: {
    alignSelf: 'center',
  },
  logoShell: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontWeight: '900',
    letterSpacing: -1.2,
  },
  subtitle: {
    fontWeight: '500',
    opacity: 0.8,
  },
  brandDescription: {
    fontWeight: '500',
    lineHeight: 42,
  },
  roles: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleTab: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  roleTabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  roleTabText: {
    fontWeight: '700',
  },
  card: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#F0EEF8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
  },
  label: {
    fontWeight: '800',
    letterSpacing: 1,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
  },
  eyeBtn: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  hint: {
    textAlign: 'center',
    opacity: 0.7,
  },
});
