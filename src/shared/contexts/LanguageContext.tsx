import React, { createContext, useContext } from 'react';

type Language = 'ru';

interface LanguageContextValue {
  language: Language;
  setLanguage: (_lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<string, string> = {
  schedule: 'Расписание',
  settings: 'Настройки',
  consultations: 'Консультации',
  profile: 'Профиль',
  save: 'Сохранить',
  cancel: 'Отмена',
  confirm: 'Подтвердить',
  logout: 'Выйти',
  login: 'Войти',
  selectRole: 'Выберите роль',
  student: 'Студент',
  teacher: 'Преподаватель',
  admin: 'Администратор',
  group: 'Группа',
  department: 'Кафедра',
  name: 'Имя',
  email: 'Email',
  phone: 'Телефон',
  darkMode: 'Тёмная тема',
  notifications: 'Уведомления',
  language: 'Язык',
  russian: 'Русский',
  noData: 'Нет данных',
  loading: 'Загрузка...',
  error: 'Ошибка',
  retry: 'Повторить',
};

const noop = () => {};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const t = (key: string): string => translations[key] || key;

  return (
    <LanguageContext.Provider value={{ language: 'ru', setLanguage: noop, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
