import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { StudentPortal } from './components/StudentPortal';
import { AdminDashboard } from './components/AdminDashboard';
import { 
  Student, TrainingSession, AttendanceRecord, ExcuseRecord, AppSettings 
} from './types';
import { 
  getStudents, getTrainingSessions, getAttendanceRecords, 
  getExcuseRecords, getSettings 
} from './services/storageService';

export default function App() {
  const [currentView, setCurrentView] = useState<'student' | 'admin'>('student');
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [adminUnlocked, setAdminUnlocked] = useState<boolean>(false);

  // Core reactive data stores
  const [students, setStudents] = useState<Student[]>([]);
  const [trainingSessions, setTrainingSessions] = useState<TrainingSession[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [excuseRecords, setExcuseRecords] = useState<ExcuseRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>(getSettings());

  const loadData = useCallback(() => {
    setStudents(getStudents());
    setTrainingSessions(getTrainingSessions());
    setAttendanceRecords(getAttendanceRecords());
    setExcuseRecords(getExcuseRecords());
    setSettings(getSettings());
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Keep active student state synced with roster updates
  useEffect(() => {
    if (activeStudent) {
      const refreshed = students.find(s => s.id === activeStudent.id);
      if (refreshed) setActiveStudent(refreshed);
    }
  }, [students]);

  const handleStudentLogin = (student: Student) => {
    setActiveStudent(student);
  };

  const handleStudentLogout = () => {
    setActiveStudent(null);
  };

  const handleAdminUnlock = () => {
    setAdminUnlocked(true);
  };

  const handleAdminLock = () => {
    setAdminUnlocked(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800 antialiased selection:bg-indigo-500 selection:text-white">
      
      {/* Universal Top Navigation */}
      <Navbar
        currentView={currentView}
        onSelectView={(view) => setCurrentView(view)}
        activeStudent={activeStudent}
        onStudentLogout={handleStudentLogout}
        settings={settings}
        adminUnlocked={adminUnlocked}
        onAdminLock={handleAdminLock}
      />

      {/* Main View Area */}
      <main className="flex-1 pb-16">
        {currentView === 'student' ? (
          <StudentPortal
            students={students}
            trainingSessions={trainingSessions}
            activeStudent={activeStudent}
            onStudentLogin={handleStudentLogin}
            onStudentLogout={handleStudentLogout}
            settings={settings}
            onDataUpdated={loadData}
          />
        ) : (
          <AdminDashboard
            students={students}
            trainingSessions={trainingSessions}
            attendanceRecords={attendanceRecords}
            excuseRecords={excuseRecords}
            settings={settings}
            adminUnlocked={adminUnlocked}
            onAdminUnlock={handleAdminUnlock}
            onAdminLock={handleAdminLock}
            onDataUpdated={loadData}
          />
        )}
      </main>

      {/* System Status Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-semibold text-slate-700">{settings.organizationName}</span>
            <span>&bull;</span>
            <span>Student Attendance &amp; Management Architecture</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
            <span>Forwarding Notifications: <strong className="text-slate-600">{settings.notificationEmail}</strong></span>
            <span>&bull;</span>
            <span>Database: <strong className="text-slate-600">Google Sheets via Apps Script</strong></span>
          </div>
        </div>
      </footer>

    </div>
  );
}
