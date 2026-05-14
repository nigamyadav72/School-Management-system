import React, { useState, useEffect } from 'react';
import { 
  Users, CheckCircle, FileSpreadsheet, BookOpen, Plus, Search, 
  Trash2, Send, LayoutDashboard, LogOut, FileText, Calendar, Video, Clock, GraduationCap as GraduationCapIcon
} from 'lucide-react';
import { 
  collection, addDoc, query, getDocs, where, deleteDoc, doc, serverTimestamp, orderBy, setDoc, getDoc 
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../lib/firebase';
import { Student, AttendanceRecord, MarkRecord, NoteRecord, MeetingRecord } from '../types';
import { useAuth } from './AuthProvider';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import LiveClassRoom from './LiveClassRoom';

export default function TeacherDashboard() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'attendance' | 'marks' | 'notes' | 'meetings'>('overview');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Attendance history states
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

  // Marks history state
  const [marksRecords, setMarksRecords] = useState<MarkRecord[]>([]);

  // Notes state
  const [notesList, setNotesList] = useState<NoteRecord[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState<string | null>(null);
  const [meetingClassId, setMeetingClassId] = useState('');

  // Form states
  const [newStudent, setNewStudent] = useState({ name: '', rollNumber: '', classId: '', parentEmail: '' });
  const [newMark, setNewMark] = useState({ studentId: '', subject: '', exam: '', score: '' as any, maxScore: 100 as any, date: new Date().toISOString().split('T')[0] });
  const [newNote, setNewNote] = useState({ classId: '', title: '', content: '', type: 'note' as const, url: '' });

  // Meeting state
  const [meetingsList, setMeetingsList] = useState<MeetingRecord[]>([]);
  const [newMeeting, setNewMeeting] = useState({ title: '', description: '', date: '', time: '', classId: '' });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    const q = query(collection(db, 'students'));
    const querySnapshot = await getDocs(q);
    const studentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
    setStudents(studentsData);
    setLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'attendance') {
      fetchAttendanceRecords(attendanceDate);
    }
    if (activeTab === 'marks') {
      fetchMarksRecords();
    }
    if (activeTab === 'notes') {
      fetchNotesRecords();
    }
    if (activeTab === 'meetings' || activeTab === 'overview') {
      fetchMeetingsRecords();
    }
  }, [activeTab, attendanceDate]);

  const fetchMeetingsRecords = async () => {
    try {
      const q = query(collection(db, 'meetings'), orderBy('date', 'asc'));
      const querySnapshot = await getDocs(q);
      const records = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MeetingRecord));
      setMeetingsList(records);
    } catch (error) {
      console.error("Error fetching meetings:", error);
    }
  };

  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const meetingLink = `EduPulse-Meeting-${newMeeting.classId}-${Date.now()}`;
      await addDoc(collection(db, 'meetings'), {
        ...newMeeting,
        meetingLink,
        teacherId: profile?.userId,
        createdAt: serverTimestamp()
      });
      setNewMeeting({ title: '', description: '', date: '', time: '', classId: '' });
      alert("Meeting scheduled successfully!");
      fetchMeetingsRecords();
      setActiveTab('overview');
    } catch (error) {
      console.error("Error scheduling meeting:", error);
      alert("Error scheduling meeting. Please try again.");
    }
  };

  const fetchNotesRecords = async () => {
    try {
      const q = query(collection(db, 'notes'));
      const querySnapshot = await getDocs(q);
      const records = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NoteRecord));
      records.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      setNotesList(records);
    } catch (error) {
      console.error("Error fetching notes:", error);
    }
  };

  const fetchMarksRecords = async () => {
    try {
      const q = query(collection(db, 'marks'));
      const querySnapshot = await getDocs(q);
      const records = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MarkRecord));
      records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setMarksRecords(records);
    } catch (error) {
      console.error("Error fetching marks:", error);
    }
  };

  const fetchAttendanceRecords = async (date: string) => {
    try {
      const q = query(collection(db, 'attendance'), where('date', '==', date));
      const querySnapshot = await getDocs(q);
      const records = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
      setAttendanceRecords(records);
    } catch (error) {
      console.error("Error fetching attendance:", error);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Create a primary key combining class, roll, and name
      const sanitizedName = newStudent.name.trim().toLowerCase().replace(/\s+/g, '_');
      const sanitizedRoll = newStudent.rollNumber.trim().toLowerCase();
      const sanitizedClass = newStudent.classId.trim().toLowerCase();
      
      const primaryKey = `${sanitizedClass}_${sanitizedRoll}_${sanitizedName}`;
      const studentRef = doc(db, 'students', primaryKey);
      
      // Check if the student already exists
      const studentSnap = await getDoc(studentRef);
      if (studentSnap.exists()) {
        alert("A student with this name and roll number already exists in this class!");
        return;
      }

      await setDoc(studentRef, newStudent);
      setNewStudent({ name: '', rollNumber: '', classId: '', parentEmail: '' });
      fetchStudents();
    } catch (error) {
      console.error("Error adding student:", error);
      alert("Failed to add student. Please try again.");
    }
  };

  const handleRecordAttendance = async (studentId: string, status: 'present' | 'absent') => {
    try {
      const student = students.find(s => s.id === studentId);
      if (!student) return;

      const dateStr = attendanceDate;
      const record: AttendanceRecord = {
        studentId,
        date: dateStr,
        status,
        classId: student.classId
      };
      
      const recordId = `${studentId}_${dateStr}`;
      
      // Optimistically update the state for instant UI feedback
      setAttendanceRecords(prev => {
        const existingIndex = prev.findIndex(r => r.studentId === studentId);
        if (existingIndex >= 0) {
          const newRecords = [...prev];
          newRecords[existingIndex] = { ...newRecords[existingIndex], status };
          return newRecords;
        } else {
          return [...prev, record];
        }
      });

      await setDoc(doc(db, 'attendance', recordId), record);
      
      // Refresh to ensure sync
      fetchAttendanceRecords(dateStr);
      
    } catch (error) {
      console.error("Error recording attendance:", error);
    }
  };

  const handleAddMark = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const subjectKey = newMark.subject.toLowerCase().trim();
      const examKey = newMark.exam.toLowerCase().trim();
      const markId = `${newMark.studentId}_${subjectKey}_${examKey}`;
      const markRef = doc(db, 'marks', markId);
      
      const currentScore = Number(newMark.score);
      const currentMaxScore = Number(newMark.maxScore) || 100;

      await setDoc(markRef, {
        ...newMark,
        score: currentScore,
        maxScore: currentMaxScore
      });
      
      alert(`Mark recorded for ${newMark.exam} successfully!`);
      setNewMark({ studentId: '', subject: '', exam: '', score: '' as any, maxScore: 100 as any, date: new Date().toISOString().split('T')[0] });
      fetchMarksRecords();
    } catch (error) {
      console.error("Error adding mark:", error);
      alert("Failed to record marks.");
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setUploading(true);
      let finalUrl = newNote.url;

      if (newNote.type === 'class_link') {
        finalUrl = `EduPulse-Class-${newNote.classId}-${Date.now()}`;
      } else if (newNote.type === 'note' && selectedFile) {
        const fileRef = ref(storage, `notes/${Date.now()}_${selectedFile.name}`);
        const uploadTask = await uploadBytesResumable(fileRef, selectedFile);
        finalUrl = await getDownloadURL(uploadTask.ref);
      }

      await addDoc(collection(db, 'notes'), {
        ...newNote,
        url: finalUrl,
        createdAt: serverTimestamp()
      });
      setNewNote({ classId: '', title: '', content: '', type: 'note', url: '' });
      setSelectedFile(null);
      alert("Note added successfully");
      fetchNotesRecords();
    } catch (error) {
      console.error("Error adding note:", error);
      alert("Error adding note. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const sidebarItems = [
    { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
    { id: 'students', icon: Users, label: 'Students' },
    { id: 'attendance', icon: CheckCircle, label: 'Attendance' },
    { id: 'marks', icon: FileSpreadsheet, label: 'Marks' },
    { id: 'notes', icon: BookOpen, label: 'Notes' },
    { id: 'meetings', icon: Video, label: 'Meetings' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans relative overflow-hidden">
      {/* Background blobs for premium feel */}
      <div className="absolute top-0 -left-10 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob"></div>
      <div className="absolute top-0 -right-10 w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-300 rounded-full mix-blend-multiply filter blur-[128px] opacity-30 animate-blob animation-delay-4000"></div>
      {/* Sidebar */}
      <div className="w-[260px] bg-gradient-to-b from-slate-900 to-indigo-950 text-slate-50 flex flex-col border-r border-white/10 relative z-10 shadow-2xl">
        <div className="p-6 font-bold text-xl border-b border-white/5 flex items-center gap-3">
          <div className="p-1.5 bg-blue-600 rounded">
            <GraduationCapIcon className="text-white w-5 h-5" />
          </div>
          <span>EduPulse</span>
        </div>
        
        <nav className="flex-1 py-4 space-y-1">
          {sidebarItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={cn(
                  "w-full flex items-center gap-3 px-6 py-3.5 text-[15px] transition-all cursor-pointer relative",
                  isActive 
                    ? "bg-white/10 text-white font-semibold border-r-4 border-blue-400" 
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <item.icon className={cn("w-4 h-4", isActive ? "text-white" : "text-[#64748b]")} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto p-6 border-t border-[#1e293b] text-[11px] text-[#64748b]">
          Academic Year 2023-24<br />v2.4.1
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-20 glass border-b border-white/40 flex items-center justify-between px-8 shrink-0 relative z-10">
          <div>
            <h2 className="text-[18px] font-semibold text-[#1e293b]">
              {activeTab === 'overview' ? 'School Dashboard' : `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Management`}
            </h2>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex flex-col text-right">
              <span className="text-[14px] font-semibold text-[#1e293b]">{profile?.name}</span>
              <span className="text-[11px] text-[#64748b] -mt-1 capitalize">{profile?.role}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#3b82f6] flex items-center justify-center text-white font-bold text-[12px]">
              {profile?.name?.split(' ').map(n => n[0]).join('')}
            </div>
            <button 
              onClick={() => auth.signOut()}
              className="p-2 text-[#64748b] hover:text-red-500 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div 
                key="overview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                <div className="glass p-6 rounded-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[14px] font-semibold text-[#64748b]">Total Students</span>
                    <span className="bg-[#ecfdf5] text-[#059669] px-2 py-1 rounded-md text-[11px] font-bold tracking-tight">Active</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-[#3b82f6] rounded-lg">
                      <Users className="w-6 h-6" />
                    </div>
                    <p className="text-3xl font-bold text-[#1e293b]">{students.length}</p>
                  </div>
                </div>

                <div className="md:col-span-2 glass p-6 rounded-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-[16px] font-bold text-[#1e293b] flex items-center gap-2">
                      <Calendar className="text-[#3b82f6] w-5 h-5" />
                      Upcoming Schedule Meetings
                    </h3>
                    <button 
                      onClick={() => setActiveTab('meetings')}
                      className="text-[12px] font-bold text-[#3b82f6] hover:underline"
                    >
                      Schedule New
                    </button>
                  </div>
                  <div className="space-y-4">
                    {meetingsList.filter(m => new Date(m.date) >= new Date(new Date().setHours(0,0,0,0))).length === 0 ? (
                      <div className="text-center py-8 text-[#64748b] bg-slate-50/50 rounded-xl border border-dashed border-[#e2e8f0]">
                        No upcoming meetings scheduled.
                      </div>
                    ) : (
                      meetingsList
                        .filter(m => new Date(m.date) >= new Date(new Date().setHours(0,0,0,0)))
                        .slice(0, 3)
                        .map(meeting => (
                          <div key={meeting.id} className="flex items-center gap-4 p-4 rounded-xl border border-[#f1f5f9] bg-white hover:border-[#3b82f6]/30 transition-all group">
                            <div className="w-12 h-12 bg-blue-50 text-[#3b82f6] rounded-lg flex flex-col items-center justify-center shrink-0">
                              <span className="text-[10px] font-bold uppercase">{new Date(meeting.date).toLocaleString('default', { month: 'short' })}</span>
                              <span className="text-[16px] font-black">{new Date(meeting.date).getDate()}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <h4 className="font-bold text-[14px] text-[#1e293b] truncate">{meeting.title}</h4>
                                <span className="text-[10px] font-bold text-[#3b82f6] bg-blue-50 px-2 py-0.5 rounded-md">Class {meeting.classId}</span>
                              </div>
                              <p className="text-[12px] text-[#64748b] flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {meeting.time}
                              </p>
                            </div>
                            <button 
                              onClick={() => setActiveMeeting(meeting.meetingLink)}
                              className="bg-[#3b82f6] text-white font-bold text-[12px] px-4 py-2 rounded-lg hover:bg-blue-600 transition-all opacity-0 group-hover:opacity-100 shadow-lg shadow-blue-200"
                            >
                              Join
                            </button>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'students' && (
              <motion.div 
                key="students"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="glass p-6 rounded-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
                  <h3 className="text-[14px] font-semibold text-[#1e293b] mb-4">Register New Student</h3>
                  <form onSubmit={handleAddStudent} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input 
                      type="text" placeholder="Full Name" 
                      className="p-2.5 text-[13px] bg-[#f8fafc] rounded-lg border border-[#e2e8f0] focus:ring-1 focus:ring-[#3b82f6] focus:border-[#3b82f6] outline-none transition-all"
                      value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})}
                      required
                    />
                    <input 
                      type="text" placeholder="Roll No" 
                      className="p-2.5 text-[13px] bg-[#f8fafc] rounded-lg border border-[#e2e8f0] focus:ring-1 focus:ring-[#3b82f6] focus:border-[#3b82f6] outline-none transition-all"
                      value={newStudent.rollNumber} onChange={e => setNewStudent({...newStudent, rollNumber: e.target.value})}
                      required
                    />
                    <input 
                      type="text" placeholder="Class (e.g. 10-A)" 
                      className="p-2.5 text-[13px] bg-[#f8fafc] rounded-lg border border-[#e2e8f0] focus:ring-1 focus:ring-[#3b82f6] focus:border-[#3b82f6] outline-none transition-all"
                      value={newStudent.classId} onChange={e => setNewStudent({...newStudent, classId: e.target.value})}
                      required
                    />
                    <button type="submit" className="bg-[#3b82f6] text-white font-semibold text-[13px] rounded-lg py-2.5 hover:bg-blue-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                      <Plus className="w-5 h-5" /> Add Student
                    </button>
                  </form>
                </div>

                <div className="space-y-6">
                  {students.length === 0 ? (
                    <div className="text-center p-8 text-[#64748b] bg-white rounded-xl border border-[#e2e8f0]">No students registered yet.</div>
                  ) : (
                    Object.keys(students.reduce((acc, student) => {
                      if (!acc[student.classId]) acc[student.classId] = [];
                      acc[student.classId].push(student);
                      return acc;
                    }, {} as Record<string, Student[]>)).sort().map(classId => {
                      const classStudents = students.filter(s => s.classId === classId);
                      return (
                        <div key={classId} className="bg-white rounded-xl border border-[#e2e8f0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
                          <div className="bg-[#f8fafc] border-b border-[#e2e8f0] p-4 flex justify-between items-center">
                            <h4 className="font-semibold text-[#1e293b]">Class: {classId}</h4>
                            <span className="text-[12px] font-medium text-[#64748b] bg-[#e2e8f0] px-2 py-1 rounded-full">{classStudents.length} Students</span>
                          </div>
                          <table className="w-full text-left border-collapse text-[13px]">
                            <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                              <tr>
                                <th className="p-4 text-[#94a3b8] font-medium w-24">Roll No</th>
                                <th className="p-4 text-[#94a3b8] font-medium">Student Name</th>
                                <th className="p-4 text-[#94a3b8] font-medium w-24 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {classStudents.sort((a,b) => {
                                // Try to sort numerically if roll numbers are numbers
                                const numA = parseInt(a.rollNumber);
                                const numB = parseInt(b.rollNumber);
                                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                                return a.rollNumber.localeCompare(b.rollNumber);
                              }).map(student => (
                                <tr key={student.id} className="border-b border-[#f1f5f9] hover:bg-[#f8fafc] transition-colors group">
                                  <td className="p-4 font-mono text-[12px] text-[#64748b]">{student.rollNumber}</td>
                                  <td className="p-4 font-semibold text-[#1e293b]">{student.name}</td>
                                  <td className="p-4 text-right">
                                    <button className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all" onClick={async () => {
                                      if(confirm("Are you sure?")) {
                                        await deleteDoc(doc(db, 'students', student.id));
                                        fetchStudents();
                                      }
                                    }}>
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    })
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'attendance' && (
              <motion.div 
                 key="attendance"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 className="grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                <div className="glass p-6 rounded-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all flex flex-col max-h-[600px]">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[14px] font-semibold text-[#64748b]">Attendance Roll Call</span>
                    {attendanceDate === new Date().toISOString().split('T')[0] ? (
                      <span className="bg-[#ecfdf5] text-[#059669] px-2 py-1 rounded-md text-[11px] font-bold tracking-tight">Live</span>
                    ) : (
                      <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded-md text-[11px] font-bold tracking-tight">{attendanceDate}</span>
                    )}
                  </div>
                  <div className="space-y-4 flex-1 overflow-y-auto mb-4 pr-2">
                    {Object.keys(students.reduce((acc, student) => {
                      if (!acc[student.classId]) acc[student.classId] = [];
                      acc[student.classId].push(student);
                      return acc;
                    }, {} as Record<string, Student[]>)).sort().map(classId => {
                      const classStudents = students.filter(s => s.classId === classId)
                        .sort((a,b) => {
                          const numA = parseInt(a.rollNumber);
                          const numB = parseInt(b.rollNumber);
                          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                          return a.rollNumber.localeCompare(b.rollNumber);
                        });
                        
                      return (
                        <div key={classId} className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden shadow-sm">
                          <div className="bg-[#f8fafc] px-3 py-2 border-b border-[#e2e8f0]">
                            <span className="text-[12px] font-bold text-[#64748b]">Class {classId}</span>
                          </div>
                          <div className="divide-y divide-[#f1f5f9]">
                            {classStudents.map(student => {
                              const record = attendanceRecords.find(r => r.studentId === student.id);
                              return (
                                <div key={student.id} className="flex justify-between items-center py-2 px-3 transition-colors hover:bg-slate-50">
                                  <span className="text-[13px] text-[#1e293b] font-medium">{student.rollNumber}. {student.name}</span>
                                  <div className="flex items-center gap-2">
                                    <button 
                                      onClick={() => handleRecordAttendance(student.id, 'present')}
                                      className={cn(
                                        "font-bold text-[13px] transition-all px-2 py-1 rounded-md border border-transparent",
                                        record?.status === 'present' 
                                          ? "bg-[#ecfdf5] text-[#059669] border-[#059669]" 
                                          : "text-[#3b82f6] hover:bg-blue-50"
                                      )}
                                    >
                                      P
                                    </button>
                                    <span className="text-[#cbd5e1] text-[10px]">|</span>
                                    <button 
                                      onClick={() => handleRecordAttendance(student.id, 'absent')}
                                      className={cn(
                                        "font-bold text-[13px] transition-all px-2 py-1 rounded-md border border-transparent",
                                        record?.status === 'absent' 
                                          ? "bg-[#fef2f2] text-[#ef4444] border-[#ef4444]" 
                                          : "text-[#ef4444] hover:bg-red-50"
                                      )}
                                    >
                                      A
                                    </button>
                                  </div>
                                </div>
                              )})}
                          </div>
                        </div>
                      )
                    })}
                    {students.length === 0 && (
                      <div className="text-center p-4 text-[#64748b] text-[13px]">No students available.</div>
                    )}
                  </div>
                  <button className="bg-[#3b82f6] text-white font-semibold text-[13px] rounded-lg py-2.5 w-full hover:bg-blue-600 transition-all mt-auto">
                    Submit Final Roll Call
                  </button>
                </div>
                
                <div className="glass p-6 rounded-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] md:col-span-2 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all flex flex-col max-h-[600px]">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[14px] font-semibold text-[#64748b]">Daily Attendance History</span>
                    <input 
                      type="date" 
                      value={attendanceDate}
                      onChange={(e) => setAttendanceDate(e.target.value)}
                      className="p-1.5 text-[12px] bg-white rounded-lg border border-[#e2e8f0] focus:ring-1 focus:ring-[#3b82f6] outline-none"
                    />
                  </div>
                  
                  <div className="flex-1 overflow-auto bg-white rounded-xl border border-[#e2e8f0] shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                    {attendanceRecords.length === 0 ? (
                      <div className="p-8 text-center text-[#94a3b8] text-[13px]">No records found for this date.</div>
                    ) : (
                      <div className="divide-y divide-[#e2e8f0]">
                        {Object.keys(students.reduce((acc, student) => {
                          if (!acc[student.classId]) acc[student.classId] = [];
                          acc[student.classId].push(student);
                          return acc;
                        }, {} as Record<string, Student[]>)).sort().map(classId => {
                          const classStudentsWithRecords = students
                            .filter(s => s.classId === classId && attendanceRecords.some(r => r.studentId === s.id))
                            .sort((a,b) => {
                              const numA = parseInt(a.rollNumber);
                              const numB = parseInt(b.rollNumber);
                              if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                              return a.rollNumber.localeCompare(b.rollNumber);
                            });

                          if (classStudentsWithRecords.length === 0) return null;

                          return (
                            <div key={classId}>
                              <div className="bg-[#f8fafc] px-4 py-2 sticky top-0 border-b border-[#e2e8f0] flex justify-between items-center z-10">
                                <span className="text-[13px] font-bold text-[#475569]">Class {classId}</span>
                                <span className="text-[11px] text-[#64748b]">{classStudentsWithRecords.length} Records</span>
                              </div>
                              <table className="w-full text-left border-collapse text-[13px]">
                                <tbody>
                                  {classStudentsWithRecords.map(student => {
                                    const record = attendanceRecords.find(r => r.studentId === student.id);
                                    return (
                                      <tr key={student.id} className="border-b border-[#f1f5f9] hover:bg-[#f8fafc] transition-colors last:border-b-0">
                                        <td className="p-3 font-mono text-[12px] text-[#64748b] w-20">{student.rollNumber}</td>
                                        <td className="p-3 font-semibold text-[#1e293b]">{student.name}</td>
                                        <td className="p-3 text-right w-24">
                                          {record?.status === 'present' ? (
                                            <span className="bg-[#ecfdf5] text-[#059669] px-2 py-1 rounded-md text-[11px] font-bold">Present</span>
                                          ) : (
                                            <span className="bg-[#fef2f2] text-[#ef4444] px-2 py-1 rounded-md text-[11px] font-bold">Absent</span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'marks' && (
               <motion.div 
                key="marks"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="glass p-6 rounded-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
                  <h3 className="text-[14px] font-semibold text-[#1e293b] mb-4">Entry Results</h3>
                  <form onSubmit={handleAddMark} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <select 
                      className="p-2.5 text-[13px] bg-[#f8fafc] rounded-lg border border-[#e2e8f0] focus:ring-1 focus:ring-[#3b82f6] outline-none"
                      value={newMark.studentId} onChange={e => setNewMark({...newMark, studentId: e.target.value})}
                      required
                    >
                      <option value="">Select Student</option>
                      {students.map(s => <option key={s.id} value={s.id}>[{s.classId}] {s.name}</option>)}
                    </select>
                    <input 
                      type="text" placeholder="Subject" 
                      className="p-2.5 text-[13px] bg-[#f8fafc] rounded-lg border border-[#e2e8f0] focus:ring-1 focus:ring-[#3b82f6] outline-none"
                      value={newMark.subject} onChange={e => setNewMark({...newMark, subject: e.target.value})}
                      required
                    />
                    <select 
                      className="p-2.5 text-[13px] bg-[#f8fafc] rounded-lg border border-[#e2e8f0] focus:ring-1 focus:ring-[#3b82f6] outline-none"
                      value={newMark.exam} onChange={e => setNewMark({...newMark, exam: e.target.value})}
                      required
                    >
                      <option value="">Select Exam</option>
                      <option value="Unit Test">Unit Test</option>
                      <option value="First Term">First Term</option>
                      <option value="Mid Term">Mid Term</option>
                      <option value="Final Exam">Final Exam</option>
                    </select>
                    <div className="flex gap-2">
                      <input 
                        type="number" placeholder="Score" 
                        className="w-1/2 p-2.5 text-[13px] bg-[#f8fafc] rounded-lg border border-[#e2e8f0] focus:ring-1 focus:ring-[#3b82f6] outline-none"
                        value={newMark.score} onChange={e => setNewMark({...newMark, score: e.target.value})}
                        required
                      />
                      <input 
                        type="number" placeholder="Total" 
                        className="w-1/2 p-2.5 text-[13px] bg-[#f8fafc] rounded-lg border border-[#e2e8f0] focus:ring-1 focus:ring-[#3b82f6] outline-none"
                        value={newMark.maxScore} onChange={e => setNewMark({...newMark, maxScore: e.target.value})}
                        required
                      />
                    </div>
                    <button type="submit" className="col-span-full bg-[#3b82f6] text-white font-semibold text-[13px] rounded-lg py-2.5 hover:bg-blue-600 transition-all">
                      Update Gradebook
                    </button>
                  </form>
                </div>

                <div className="glass p-6 rounded-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
                  <h3 className="text-[14px] font-semibold text-[#1e293b] mb-4">Recent Marks Added</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[13px]">
                      <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                        <tr>
                          <th className="p-4 text-[#94a3b8] font-medium">Date</th>
                          <th className="p-4 text-[#94a3b8] font-medium">Class</th>
                          <th className="p-4 text-[#94a3b8] font-medium">Student Name</th>
                          <th className="p-4 text-[#94a3b8] font-medium">Subject</th>
                          <th className="p-4 text-[#94a3b8] font-medium">Exam</th>
                          <th className="p-4 text-[#94a3b8] font-medium">Score</th>
                          <th className="p-4 text-[#94a3b8] font-medium w-24 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {marksRecords.map(mark => {
                          const student = students.find(s => s.id === mark.studentId);
                          return (
                            <tr key={mark.id} className="border-b border-[#f1f5f9] hover:bg-[#f8fafc] transition-colors group">
                              <td className="p-4 text-[#64748b]">{mark.date}</td>
                              <td className="p-4 text-[#64748b] font-medium">{student ? student.classId : 'N/A'}</td>
                              <td className="p-4 font-semibold text-[#1e293b]">{student ? student.name : 'Unknown Student'}</td>
                              <td className="p-4 text-[#64748b]">{mark.subject}</td>
                              <td className="p-4 text-[#64748b]">
                                <span className="bg-slate-100 px-2 py-1 rounded text-[11px] font-medium">{mark.exam}</span>
                              </td>
                              <td className="p-4 text-[#1e293b] font-medium">{mark.score} / {mark.maxScore}</td>
                              <td className="p-4 text-right">
                                <button className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all" onClick={async () => {
                                  if(confirm("Are you sure you want to delete this mark?")) {
                                    if(mark.id) {
                                      await deleteDoc(doc(db, 'marks', mark.id));
                                      fetchMarksRecords();
                                    }
                                  }
                                }}>
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {marksRecords.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-[#94a3b8]">No marks recorded yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'notes' && (
              <motion.div 
                key="notes"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                <div className="glass p-6 rounded-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
                  <h3 className="text-[14px] font-semibold text-[#1e293b] mb-4">Study Materials & Live Classes</h3>
                  <form onSubmit={handleAddNote} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input 
                        type="text" placeholder="Resource Title" 
                        className="p-2.5 text-[13px] bg-[#f8fafc] rounded-lg border border-[#e2e8f0] outline-none focus:ring-1 focus:ring-[#3b82f6]"
                        value={newNote.title} onChange={e => setNewNote({...newNote, title: e.target.value})}
                        required
                      />
                      <select 
                        className="p-2.5 text-[13px] bg-[#f8fafc] rounded-lg border border-[#e2e8f0] outline-none"
                        value={newNote.type} onChange={e => setNewNote({...newNote, type: e.target.value as any})}
                      >
                        <option value="note">PDF / Document</option>
                        <option value="class_link">Live Class Session</option>
                      </select>
                    </div>
                    <input 
                      type="text" placeholder="Allocated Class (e.g. 10-A)" 
                      className="w-full p-2.5 text-[13px] bg-[#f8fafc] rounded-lg border border-[#e2e8f0] outline-none"
                      value={newNote.classId} onChange={e => setNewNote({...newNote, classId: e.target.value})}
                      required
                    />
                    <textarea 
                      placeholder="Brief Description" 
                      className="w-full p-2.5 text-[13px] bg-[#f8fafc] rounded-lg border border-[#e2e8f0] outline-none min-h-[80px]"
                      value={newNote.content} onChange={e => setNewNote({...newNote, content: e.target.value})}
                      required
                    />
                    {newNote.type === 'class_link' ? null : (
                      <input 
                        type="file" 
                        className="w-full p-2.5 text-[13px] bg-[#f8fafc] rounded-lg border border-[#e2e8f0] outline-none"
                        onChange={e => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                        required
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                      />
                    )}
                    <button type="submit" disabled={uploading} className="w-full bg-[#0f172a] text-white font-semibold text-[13px] rounded-lg py-2.5 hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                      <Send className="w-4 h-4" /> {uploading ? 'Publishing...' : 'Publish Resource'}
                    </button>
                  </form>
                </div>

                <div className="glass p-6 rounded-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-[14px] font-semibold text-[#1e293b]">Quick Start Live Class</span>
                  </div>
                  <div className="flex-1 flex flex-col justify-center gap-4 bg-[#eff6ff] rounded-xl p-6">
                    <p className="text-[13px] text-[#64748b] text-center">Instantly create a secure virtual classroom.</p>
                    <input 
                      type="text" 
                      placeholder="Class ID (e.g. 10-A)" 
                      className="w-full p-2.5 text-[13px] bg-white rounded-lg border border-[#e2e8f0] outline-none text-center"
                      value={meetingClassId} 
                      onChange={e => setMeetingClassId(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={() => {
                      if (!meetingClassId) {
                        alert("Please enter a Class ID to start a meeting.");
                        return;
                      }
                      setActiveMeeting(`EduPulse-Class-${meetingClassId}-${Date.now()}`);
                    }}
                    className="mt-6 bg-[#3b82f6] text-white font-semibold text-[13px] rounded-lg py-3 w-full hover:bg-blue-600 shadow-md shadow-blue-100 transition-all"
                  >
                    Initialize Meeting Space
                  </button>
                </div>

                <div className="glass p-6 rounded-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all md:col-span-2">
                  <h3 className="text-[14px] font-semibold text-[#1e293b] mb-4">Published Resources & Notes</h3>
                  <div className="space-y-4">
                    {notesList.map((note) => (
                      <div key={note.id} className="flex gap-4 p-4 rounded-xl border border-[#f1f5f9] hover:border-[#e2e8f0] transition-all bg-white">
                        <div className="w-10 h-10 bg-[#f1f5f9] rounded-lg flex items-center justify-center shrink-0">
                          <BookOpen className="text-[#64748b] w-5 h-5" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-[14px] text-[#1e293b]">{note.title}</h4>
                            <span className="text-[10px] font-bold text-[#64748b] bg-[#f1f5f9] px-2 py-0.5 rounded-md">Class: {note.classId}</span>
                          </div>
                          <p className="text-[12px] text-[#64748b] mb-2">{note.content}</p>
                          <p className="text-[11px] text-[#94a3b8]">{note.type === 'class_link' ? 'Online Class Session' : 'Study Resource'}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {note.url && (
                            note.type === 'class_link' ? (
                              <button 
                                onClick={() => setActiveMeeting(note.url as string)}
                                className="bg-[#3b82f6] text-white hover:bg-blue-600 font-semibold text-[12px] px-4 py-2 rounded-lg transition-all"
                              >
                                Join Class
                              </button>
                            ) : (
                              <a 
                                href={note.url} target="_blank" rel="noopener noreferrer"
                                className="bg-[#f8fafc] text-[#1e293b] border border-[#e2e8f0] hover:bg-[#f1f5f9] font-semibold text-[12px] px-4 py-2 rounded-lg transition-all"
                              >
                                View Resource
                              </a>
                            )
                          )}
                          <button className="text-red-400 hover:text-red-600 transition-all p-2" onClick={async () => {
                            if(confirm("Are you sure you want to delete this resource?")) {
                              if(note.id) {
                                await deleteDoc(doc(db, 'notes', note.id));
                                fetchNotesRecords();
                              }
                            }
                          }}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {notesList.length === 0 && <p className="text-center text-[#94a3b8] py-6 text-[13px]">No resources published yet.</p>}
                  </div>
                </div>
              </motion.div>
            )}
            {activeTab === 'meetings' && (
              <motion.div 
                key="meetings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                <div className="glass p-6 rounded-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
                  <h3 className="text-[16px] font-bold text-[#1e293b] mb-6 flex items-center gap-2">
                    <Calendar className="text-[#3b82f6] w-5 h-5" />
                    Schedule New Meeting
                  </h3>
                  <form onSubmit={handleScheduleMeeting} className="space-y-4">
                    <div>
                      <label className="text-[12px] font-bold text-[#64748b] mb-1.5 block">Meeting Title</label>
                      <input 
                        type="text" placeholder="e.g. Science Revision Class" 
                        className="w-full p-2.5 text-[13px] bg-[#f8fafc] rounded-lg border border-[#e2e8f0] outline-none focus:ring-2 focus:ring-[#3b82f6]/20 focus:border-[#3b82f6] transition-all"
                        value={newMeeting.title} onChange={e => setNewMeeting({...newMeeting, title: e.target.value})}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[12px] font-bold text-[#64748b] mb-1.5 block">Date</label>
                        <input 
                          type="date" 
                          className="w-full p-2.5 text-[13px] bg-[#f8fafc] rounded-lg border border-[#e2e8f0] outline-none focus:ring-2 focus:ring-[#3b82f6]/20 focus:border-[#3b82f6] transition-all"
                          value={newMeeting.date} onChange={e => setNewMeeting({...newMeeting, date: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[12px] font-bold text-[#64748b] mb-1.5 block">Time</label>
                        <input 
                          type="time" 
                          className="w-full p-2.5 text-[13px] bg-[#f8fafc] rounded-lg border border-[#e2e8f0] outline-none focus:ring-2 focus:ring-[#3b82f6]/20 focus:border-[#3b82f6] transition-all"
                          value={newMeeting.time} onChange={e => setNewMeeting({...newMeeting, time: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[12px] font-bold text-[#64748b] mb-1.5 block">Target Class</label>
                      <input 
                        type="text" placeholder="e.g. 10-A" 
                        className="w-full p-2.5 text-[13px] bg-[#f8fafc] rounded-lg border border-[#e2e8f0] outline-none focus:ring-2 focus:ring-[#3b82f6]/20 focus:border-[#3b82f6] transition-all"
                        value={newMeeting.classId} onChange={e => setNewMeeting({...newMeeting, classId: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[12px] font-bold text-[#64748b] mb-1.5 block">Description (Optional)</label>
                      <textarea 
                        placeholder="Briefly describe the meeting agenda..." 
                        className="w-full p-2.5 text-[13px] bg-[#f8fafc] rounded-lg border border-[#e2e8f0] outline-none min-h-[100px] focus:ring-2 focus:ring-[#3b82f6]/20 focus:border-[#3b82f6] transition-all"
                        value={newMeeting.description} onChange={e => setNewMeeting({...newMeeting, description: e.target.value})}
                      />
                    </div>
                    <button type="submit" className="w-full bg-[#0f172a] text-white font-bold text-[14px] rounded-xl py-3.5 hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200">
                      <Calendar className="w-5 h-5" /> Schedule Session
                    </button>
                  </form>
                </div>

                <div className="md:col-span-2 glass p-6 rounded-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
                  <h3 className="text-[16px] font-bold text-[#1e293b] mb-6 flex items-center gap-2">
                    <Video className="text-[#3b82f6] w-5 h-5" />
                    All Scheduled Meetings
                  </h3>
                  <div className="space-y-4">
                    {meetingsList.length === 0 ? (
                      <div className="text-center py-12 text-[#64748b] bg-white rounded-2xl border border-[#e2e8f0]">
                        No meetings scheduled yet.
                      </div>
                    ) : (
                      meetingsList.map(meeting => (
                        <div key={meeting.id} className="bg-white p-5 rounded-2xl border border-[#f1f5f9] hover:border-[#3b82f6]/30 transition-all group flex items-center gap-6">
                           <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex flex-col items-center justify-center shrink-0 border border-slate-100 group-hover:bg-blue-50 group-hover:text-blue-500 group-hover:border-blue-100 transition-all">
                              <span className="text-[10px] font-bold uppercase leading-none mb-1">{new Date(meeting.date).toLocaleString('default', { month: 'short' })}</span>
                              <span className="text-[20px] font-black leading-none">{new Date(meeting.date).getDate()}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-1">
                                <h4 className="font-bold text-[16px] text-[#1e293b] truncate">{meeting.title}</h4>
                                <span className="text-[10px] font-bold text-[#3b82f6] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">Class {meeting.classId}</span>
                              </div>
                              <p className="text-[13px] text-[#64748b] line-clamp-1 mb-2">{meeting.description || 'No description provided.'}</p>
                              <div className="flex items-center gap-4">
                                <span className="text-[12px] text-[#94a3b8] flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5" /> {meeting.time}
                                </span>
                                <span className="text-[12px] text-[#94a3b8] flex items-center gap-1.5">
                                  <Video className="w-3.5 h-3.5" /> Online Class
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <button 
                                onClick={() => setActiveMeeting(meeting.meetingLink)}
                                className="bg-[#3b82f6] text-white font-bold text-[13px] px-5 py-2.5 rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-100 active:scale-95"
                              >
                                Join Now
                              </button>
                              <button 
                                onClick={async () => {
                                  if(confirm("Cancel this meeting?")) {
                                    if(meeting.id) {
                                      await deleteDoc(doc(db, 'meetings', meeting.id));
                                      fetchMeetingsRecords();
                                    }
                                  }
                                }}
                                className="p-2.5 text-[#94a3b8] hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
      {activeMeeting && (
        <LiveClassRoom
          roomName={activeMeeting}
          userName={profile?.name || 'Teacher'}
          userEmail={profile?.email || ''}
          isTeacher={true}
          onClose={() => setActiveMeeting(null)}
        />
      )}
    </div>
  );
}

// Fixed missing icon import
