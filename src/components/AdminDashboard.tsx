import React, { useState } from 'react';
import { 
  ShieldCheck, Users, Clock, FileText, Settings, KeyRound, 
  Search, Download, Plus, CheckCircle2, XCircle, AlertCircle, 
  Copy, ExternalLink, RefreshCw, Send, Check, Trash2, Edit3, Lock
} from 'lucide-react';
import { 
  Student, TrainingSession, AttendanceRecord, ExcuseRecord, 
  AppSettings 
} from '../types';
import { 
  saveStudents, saveTrainingSessions, saveSettings, 
  updateExcuseStatus, recordSignIn, recordSignOut 
} from '../services/storageService';
import { 
  getGoogleAppsScriptTemplate, sendToGoogleAppsScript 
} from '../services/googleSheetsAppsScript';

interface AdminDashboardProps {
  students: Student[];
  trainingSessions: TrainingSession[];
  attendanceRecords: AttendanceRecord[];
  excuseRecords: ExcuseRecord[];
  settings: AppSettings;
  adminUnlocked: boolean;
  onAdminUnlock: () => void;
  onAdminLock: () => void;
  onDataUpdated: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  students,
  trainingSessions,
  attendanceRecords,
  excuseRecords,
  settings,
  adminUnlocked,
  onAdminUnlock,
  onAdminLock,
  onDataUpdated,
}) => {
  // Master PIN Challenge State
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');

  // Active sub-tab
  const [adminTab, setAdminTab] = useState<'attendance' | 'excuses' | 'roster' | 'schedules' | 'integrations'>('attendance');

  // Attendance filter & search
  const [attendanceSearch, setAttendanceSearch] = useState<string>('');
  const [attendanceFilterType, setAttendanceFilterType] = useState<'all' | 'sign_in' | 'sign_out'>('all');

  // Excuse filter
  const [excuseFilterStatus, setExcuseFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedExcuseForReview, setSelectedExcuseForReview] = useState<ExcuseRecord | null>(null);
  const [reviewAdminNote, setReviewAdminNote] = useState<string>('');

  // Add Student Modal State
  const [isAddStudentOpen, setIsAddStudentOpen] = useState<boolean>(false);
  const [newStudentId, setNewStudentId] = useState<string>('');
  const [newStudentUsername, setNewStudentUsername] = useState<string>('');
  const [newStudentPassword, setNewStudentPassword] = useState<string>('password123');
  const [newStudentName, setNewStudentName] = useState<string>('');
  const [newStudentEmail, setNewStudentEmail] = useState<string>('');
  const [newStudentPhone, setNewStudentPhone] = useState<string>('');
  const [newStudentPin, setNewStudentPin] = useState<string>('1234');
  const [newStudentTrack, setNewStudentTrack] = useState<string>('Full-Stack Web Development');
  const [newStudentCohort, setNewStudentCohort] = useState<string>('Cohort 2026-A');

  // Add Training Session Modal State
  const [isAddSessionOpen, setIsAddSessionOpen] = useState<boolean>(false);
  const [newSessionCode, setNewSessionCode] = useState<string>('');
  const [newSessionTitle, setNewSessionTitle] = useState<string>('');
  const [newSessionInstructor, setNewSessionInstructor] = useState<string>('');
  const [newSessionTrack, setNewSessionTrack] = useState<string>('Full-Stack Web Development');
  const [newSessionDay, setNewSessionDay] = useState<string>('Monday, Wednesday');
  const [newSessionStart, setNewSessionStart] = useState<string>('09:00');
  const [newSessionEnd, setNewSessionEnd] = useState<string>('12:00');
  const [newSessionRoom, setNewSessionRoom] = useState<string>('Lab 1');
  const [newSessionDesc, setNewSessionDesc] = useState<string>('');

  // Manual Check-in / Check-out Modal State
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [manualStudentId, setManualStudentId] = useState<string>('');
  const [manualActionType, setManualActionType] = useState<'sign_in' | 'sign_out'>('sign_in');
  const [manualSessionId, setManualSessionId] = useState<string>('');
  const [manualRoom, setManualRoom] = useState<string>('Main Lab');
  const [manualNotes, setManualNotes] = useState<string>('Staff override check-in');

  // Integration Hub State
  const [scriptUrlInput, setScriptUrlInput] = useState<string>(settings.googleAppsScriptUrl || '');
  const [targetEmailInput, setTargetEmailInput] = useState<string>(settings.notificationEmail || 'opraldedutechconsult@gmail.com');
  const [newMasterPin, setNewMasterPin] = useState<string>(settings.adminPin || '8899');
  const [isTestingPing, setIsTestingPing] = useState<boolean>(false);
  const [pingResult, setPingResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [settingsSavedMessage, setSettingsSavedMessage] = useState<string>('');

  // Handle PIN verification
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === settings.adminPin.trim()) {
      setPinError('');
      setPinInput('');
      onAdminUnlock();
    } else {
      setPinError('Incorrect Master PIN. Default PIN is 8899.');
    }
  };

  // CSV Export
  const handleExportAttendanceCsv = () => {
    const headers = ['ID', 'Timestamp', 'Student ID', 'Student Name', 'Action', 'Session', 'Room', 'Duration (Mins)', 'Notes'];
    const rows = attendanceRecords.map(r => [
      `"${r.id}"`,
      `"${r.timestamp}"`,
      `"${r.studentId}"`,
      `"${r.studentName}"`,
      `"${r.type.toUpperCase()}"`,
      `"${r.sessionName}"`,
      `"${r.room}"`,
      r.durationMinutes || 0,
      `"${(r.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `oprald_attendance_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Add Student Handler
  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentId || !newStudentName) return;

    const cleanUsername = (newStudentUsername.trim() || newStudentName.trim().toLowerCase().replace(/\s+/g, '_')).toLowerCase();
    const cleanPassword = newStudentPassword.trim() || newStudentPin.trim() || 'password123';

    const newStudent: Student = {
      id: `std_${Date.now()}`,
      studentId: newStudentId.trim().toUpperCase(),
      username: cleanUsername,
      password: cleanPassword,
      fullName: newStudentName.trim(),
      email: newStudentEmail.trim() || `${cleanUsername}@opraldedutech.com`,
      phone: newStudentPhone.trim() || '+1 (555) 000-0000',
      pin: newStudentPin.trim() || '1234',
      cohort: newStudentCohort,
      track: newStudentTrack,
      status: 'active',
      registeredAt: new Date().toISOString(),
    };

    saveStudents([newStudent, ...students]);
    setIsAddStudentOpen(false);
    setNewStudentId('');
    setNewStudentUsername('');
    setNewStudentPassword('password123');
    setNewStudentName('');
    setNewStudentEmail('');
    setNewStudentPhone('');
    onDataUpdated();
  };

  // Add Session Handler
  const handleAddSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionCode || !newSessionTitle) return;

    const newSession: TrainingSession = {
      id: `sess_${Date.now()}`,
      code: newSessionCode.trim().toUpperCase(),
      title: newSessionTitle.trim(),
      instructor: newSessionInstructor.trim() || 'Staff Instructor',
      track: newSessionTrack,
      dayOfWeek: newSessionDay,
      startTime: newSessionStart,
      endTime: newSessionEnd,
      room: newSessionRoom,
      capacity: 25,
      enrolledCount: 0,
      description: newSessionDesc || 'Comprehensive hands-on training module.',
    };

    saveTrainingSessions([...trainingSessions, newSession]);
    setIsAddSessionOpen(false);
    setNewSessionCode('');
    setNewSessionTitle('');
    setNewSessionDesc('');
    onDataUpdated();
  };

  // Delete Session
  const handleDeleteSession = (sessionId: string) => {
    if (confirm('Are you sure you want to remove this training session?')) {
      const updated = trainingSessions.filter(s => s.id !== sessionId);
      saveTrainingSessions(updated);
      onDataUpdated();
    }
  };

  // Toggle student active status
  const handleToggleStudentStatus = (studentId: string) => {
    const updated = students.map(s => {
      if (s.id === studentId) {
        return { ...s, status: s.status === 'active' ? 'inactive' : 'active' } as Student;
      }
      return s;
    });
    saveStudents(updated);
    onDataUpdated();
  };

  // Review Excuse Submit
  const handleReviewExcuse = (status: 'approved' | 'rejected') => {
    if (!selectedExcuseForReview) return;
    updateExcuseStatus(selectedExcuseForReview.id, status, reviewAdminNote);
    setSelectedExcuseForReview(null);
    setReviewAdminNote('');
    onDataUpdated();
  };

  // Save Settings & Webhook
  const handleSaveSettings = () => {
    const updated: AppSettings = {
      ...settings,
      googleAppsScriptUrl: scriptUrlInput.trim(),
      notificationEmail: targetEmailInput.trim(),
      adminPin: newMasterPin.trim() || '8899',
    };
    saveSettings(updated);
    setSettingsSavedMessage('Configuration updated successfully!');
    setTimeout(() => setSettingsSavedMessage(''), 3000);
    onDataUpdated();
  };

  // Test Ping to Google Apps Script
  const handleTestPing = async () => {
    if (!scriptUrlInput.trim()) {
      setPingResult({
        success: false,
        message: 'Please paste your Google Apps Script Web App URL first.',
      });
      return;
    }

    setIsTestingPing(true);
    setPingResult(null);

    const res = await sendToGoogleAppsScript(scriptUrlInput.trim(), {
      action: 'ping',
      testedAt: new Date().toISOString(),
    });

    setIsTestingPing(false);
    setPingResult(res);
  };

  // Copy Apps Script Code
  const handleCopyScript = () => {
    const code = getGoogleAppsScriptTemplate(targetEmailInput || settings.notificationEmail);
    navigator.clipboard.writeText(code);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  // Perform manual check-in or out
  const handleManualAction = async (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find(s => s.studentId === manualStudentId);
    if (!student) {
      alert('Please select a student.');
      return;
    }

    const session = trainingSessions.find(s => s.id === manualSessionId);
    const sessionName = session ? session.title : 'Admin Direct Session';

    if (manualActionType === 'sign_in') {
      await recordSignIn({
        student,
        sessionId: manualSessionId || 'admin_manual',
        sessionName,
        room: manualRoom,
        notes: `[Admin Override] ${manualNotes}`,
      });
    } else {
      await recordSignOut({
        student,
        notes: `[Admin Override] ${manualNotes}`,
      });
    }

    setIsManualModalOpen(false);
    onDataUpdated();
  };

  // If Admin is NOT unlocked, show PIN Pad Gate
  if (!adminUnlocked) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 sm:px-6">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          
          <div className="bg-gradient-to-r from-slate-900 to-amber-950 p-6 text-white text-center">
            <div className="w-14 h-14 bg-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner ring-4 ring-amber-500/20">
              <Lock className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Admin Dashboard Locked</h2>
            <p className="text-xs text-amber-200/90 mt-1">
              Secured behind Master PIN to protect student records, rosters, and Google Sheets configurations.
            </p>
          </div>

          <div className="p-6 sm:p-8">
            <form onSubmit={handlePinSubmit} className="space-y-4">
              {pinError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Enter Master Admin PIN
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    id="input-master-pin"
                    type="password"
                    required
                    maxLength={8}
                    placeholder="&bull;&bull;&bull;&bull;"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 text-base tracking-widest bg-white"
                  />
                </div>
              </div>

              <button
                id="btn-submit-master-pin"
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-semibold text-sm shadow-md transition cursor-pointer"
              >
                Verify Master PIN &amp; Unlock
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Default Master PIN:</span>
              <button
                type="button"
                onClick={() => setPinInput('8899')}
                className="font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded hover:bg-amber-100 transition cursor-pointer"
              >
                8899 (Click to autofill)
              </button>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // Calculate high-level stats
  const activeSignIns = students.filter(s => {
    const studentRecords = attendanceRecords
      .filter(r => r.studentId.toUpperCase() === s.studentId.toUpperCase())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return studentRecords.length > 0 && studentRecords[0].type === 'sign_in';
  }).length;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecords = attendanceRecords.filter(r => r.timestamp.startsWith(todayStr));
  const pendingExcuses = excuseRecords.filter(e => e.status === 'pending').length;

  // Filtered attendance records
  const filteredAttendance = attendanceRecords.filter(r => {
    const matchesSearch = 
      r.studentName.toLowerCase().includes(attendanceSearch.toLowerCase()) ||
      r.studentId.toLowerCase().includes(attendanceSearch.toLowerCase()) ||
      r.sessionName.toLowerCase().includes(attendanceSearch.toLowerCase());
    
    const matchesType = attendanceFilterType === 'all' || r.type === attendanceFilterType;
    return matchesSearch && matchesType;
  });

  // Filtered excuses
  const filteredExcuses = excuseRecords.filter(e => {
    if (excuseFilterStatus === 'all') return true;
    return e.status === excuseFilterStatus;
  });

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      
      {/* Top Banner & Quick Metrics */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Master PIN Authenticated
              </span>
              <span className="text-xs text-slate-400">&bull;</span>
              <span className="text-xs text-slate-300">{settings.organizationName}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight mt-1 text-white">
              Institutional Admin Dashboard
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Live attendance oversight, excuse review queue, student rosters, and Google Apps Script MailApp backend.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              id="btn-open-manual-check"
              onClick={() => {
                if (students.length > 0) setManualStudentId(students[0].studentId);
                if (trainingSessions.length > 0) setManualSessionId(trainingSessions[0].id);
                setIsManualModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow transition flex items-center space-x-1.5 cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Manual Check-In/Out</span>
            </button>

            <button
              id="btn-admin-lock-dashboard"
              onClick={onAdminLock}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition flex items-center space-x-1.5 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Lock Dashboard</span>
            </button>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/60">
            <div className="text-xs font-medium text-slate-400">Students On-Site Now</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1 flex items-baseline gap-2">
              <span>{activeSignIns}</span>
              <span className="text-xs text-slate-400 font-normal">/ {students.length} enrolled</span>
            </div>
          </div>

          <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/60">
            <div className="text-xs font-medium text-slate-400">Today's Check-ins</div>
            <div className="text-2xl font-bold text-indigo-400 mt-1">
              {todayRecords.filter(r => r.type === 'sign_in').length}
            </div>
          </div>

          <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/60">
            <div className="text-xs font-medium text-slate-400">Pending Absence Excuses</div>
            <div className="text-2xl font-bold text-amber-400 mt-1 flex items-baseline gap-2">
              <span>{pendingExcuses}</span>
              <span className="text-xs text-slate-400 font-normal">awaiting review</span>
            </div>
          </div>

          <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/60">
            <div className="text-xs font-medium text-slate-400">Forwarding Target</div>
            <div className="text-xs font-bold text-slate-200 mt-1.5 font-mono truncate" title={settings.notificationEmail}>
              {settings.notificationEmail}
            </div>
          </div>
        </div>
      </div>

      {/* Admin Sub-Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          id="admin-tab-attendance"
          onClick={() => setAdminTab('attendance')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
            adminTab === 'attendance'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Attendance Logs ({attendanceRecords.length})</span>
        </button>

        <button
          id="admin-tab-excuses"
          onClick={() => setAdminTab('excuses')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
            adminTab === 'excuses'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Absence Excuses</span>
          {pendingExcuses > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white text-amber-800 font-bold">
              {pendingExcuses}
            </span>
          )}
        </button>

        <button
          id="admin-tab-roster"
          onClick={() => setAdminTab('roster')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
            adminTab === 'roster'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Student Roster ({students.length})</span>
        </button>

        <button
          id="admin-tab-schedules"
          onClick={() => setAdminTab('schedules')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
            adminTab === 'schedules'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Training Schedules ({trainingSessions.length})</span>
        </button>

        <button
          id="admin-tab-integrations"
          onClick={() => setAdminTab('integrations')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
            adminTab === 'integrations'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Google Sheets &amp; MailApp Engine</span>
        </button>
      </div>

      {/* SUB-TAB 1: ATTENDANCE LOGS */}
      {adminTab === 'attendance' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden space-y-4">
          
          {/* Controls Bar */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="input-search-attendance"
                  type="text"
                  placeholder="Search student name, ID, session..."
                  value={attendanceSearch}
                  onChange={(e) => setAttendanceSearch(e.target.value)}
                  className="pl-9 pr-3.5 py-2 rounded-lg border border-slate-300 text-xs w-64 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <select
                id="select-filter-action-type"
                value={attendanceFilterType}
                onChange={(e) => setAttendanceFilterType(e.target.value as any)}
                className="px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-700 focus:outline-none"
              >
                <option value="all">All Actions (Sign-In &amp; Out)</option>
                <option value="sign_in">Sign-In Only</option>
                <option value="sign_out">Sign-Out Only</option>
              </select>
            </div>

            <button
              id="btn-export-csv"
              onClick={handleExportAttendanceCsv}
              className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition flex items-center space-x-1.5 self-start md:self-auto cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV for Google Sheets</span>
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Student ID &amp; Name</th>
                  <th className="py-3 px-4">Date &amp; Time</th>
                  <th className="py-3 px-4">Session</th>
                  <th className="py-3 px-4">Room</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4">Database Sync</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No attendance records matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredAttendance.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          rec.type === 'sign_in' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {rec.type === 'sign_in' ? 'Sign In' : 'Sign Out'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{rec.studentName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{rec.studentId}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <div>{new Date(rec.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">{rec.sessionName}</td>
                      <td className="py-3 px-4 text-slate-600">{rec.room}</td>
                      <td className="py-3 px-4 font-mono text-slate-800">
                        {rec.durationMinutes ? `${rec.durationMinutes} mins` : '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={rec.notes}>
                        {rec.notes || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Recorded
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* SUB-TAB 2: ABSENCE EXCUSES */}
      {adminTab === 'excuses' && (
        <div className="space-y-4">
          
          {/* Header filter */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Student Absence Excuses Queue</h3>
              <p className="text-xs text-slate-500">
                Review submitted medical notices, exam conflicts, and official leave requests.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-600">Filter Status:</span>
              <select
                id="select-filter-excuses-status"
                value={excuseFilterStatus}
                onChange={(e) => setExcuseFilterStatus(e.target.value as any)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-800"
              >
                <option value="all">All ({excuseRecords.length})</option>
                <option value="pending">Pending ({excuseRecords.filter(e => e.status === 'pending').length})</option>
                <option value="approved">Approved ({excuseRecords.filter(e => e.status === 'approved').length})</option>
                <option value="rejected">Rejected ({excuseRecords.filter(e => e.status === 'rejected').length})</option>
              </select>
            </div>
          </div>

          {/* List of Excuses */}
          <div className="grid grid-cols-1 gap-4">
            {filteredExcuses.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center text-slate-400 text-sm border border-slate-200">
                No absence excuses in this category.
              </div>
            ) : (
              filteredExcuses.map((exc) => (
                <div key={exc.id} className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-base">{exc.studentName}</span>
                        <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          {exc.studentId}
                        </span>
                        <span className="text-xs text-slate-500">&bull; {exc.studentEmail}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Submitted: {new Date(exc.submissionDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at{' '}
                        {new Date(exc.submissionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-1 rounded text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {exc.reasonCategory}
                      </span>
                      <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                        exc.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : exc.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {exc.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-500 block">Absence Date Range:</span>
                      <strong className="text-slate-800 font-semibold">{exc.absenceStartDate} &rarr; {exc.absenceEndDate}</strong>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-slate-500 block">Affected Training Sessions:</span>
                      <span className="text-slate-800 font-medium">
                        {Array.isArray(exc.affectedSessions) ? exc.affectedSessions.join(', ') : exc.affectedSessions}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-slate-700">Reason &amp; Justification:</span>
                    <p className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200 mt-1 leading-relaxed">
                      {exc.justification}
                    </p>
                  </div>

                  {exc.adminNotes && (
                    <div className="text-xs bg-indigo-50 p-2.5 rounded-lg border border-indigo-100 text-indigo-900">
                      <strong>Admin Resolution Note:</strong> {exc.adminNotes}
                    </div>
                  )}

                  {/* Review Action Controls */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Send className="w-3 h-3 text-slate-400" />
                      Alert forwarded to: <strong className="text-slate-700">{settings.notificationEmail}</strong>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        id={`btn-review-excuse-${exc.id}`}
                        onClick={() => {
                          setSelectedExcuseForReview(exc);
                          setReviewAdminNote(exc.adminNotes || '');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer"
                      >
                        Update Status / Remarks
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      )}

      {/* SUB-TAB 3: STUDENT ROSTER */}
      {adminTab === 'roster' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden space-y-4">
          
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Enrolled Student Roster</h3>
              <p className="text-xs text-slate-500">
                Manage student credentials, security PINs, training tracks, and enrollment statuses.
              </p>
            </div>

            <button
              id="btn-open-add-student"
              onClick={() => setIsAddStudentOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Enroll New Student</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Login Username</th>
                  <th className="py-3 px-4">Password</th>
                  <th className="py-3 px-4">Training Track</th>
                  <th className="py-3 px-4">Cohort</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {students.map((std) => (
                  <tr key={std.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">{std.studentId}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{std.fullName}</td>
                    <td className="py-3 px-4 font-mono text-indigo-700">
                      <span className="bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded font-semibold text-[11px]">
                        {std.username || std.studentId.toLowerCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                        {std.password || std.pin}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{std.track}</td>
                    <td className="py-3 px-4 text-slate-600">{std.cohort}</td>
                    <td className="py-3 px-4 text-slate-500">
                      <div>{std.email}</div>
                      <div className="text-[11px]">{std.phone}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        std.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {std.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleStudentStatus(std.id)}
                        className="text-xs text-indigo-600 hover:text-indigo-900 font-medium underline cursor-pointer"
                      >
                        {std.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* SUB-TAB 4: TRAINING SCHEDULES */}
      {adminTab === 'schedules' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Training Session Master Schedules</h3>
              <p className="text-xs text-slate-500">
                Configure timetable, classroom locations, assigned instructors, and track cohorts.
              </p>
            </div>

            <button
              id="btn-open-add-session"
              onClick={() => setIsAddSessionOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Training Session</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trainingSessions.map((sess) => (
              <div key={sess.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      {sess.code}
                    </span>
                    <button
                      onClick={() => handleDeleteSession(sess.id)}
                      title="Remove Session"
                      className="text-slate-400 hover:text-red-600 p-1 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm">{sess.title}</h4>
                  <p className="text-xs text-slate-600">{sess.description}</p>

                  <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                    <div><strong>Track:</strong> {sess.track}</div>
                    <div><strong>Timetable:</strong> {sess.dayOfWeek} ({sess.startTime} - {sess.endTime})</div>
                    <div><strong>Room:</strong> {sess.room}</div>
                    <div><strong>Instructor:</strong> {sess.instructor}</div>
                  </div>
                </div>

                <div className="pt-2 text-xs text-slate-500 flex items-center justify-between">
                  <span>Capacity: {sess.capacity} seats</span>
                  <span className="text-emerald-700 font-semibold">Active Session</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 5: GOOGLE SHEETS & MAILAPP WEBHOOK ENGINE */}
      {adminTab === 'integrations' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left: Configuration Form */}
          <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-5">
              
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-2 text-indigo-600 mb-1">
                  <Settings className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-wider">Cloud Synchronization &amp; Alerts</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  Google Apps Script &amp; MailApp Configuration
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Connect your Google Spreadsheet to log all attendance data in real time and trigger MailApp emails to administration.
                </p>
              </div>

              {settingsSavedMessage && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{settingsSavedMessage}</span>
                </div>
              )}

              {/* Webhook URL input */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Google Apps Script Web App URL
                </label>
                <div className="flex space-x-2">
                  <input
                    id="input-google-script-url"
                    type="url"
                    placeholder="https://script.google.com/macros/s/.../exec"
                    value={scriptUrlInput}
                    onChange={(e) => setScriptUrlInput(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs font-mono text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    id="btn-test-script-ping"
                    type="button"
                    disabled={isTestingPing}
                    onClick={handleTestPing}
                    className="px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition flex items-center space-x-1.5 shrink-0 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingPing ? 'animate-spin' : ''}`} />
                    <span>{isTestingPing ? 'Pinging...' : 'Test Connection'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Must be deployed as a Web App with access set to &ldquo;Anyone&rdquo;.
                </p>
              </div>

              {/* Ping Result Alert */}
              {pingResult && (
                <div className={`p-3 rounded-lg text-xs flex items-start space-x-2 ${
                  pingResult.success 
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-900' 
                    : 'bg-red-50 border border-red-200 text-red-900'
                }`}>
                  {pingResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-bold">{pingResult.success ? 'Connection Operational' : 'Connection Notice'}</div>
                    <div className="text-[11px] mt-0.5">{pingResult.message}</div>
                  </div>
                </div>
              )}

              {/* Target Notification Email */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Notification Recipient Email (MailApp Destination)
                </label>
                <input
                  id="input-target-notification-email"
                  type="email"
                  required
                  value={targetEmailInput}
                  onChange={(e) => setTargetEmailInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <p className="text-[11px] text-slate-500">
                  Default: <strong className="text-slate-800">opraldedutechconsult@gmail.com</strong>. Every check-in, check-out, and excuse triggers an email here.
                </p>
              </div>

              {/* Master Admin PIN */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Master Admin PIN
                </label>
                <input
                  id="input-change-admin-pin"
                  type="text"
                  maxLength={8}
                  value={newMasterPin}
                  onChange={(e) => setNewMasterPin(e.target.value)}
                  className="w-48 px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs font-mono text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-500">
                  Used to lock down this dashboard from unauthorized student access.
                </p>
              </div>

              <div className="pt-2">
                <button
                  id="btn-save-admin-settings"
                  type="button"
                  onClick={handleSaveSettings}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow transition cursor-pointer"
                >
                  Save Integration Settings
                </button>
              </div>

            </div>

            {/* Google Apps Script Code Preview */}
            <div className="bg-slate-900 text-slate-200 rounded-2xl p-6 shadow-md border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Google Apps Script Backend Code</h4>
                  <p className="text-xs text-slate-400">Pre-configured with sheet writers and MailApp forwarders.</p>
                </div>

                <button
                  id="btn-copy-google-apps-script"
                  onClick={handleCopyScript}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer"
                >
                  {copiedScript ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Full Script</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative">
                <pre className="bg-slate-950 p-4 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto max-h-64 border border-slate-800/80">
                  {getGoogleAppsScriptTemplate(targetEmailInput || settings.notificationEmail)}
                </pre>
              </div>
            </div>

          </div>

          {/* Right: Step-by-Step Instructions */}
          <div className="space-y-6">
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-indigo-600" />
                <span>2-Minute Google Sheets Setup</span>
              </h4>

              <ol className="text-xs text-slate-600 space-y-3 list-decimal list-inside leading-relaxed">
                <li>
                  Open <strong className="text-slate-800">Google Sheets</strong> (create a fresh sheet or use an existing one).
                </li>
                <li>
                  Click <strong className="text-slate-800">Extensions &gt; Apps Script</strong>.
                </li>
                <li>
                  Click the <strong>&ldquo;Copy Full Script&rdquo;</strong> button above and paste it, replacing everything in the editor.
                </li>
                <li>
                  Click <strong className="text-slate-800">Deploy &gt; New deployment</strong>.
                </li>
                <li>
                  Select type: <strong className="text-slate-800">Web app</strong>.
                </li>
                <li>
                  Set <em>&ldquo;Execute as&rdquo;</em> to <strong className="text-slate-800">Me</strong>.
                </li>
                <li>
                  Set <em>&ldquo;Who has access&rdquo;</em> to <strong className="text-indigo-600">Anyone</strong> (essential for webhook dispatch).
                </li>
                <li>
                  Click <strong className="text-slate-800">Deploy</strong> and grant permissions.
                </li>
                <li>
                  Copy the generated <strong className="text-slate-800">Web app URL</strong> into the field on the left and click <strong>Test Connection</strong>!
                </li>
              </ol>

              <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 text-xs text-indigo-900">
                <strong>Automatic Provisioning:</strong> The script automatically creates the <span className="font-mono font-semibold">Attendance_Log</span> and <span className="font-mono font-semibold">Absence_Excuses</span> sheets on the first submission!
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Review Excuse Modal */}
      {selectedExcuseForReview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Review Student Absence Excuse</h3>
              <button
                onClick={() => setSelectedExcuseForReview(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="text-xs space-y-2 bg-slate-50 p-3.5 rounded-xl">
              <div><strong>Student:</strong> {selectedExcuseForReview.studentName} ({selectedExcuseForReview.studentId})</div>
              <div><strong>Category:</strong> {selectedExcuseForReview.reasonCategory}</div>
              <div><strong>Absence Period:</strong> {selectedExcuseForReview.absenceStartDate} to {selectedExcuseForReview.absenceEndDate}</div>
              <div><strong>Justification:</strong> &ldquo;{selectedExcuseForReview.justification}&rdquo;</div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Admin Resolution / Feedback Notes
              </label>
              <textarea
                rows={3}
                value={reviewAdminNote}
                onChange={(e) => setReviewAdminNote(e.target.value)}
                placeholder="e.g. Approved. Student instructed to complete self-paced lab by next Friday."
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-800"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => handleReviewExcuse('rejected')}
                className="px-4 py-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold transition cursor-pointer"
              >
                Reject Excuse
              </button>
              <button
                type="button"
                onClick={() => handleReviewExcuse('approved')}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer"
              >
                Approve Excuse
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enroll Student Modal */}
      {isAddStudentOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Enroll New Student</h3>
              <button
                onClick={() => setIsAddStudentOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Student ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. STD-1006"
                  value={newStudentId}
                  onChange={(e) => setNewStudentId(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Folake Adeyemi"
                  value={newStudentName}
                  onChange={(e) => {
                    setNewStudentName(e.target.value);
                    if (!newStudentUsername) {
                      setNewStudentUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'));
                    }
                  }}
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Login Username</label>
                  <input
                    type="text"
                    placeholder="e.g. folake_a"
                    value={newStudentUsername}
                    onChange={(e) => setNewStudentUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-slate-800"
                  />
                  <span className="text-[10px] text-slate-400">Used by student to log in</span>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Login Password</label>
                  <input
                    type="text"
                    placeholder="e.g. password123"
                    value={newStudentPassword}
                    onChange={(e) => setNewStudentPassword(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-slate-800"
                  />
                  <span className="text-[10px] text-slate-400">Default: password123</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Security PIN (4 digits)</label>
                  <input
                    type="password"
                    maxLength={6}
                    value={newStudentPin}
                    onChange={(e) => setNewStudentPin(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-mono tracking-wider"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cohort</label>
                  <input
                    type="text"
                    value={newStudentCohort}
                    onChange={(e) => setNewStudentCohort(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Training Track</label>
                <select
                  value={newStudentTrack}
                  onChange={(e) => setNewStudentTrack(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="Full-Stack Web Development">Full-Stack Web Development</option>
                  <option value="Data Science & Machine Learning">Data Science &amp; Machine Learning</option>
                  <option value="Cloud & DevOps Engineering">Cloud &amp; DevOps Engineering</option>
                  <option value="UI/UX Product Design">UI/UX Product Design</option>
                  <option value="Cybersecurity Operations">Cybersecurity Operations</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="folake@example.com"
                  value={newStudentEmail}
                  onChange={(e) => setNewStudentEmail(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddStudentOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Enroll Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Training Session Modal */}
      {isAddSessionOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Add Training Session</h3>
              <button
                onClick={() => setIsAddSessionOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddSession} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Course Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AI-501"
                    value={newSessionCode}
                    onChange={(e) => setNewSessionCode(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Room / Lab</label>
                  <input
                    type="text"
                    value={newSessionRoom}
                    onChange={(e) => setNewSessionRoom(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Session Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Generative AI & LLM Systems"
                  value={newSessionTitle}
                  onChange={(e) => setNewSessionTitle(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Days of Week</label>
                  <input
                    type="text"
                    value={newSessionDay}
                    onChange={(e) => setNewSessionDay(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Instructor</label>
                  <input
                    type="text"
                    value={newSessionInstructor}
                    onChange={(e) => setNewSessionInstructor(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={newSessionStart}
                    onChange={(e) => setNewSessionStart(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={newSessionEnd}
                    onChange={(e) => setNewSessionEnd(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Brief Description</label>
                <textarea
                  rows={2}
                  value={newSessionDesc}
                  onChange={(e) => setNewSessionDesc(e.target.value)}
                  placeholder="Session objectives and syllabus scope..."
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddSessionOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold"
                >
                  Create Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Check-in / Out Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Manual Staff Attendance Action</h3>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleManualAction} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Student</label>
                <select
                  value={manualStudentId}
                  onChange={(e) => setManualStudentId(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-medium"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.studentId}>
                      {s.fullName} ({s.studentId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Action Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setManualActionType('sign_in')}
                    className={`py-2 text-center rounded-lg font-bold border transition ${
                      manualActionType === 'sign_in'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualActionType('sign_out')}
                    className={`py-2 text-center rounded-lg font-bold border transition ${
                      manualActionType === 'sign_out'
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    Sign Out
                  </button>
                </div>
              </div>

              {manualActionType === 'sign_in' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Training Session</label>
                  <select
                    value={manualSessionId}
                    onChange={(e) => setManualSessionId(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 bg-white"
                  >
                    {trainingSessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        [{s.code}] {s.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Room / Lab</label>
                <input
                  type="text"
                  value={manualRoom}
                  onChange={(e) => setManualRoom(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Staff Note</label>
                <input
                  type="text"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Record Attendance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
