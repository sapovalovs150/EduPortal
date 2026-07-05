import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import './shared/utils/calendarLocale';
import { AuthProvider } from './core/auth/AuthContext';
import { ThemeProvider } from './shared/contexts/ThemeContext';
import { LanguageProvider } from './shared/contexts/LanguageContext';
import { AppNavigator } from './core/navigation/AppNavigator';

const App = () => {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <StatusBar style="auto" />
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

export default App;

