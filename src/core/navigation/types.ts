export type ConsultationEditRole = 'admin' | 'teacher';

export type ConsultationEditParams = {
  consultationId: string;
  role: ConsultationEditRole;
};

export type AdminStackParamList = {
  AdminTabs: undefined;
  ConsultationForm: undefined;
  ConsultationEdit: ConsultationEditParams;
  RoomBlock: { roomId: string };
};

export type TeacherScheduleStackParamList = {
  TeacherScheduleMain: undefined;
  ConsultationForm: undefined;
  ConsultationEdit: ConsultationEditParams;
  Profile: undefined;
};

export type TeacherSettingsStackParamList = {
  TeacherSettingsMain: undefined;
  Profile: undefined;
};
