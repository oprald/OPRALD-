import { Student, AttendanceRecord, ExcuseRecord, TrainingSession, AppSettings } from '../types';
import { DEFAULT_SETTINGS, INITIAL_STUDENTS, INITIAL_SESSIONS, INITIAL_ATTENDANCE, INITIAL_EXCUSES } from '../data/mockData';
import { sendToGoogleAppsScript } from './googleSheetsAppsScript';

const STORAGE_KEYS = {
  SETTINGS: 'oprald_app_settings',
  STUDENTS: 'oprald_students',
  ATTENDANCE: 'oprald_attendance_records',
  EXCUSES: 'oprald_excuse_records',
  SESSIONS: 'oprald_training_sessions',
};

// --- Settings ---
export function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      saveSettings(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    // If organizationName was default or old name, ensure OPRALD EDUTECH CONSULT
    if (!parsed.organizationName || parsed.organizationName === 'Oprald EduTech Training Institute') {
      parsed.organizationName = 'OPRALD EDUTECH CONSULT';
      saveSettings(parsed);
    }
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings to localStorage', e);
  }
}

// --- Students ---
export function getStudents(): Student[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    if (!raw) {
      saveStudents(INITIAL_STUDENTS);
      return INITIAL_STUDENTS;
    }
    const parsed: Student[] = JSON.parse(raw);
    // Ensure all students have username and password attributes
    let changed = false;
    const validated = parsed.map((s, idx) => {
      let updated = { ...s };
      if (!updated.username) {
        // derive username from full name or student ID
        updated.username = updated.fullName ? updated.fullName.toLowerCase().replace(/\s+/g, '_') : `student_${idx + 1}`;
        changed = true;
      }
      if (!updated.password) {
        updated.password = updated.pin || 'password123';
        changed = true;
      }
      return updated;
    });

    if (changed) {
      saveStudents(validated);
    }
    return validated;
  } catch (e) {
    return INITIAL_STUDENTS;
  }
}

export function saveStudents(students: Student[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  } catch (e) {
    console.error('Failed to save students to localStorage', e);
  }
}

/**
 * Authenticates student using username (or studentId/email) and password (or PIN)
 */
export function authenticateStudent(usernameOrId: string, passwordOrPin: string): Student | null {
  const students = getStudents();
  const inputIdentifier = usernameOrId.trim().toLowerCase();
  const inputSecret = passwordOrPin.trim();

  if (!inputIdentifier || !inputSecret) return null;

  return students.find(s => {
    if (s.status !== 'active') return false;

    const usernameMatch = s.username && s.username.toLowerCase() === inputIdentifier;
    const studentIdMatch = s.studentId && s.studentId.toLowerCase() === inputIdentifier;
    const emailMatch = s.email && s.email.toLowerCase() === inputIdentifier;

    const identifierMatches = usernameMatch || studentIdMatch || emailMatch;
    const secretMatches = (s.password && s.password === inputSecret) || (s.pin && s.pin === inputSecret);

    return identifierMatches && secretMatches;
  }) || null;
}

/**
 * Registers a new student with username and password
 */
