import React, { createContext, PropsWithChildren, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { supabase, DbProfile, DbScheduleItem, DbConsultation, DbRoom, DbRoomBlock, DbTeacher, DbStudent, DbGroup } from '../supabase/client';
import {
  AppSettings,
  Consultation,
  ConsultationDraft,
  RoomBlock,
  Room,
  ScheduleItem,
  SuggestedSlot,
  Teacher,
  Student,
  Group,
  NotificationItem,
  UserProfile,
  UserRole,
} from '../../shared/types';
import { STANDARD_TIME_SLOTS, getSlotTimes } from '../../shared/constants/timeSlots';

// --- Трансформеры ---
const transformDbScheduleToScheduleItem = (dbItem: DbScheduleItem): ScheduleItem => ({
  id: dbItem.id,
  subject: dbItem.subject,
  teacherName: dbItem.teacher_name,
  groupName: dbItem.group_name,
  date: dbItem.date,
  startTime: dbItem.start_time,
  endTime: dbItem.end_time,
  room: dbItem.room,
  building: dbItem.building,
});

const transformDbConsultationToConsultation = (dbItem: DbConsultation): Consultation => ({
  id: dbItem.id,
  teacherName: dbItem.teacher_name,
  studentNames: dbItem.student_names || [],
  groupName: dbItem.group_name,
  date: dbItem.date,
  startTime: dbItem.start_time,
  endTime: dbItem.end_time,
  room: dbItem.room,
  building: dbItem.building,
  topic: dbItem.topic,
  status: dbItem.status,
  createdBy: dbItem.created_by || 'system',
  createdAt: dbItem.created_at,
});

const transformDbRoomToRoom = (dbItem: DbRoom): Room => ({
  id: dbItem.id,
  number: dbItem.number,
  building: dbItem.building,
  capacity: dbItem.capacity,
  hasProjector: dbItem.has_projector,
  hasComputers: dbItem.has_computers,
  underRepair: dbItem.under_repair,
  blocks: [],
});

const transformDbRoomBlockToRoomBlock = (dbItem: DbRoomBlock): RoomBlock => ({
  id: dbItem.id,
  type: dbItem.type,
  title: dbItem.title,
  startDate: dbItem.start_date || undefined,
  endDate: dbItem.end_date || undefined,
  date: dbItem.date || undefined,
  startTime: dbItem.start_time || undefined,
  endTime: dbItem.end_time || undefined,
});

const transformDbTeacherToTeacher = (dbItem: DbTeacher): Teacher => ({
  id: dbItem.id,
  name: dbItem.name,
  department: dbItem.department,
  subjects: dbItem.subjects,
});

const transformDbStudentToStudent = (dbItem: DbStudent): Student => ({
  id: dbItem.id,
  name: dbItem.name,
  groupName: dbItem.group_name,
});

const transformDbGroupToGroup = (dbItem: DbGroup): Group => ({
  id: dbItem.id,
  name: dbItem.name,
});

const normalizePersonName = (value: string) =>
  value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\.+/g, '.')
    .trim();

const extractTeacherSearchToken = (value: string) => {
  const normalized = normalizePersonName(value);
  return normalized.split(' ')[0] || normalized;
};

const devLog = (...args: unknown[]) => {
  if (__DEV__) console.log(...args);
};

