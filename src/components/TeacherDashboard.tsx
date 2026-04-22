import React, { useState, useEffect } from 'react';
import { 
  Users, CheckCircle, FileSpreadsheet, BookOpen, Plus, Search, 
  Trash2, Send, LayoutDashboard, LogOut, FileText 
} from 'lucide-react';
import { 
  collection, addDoc, query, getDocs, where, deleteDoc, doc, serverTimestamp, orderBy 
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Student, AttendanceRecord, MarkRecord, NoteRecord } from '../types';
import { useAuth } from './AuthProvider';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function TeacherDashboard() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'attendance' | 'marks' | 'notes'>('overview');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newStudent, setNewStudent] = useState({ name: '', rollNumber: '', classId: '', parentEmail: '' });
  const [newMark, setNewMark] = useState({ studentId: '', subject: '', score: 0, maxScore: 100, date: new Date().toISOString().split('T')[0] });
  const [newNote, setNewNote] = useState({ classId: '', title: '', content: '', type: 'note' as const, url: '' });

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

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'students'), newStudent);
      setNewStudent({ name: '', rollNumber: '', classId: '', parentEmail: '' });
      fetchStudents();
    } catch (error) {
      console.error("Error adding student:", error);
    }
  };

  const handleRecordAttendance = async (studentId: string, status: 'present' | 'absent') => {
    try {
      const student = students.find(s => s.id === studentId);
      if (!student) return;

      const record: AttendanceRecord = {
        studentId,
        date: new Date().toISOString().split('T')[0],
        status,
        classId: student.classId
      };
      await addDoc(collection(db, 'attendance'), record);
      alert(`Attendance recorded for ${student.name}`);
    } catch (error) {
      console.error("Error recording attendance:", error);
    }
  };

  const handleAddMark = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'marks'), newMark);
      setNewMark({ studentId: '', subject: '', score: 0, maxScore: 100, date: new Date().toISOString().split('T')[0] });
      alert("Mark added successfully");
    } catch (error) {
      console.error("Error adding mark:", error);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'notes'), {
        ...newNote,
        createdAt: serverTimestamp()
      });
      setNewNote({ classId: '', title: '', content: '', type: 'note', url: '' });
      alert("Note added successfully");
    } catch (error) {
      console.error("Error adding note:", error);
    }
  };

  const sidebarItems = [
    { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
    { id: 'students', icon: Users, label: 'Students' },
    { id: 'attendance', icon: CheckCircle, label: 'Attendance' },
    { id: 'marks', icon: FileSpreadsheet, label: 'Marks' },
    { id: 'notes', icon: BookOpen, label: 'Notes' },
  ];

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-[#1e293b] font-sans">
      {/* Sidebar */}
      <div className="w-[240px] bg-[#0f172a] text-[#f8fafc] flex flex-col border-r border-[#e2e8f0]">
        <div className="p-6 font-bold text-xl border-b border-[#1e293b] flex items-center gap-3">
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
                  "w-full flex items-center gap-3 px-6 py-3 text-[14px] transition-colors cursor-pointer",
                  isActive 
                    ? "bg-[#3b82f6] text-white font-semibold" 
                    : "text-[#94a3b8] hover:bg-[#1e293b] hover:text-white"
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
        <header className="h-16 bg-white border-b border-[#e2e8f0] flex items-center justify-between px-8 shrink-0">
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
                <div className="bg-white p-5 rounded-xl border border-[#e2e8f0] shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
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
                <div className="bg-white p-5 rounded-xl border border-[#e2e8f0] shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
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

                <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
                  <table className="w-full text-left border-collapse text-[13px]">
                    <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                      <tr>
                        <th className="p-4 text-[#94a3b8] font-medium">Roll No</th>
                        <th className="p-4 text-[#94a3b8] font-medium">Student Name</th>
                        <th className="p-4 text-[#94a3b8] font-medium">Class</th>
                        <th className="p-4 text-[#94a3b8] font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map(student => (
                        <tr key={student.id} className="border-b border-[#f1f5f9] hover:bg-[#f8fafc] transition-colors group">
                          <td className="p-4 font-mono text-[12px] text-[#64748b]">{student.rollNumber}</td>
                          <td className="p-4 font-semibold text-[#1e293b]">{student.name}</td>
                          <td className="p-4 text-[#64748b]">{student.classId}</td>
                          <td className="p-4">
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
              </motion.div>
            )}

            {activeTab === 'attendance' && (
              <motion.div 
                 key="attendance"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                <div className="lg:col-span-1 bg-white p-5 rounded-xl border border-[#e2e8f0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col h-full">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[14px] font-semibold text-[#64748b]">Attendance Roll Call</span>
                    <span className="bg-[#ecfdf5] text-[#059669] px-2 py-1 rounded-md text-[11px] font-bold tracking-tight">Live</span>
                  </div>
                  <div className="space-y-1 flex-1 overflow-y-auto mb-4">
                    {students.map(student => (
                      <div key={student.id} className="flex justify-between items-center py-2.5 border-b border-[#f1f5f9] transition-colors hover:bg-slate-50 px-2 rounded-lg">
                        <span className="text-[13px] text-[#1e293b] font-medium">{student.rollNumber}. {student.name}</span>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => handleRecordAttendance(student.id, 'present')}
                            className="text-[#3b82f6] font-bold text-[13px] hover:scale-110 transition-transform px-1"
                          >
                            P
                          </button>
                          <span className="text-[#cbd5e1] text-[10px]">|</span>
                          <button 
                            onClick={() => handleRecordAttendance(student.id, 'absent')}
                            className="text-[#ef4444] font-bold text-[13px] hover:scale-110 transition-transform px-1"
                          >
                            A
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="bg-[#3b82f6] text-white font-semibold text-[13px] rounded-lg py-2.5 w-full hover:bg-blue-600 transition-all">
                    Submit Final Roll Call
                  </button>
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
                <div className="bg-white p-5 rounded-xl border border-[#e2e8f0] shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                  <h3 className="text-[14px] font-semibold text-[#1e293b] mb-4">Entry Results</h3>
                  <form onSubmit={handleAddMark} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <select 
                      className="p-2.5 text-[13px] bg-[#f8fafc] rounded-lg border border-[#e2e8f0] focus:ring-1 focus:ring-[#3b82f6] outline-none"
                      value={newMark.studentId} onChange={e => setNewMark({...newMark, studentId: e.target.value})}
                      required
                    >
                      <option value="">Select Student</option>
                      {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <input 
                      type="text" placeholder="Subject" 
                      className="p-2.5 text-[13px] bg-[#f8fafc] rounded-lg border border-[#e2e8f0] focus:ring-1 focus:ring-[#3b82f6] outline-none"
                      value={newMark.subject} onChange={e => setNewMark({...newMark, subject: e.target.value})}
                      required
                    />
                    <div className="flex gap-2">
                      <input 
                        type="number" placeholder="Score" 
                        className="w-1/2 p-2.5 text-[13px] bg-[#f8fafc] rounded-lg border border-[#e2e8f0] focus:ring-1 focus:ring-[#3b82f6] outline-none"
                        value={newMark.score} onChange={e => setNewMark({...newMark, score: Number(e.target.value)})}
                        required
                      />
                      <input 
                        type="number" placeholder="Total" 
                        className="w-1/2 p-2.5 text-[13px] bg-[#f8fafc] rounded-lg border border-[#e2e8f0] focus:ring-1 focus:ring-[#3b82f6] outline-none"
                        value={newMark.maxScore} onChange={e => setNewMark({...newMark, maxScore: Number(e.target.value)})}
                        required
                      />
                    </div>
                    <button type="submit" className="col-span-full bg-[#3b82f6] text-white font-semibold text-[13px] rounded-lg py-2.5 hover:bg-blue-600 transition-all">
                      Update Gradebook
                    </button>
                  </form>
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
                <div className="bg-white p-5 rounded-xl border border-[#e2e8f0] shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
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
                    {newNote.type === 'class_link' && (
                      <input 
                        type="url" placeholder="Session URL (Zoom/Meet)" 
                        className="w-full p-2.5 text-[13px] bg-[#f8fafc] rounded-lg border border-[#e2e8f0] outline-none"
                        value={newNote.url} onChange={e => setNewNote({...newNote, url: e.target.value})}
                        required
                      />
                    )}
                    <button type="submit" className="w-full bg-[#0f172a] text-white font-semibold text-[13px] rounded-lg py-2.5 hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                      <Send className="w-4 h-4" /> Publish Resource
                    </button>
                  </form>
                </div>

                <div className="bg-white p-5 rounded-xl border border-[#e2e8f0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-[14px] font-semibold text-[#1e293b]">Upcoming Virtual Activity</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-[#eff6ff] rounded-xl">
                    <span className="text-[13px] text-[#1e293b] mb-1">Session Starts In</span>
                    <div className="text-[32px] font-bold text-[#1d4ed8] tracking-tight">00:14:52</div>
                    <span className="text-[11px] text-[#64748b] mt-2">Waiting for student check-ins...</span>
                  </div>
                  <button className="mt-6 bg-[#3b82f6] text-white font-semibold text-[13px] rounded-lg py-3 w-full hover:bg-blue-600 shadow-md shadow-blue-100 transition-all">
                    Initialize Meeting Space
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

// Fixed missing icon import
import { GraduationCap as GraduationCapIcon } from 'lucide-react';
