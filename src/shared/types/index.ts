// src/shared/types.ts
export type UserRole = 'student' | 'teacher' | 'admin';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  isGuest: boolean;
  login?: string;
  groupName?: string;
  department?: string;
}

export interface ScheduleItem {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  subject: string;
  teacherName: string;
  room: string;
  groupName: string;
  building: string;
  isConsultation?: boolean;
  isForWholeGroup?: boolean;
  assignedStudents?: string[];
  consultationTopic?: string;
}

export interface Room {
  id: string;
  number: string;
  building: string;
  capacity: number;
  hasProjector: boolean;
  hasComputers: boolean;
  underRepair: boolean;
  blocks?: RoomBlock[];
}

export type RoomBlockType = 'repair' | 'event';

export interface RoomBlock {
  id: string;
  type: RoomBlockType;
  title: string;
  // For repair blocks
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  // For event blocks
  date?: string;      // YYYY-MM-DD
  startTime?: string; // HH:MM
  endTime?: string;   // HH:MM
}

export interface Teacher {
  id: string;
  name: string;
  department: string;
  subjects: string[];
}

export interface Student {
  id: string;
  name: string;
  groupName: string;
}

export interface Group {
  id: string;
  name: string;
}

export type ConsultationStatus = 'scheduled' | 'cancelled' | 'completed';

export interface Consultation {
  id: string;
  teacherName: string;
  studentNames: string[];
  groupName: string | null;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  building: string;
  topic: string;
  status: ConsultationStatus;
  createdBy: string;
  createdAt: string;
}

export interface ConsultationDraft {
  teacherName: string;
  studentNames: string[];
  groupName: string | null;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  building: string;
}

export interface NotificationItem {
  id: string;
  userRole: UserRole;
  userName: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface AppSettings {
  language: 'ru';
  theme: 'light' | 'dark';
  notificationsEnabled: boolean;
}

export interface SuggestedSlot {
  id: string;
  building: string;
  room: string;
  date: string;
  startTime: string;
  endTime: string;
  confidence: number;
  reason: string;
}
