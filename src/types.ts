export type ActionType = 'sign_in' | 'sign_out';
export type ExcuseStatus = 'pending' | 'approved' | 'rejected';
export type ReasonCategory = 'Medical' | 'Family Emergency' | 'Official Exam/Work' | 'Transportation' | 'Academic Commitment' | 'Other';
export type SyncStatus = 'synced' | 'pending' | 'failed';

export interface Student {
  id: string;
  studentId: string;
  username: string;
  password: string;
  fullName: string;
  email: string;
  phone: string;
  pin: string;
  cohort: string;
  track: string;
  status: 'active' | 'inactive';
  avatarUrl?: string;
  registeredAt: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  timestamp: string; // ISO string
  type: ActionType;
  sessionId: string;
  sessionName: string;
  room: string;
  durationMinutes?: number;
  notes?: string;
  syncStatus: SyncStatus;
  syncedAt?: string;
  syncedError?: string;
}

export interface ExcuseRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  submissionDate: string; // ISO string
  absenceStartDate: string;
  absenceEndDate: string;
  reasonCategory: ReasonCategory;
  justification: string;
  affectedSessions: string[]; // names of training sessions affected
  status: ExcuseStatus;
  adminNotes?: string;
  syncStatus: SyncStatus;
  syncedAt?: string;
  syncedError?: string;
}

export interface TrainingSession {
  id: string;
  code: string;
  title: string;
  instructor: string;
  instructorEmail?: string;
  track: string;
  dayOfWeek: string;
  startTime: string; // e.g. "09:00"
  endTime: string;   // e.g. "12:00"
  room: string;
  capacity: number;
  enrolledCount: number;
  description: string;
}

export interface AppSettings {
  adminPin: string;
  googleAppsScriptUrl: string;
  notificationEmail: string;
  organizationName: string;
  allowManualCheckout: boolean;
  autoSync: boolean;
}