// --- Интерфейс контекста ---
interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  signIn: (payload: {
    role: UserRole; name: string; isGuest: boolean;
    login?: string; password?: string; groupName?: string; department?: string;
  }) => Promise<{ success: boolean; message?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (payload: { name?: string; groupName?: string; department?: string }) => Promise<void>;
  upgradeStudentToAccount: (payload: { name: string; login: string; password: string }) => Promise<{ success: boolean; message?: string }>;

  teachers: Teacher[];
  students: Student[];
  groups: Group[];
  rooms: Room[];
  setRooms: React.Dispatch<React.SetStateAction<Room[]>>;
  addRoomBlock: (roomId: string, block: Omit<RoomBlock, 'id'>) => Promise<{ success: boolean; message?: string }>;
  removeRoomBlock: (roomId: string, blockId: string) => Promise<{ success: boolean; message?: string }>;
  schedule: ScheduleItem[];
  setSchedule: React.Dispatch<React.SetStateAction<ScheduleItem[]>>;
  consultations: Consultation[];
  setConsultations: React.Dispatch<React.SetStateAction<Consultation[]>>;
  notifications: NotificationItem[];

  addNotification: (notification: Omit<NotificationItem, 'id' | 'createdAt' | 'isRead'>) => void;
  markNotificationAsRead: (id: string) => void;

  getTeacherSchedule: (teacherName: string, date?: string) => ScheduleItem[];
  getStudentSchedule: (studentName: string, date?: string) => ScheduleItem[];
  getGroupSchedule: (groupName: string, date?: string) => ScheduleItem[];
  getAvailableBuildings: (date: string, startTime: string, endTime: string) => string[];
  getAvailableRooms: (building: string, date: string, startTime: string, endTime: string, ignoreId?: string) => Room[];
  suggestSlots: (draft: Omit<ConsultationDraft, 'room' | 'building'>) => SuggestedSlot[];
  checkConflicts: (draft: ConsultationDraft, ignoreId?: string) => string[];
  createConsultation: (draft: ConsultationDraft, topic: string) => Promise<{ success: boolean; message?: string }>;
  cancelConsultation: (consultationId: string) => Promise<{ success: boolean; message?: string }>;
  rescheduleConsultation: (
    consultationId: string,
    draft: ConsultationDraft,
    topic: string
  ) => Promise<{ success: boolean; message?: string }>;
  getConsultationConflicts: (draft: ConsultationDraft, ignoreId?: string) => string[];
  getAvailableDays: (teacherName: string, roomNumber: string, building: string) => string[];
  getAvailableTimeSlots: (
    date: string, teacherName: string, roomNumber: string, building: string,
    groupName: string | null, studentNames: string[]
  ) => { startTime: string; endTime: string; reason: string }[];
  createConsultationFromTablet: (draft: ConsultationDraft, topic: string) => Promise<{ success: boolean; message?: string }>;

  settings: AppSettings;
  updateSettings: (payload: Partial<AppSettings>) => void;

  searchTeachers: (query: string) => Teacher[];
  searchGroups: (query: string) => Group[];
  searchStudents: (query: string, groupName?: string) => Student[];
  getTeacherGroups: (teacherName: string) => string[];
  refreshData: () => Promise<void>;

  isTeacherFree: (teacherName: string, date: string, startTime: string, endTime: string) => boolean;
  isGroupFree: (groupName: string, date: string, startTime: string, endTime: string) => boolean;

  loadRoomSchedule: (roomNumber: string, building?: string) => Promise<void>;
  loadFullSchedule: () => Promise<void>;
  loadConsultations: () => Promise<void>;
  loadBookingData: (teacherName: string, roomNumber: string, building?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// --- Провайдер ---
export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<AppSettings>({
    language: 'ru',
    theme: 'light',
    notificationsEnabled: true,
  });

  // --- Загрузка общих данных (без расписания) ---
  const fetchCommonData = useCallback(async () => {
    try {
      const [roomsResult, roomBlocksResult, teachersResult, studentsResult, groupsResult] = await Promise.all([
        supabase.from('rooms').select('*'),
        supabase.from('room_blocks').select('*'),
        supabase.from('teachers').select('*'),
        supabase.from('students').select('*'),
        supabase.from('groups').select('*'),
      ]);
      if (roomsResult.data) {
        const blocksByRoomId = ((roomBlocksResult.data || []) as DbRoomBlock[]).reduce<Record<string, RoomBlock[]>>(
          (acc, item) => {
            acc[item.room_id] = [...(acc[item.room_id] || []), transformDbRoomBlockToRoomBlock(item)];
            return acc;
          },
          {}
        );
        const baseRooms = roomsResult.data.map(transformDbRoomToRoom);
        setRooms(
          baseRooms.map((room) => ({
            ...room,
            blocks: blocksByRoomId[room.id] || [],
          }))
        );
      }
      if (teachersResult.data) setTeachers(teachersResult.data.map(transformDbTeacherToTeacher));
      if (studentsResult.data) setStudents(studentsResult.data.map(transformDbStudentToStudent));
      if (groupsResult.data) setGroups(groupsResult.data.map(transformDbGroupToGroup));
    } catch (error) {
      console.error('[Auth] Error fetching common data:', error);
    }
  }, []);

  // --- Загрузка расписания для аудитории ---
  const loadRoomSchedule = useCallback(async (roomNumber: string, building?: string) => {
    try {
      devLog(`[Auth] loadRoomSchedule: room ${roomNumber}, building ${building || 'any'}`);
      let query = supabase.from('schedule').select('*').eq('room', roomNumber);
      if (building) query = query.eq('building', building);
      const { data, error } = await query;
      if (error) throw error;
      const transformed = (data || []).map(transformDbScheduleToScheduleItem);
      devLog('[Auth] room schedule loaded, count:', transformed.length);
      setSchedule(transformed);
    } catch (error) {
      console.error('[Auth] Error loading room schedule:', error);
    }
  }, []);

  // --- Загрузка полного расписания (для TabletBooking) ---
  const loadFullSchedule = useCallback(async () => {
    try {
      devLog('[Auth] loadFullSchedule');
      let allSchedule: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;
      while (hasMore) {
        const from = page * pageSize;
        const to = from + pageSize - 1;
        const { data, error } = await supabase
          .from('schedule')
          .select('*', { count: 'exact' })
          .range(from, to);
        if (error) {
          if (error.code === 'PGRST103') {
            devLog('[Auth] Reached end of schedule data');
            hasMore = false;
            continue;
          }
          throw error;
        }
        if (data && data.length > 0) {
          allSchedule.push(...data);
          page++;
        } else {
          hasMore = false;
        }
      }
      const transformed = allSchedule.map(transformDbScheduleToScheduleItem);
      devLog('[Auth] full schedule loaded, count:', transformed.length);
      setSchedule(transformed);
    } catch (error) {
      console.error('[Auth] Error loading full schedule:', error);
    }
  }, []);

  // --- Загрузка всех консультаций (публично) ---
  const loadConsultations = useCallback(async () => {
    try {
      devLog('[Auth] loadConsultations (public)');
      const { data, error } = await supabase.from('consultations').select('*');
      if (error) throw error;
      if (data) {
        devLog('[Auth] consultations loaded, count:', data.length);
        setConsultations(data.map(transformDbConsultationToConsultation));
      }
    } catch (error) {
      console.error('[Auth] Error loading consultations:', error);
    }
  }, []);

  // --- Загрузка данных для бронирования (преподаватель + аудитория + консультации) ---
  const loadBookingData = useCallback(async (teacherName: string, roomNumber: string, building?: string) => {
    try {
      devLog('[Auth] loadBookingData for', teacherName, roomNumber);
      const allSchedule: any[] = [];
      const ids = new Set<string>();

      // Пары преподавателя
      const normalizedTeacherName = normalizePersonName(teacherName);
      const teacherSearchToken = extractTeacherSearchToken(teacherName);
      const { data: rawOwnLessons, error } = await supabase
        .from('schedule')
        .select('*')
        .ilike('teacher_name', `%${teacherSearchToken}%`);
      if (error) throw error;
      const ownLessons = (rawOwnLessons || []).filter(item =>
        normalizePersonName(item.teacher_name).includes(normalizedTeacherName) ||
        normalizedTeacherName.includes(normalizePersonName(item.teacher_name))
      );
      if (ownLessons.length > 0) {
        for (const item of ownLessons) {
          if (!ids.has(item.id)) { allSchedule.push(item); ids.add(item.id); }
        }
      }

      // Пары групп преподавателя
      const teacherGroups = [...new Set(ownLessons.map(item => item.group_name))];
      if (teacherGroups.length > 0) {
        const { data: groupLessons, error: groupError } = await supabase
          .from('schedule')
          .select('*')
          .in('group_name', teacherGroups);
        if (groupError) throw groupError;
        if (groupLessons) {
          for (const item of groupLessons) {
            if (!ids.has(item.id)) { allSchedule.push(item); ids.add(item.id); }
          }
        }
      }

      // Пары аудитории
      let roomQuery = supabase.from('schedule').select('*').eq('room', roomNumber);
      if (building) roomQuery = roomQuery.eq('building', building);
      const { data: roomLessons, error: roomError } = await roomQuery;
      if (roomError) throw roomError;
      if (roomLessons) {
        for (const item of roomLessons) {
          if (!ids.has(item.id)) { allSchedule.push(item); ids.add(item.id); }
        }
      }

      // Консультации
      const { data: cons, error: consError } = await supabase.from('consultations').select('*');
      if (consError) throw consError;
      if (cons) {
        setConsultations(cons.map(transformDbConsultationToConsultation));
      }

      const transformed = allSchedule.map(transformDbScheduleToScheduleItem);
      devLog('[Auth] booking data loaded, schedule count:', transformed.length);
      setSchedule(transformed);
    } catch (error) {
      console.error('[Auth] Error in loadBookingData:', error);
    }
  }, []);

  // --- Загрузка расписания для пользователя (при входе) ---
  const loadSchedule = useCallback(async (currentUser: UserProfile) => {
    try {
      let allSchedule: any[] = [];
      if (currentUser.role === 'teacher') {
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;
        while (hasMore) {
          const from = page * pageSize;
          const to = from + pageSize - 1;
          const { data, error } = await supabase
            .from('schedule')
            .select('*', { count: 'exact' })
            .range(from, to);
          if (error) {
            if (error.code === 'PGRST103') {
              hasMore = false;
              continue;
            }
            throw error;
          }
          if (data && data.length > 0) {
            allSchedule.push(...data);
            page++;
          } else {
            hasMore = false;
          }
        }
      } else if (currentUser.role === 'student') {
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;
        while (hasMore) {
          const from = page * pageSize;
          const to = from + pageSize - 1;
          const { data, error } = await supabase
            .from('schedule')
            .select('*', { count: 'exact' })
            .range(from, to);
          if (error) {
            if (error.code === 'PGRST103') {
              hasMore = false;
              continue;
            }
            throw error;
          }
          if (data && data.length > 0) {
            allSchedule.push(...data);
            page++;
          } else {
            hasMore = false;
          }
        }
      } else if (currentUser.role === 'admin') {
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;
        while (hasMore) {
          const from = page * pageSize;
          const to = from + pageSize - 1;
          const { data, error } = await supabase
            .from('schedule')
            .select('*', { count: 'exact' })
            .range(from, to);
          if (error) {
            if (error.code === 'PGRST103') {
              hasMore = false;
              continue;
            }
            throw error;
          }
          if (data && data.length > 0) {
            allSchedule.push(...data);
            page++;
          } else {
            hasMore = false;
          }
        }
      }
      const transformed = allSchedule.map(transformDbScheduleToScheduleItem);
      devLog('[Auth] schedule loaded, count:', transformed.length);
      setSchedule(transformed);
    } catch (error) {
      console.error('[Auth] Error loading schedule:', error);
    }
  }, []);

  const fetchPublicData = useCallback(async () => {
    await fetchCommonData();
  }, [fetchCommonData]);

  const fetchPrivateData = useCallback(async () => {
    devLog('[Auth] fetchPrivateData started');
    try {
      const { data, error } = await supabase.from('consultations').select('*');
      if (error) throw error;
      if (data) {
        devLog('[Auth] consultations loaded, count:', data.length);
        setConsultations(data.map(transformDbConsultationToConsultation));
      }
    } catch (error) {
      console.error('[Auth] Error fetching private data:', error);
    }
  }, []);

  useEffect(() => {
    fetchPublicData().finally(() => setIsLoading(false));
  }, [fetchPublicData]);

  useEffect(() => {
    const sub = supabase
      .channel('room-blocks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_blocks' }, () => {
        devLog('[Auth] room blocks changed, reloading common data');
        fetchCommonData();
      })
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, [fetchCommonData]);

  useEffect(() => {
    if (user) {
      devLog('[Auth] User logged in, loading schedule and consultations');
      setIsLoading(true);
      Promise.all([loadSchedule(user), fetchPrivateData()])
        .finally(() => setIsLoading(false));
    } else {
      setSchedule([]);
      setConsultations([]);
    }
  }, [user, loadSchedule, fetchPrivateData]);

  useEffect(() => {
    if (user) {
      const sub = supabase
        .channel('consultations-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'consultations' }, () => {
          devLog('[Auth] consultations changed, reloading');
          fetchPrivateData();
        })
        .subscribe();
      return () => { sub.unsubscribe(); };
    }
  }, [user, fetchPrivateData]);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    if (user) {
      await Promise.all([loadSchedule(user), fetchPrivateData()]);
    } else {
      await fetchPublicData();
    }
    setIsLoading(false);
  }, [user, loadSchedule, fetchPrivateData, fetchPublicData]);

  // --- Refs ---
  const scheduleRef = React.useRef(schedule);
  const consultationsRef = React.useRef(consultations);
  const roomsRef = React.useRef(rooms);
  const studentsRef = React.useRef(students);
  const groupsRef = React.useRef(groups);
  const teachersRef = React.useRef(teachers);
  const userRef = React.useRef(user);

  useEffect(() => { scheduleRef.current = schedule; }, [schedule]);
  useEffect(() => { consultationsRef.current = consultations; }, [consultations]);
  useEffect(() => { roomsRef.current = rooms; }, [rooms]);
  useEffect(() => { studentsRef.current = students; }, [students]);
  useEffect(() => { groupsRef.current = groups; }, [groups]);
  useEffect(() => { teachersRef.current = teachers; }, [teachers]);
  useEffect(() => { userRef.current = user; }, [user]);

  // --- Утилита перекрытия ---
  const isOverlap = (aStart: string, aEnd: string, bStart: string, bEnd: string) => {
    return aStart < bEnd && aEnd > bStart;
  };

  const isDateInRange = (date: string, startDate: string, endDate: string) => {
    return date >= startDate && date <= endDate;
  };

  const isRoomBlocked = useCallback((room: Room, date: string, startTime: string, endTime: string): string | null => {
    if (room.underRepair) return 'Аудитория на ремонте';
    const blocks = room.blocks || [];
    for (const block of blocks) {
      if (block.type === 'repair' && block.startDate && block.endDate) {
        if (isDateInRange(date, block.startDate, block.endDate)) {
          return block.title || 'Аудитория заблокирована (ремонт)';
        }
      }
      if (block.type === 'event' && block.date && block.startTime && block.endTime) {
        if (block.date === date && isOverlap(startTime, endTime, block.startTime, block.endTime)) {
          return block.title || 'Аудитория заблокирована (мероприятие)';
        }
      }
    }
    return null;
  }, []);

  // --- Уведомления ---
  const addNotification = useCallback((notification: Omit<NotificationItem, 'id' | 'createdAt' | 'isRead'>) => {
    const newNotification: NotificationItem = {
      ...notification,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      isRead: false,
    };
    setNotifications(prev => [newNotification, ...prev]);
  }, []);

  const markNotificationAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  }, []);

  const addRoomBlock = useCallback(async (roomId: string, block: Omit<RoomBlock, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('room_blocks')
        .insert({
          room_id: roomId,
          type: block.type,
          title: block.title,
          start_date: block.type === 'repair' ? block.startDate : null,
          end_date: block.type === 'repair' ? block.endDate : null,
          date: block.type === 'event' ? block.date : null,
          start_time: block.type === 'event' ? block.startTime : null,
          end_time: block.type === 'event' ? block.endTime : null,
        })
        .select('*')
        .single();
      if (error) throw error;

      const nextBlock = transformDbRoomBlockToRoomBlock(data as DbRoomBlock);
      setRooms(prev =>
        prev.map(room =>
          room.id === roomId
            ? { ...room, blocks: [...(room.blocks || []), nextBlock] }
            : room
        )
      );
      return { success: true };
    } catch (error) {
      console.error('[Auth] Error adding room block:', error);
      return { success: false, message: 'Не удалось сохранить блокировку' };
    }
  }, []);

  const removeRoomBlock = useCallback(async (roomId: string, blockId: string) => {
    try {
      const { error } = await supabase.from('room_blocks').delete().eq('id', blockId);
      if (error) throw error;

      setRooms(prev =>
        prev.map(room =>
          room.id === roomId
            ? { ...room, blocks: (room.blocks || []).filter(b => b.id !== blockId) }
            : room
        )
      );
      return { success: true };
    } catch (error) {
      console.error('[Auth] Error removing room block:', error);
      return { success: false, message: 'Не удалось удалить блокировку' };
    }
  }, []);

  // --- Аутентификация ---
  const signIn = useCallback(async ({
    role, name, isGuest, login, password, groupName, department,
  }: {
    role: UserRole; name: string; isGuest: boolean;
    login?: string; password?: string; groupName?: string; department?: string;
  }): Promise<{ success: boolean; message?: string }> => {
    try {
      if (login && password) {
        const email = `${login}@eduportal.local`;
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { success: false, message: error.message };
        if (!data.user) return { success: false, message: 'Пользователь не найден' };

        const { data: profileData, error: profileError } = await supabase
          .from('profiles').select('*').eq('id', data.user.id).single();
        if (profileError) return { success: false, message: 'Профиль не найден' };
        if (profileData.role !== role) {
          return { success: false, message: 'Неверный логин или пароль для выбранной роли' };
        }

        setUser({
          id: data.user.id,
          name: profileData.name,
          role: profileData.role,
          isGuest: false,
          login,
          groupName: profileData.group_name || undefined,
          department: profileData.department || undefined,
        });
        return { success: true };
      }
      if (role === 'student') {
        setUser({ id: `guest_${Date.now()}`, name: name || 'Студент', role: 'student', isGuest: true, groupName });
        return { success: true };
      }
      return { success: false, message: 'Неверные учетные данные' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Ошибка входа' };
    }
  }, []);

  const signOut = useCallback(async () => {
    if (userRef.current && !userRef.current.isGuest) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setConsultations([]);
  }, []);

  const updateProfile = useCallback(async (payload: { name?: string; groupName?: string; department?: string }) => {
    const currentUser = userRef.current;
    if (!currentUser || currentUser.isGuest) return;
    const updates: Partial<DbProfile> = {};
    if (payload.name) updates.name = payload.name;
    if (payload.groupName) updates.group_name = payload.groupName;
    if (payload.department) updates.department = payload.department;
    if (Object.keys(updates).length === 0) return;
    const { error } = await supabase.from('profiles').update(updates).eq('id', currentUser.id);
    if (error) throw error;
    setUser(prev => prev ? { ...prev, ...payload } : prev);
  }, []);

  // --- Работа с расписанием ---
  const getTeacherSchedule = useCallback((teacherName: string, date?: string) => {
    return scheduleRef.current.filter(item =>
      item.teacherName === teacherName && (!date || item.date === date)
    );
  }, []);

  const getStudentSchedule = useCallback((studentName: string, date?: string) => {
    const student = studentsRef.current.find(s => s.name === studentName);
    if (!student) return [];
    return scheduleRef.current.filter(item =>
      item.groupName === student.groupName && (!date || item.date === date)
    );
  }, []);

  const getGroupSchedule = useCallback((groupName: string, date?: string) => {
    return scheduleRef.current.filter(item =>
      item.groupName === groupName && (!date || item.date === date)
    );
  }, []);

  // --- Проверка конфликтов ---
  const checkConflicts = useCallback((draft: ConsultationDraft, ignoreId?: string): string[] => {
    const conflicts: string[] = [];
    const sch = scheduleRef.current;
    const cons = consultationsRef.current;

    const teacherBusyInSchedule = sch.some(item =>
      item.date === draft.date &&
      item.teacherName === draft.teacherName &&
      isOverlap(draft.startTime, draft.endTime, item.startTime, item.endTime)
    );
    if (teacherBusyInSchedule) conflicts.push('Преподаватель занят (пара)');

    const teacherBusyInConsultations = cons.some(c =>
      c.id !== ignoreId &&
      c.status === 'scheduled' &&
      c.teacherName === draft.teacherName &&
      c.date === draft.date &&
      isOverlap(draft.startTime, draft.endTime, c.startTime, c.endTime)
    );
    if (teacherBusyInConsultations) conflicts.push('Преподаватель занят (консультация)');

    if (draft.groupName) {
      const groupBusyInSchedule = sch.some(item =>
        item.date === draft.date &&
        item.groupName === draft.groupName &&
        isOverlap(draft.startTime, draft.endTime, item.startTime, item.endTime)
      );
      if (groupBusyInSchedule) conflicts.push('У группы есть пара в это время');

      const groupBusyInConsultations = cons.some(c =>
        c.id !== ignoreId &&
        c.status === 'scheduled' &&
        c.groupName === draft.groupName &&
        c.date === draft.date &&
        isOverlap(draft.startTime, draft.endTime, c.startTime, c.endTime)
      );
      if (groupBusyInConsultations) conflicts.push('У группы есть консультация в это время');
    }

    const roomBlockedReason = roomsRef.current
      .filter(r => r.number === draft.room && r.building === draft.building)
      .map(r => isRoomBlocked(r, draft.date, draft.startTime, draft.endTime))
      .find(Boolean);
    if (roomBlockedReason) conflicts.push(roomBlockedReason);

    const roomBusyInSchedule = sch.some(item =>
      item.date === draft.date &&
      item.room === draft.room &&
      item.building === draft.building &&
      isOverlap(draft.startTime, draft.endTime, item.startTime, item.endTime)
    );
    if (roomBusyInSchedule) conflicts.push('Аудитория занята (пара)');

    const roomBusyInConsultations = cons.some(c =>
      c.id !== ignoreId &&
      c.status === 'scheduled' &&
      c.room === draft.room &&
      c.building === draft.building &&
      c.date === draft.date &&
      isOverlap(draft.startTime, draft.endTime, c.startTime, c.endTime)
    );
    if (roomBusyInConsultations) conflicts.push('Аудитория занята другой консультацией');

    return conflicts;
  }, [isRoomBlocked]);

  const getConsultationConflicts = checkConflicts;

  // --- Группы преподавателя (только из расписания) ---
  const getTeacherGroups = useCallback((teacherName: string) => {
    const normalizedTeacherName = normalizePersonName(teacherName);
    const fromSchedule = scheduleRef.current
      .filter(item => {
        const normalizedScheduleTeacher = normalizePersonName(item.teacherName);
        return (
          normalizedScheduleTeacher.includes(normalizedTeacherName) ||
          normalizedTeacherName.includes(normalizedScheduleTeacher)
        );
      })
      .map(item => item.groupName);
    const unique = [...new Set(fromSchedule)];
    return unique;
  }, []);

  // --- Корпуса преподавателя ---
  const getTeacherBuildings = useCallback((teacherName: string): string[] => {
    const teacherSchedule = scheduleRef.current.filter(item => item.teacherName === teacherName);
    const buildings = new Set<string>();
    teacherSchedule.forEach(item => { if (item.building) buildings.add(item.building); });
    if (buildings.size === 0) {
      return Array.from(new Set(roomsRef.current.map(r => r.building)));
    }
    return Array.from(buildings);
  }, []);

  // --- Проверка свободы (с учётом консультаций) ---
  const isTeacherFree = useCallback((teacherName: string, date: string, startTime: string, endTime: string): boolean => {
    const busyInSchedule = scheduleRef.current.some(item =>
      item.date === date &&
      item.teacherName === teacherName &&
      isOverlap(startTime, endTime, item.startTime, item.endTime)
    );
    if (busyInSchedule) return false;

    const busyInConsultations = consultationsRef.current.some(c =>
      c.teacherName === teacherName &&
      c.date === date &&
      c.status === 'scheduled' &&
      isOverlap(startTime, endTime, c.startTime, c.endTime)
    );
    return !busyInConsultations;
  }, []);

  const isGroupFree = useCallback((groupName: string, date: string, startTime: string, endTime: string): boolean => {
    const busyInSchedule = scheduleRef.current.some(item =>
      item.date === date &&
      item.groupName === groupName &&
      isOverlap(startTime, endTime, item.startTime, item.endTime)
    );
    if (busyInSchedule) return false;

    const busyInConsultations = consultationsRef.current.some(c =>
      c.groupName === groupName &&
      c.date === date &&
      c.status === 'scheduled' &&
      isOverlap(startTime, endTime, c.startTime, c.endTime)
    );
    return !busyInConsultations;
  }, []);

  // --- Доступные аудитории ---
  const getAvailableRooms = useCallback((building: string, date: string, startTime: string, endTime: string, ignoreId?: string) => {
    return roomsRef.current.filter(room => {
      if (room.building !== building) return false;
      if (isRoomBlocked(room, date, startTime, endTime)) return false;

      const busyInSchedule = scheduleRef.current.some(item =>
        item.date === date &&
        item.room === room.number &&
        item.building === room.building &&
        isOverlap(startTime, endTime, item.startTime, item.endTime)
      );
      if (busyInSchedule) return false;

      const busyInConsultations = consultationsRef.current.some(c =>
        c.id !== ignoreId &&
        c.status === 'scheduled' &&
        c.room === room.number &&
        c.building === room.building &&
        c.date === date &&
        isOverlap(startTime, endTime, c.startTime, c.endTime)
      );
      return !busyInConsultations;
    });
  }, [isRoomBlocked]);

  const getAvailableBuildings = useCallback((date: string, startTime: string, endTime: string) => {
    const buildings = new Set<string>();
    roomsRef.current.forEach(room => {
      if (isRoomBlocked(room, date, startTime, endTime)) return;
      const busyInSchedule = scheduleRef.current.some(item =>
        item.date === date &&
        item.room === room.number &&
        item.building === room.building &&
        isOverlap(startTime, endTime, item.startTime, item.endTime)
      );
      if (busyInSchedule) return;
      const busyInConsultations = consultationsRef.current.some(c =>
        c.status === 'scheduled' &&
        c.date === date &&
        c.room === room.number &&
        c.building === room.building &&
        isOverlap(startTime, endTime, c.startTime, c.endTime)
      );
      if (busyInConsultations) return;
      buildings.add(room.building);
    });
    return Array.from(buildings);
  }, [isRoomBlocked]);

  // --- Подбор слотов ---
  const suggestSlots = useCallback((draft: Omit<ConsultationDraft, 'room' | 'building'>): SuggestedSlot[] => {
    const suggested: SuggestedSlot[] = [];
    const dates: string[] = [];
    const today = new Date();
    for (let i = 1; i <= 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.toLocaleDateString('ru-RU', { weekday: 'long' });
      if (dayOfWeek !== 'Воскресенье') dates.push(dateStr);
    }

    const teacherGroupsList = getTeacherGroups(draft.teacherName);
    if (draft.groupName && !teacherGroupsList.includes(draft.groupName)) return [];

    const teacherBuildings = getTeacherBuildings(draft.teacherName);
    const otherBuildings = Array.from(new Set(roomsRef.current.map(r => r.building)))
      .filter(b => !teacherBuildings.includes(b));

    for (const date of dates) {
      for (const slot of STANDARD_TIME_SLOTS) {
        for (const building of teacherBuildings) {
          const times = getSlotTimes(slot, building);
          if (!isTeacherFree(draft.teacherName, date, times.start, times.end)) continue;
          if (draft.groupName && !isGroupFree(draft.groupName, date, times.start, times.end)) continue;

          const available = getAvailableRooms(building, date, times.start, times.end);
          if (available.length > 0) {
            const teacherHasConsultations = consultationsRef.current.some(c =>
              c.teacherName === draft.teacherName && c.date === date && c.status === 'scheduled'
            );
            suggested.push({
              id: `${date}-${slot.id}-${building}`,
              building,
              room: available[0].number,
              date,
              startTime: times.start,
              endTime: times.end,
              confidence: teacherHasConsultations ? 90 : 100,
              reason: teacherHasConsultations
                ? 'Рекомендуемый корпус (в этот день уже есть консультации)'
                : 'Рекомендуемый корпус (вы здесь ведёте занятия)',
            });
          }
        }

        const hasPriority = suggested.some(s =>
          s.date === date && s.startTime === getSlotTimes(slot, teacherBuildings[0] || 'А').start
        );
        if (!hasPriority) {
          for (const building of otherBuildings) {
            const times = getSlotTimes(slot, building);
            if (!isTeacherFree(draft.teacherName, date, times.start, times.end)) continue;
            if (draft.groupName && !isGroupFree(draft.groupName, date, times.start, times.end)) continue;

            const available = getAvailableRooms(building, date, times.start, times.end);
            if (available.length > 0) {
              const teacherHasConsultations = consultationsRef.current.some(c =>
                c.teacherName === draft.teacherName && c.date === date && c.status === 'scheduled'
              );
              suggested.push({
                id: `${date}-${slot.id}-${building}`,
                building,
                room: available[0].number,
                date,
                startTime: times.start,
                endTime: times.end,
                confidence: teacherHasConsultations ? 60 : 70,
                reason: teacherHasConsultations
                  ? 'Другой корпус (уже есть консультации в этот день)'
                  : 'Свободная аудитория (другой корпус)',
              });
            }
          }
        }
      }
    }

    return suggested
      .sort((a, b) => {
        const aPriority = teacherBuildings.includes(a.building);
        const bPriority = teacherBuildings.includes(b.building);
        if (aPriority !== bPriority) return aPriority ? -1 : 1;
        if (a.confidence !== b.confidence) return b.confidence - a.confidence;
        return a.date.localeCompare(b.date);
      })
      .slice(0, 5);
  }, [getTeacherGroups, getTeacherBuildings, isTeacherFree, isGroupFree, getAvailableRooms]);

  // --- Слоты для планшета ---
  const getAvailableTimeSlots = useCallback((
    date: string, teacherName: string, roomNumber: string, building: string,
    groupName: string | null, studentNames: string[]
  ): { startTime: string; endTime: string; reason: string }[] => {
    const availableSlots: { startTime: string; endTime: string; reason: string }[] = [];
    const dayOfWeek = new Date(date).getDay();
    if (dayOfWeek === 0) return [];

    for (const slot of STANDARD_TIME_SLOTS) {
      const times = getSlotTimes(slot, building);
      const conflicts = checkConflicts({
        teacherName, studentNames, groupName, date,
        startTime: times.start, endTime: times.end,
        room: roomNumber, building,
      });
      if (conflicts.length === 0) {
        availableSlots.push({ startTime: times.start, endTime: times.end, reason: 'Свободно' });
      } else {
        availableSlots.push({ startTime: times.start, endTime: times.end, reason: conflicts[0] });
      }
    }
    return availableSlots;
  }, [checkConflicts]);

  const getAvailableDays = useCallback((teacherName: string, roomNumber: string, building: string): string[] => {
    const days: string[] = [];
    const today = new Date();
    for (let i = 1; i <= 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0) continue;

      for (const slot of STANDARD_TIME_SLOTS) {
        const times = getSlotTimes(slot, building);
        const draft: ConsultationDraft = {
          teacherName, studentNames: [], groupName: null,
          date: dateStr, startTime: times.start, endTime: times.end,
          room: roomNumber, building,
        };
        if (checkConflicts(draft).length === 0) {
          days.push(dateStr);
          break;
        }
      }
    }
    return days;
  }, [checkConflicts]);

  // --- Создание консультации ---
  const createConsultation = useCallback(async (draft: ConsultationDraft, topic: string) => {
    try {
      const conflicts = checkConflicts(draft);
      if (conflicts.length > 0) return { success: false, message: conflicts.join('\n') };

      const isDuplicate = consultationsRef.current.some(c =>
        c.teacherName === draft.teacherName && c.date === draft.date &&
        c.startTime === draft.startTime && c.room === draft.room &&
        c.topic.toLowerCase() === topic.toLowerCase() && c.status === 'scheduled'
      );
      if (isDuplicate) return { success: false, message: 'Такая консультация уже запланирована' };

      const newConsultationData = {
        topic,
        teacher_name: draft.teacherName,
        student_names: draft.studentNames,
        group_name: draft.groupName,
        date: draft.date,
        start_time: draft.startTime,
        end_time: draft.endTime,
        room: draft.room,
        building: draft.building,
        status: 'scheduled' as const,
        created_by: userRef.current?.id ?? null,
      };

      const { data, error } = await supabase
        .from('consultations')
        .insert([newConsultationData])
        .select()
        .single();
      if (error) throw error;
      if (data) {
        setConsultations(prev => [transformDbConsultationToConsultation(data), ...prev]);
      }

      addNotification({
        userRole: userRef.current?.role || 'admin',
        userName: userRef.current?.name || 'Система',
        title: 'Новая консультация',
        message: `Создана консультация "${topic}" на ${draft.date}`,
      });

      await fetchPrivateData();
      return { success: true, message: 'Консультация успешно создана' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Ошибка при создании консультации' };
    }
  }, [checkConflicts, addNotification, fetchPrivateData]);

  const cancelConsultation = useCallback(async (consultationId: string) => {
    try {
      const { error } = await supabase
        .from('consultations')
        .update({ status: 'cancelled' })
        .eq('id', consultationId);
      if (error) throw error;

      setConsultations(prev =>
        prev.map(c => (c.id === consultationId ? { ...c, status: 'cancelled' as const } : c))
      );
      await fetchPrivateData();
      return { success: true };
    } catch (error: any) {
      return { success: false, message: error?.message || 'Не удалось отменить консультацию' };
    }
  }, [fetchPrivateData]);

  const rescheduleConsultation = useCallback(async (
    consultationId: string,
    draft: ConsultationDraft,
    topic: string
  ) => {
    try {
      const conflicts = checkConflicts(draft, consultationId);
      if (conflicts.length > 0) return { success: false, message: conflicts.join('\n') };

      const { data, error } = await supabase
        .from('consultations')
        .update({
          topic,
          teacher_name: draft.teacherName,
          student_names: draft.studentNames,
          group_name: draft.groupName,
          date: draft.date,
          start_time: draft.startTime,
          end_time: draft.endTime,
          room: draft.room,
          building: draft.building,
          status: 'scheduled',
        })
        .eq('id', consultationId)
        .select()
        .single();
      if (error) throw error;

      if (data) {
        const next = transformDbConsultationToConsultation(data);
        setConsultations(prev => prev.map(c => (c.id === consultationId ? next : c)));
      }
      await fetchPrivateData();
      return { success: true };
    } catch (error: any) {
      return { success: false, message: error?.message || 'Не удалось перенести консультацию' };
    }
  }, [checkConflicts, fetchPrivateData]);

  const createConsultationFromTablet = useCallback(async (draft: ConsultationDraft, topic: string) => {
    return createConsultation(draft, topic);
  }, [createConsultation]);

  // --- Поиск ---
  const searchTeachers = useCallback((query: string) =>
    teachersRef.current.filter(t => t.name.toLowerCase().includes(query.toLowerCase())), []);

  const searchGroups = useCallback((query: string) =>
    groupsRef.current.filter(g => g.name.toLowerCase().includes(query.toLowerCase())), []);

  const searchStudents = useCallback((query: string, groupName?: string) =>
    studentsRef.current.filter(s =>
      s.name.toLowerCase().includes(query.toLowerCase()) && (!groupName || s.groupName === groupName)
    ), []);

  const updateSettings = useCallback((payload: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...payload }));
  }, []);

  const upgradeStudentToAccount = useCallback(async () => ({ success: false as const }), []);

  // --- Значение контекста ---
  const value = useMemo(
    () => ({
      user, isLoading, signIn, signOut, updateProfile, upgradeStudentToAccount,
      teachers, students, groups, rooms, setRooms, addRoomBlock, removeRoomBlock, schedule, setSchedule, consultations, setConsultations, notifications,
      addNotification, markNotificationAsRead,
      getTeacherSchedule, getStudentSchedule, getGroupSchedule,
      getAvailableBuildings, getAvailableRooms, suggestSlots,
      checkConflicts, getConsultationConflicts: checkConflicts,
      createConsultation, cancelConsultation, rescheduleConsultation, getAvailableDays, getAvailableTimeSlots,
      createConsultationFromTablet,
      settings, updateSettings,
      searchTeachers, searchGroups, searchStudents, getTeacherGroups, refreshData,
      isTeacherFree, isGroupFree,
      loadRoomSchedule,
      loadFullSchedule,
      loadConsultations,
      loadBookingData,
    }),
    [user, isLoading, teachers, students, groups, rooms, schedule, consultations, notifications, settings,
      signIn, signOut, updateProfile, addNotification, markNotificationAsRead,
      addRoomBlock, removeRoomBlock,
      getTeacherSchedule, getStudentSchedule, getGroupSchedule,
      getAvailableBuildings, getAvailableRooms, suggestSlots,
      checkConflicts, createConsultation, cancelConsultation, rescheduleConsultation, getAvailableDays, getAvailableTimeSlots,
      createConsultationFromTablet, updateSettings,
      searchTeachers, searchGroups, searchStudents, getTeacherGroups, refreshData,
      isTeacherFree, isGroupFree, loadRoomSchedule, loadFullSchedule, loadConsultations,
      loadBookingData]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};