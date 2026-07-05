// src/core/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || '';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const customStorage = {
  getItem: async (key: string) => await AsyncStorage.getItem(key),
  setItem: async (key: string, value: string) => await AsyncStorage.setItem(key, value),
  removeItem: async (key: string) => await AsyncStorage.removeItem(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type DbProfile = {
  id: string;
  role: 'student' | 'teacher' | 'admin';
  name: string;
  group_name: string | null;
  department: string | null;
  login: string;
  updated_at: string;
};

export type DbScheduleItem = {
  id: string;
  subject: string;
  teacher_name: string;
  group_name: string;
  date: string;
  start_time: string;
  end_time: string;
  room: string;
  building: string;
  created_at: string;
};

export type DbConsultation = {
  id: string;
  topic: string;
  teacher_name: string;
  student_names: string[] | null;
  group_name: string | null;
  date: string;
  start_time: string;
  end_time: string;
  room: string;
  building: string;
  status: 'scheduled' | 'cancelled' | 'completed';
  created_by: string | null;
  created_at: string;
};

export type DbRoom = {
  id: string;
  number: string;
  building: string;
  capacity: number;
  has_projector: boolean;
  has_computers: boolean;
  under_repair: boolean;
};

export type DbRoomBlock = {
  id: string;
  room_id: string;
  type: 'repair' | 'event';
  title: string;
  start_date: string | null;
  end_date: string | null;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
};

export type DbTeacher = {
  id: string;
  name: string;
  department: string;
  subjects: string[];
  created_at: string;
};

export type DbStudent = {
  id: string;
  name: string;
  group_name: string;
  created_at: string;
};

export type DbGroup = {
  id: string;
  name: string;
  created_at: string;
};
