import React, { useState, useEffect } from 'react';
import { ShieldCheck, UserCheck, Clock, CheckCircle2, AlertCircle, LogOut } from 'lucide-react';
import { Student, AppSettings } from '../types';

interface NavbarProps {
  currentView: 'student' | 'admin';
  onSelectView: (view: 'student' | 'admin') => void;
  activeStudent: Student | null;
  onStudentLogout: () => void;
  settings: AppSettings;
  adminUnlocked: boolean;
  onAdminLock: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onSelectView,
  activeStudent,
  onStudentLogout,
  settings,
  adminUnlocked,
  onAdminLock,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      setCurrentDate(
        now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          
          {/* Brand & Organization */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-sm ring-2 ring-indigo-400/20">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base sm:text-lg tracking-tight text-white">
                  OPRALD EDUTECH CONSULT
                </span>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-900/60 text-indigo-300 border border-indigo-700/40">
                  Portal
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Automated Google Sheets &amp; MailApp Webhook Portal
              </p>
            </div>
          </div>

          {/* Center: Live Clock & Sync indicator */}
          <div className="hidden lg:flex items-center space-x-4 px-3 py-1.5 bg-slate-800/80 rounded-lg border border-slate-700/60 text-xs text-slate-300">
            <div className="flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-semibold text-slate-200">{currentTime}</span>
              <span className="text-slate-500">&bull;</span>
              <span className="text-slate-400">{currentDate}</span>
            </div>
            <div className="h-3 w-px bg-slate-700" />
            <div className="flex items-center space-x-1.5">
              {settings.googleAppsScriptUrl ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3 h-3" /> Sheets Webhook Connected
                  </span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-slate-300 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-amber-400" /> Local Storage Mode
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Right: Mode Switcher & Student Info */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* View Selector Tabs */}
            <div className="flex items-center p-1 bg-slate-800 rounded-lg border border-slate-700/60">
              <button
                id="btn-nav-student-portal"
                onClick={() => onSelectView('student')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
                  currentView === 'student'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Student Portal</span>
              </button>

              <button
                id="btn-nav-admin-dashboard"
                onClick={() => onSelectView('admin')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
                  currentView === 'admin'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Admin Dashboard</span>
                {adminUnlocked && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                )}
              </button>
            </div>

            {/* If Student is signed in and on student view */}
            {currentView === 'student' && activeStudent && (
              <button
                id="btn-student-logout"
                onClick={onStudentLogout}
                title="Switch Student / Log out"
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-md text-xs border border-slate-700 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Switch</span>
              </button>
            )}

            {/* If Admin is unlocked and on admin view */}
            {currentView === 'admin' && adminUnlocked && (
              <button
                id="btn-admin-lock"
                onClick={onAdminLock}
                title="Lock Admin Dashboard"
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-red-950/60 hover:bg-red-900 text-red-300 hover:text-red-100 rounded-md text-xs border border-red-800/40 transition"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Lock</span>
              </button>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};
