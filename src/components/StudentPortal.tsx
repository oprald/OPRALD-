import React, { useState, useEffect } from 'react';
import { 
  LogIn, LogOut, FileText, Calendar, History, CheckCircle2, 
  Clock, MapPin, BookOpen, AlertTriangle, KeyRound, 
  Send, ShieldAlert, Sparkles, HelpCircle, ArrowRight,
  UserPlus, User, Lock, Eye, EyeOff, Check
} from 'lucide-react';
import { 
  Student, TrainingSession, AttendanceRecord, ExcuseRecord, 
  AppSettings, ReasonCategory 
} from '../types';
import { 
  authenticateStudent, registerStudent, recordSignIn, recordSignOut, 
  getStudentActiveStatus, submitExcuseRecord, getAttendanceRecords, 
  getExcuseRecords 
} from '../services/storageService';

interface StudentPortalProps {
  students: Student[];
  trainingSessions: TrainingSession[];
  activeStudent: Student | null;
  onStudentLogin: (student: Student) => void;
  onStudentLogout: () => void;
  settings: AppSettings;
  onDataUpdated: () => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  students,
  trainingSessions,
  activeStudent,
  onStudentLogin,
  onStudentLogout,
  settings,
  onDataUpdated,
}) => {
  // Auth Tab Mode: Login vs Sign Up
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Login form state
  const [usernameInput, setUsernameInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>('');
  const [isSubmittingLogin, setIsSubmittingLogin] = useState<boolean>(false);

  // Sign up / Registration form state
  const [regFullName, setRegFullName] = useState<string>('');
  const [regUsername, setRegUsername] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [regTrack, setRegTrack] = useState<string>('Full-Stack Web Development');
  const [regCohort, setRegCohort] = useState<string>('Cohort 2026-A');
  const [showRegPassword, setShowRegPassword] = useState<boolean>(false);
  const [registerError, setRegisterError] = useState<string>('');
  const [registerSuccess, setRegisterSuccess] = useState<string>('');
  const [isSubmittingRegister, setIsSubmittingRegister] = useState<boolean>(false);

  // Active portal tab
  const [activeTab, setActiveTab] = useState<'attendance' | 'excuse' | 'schedule' | 'history'>('attendance');

  // Sign-in form state
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [roomInput, setRoomInput] = useState<string>('');
  const [checkInNotes, setCheckInNotes] = useState<string>('');
  const [checkOutNotes, setCheckOutNotes] = useState<string>('');
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string>('');

  // Excuse form state
  const [excuseStartDate, setExcuseStartDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [excuseEndDate, setExcuseEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [excuseReasonCategory, setExcuseReasonCategory] = useState<ReasonCategory>('Medical');
  const [excuseJustification, setExcuseJustification] = useState<string>('');
  const [excuseAffectedSessions, setExcuseAffectedSessions] = useState<string[]>([]);
  const [isExcuseSubmitting, setIsExcuseSubmitting] = useState<boolean>(false);
  const [excuseSuccessMessage, setExcuseSuccessMessage] = useState<string>('');

  // Live timer for signed-in state
  const [elapsedString, setElapsedString] = useState<string>('');

  // Current active status
  const activeStatus = activeStudent ? getStudentActiveStatus(activeStudent.studentId) : { isSignedIn: false };

  // Sync selected session details to room input
  useEffect(() => {
    if (trainingSessions.length > 0 && !selectedSessionId) {
      setSelectedSessionId(trainingSessions[0].id);
      setRoomInput(trainingSessions[0].room);
    }
  }, [trainingSessions, selectedSessionId]);

  const handleSessionChange = (id: string) => {
    setSelectedSessionId(id);
    const found = trainingSessions.find(s => s.id === id);
    if (found) {
      setRoomInput(found.room);
    }
  };

  // Elapsed duration stopwatch when signed in
  useEffect(() => {
    if (!activeStudent || !activeStatus.isSignedIn || !activeStatus.lastRecord) {
      setElapsedString('');
      return;
    }

    const signInTime = new Date(activeStatus.lastRecord.timestamp).getTime();

    const updateDuration = () => {
      const diffMs = Math.max(0, Date.now() - signInTime);
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      const hStr = hours > 0 ? `${hours}h ` : '';
      const mStr = `${minutes}m `;
      const sStr = `${seconds}s`;
      setElapsedString(`${hStr}${mStr}${sStr}`);
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);
    return () => clearInterval(interval);
  }, [activeStudent, activeStatus.isSignedIn, activeStatus.lastRecord]);

  // Handle student login submit with username and password
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsSubmittingLogin(true);

    setTimeout(() => {
      const student = authenticateStudent(usernameInput, passwordInput);
      if (student) {
        onStudentLogin(student);
        setPasswordInput('');
        setUsernameInput('');
      } else {
        setLoginError('Invalid Username or Password. Please check your credentials or register a new account.');
      }
      setIsSubmittingLogin(false);
    }, 250);
  };

  // Handle student registration submit
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterSuccess('');

    if (regPassword !== regConfirmPassword) {
      setRegisterError('Passwords do not match. Please re-enter your password.');
      return;
    }

    setIsSubmittingRegister(true);

    setTimeout(() => {
      const result = registerStudent({
        fullName: regFullName,
        username: regUsername,
        password: regPassword,
        email: regEmail,
        phone: regPhone,
        track: regTrack,
        cohort: regCohort,
      });

      setIsSubmittingRegister(false);

      if (result.success && result.student) {
        setRegisterSuccess(result.message);
        onDataUpdated();
        // Immediately log the newly registered student in!
        setTimeout(() => {
          onStudentLogin(result.student!);
          setRegFullName('');
          setRegUsername('');
          setRegPassword('');
          setRegConfirmPassword('');
          setRegEmail('');
          setRegPhone('');
        }, 600);
      } else {
        setRegisterError(result.message || 'Registration failed. Please try again.');
      }
    }, 300);
  };

  // Quick fill student credentials for seamless evaluation
  const handleQuickSelectStudent = (student: Student) => {
    setAuthMode('login');
    setUsernameInput(student.username || student.studentId);
    setPasswordInput(student.password || student.pin || 'password123');
    setLoginError('');
  };

  // Handle Sign-In Action
  const handlePerformSignIn = async () => {
    if (!activeStudent) return;
    setIsActionLoading(true);
    setActionSuccessMessage('');

    const session = trainingSessions.find(s => s.id === selectedSessionId);
    const sessionTitle = session ? session.title : 'General Training';

    const result = await recordSignIn({
      student: activeStudent,
      sessionId: selectedSessionId || 'general',
      sessionName: sessionTitle,
      room: roomInput || 'Main Training Room',
      notes: checkInNotes,
    });

    setIsActionLoading(false);
    setActionSuccessMessage(`Sign-in recorded! ${result.syncMessage}`);
    setCheckInNotes('');
    onDataUpdated();
  };

  // Handle Sign-Out Action
  const handlePerformSignOut = async () => {
    if (!activeStudent) return;
    setIsActionLoading(true);
    setActionSuccessMessage('');

    const result = await recordSignOut({
      student: activeStudent,
      notes: checkOutNotes,
    });

    setIsActionLoading(false);
    setActionSuccessMessage(`Sign-out registered! ${result.syncMessage}`);
    setCheckOutNotes('');
    onDataUpdated();
  };

  // Handle Excuse Submit
  const handleExcuseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent) return;

    if (!excuseJustification.trim()) {
      alert('Please provide a reason / justification for your absence.');
      return;
    }

    setIsExcuseSubmitting(true);
    setExcuseSuccessMessage('');

    const result = await submitExcuseRecord({
      student: activeStudent,
      absenceStartDate: excuseStartDate,
      absenceEndDate: excuseEndDate,
      reasonCategory: excuseReasonCategory,
      justification: excuseJustification,
      affectedSessions: excuseAffectedSessions.length > 0 
        ? excuseAffectedSessions 
        : ['All Scheduled Sessions During Period'],
    });

    setIsExcuseSubmitting(false);
    setExcuseSuccessMessage(
      `Absence excuse submitted successfully! Recorded to database and forwarded to ${settings.notificationEmail}.`
    );
    setExcuseJustification('');
    setExcuseAffectedSessions([]);
    onDataUpdated();
  };

  const toggleSessionAffected = (sessionTitle: string) => {
    if (excuseAffectedSessions.includes(sessionTitle)) {
      setExcuseAffectedSessions(excuseAffectedSessions.filter(s => s !== sessionTitle));
    } else {
      setExcuseAffectedSessions([...excuseAffectedSessions, sessionTitle]);
    }
  };

  // If NO student is authenticated, show login or register portal
  if (!activeStudent) {
    return (
      <div className="max-w-xl mx-auto py-10 px-4 sm:px-6">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white text-center relative">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg ring-4 ring-indigo-500/20">
              {authMode === 'login' ? (
                <LogIn className="w-7 h-7 text-white" />
              ) : (
                <UserPlus className="w-7 h-7 text-white" />
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              OPRALD EDUTECH CONSULT
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200 font-medium mt-0.5">
              Student Attendance, Absences &amp; Schedule Portal
            </p>
            <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto">
              {authMode === 'login'
                ? 'Sign in with your registered username and password to record attendance and manage sessions.'
                : 'Create your new student account with your chosen username and password to get started.'}
            </p>

            {/* Mode Switcher Tabs */}
            <div className="mt-5 p-1 bg-slate-800/80 rounded-xl border border-slate-700/60 grid grid-cols-2 max-w-xs mx-auto">
              <button
                id="tab-switch-student-login"
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setLoginError('');
                  setRegisterError('');
                }}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                  authMode === 'login'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Log In</span>
              </button>

              <button
                id="tab-switch-student-signup"
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setLoginError('');
                  setRegisterError('');
                }}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                  authMode === 'register'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Sign Up</span>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 sm:p-8">

            {/* Notification messages */}
            {registerSuccess && (
              <div className="mb-4 flex items-center space-x-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-medium animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{registerSuccess} Logging you in...</span>
              </div>
            )}

            {/* TAB 1: LOGIN FORM */}
            {authMode === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {loginError && (
                  <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="input-student-username"
                      type="text"
                      required
                      placeholder="e.g. alex_wright"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 text-sm bg-white placeholder-slate-400"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Tip: You can also use your registered Student ID (e.g. STD-1001) or email.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center space-x-1 cursor-pointer"
                    >
                      {showPassword ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Hide</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Show</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="input-student-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter your password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 text-sm bg-white placeholder-slate-400"
                    />
                  </div>
                </div>

                <button
                  id="btn-student-submit-login"
                  type="submit"
                  disabled={isSubmittingLogin}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {isSubmittingLogin ? (
                    <span>Verifying credentials...</span>
                  ) : (
                    <>
                      <span>Sign In with Username &amp; Password</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <span className="text-xs text-slate-500">Don't have an account yet? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('register');
                      setLoginError('');
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline cursor-pointer"
                  >
                    Sign Up / Register Here
                  </button>
                </div>
              </form>
            ) : (
              /* TAB 2: SIGN UP / REGISTRATION FORM */
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                {registerError && (
                  <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{registerError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Full Legal Name *
                  </label>
                  <input
                    id="reg-fullname"
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 text-sm bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Choose Username *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="reg-username"
                      type="text"
                      required
                      minLength={3}
                      placeholder="e.g. john_doe"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 text-sm bg-white font-mono lowercase"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Use letters, numbers, and underscores. You will log in using this username.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                      Password *
                    </label>
                    <div className="relative">
                      <input
                        id="reg-password"
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        minLength={4}
                        placeholder="At least 4 characters"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 text-sm bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <input
                        id="reg-confirm-password"
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        minLength={4}
                        placeholder="Re-enter password"
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 text-sm bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center space-x-1 cursor-pointer"
                  >
                    {showRegPassword ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Hide Passwords</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Show Passwords</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      id="reg-email"
                      type="email"
                      required
                      placeholder="student@example.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 text-sm bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      id="reg-phone"
                      type="tel"
                      placeholder="+234 or +1 (555) 000-0000"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 text-sm bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                      Training Track
                    </label>
                    <select
                      id="reg-track"
                      value={regTrack}
                      onChange={(e) => setRegTrack(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 text-xs sm:text-sm bg-white"
                    >
                      <option value="Full-Stack Web Development">Full-Stack Web Development</option>
                      <option value="Data Science & Machine Learning">Data Science &amp; Machine Learning</option>
                      <option value="Cloud & DevOps Engineering">Cloud &amp; DevOps Engineering</option>
                      <option value="UI/UX Product Design">UI/UX Product Design</option>
                      <option value="Cybersecurity Operations">Cybersecurity Operations</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                      Assigned Cohort
                    </label>
                    <select
                      id="reg-cohort"
                      value={regCohort}
                      onChange={(e) => setRegCohort(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 text-xs sm:text-sm bg-white"
                    >
                      <option value="Cohort 2026-A">Cohort 2026-A (Active)</option>
                      <option value="Cohort 2026-B">Cohort 2026-B (Incoming)</option>
                    </select>
                  </div>
                </div>

                <button
                  id="btn-student-submit-signup"
                  type="submit"
                  disabled={isSubmittingRegister}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {isSubmittingRegister ? (
                    <span>Registering account...</span>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Complete Registration &amp; Sign In</span>
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <span className="text-xs text-slate-500">Already have an account? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setRegisterError('');
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline cursor-pointer"
                  >
                    Log In Here
                  </button>
                </div>
              </form>
            )}

            {/* Fast-select Demo Accounts for seamless inspection */}
            <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  Quick Test Demo Students
                </span>
                <span className="text-xs text-slate-400">Click to autofill login</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {students.slice(0, 4).map((std) => (
                  <button
                    key={std.id}
                    id={`btn-demo-student-${std.studentId}`}
                    type="button"
                    onClick={() => handleQuickSelectStudent(std)}
                    className="text-left p-2.5 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition group cursor-pointer"
                  >
                    <div className="font-semibold text-xs text-slate-800 group-hover:text-indigo-900">
                      {std.fullName}
                    </div>
                    <div className="text-[11px] text-slate-500 flex flex-col gap-0.5 mt-0.5">
                      <span className="font-mono text-slate-600">
                        user: <strong className="text-indigo-600">{std.username || std.studentId.toLowerCase()}</strong>
                      </span>
                      <span className="font-mono text-slate-500">
                        pass: <strong className="text-slate-700">{std.password || std.pin}</strong>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Security note */}
            <div className="mt-6 p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex items-start space-x-2">
              <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>
                All attendance actions and excuse reasons are instantly dispatched to the Google Sheets database with automated MailApp alerts forwarded to <strong className="text-slate-800">{settings.notificationEmail}</strong>.
              </span>
            </div>

          </div>

        </div>
      </div>
    );
  }

  // Active student attendance records & excuses
  const studentAttendanceHistory = getAttendanceRecords()
    .filter(r => r.studentId.toUpperCase() === activeStudent.studentId.toUpperCase())
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const studentExcuseHistory = getExcuseRecords()
    .filter(r => r.studentId.toUpperCase() === activeStudent.studentId.toUpperCase())
    .sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      
      {/* Student Profile Card & Status Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start sm:items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0">
            {activeStudent.fullName.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {activeStudent.fullName}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
                @{activeStudent.username || activeStudent.studentId.toLowerCase()}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                {activeStudent.studentId}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                {activeStudent.cohort}
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-0.5">
              {activeStudent.track} &bull; {activeStudent.email}
            </p>
          </div>
        </div>

        {/* Live Attendance Status Pill */}
        <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-xl border border-slate-200 self-start md:self-auto">
          {activeStatus.isSignedIn ? (
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Currently Checked In
                </div>
                <div className="text-xs text-slate-600 font-medium">
                  {activeStatus.lastRecord?.sessionName} &bull; <span className="font-mono text-emerald-800 font-semibold">{elapsedString || 'Active'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 rounded-full bg-slate-400" />
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Currently Checked Out
                </div>
                <div className="text-xs text-slate-500">
                  Ready to sign in for training
                </div>
              </div>
            </div>
          )}

          <button
            id="btn-student-signout-switch"
            onClick={onStudentLogout}
            className="text-xs text-slate-500 hover:text-slate-900 underline font-medium ml-2 pl-2 border-l border-slate-300"
          >
            Switch
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          id="tab-btn-attendance"
          onClick={() => { setActiveTab('attendance'); setActionSuccessMessage(''); }}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
            activeTab === 'attendance'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Sign-In / Sign-Out</span>
        </button>

        <button
          id="tab-btn-excuse"
          onClick={() => { setActiveTab('excuse'); setExcuseSuccessMessage(''); }}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
            activeTab === 'excuse'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Absence Excuse Form</span>
          {studentExcuseHistory.filter(e => e.status === 'pending').length > 0 && (
            <span className="w-2 h-2 rounded-full bg-white inline-block" />
          )}
        </button>

        <button
          id="tab-btn-schedule"
          onClick={() => setActiveTab('schedule')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
            activeTab === 'schedule'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Training Schedules</span>
        </button>

        <button
          id="tab-btn-history"
          onClick={() => setActiveTab('history')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
            activeTab === 'history'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          <span>My History ({studentAttendanceHistory.length})</span>
        </button>
      </div>

      {/* TAB 1: SIGN-IN / SIGN-OUT */}
      {activeTab === 'attendance' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Action Panel */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Success Feedback Alert */}
            {actionSuccessMessage && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-start space-x-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Action Completed Successfully</div>
                  <div className="text-emerald-700 text-xs mt-0.5">{actionSuccessMessage}</div>
                </div>
              </div>
            )}

            {/* Check-In vs Check-Out Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              
              {!activeStatus.isSignedIn ? (
                // --- SIGN IN FORM ---
                <div className="space-y-5">
                  <div className="border-b border-slate-100 pb-4">
                    <div className="flex items-center space-x-2 text-indigo-600 mb-1">
                      <LogIn className="w-5 h-5" />
                      <span className="text-xs font-bold uppercase tracking-wider">Attendance Check-In</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Sign In for Training Session
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Confirm your session and classroom to record your arrival to Google Sheets and notify management.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Select Training Session
                      </label>
                      <select
                        id="select-training-session"
                        value={selectedSessionId}
                        onChange={(e) => handleSessionChange(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 text-sm bg-white"
                      >
                        {trainingSessions.map((sess) => (
                          <option key={sess.id} value={sess.id}>
                            [{sess.code}] {sess.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Training Lab / Room
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          id="input-training-room"
                          type="text"
                          value={roomInput}
                          onChange={(e) => setRoomInput(e.target.value)}
                          placeholder="e.g. Lab 1 - Turing Hall"
                          className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 text-sm bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Arrival Notes / Today's Objective (Optional)
                    </label>
                    <input
                      id="input-signin-notes"
                      type="text"
                      placeholder="e.g. Working on React state management assignment, prepared with project repo."
                      value={checkInNotes}
                      onChange={(e) => setCheckInNotes(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 text-sm bg-white"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      id="btn-confirm-sign-in"
                      type="button"
                      disabled={isActionLoading}
                      onClick={handlePerformSignIn}
                      className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>{isActionLoading ? 'Recording Sign-In...' : 'Confirm Sign-In to Session'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                // --- SIGN OUT FORM ---
                <div className="space-y-5">
                  <div className="border-b border-slate-100 pb-4">
                    <div className="flex items-center space-x-2 text-red-600 mb-1">
                      <LogOut className="w-5 h-5" />
                      <span className="text-xs font-bold uppercase tracking-wider">Attendance Check-Out</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Sign Out / Complete Session
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Record your checkout time and log training duration to Google Sheets.
                    </p>
                  </div>

                  {/* Active session recap block */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">Current Session:</span>
                      <span className="text-xs font-bold text-slate-900">{activeStatus.lastRecord?.sessionName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">Location:</span>
                      <span className="text-xs text-slate-800">{activeStatus.lastRecord?.room}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">Signed In At:</span>
                      <span className="text-xs text-slate-800">
                        {activeStatus.lastRecord?.timestamp ? new Date(activeStatus.lastRecord.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                      <span className="text-xs font-bold text-slate-700">Elapsed Time:</span>
                      <span className="text-sm font-bold text-indigo-600 font-mono">{elapsedString || 'In progress'}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Departure Notes / Progress Achieved (Optional)
                    </label>
                    <textarea
                      id="input-signout-notes"
                      rows={2}
                      placeholder="e.g. Completed module 3 exercises, committed project code to GitHub, cleaned workstation."
                      value={checkOutNotes}
                      onChange={(e) => setCheckOutNotes(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-800 text-sm bg-white"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      id="btn-confirm-sign-out"
                      type="button"
                      disabled={isActionLoading}
                      onClick={handlePerformSignOut}
                      className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-sm shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{isActionLoading ? 'Recording Sign-Out...' : 'Confirm Sign-Out & Checkout'}</span>
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Recent Check-ins preview */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6">
              <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>My Recent Activity</span>
              </h4>

              {studentAttendanceHistory.length === 0 ? (
                <p className="text-xs text-slate-500 py-3 text-center">
                  No attendance records logged yet for this account.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {studentAttendanceHistory.slice(0, 3).map((rec) => (
                    <div key={rec.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2.5">
                        <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                          rec.type === 'sign_in' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {rec.type === 'sign_in' ? 'In' : 'Out'}
                        </span>
                        <div>
                          <div className="font-semibold text-slate-800">{rec.sessionName}</div>
                          <div className="text-slate-500 text-[11px]">{rec.room} {rec.durationMinutes ? `&bull; ${rec.durationMinutes} mins` : ''}</div>
                        </div>
                      </div>
                      <div className="text-right text-slate-500 font-mono text-[11px]">
                        {new Date(rec.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })} at{' '}
                        {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Side Info & Instructions */}
          <div className="space-y-6">
            
            {/* Student ID Badge Card */}
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-slate-800">
              <div className="flex items-center justify-between text-xs text-indigo-300 font-mono mb-4">
                <span>OPRALD EDUTECH CARD</span>
                <span className="px-2 py-0.5 rounded bg-indigo-800/60 font-semibold">{activeStudent.studentId}</span>
              </div>
              <div className="text-lg font-bold tracking-tight">{activeStudent.fullName}</div>
              <div className="text-xs text-slate-300 mt-0.5">{activeStudent.track}</div>
              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>Status: <strong className="text-emerald-400">Active Student</strong></span>
                <span>Security PIN: <strong className="text-slate-300 font-mono">****</strong></span>
              </div>
            </div>

            {/* Notification alert policy */}
            <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-5 text-xs text-indigo-950 space-y-2.5">
              <div className="font-bold flex items-center gap-1.5 text-indigo-900">
                <Send className="w-4 h-4 text-indigo-600" />
                <span>Real-Time Notifications Policy</span>
              </div>
              <p className="text-slate-700 leading-relaxed">
                Whenever you check in or check out, our automated Google Apps Script MailApp forwarder dispatches notification emails to:
              </p>
              <div className="font-mono text-xs bg-white p-2 rounded-lg border border-indigo-200 text-indigo-800 font-semibold truncate">
                {settings.notificationEmail}
              </div>
              <p className="text-[11px] text-slate-500">
                This guarantees prompt attendance monitoring and verification for institutional records.
              </p>
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: ABSENCE EXCUSE FORM */}
      {activeTab === 'excuse' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 space-y-6">
            
            {excuseSuccessMessage && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-start space-x-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Absence Form Dispatched</div>
                  <div className="text-emerald-700 text-xs mt-0.5">{excuseSuccessMessage}</div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              
              <div className="border-b border-slate-100 pb-4 mb-5">
                <div className="flex items-center space-x-2 text-amber-600 mb-1">
                  <FileText className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-wider">Official Absence Request</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  Student Absence &amp; Excuse Form
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Submit an official notice for upcoming or past missed training sessions. Forwarded directly to administration.
                </p>
              </div>

              <form onSubmit={handleExcuseSubmit} className="space-y-4">
                
                {/* Date range */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Absence Start Date
                    </label>
                    <input
                      id="input-excuse-start-date"
                      type="date"
                      required
                      value={excuseStartDate}
                      onChange={(e) => setExcuseStartDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 text-sm bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Absence End Date
                    </label>
                    <input
                      id="input-excuse-end-date"
                      type="date"
                      required
                      value={excuseEndDate}
                      onChange={(e) => setExcuseEndDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 text-sm bg-white"
                    />
                  </div>
                </div>

                {/* Reason category */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Reason Category
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(['Medical', 'Family Emergency', 'Official Exam/Work', 'Transportation', 'Academic Commitment', 'Other'] as ReasonCategory[]).map((cat) => (
                      <button
                        key={cat}
                        id={`btn-reason-cat-${cat.toLowerCase().replace(/[\/\s]/g, '-')}`}
                        type="button"
                        onClick={() => setExcuseReasonCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                          excuseReasonCategory === cat
                            ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Affected Sessions */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Select Affected Training Sessions
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {trainingSessions.map((s) => {
                      const isSelected = excuseAffectedSessions.includes(s.title);
                      return (
                        <div
                          key={s.id}
                          onClick={() => toggleSessionAffected(s.title)}
                          className={`p-2.5 rounded-lg border text-xs cursor-pointer transition flex items-start space-x-2 ${
                            isSelected
                              ? 'bg-amber-50 border-amber-400 text-amber-900 font-semibold'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                          />
                          <div>
                            <div>{s.title}</div>
                            <div className="text-[10px] text-slate-500 font-normal">{s.dayOfWeek} &bull; {s.startTime} - {s.endTime}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Justification details */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Detailed Reason &amp; Supporting Remarks *
                  </label>
                  <textarea
                    id="input-excuse-justification"
                    rows={4}
                    required
                    placeholder="Provide detailed explanation for your absence and any makeup study arrangements..."
                    value={excuseJustification}
                    onChange={(e) => setExcuseJustification(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 text-sm bg-white"
                  />
                </div>

                <div className="pt-2">
                  <button
                    id="btn-submit-excuse-form"
                    type="submit"
                    disabled={isExcuseSubmitting}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-sm shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isExcuseSubmitting ? 'Submitting Excuse...' : 'Submit Official Excuse to Management'}</span>
                  </button>
                </div>

              </form>

            </div>

          </div>

          {/* Right: History of Submissions */}
          <div className="space-y-6">
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6">
              <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
                <span>My Submitted Excuses</span>
                <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
                  {studentExcuseHistory.length}
                </span>
              </h4>

              {studentExcuseHistory.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No excuses filed. Perfect attendance record!
                </div>
              ) : (
                <div className="space-y-3">
                  {studentExcuseHistory.map((exc) => (
                    <div key={exc.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{exc.reasonCategory}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          exc.status === 'approved' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : exc.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {exc.status}
                        </span>
                      </div>

                      <div className="text-slate-600 text-[11px]">
                        Period: <strong>{exc.absenceStartDate}</strong> to <strong>{exc.absenceEndDate}</strong>
                      </div>

                      <p className="text-slate-700 text-[11px] line-clamp-2 bg-white p-2 rounded border border-slate-200">
                        {exc.justification}
                      </p>

                      {exc.adminNotes && (
                        <div className="text-[11px] text-indigo-700 bg-indigo-50 p-1.5 rounded border border-indigo-100">
                          <strong>Admin:</strong> {exc.adminNotes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* TAB 3: TRAINING SCHEDULE SELECTOR */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Training Calendar &amp; Schedule Selector
                </h3>
                <p className="text-xs text-slate-500">
                  Browse available training courses, view classroom assignments, and select sessions for quick check-in.
                </p>
              </div>
              <div className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 self-start sm:self-auto">
                {trainingSessions.length} Active Sessions
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trainingSessions.map((sess) => (
                <div
                  key={sess.id}
                  className="rounded-xl border border-slate-200 p-5 bg-white hover:border-indigo-400 hover:shadow-md transition flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        {sess.code}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {sess.track}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-sm leading-snug">
                      {sess.title}
                    </h4>

                    <p className="text-xs text-slate-600 line-clamp-2">
                      {sess.description}
                    </p>

                    <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{sess.dayOfWeek} ({sess.startTime} - {sess.endTime})</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{sess.room}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Instructor: <strong className="text-slate-800">{sess.instructor}</strong></span>
                      </div>
                    </div>
                  </div>

                  <button
                    id={`btn-select-session-${sess.code.toLowerCase()}`}
                    type="button"
                    onClick={() => {
                      setSelectedSessionId(sess.id);
                      setRoomInput(sess.room);
                      setActiveTab('attendance');
                    }}
                    className="w-full py-2 px-3 rounded-lg bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 font-semibold text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <span>Check In to This Session</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MY ATTENDANCE HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Personal Attendance Ledger
              </h3>
              <p className="text-xs text-slate-500">
                Full chronological record of all sign-ins and sign-outs recorded for {activeStudent.fullName}.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">
              {studentAttendanceHistory.length} Total Logs
            </span>
          </div>

          {studentAttendanceHistory.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No historical records found for this student.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Date &amp; Time</th>
                    <th className="py-3 px-4">Training Session</th>
                    <th className="py-3 px-4">Room</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Notes</th>
                    <th className="py-3 px-4">Sync Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {studentAttendanceHistory.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-bold">
                        <span className={`px-2.5 py-1 rounded text-[11px] uppercase font-bold tracking-wider ${
                          rec.type === 'sign_in' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {rec.type === 'sign_in' ? 'SIGN IN' : 'SIGN OUT'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-800 font-medium">
                        <div>{new Date(rec.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{rec.sessionName}</td>
                      <td className="py-3 px-4 text-slate-600">{rec.room}</td>
                      <td className="py-3 px-4 text-slate-800 font-mono font-medium">
                        {rec.durationMinutes ? `${rec.durationMinutes} mins` : '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{rec.notes || '-'}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Recorded
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