export function registerStudent(params: {
  username: string;
  password: string;
  fullName: string;
  email: string;
  phone?: string;
  cohort?: string;
  track?: string;
}): { success: boolean; student?: Student; message: string } {
  const students = getStudents();
  const trimmedUsername = params.username.trim().toLowerCase();
  const trimmedPassword = params.password.trim();
  const trimmedEmail = params.email.trim().toLowerCase();

  // Basic validation
  if (!trimmedUsername || trimmedUsername.length < 3) {
    return { success: false, message: 'Username must be at least 3 characters long.' };
  }
  if (!trimmedPassword || trimmedPassword.length < 4) {
    return { success: false, message: 'Password must be at least 4 characters long.' };
  }
  if (!params.fullName.trim()) {
    return { success: false, message: 'Please enter your full legal name.' };
  }

  // Check username uniqueness
  const existingUser = students.find(s => s.username && s.username.toLowerCase() === trimmedUsername);
  if (existingUser) {
    return { success: false, message: `Username "${params.username}" is already taken. Please choose another.` };
  }

  // Check email uniqueness if provided
  if (trimmedEmail) {
    const existingEmail = students.find(s => s.email && s.email.toLowerCase() === trimmedEmail);
    if (existingEmail) {
      return { success: false, message: `An account with email "${params.email}" already exists.` };
    }
  }

  // Auto-generate student ID
  const nextNumber = 1000 + students.length + 1;
  const newStudentId = `STD-${nextNumber}`;

  const newStudent: Student = {
    id: `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    studentId: newStudentId,
    username: trimmedUsername,
    password: trimmedPassword,
    fullName: params.fullName.trim(),
    email: trimmedEmail || `${trimmedUsername}@opraldedutech.com`,
    phone: params.phone?.trim() || '+1 (555) 000-0000',
    pin: trimmedPassword.length <= 6 ? trimmedPassword : trimmedPassword.substring(0, 4),
    cohort: params.cohort || 'Cohort 2026-A',
    track: params.track || 'Full-Stack Web Development',
    status: 'active',
    registeredAt: new Date().toISOString(),
  };

  const updatedStudents = [newStudent, ...students];
  saveStudents(updatedStudents);

  return {
    success: true,
    student: newStudent,
    message: `Account created successfully! Welcome, ${newStudent.fullName}.`,
  };
}

// --- Training Sessions ---
export function getTrainingSessions(): TrainingSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    if (!raw) {
      saveTrainingSessions(INITIAL_SESSIONS);
      return INITIAL_SESSIONS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_SESSIONS;
  }
}

export function saveTrainingSessions(sessions: TrainingSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  } catch (e) {
    console.error('Failed to save sessions to localStorage', e);
  }
}

// --- Attendance Records ---
export function getAttendanceRecords(): AttendanceRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    if (!raw) {
      saveAttendanceRecords(INITIAL_ATTENDANCE);
      return INITIAL_ATTENDANCE;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_ATTENDANCE;
  }
}

export function saveAttendanceRecords(records: AttendanceRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to save attendance records to localStorage', e);
  }
}

/**
 * Gets the latest attendance record for a student to know if they are currently signed in
 */
export function getStudentActiveStatus(studentId: string): {
  isSignedIn: boolean;
  lastRecord?: AttendanceRecord;
} {
  const records = getAttendanceRecords();
  const studentRecords = records
    .filter(r => r.studentId.toUpperCase() === studentId.toUpperCase())
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (studentRecords.length === 0) {
    return { isSignedIn: false };
  }

  const latest = studentRecords[0];
  return {
    isSignedIn: latest.type === 'sign_in',
    lastRecord: latest,
  };
}

/**
 * Records a student sign-in and dispatches to Google Apps Script
 */
export async function recordSignIn(params: {
  student: Student;
  sessionId: string;
  sessionName: string;
  room: string;
  notes?: string;
}): Promise<{ record: AttendanceRecord; syncMessage: string }> {
  const records = getAttendanceRecords();
  const settings = getSettings();

  const newRecord: AttendanceRecord = {
    id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    studentId: params.student.studentId,
    studentName: params.student.fullName,
    timestamp: new Date().toISOString(),
    type: 'sign_in',
    sessionId: params.sessionId,
    sessionName: params.sessionName,
    room: params.room,
    notes: params.notes || '',
    syncStatus: settings.googleAppsScriptUrl ? 'pending' : 'synced',
  };

  records.unshift(newRecord);
  saveAttendanceRecords(records);

  let syncMessage = 'Saved to database.';

  if (settings.googleAppsScriptUrl) {
    const res = await sendToGoogleAppsScript(settings.googleAppsScriptUrl, {
      action: 'sign_in',
      record: newRecord,
    });
    if (res.success) {
      newRecord.syncStatus = 'synced';
      newRecord.syncedAt = new Date().toISOString();
      saveAttendanceRecords(records);
      syncMessage = `Synced to Google Sheets & notification sent to ${settings.notificationEmail}`;
    } else {
      newRecord.syncStatus = 'failed';
      newRecord.syncedError = res.message;
      saveAttendanceRecords(records);
      syncMessage = `Saved locally (Webhook pending: ${res.message})`;
    }
  }

  return { record: newRecord, syncMessage };
}

/**
 * Records a student sign-out and dispatches to Google Apps Script
 */
export async function recordSignOut(params: {
  student: Student;
  notes?: string;
}): Promise<{ record: AttendanceRecord; syncMessage: string }> {
  const records = getAttendanceRecords();
  const settings = getSettings();
  const activeStatus = getStudentActiveStatus(params.student.studentId);

  let durationMinutes = 0;
  let sessionName = 'General Session';
  let room = 'Main Campus';
  let sessionId = 'general';

  if (activeStatus.lastRecord && activeStatus.lastRecord.type === 'sign_in') {
    const signInTime = new Date(activeStatus.lastRecord.timestamp).getTime();
    const nowTime = Date.now();
    durationMinutes = Math.max(1, Math.round((nowTime - signInTime) / (1000 * 60)));
    sessionName = activeStatus.lastRecord.sessionName;
    room = activeStatus.lastRecord.room;
    sessionId = activeStatus.lastRecord.sessionId;
  }

  const newRecord: AttendanceRecord = {
    id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    studentId: params.student.studentId,
    studentName: params.student.fullName,
    timestamp: new Date().toISOString(),
    type: 'sign_out',
    sessionId,
    sessionName,
    room,
    durationMinutes,
    notes: params.notes || '',
    syncStatus: settings.googleAppsScriptUrl ? 'pending' : 'synced',
  };

  records.unshift(newRecord);
  saveAttendanceRecords(records);

  let syncMessage = 'Saved to database.';

  if (settings.googleAppsScriptUrl) {
    const res = await sendToGoogleAppsScript(settings.googleAppsScriptUrl, {
      action: 'sign_out',
      record: newRecord,
    });
    if (res.success) {
      newRecord.syncStatus = 'synced';
      newRecord.syncedAt = new Date().toISOString();
      saveAttendanceRecords(records);
      syncMessage = `Sign-out registered in Google Sheets & notified to ${settings.notificationEmail}`;
    } else {
      newRecord.syncStatus = 'failed';
      newRecord.syncedError = res.message;
      saveAttendanceRecords(records);
      syncMessage = `Saved locally (Webhook pending: ${res.message})`;
    }
  }

  return { record: newRecord, syncMessage };
}

// --- Excuses Records ---
export function getExcuseRecords(): ExcuseRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EXCUSES);
    if (!raw) {
      saveExcuseRecords(INITIAL_EXCUSES);
      return INITIAL_EXCUSES;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_EXCUSES;
  }
}

export function saveExcuseRecords(records: ExcuseRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.EXCUSES, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to save excuse records to localStorage', e);
  }
}

export async function submitExcuseRecord(params: {
  student: Student;
  absenceStartDate: string;
  absenceEndDate: string;
  reasonCategory: ExcuseRecord['reasonCategory'];
  justification: string;
  affectedSessions: string[];
}): Promise<{ record: ExcuseRecord; syncMessage: string }> {
  const records = getExcuseRecords();
  const settings = getSettings();

  const newRecord: ExcuseRecord = {
    id: `exc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    studentId: params.student.studentId,
    studentName: params.student.fullName,
    studentEmail: params.student.email,
    submissionDate: new Date().toISOString(),
    absenceStartDate: params.absenceStartDate,
    absenceEndDate: params.absenceEndDate,
    reasonCategory: params.reasonCategory,
    justification: params.justification,
    affectedSessions: params.affectedSessions,
    status: 'pending',
    syncStatus: settings.googleAppsScriptUrl ? 'pending' : 'synced',
  };

  records.unshift(newRecord);
  saveExcuseRecords(records);

  let syncMessage = 'Excuse recorded.';

  if (settings.googleAppsScriptUrl) {
    const res = await sendToGoogleAppsScript(settings.googleAppsScriptUrl, {
      action: 'excuse_submission',
      record: newRecord,
    });
    if (res.success) {
      newRecord.syncStatus = 'synced';
      newRecord.syncedAt = new Date().toISOString();
      saveExcuseRecords(records);
      syncMessage = `Forwarded to Google Sheets & alerted ${settings.notificationEmail} via MailApp!`;
    } else {
      newRecord.syncStatus = 'failed';
      newRecord.syncedError = res.message;
      saveExcuseRecords(records);
      syncMessage = `Saved locally (Email dispatch pending connection)`;
    }
  }

  return { record: newRecord, syncMessage };
}

export function updateExcuseStatus(
  excuseId: string,
  status: ExcuseRecord['status'],
  adminNotes?: string
): boolean {
  const records = getExcuseRecords();
  const index = records.findIndex(r => r.id === excuseId);
  if (index === -1) return false;

  records[index] = {
    ...records[index],
    status,
    adminNotes: adminNotes ?? records[index].adminNotes,
  };

  saveExcuseRecords(records);
  return true;
}
