import React, { useState, useEffect } from 'react';
import { 
  Heart, Calendar, FileSpreadsheet, BookOpen, Clock, 
  ChevronRight, Award, Bell, Shield, LogOut, Video
} from 'lucide-react';
import { collection, query, getDocs, where, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Student, AttendanceRecord, MarkRecord, NoteRecord } from '../types';
import { useAuth } from './AuthProvider';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function ParentDashboard() {
  const { profile } = useAuth();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [children, setChildren] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [marks, setMarks] = useState<MarkRecord[]>([]);
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChildren();
  }, []);

  useEffect(() => {
    if (selectedStudentId) {
      fetchStudentData(selectedStudentId);
    }
  }, [selectedStudentId]);

  const fetchChildren = async () => {
    setLoading(true);
    // In a real app, we'd query by IDs in profile.studentIds
    // For this demo, let's look for students with parentEmail == profile.email
    const q = query(collection(db, 'students'), where('parentEmail', '==', profile?.email || ''));
    const querySnapshot = await getDocs(q);
    const childrenData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
    setChildren(childrenData);
    if (childrenData.length > 0) {
      setSelectedStudentId(childrenData[0].id);
    }
    setLoading(false);
  };

  const fetchStudentData = async (studentId: string) => {
    const student = children.find(c => c.id === studentId);
    if (!student) return;

    // Fetch Attendance
    const aq = query(collection(db, 'attendance'), where('studentId', '==', studentId), orderBy('date', 'desc'), limit(10));
    const attendanceSnap = await getDocs(aq);
    setAttendance(attendanceSnap.docs.map(doc => doc.data() as AttendanceRecord));

    // Fetch Marks
    const mq = query(collection(db, 'marks'), where('studentId', '==', studentId), orderBy('date', 'desc'));
    const marksSnap = await getDocs(mq);
    setMarks(marksSnap.docs.map(doc => doc.data() as MarkRecord));

    // Fetch Notes/Classes
    const nq = query(collection(db, 'notes'), where('classId', '==', student.classId), orderBy('createdAt', 'desc'));
    const notesSnap = await getDocs(nq);
    setNotes(notesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as NoteRecord)));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }} 
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-12 h-12 bg-blue-600 rounded-full"
        />
      </div>
    );
  }

  const activeStudent = children.find(c => c.id === selectedStudentId);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20 relative overflow-hidden">
      {/* Background blobs for premium feel */}
      <div className="absolute top-0 -left-10 w-[500px] h-[500px] bg-rose-200/50 rounded-full mix-blend-multiply filter blur-[128px] opacity-60 animate-blob"></div>
      <div className="absolute top-0 -right-10 w-[500px] h-[500px] bg-violet-200/50 rounded-full mix-blend-multiply filter blur-[128px] opacity-60 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-sky-200/50 rounded-full mix-blend-multiply filter blur-[128px] opacity-50 animate-blob animation-delay-4000"></div>
      {/* Top Header */}
      <header className="h-20 glass border-b border-white/40 sticky top-0 z-30 px-8 flex items-center justify-between shadow-sm backdrop-blur-xl bg-white/70">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-[#0f172a] rounded">
            <Shield className="text-white w-5 h-5" />
          </div>
          <h1 className="text-[18px] font-bold text-[#1e293b]">EduPulse Parent Portal</h1>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex flex-col text-right">
            <span className="text-[14px] font-semibold text-[#1e293b]">{profile?.name}</span>
            <span className="text-[11px] text-[#64748b] -mt-1">Primary Guardian</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#3b82f6] flex items-center justify-center text-white font-bold text-[12px]">
            {profile?.name?.split(' ').map(n => n[0]).join('')}
          </div>
          <button onClick={() => auth.signOut()} className="p-2 text-[#64748b] hover:text-red-500 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Child Selector & Info */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass p-6 rounded-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <h3 className="text-[14px] font-semibold text-[#64748b] mb-4 uppercase tracking-wider">My Children</h3>
            <div className="space-y-2">
              {children.map(child => (
                <button
                  key={child.id}
                  onClick={() => setSelectedStudentId(child.id)}
                  className={cn(
                    "w-full flex items-center gap-4 p-3 rounded-lg border transition-all text-left",
                    selectedStudentId === child.id 
                      ? "bg-[#eff6ff] border-[#3b82f6] shadow-sm" 
                      : "bg-white border-[#f1f5f9] hover:border-[#e2e8f0]"
                  )}
                >
                  <div className="w-10 h-10 rounded-full bg-[#3b82f6] flex items-center justify-center text-white font-bold text-sm">
                    {child.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-[14px] text-[#1e293b]">{child.name}</h4>
                    <p className="text-[11px] text-[#64748b]">Roll: {child.rollNumber} • Class {child.classId}</p>
                  </div>
                </button>
              ))}
              {children.length === 0 && (
                <div className="text-center py-6 px-4 bg-[#f8fafc] rounded-xl border border-dashed border-[#e2e8f0]">
                  <p className="text-[12px] text-[#64748b] italic">No child linked yet. Contact site admin.</p>
                </div>
              )}
            </div>
          </div>

          {activeStudent && (
            <div className="bg-[#0f172a] p-6 rounded-xl text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Shield className="w-20 h-20" />
              </div>
              <h3 className="text-lg font-bold mb-1">Academic Summary</h3>
              <p className="text-slate-400 text-[12px] mb-6">Tracking {activeStudent.name}'s progress</p>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 border border-white/10 p-3 rounded-lg">
                   <p className="text-[10px] text-slate-400 mb-1">Avg Score</p>
                   <p className="text-xl font-bold text-white">
                     {marks.length > 0 
                       ? Math.round((marks.reduce((a, b) => a + (b.score/b.maxScore), 0) / marks.length) * 100) 
                       : 0}%
                   </p>
                </div>
                <div className="bg-white/5 border border-white/10 p-3 rounded-lg">
                   <p className="text-[10px] text-slate-400 mb-1">Attendance</p>
                   <p className="text-xl font-bold text-white">
                     {attendance.length > 0 
                        ? Math.round((attendance.filter(a => a.status === 'present').length / attendance.length) * 100)
                        : 0}%
                   </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content Tabs */}
        <div className="lg:col-span-8 space-y-8">
          {/* Progress Overview Section */}
          <section className="glass rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all border border-white/60 relative z-10">
            <div className="flex items-center justify-between mb-8">
               <h3 className="text-[16px] font-bold text-[#1e293b] flex items-center gap-2">
                 <FileSpreadsheet className="text-[#3b82f6] w-5 h-5" />
                 Mid-Term Performance Metrics
               </h3>
               <span className="text-[11px] font-normal text-[#94a3b8]">Updated 2h ago</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px] border-collapse">
                <thead className="text-[#94a3b8] font-medium border-b border-[#f1f5f9]">
                  <tr>
                    <th className="pb-3 text-left">Subject</th>
                    <th className="pb-3 text-left">Result</th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {marks.map((mark, i) => (
                    <tr key={i} className="hover:bg-[#f8fafc] transition-colors">
                      <td className="py-4 font-semibold text-[#1e293b]">{mark.subject}</td>
                      <td className="py-4 text-[#64748b]">{mark.score} / {mark.maxScore}</td>
                      <td className="py-4 text-right">
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-md inline-block uppercase",
                          (mark.score / mark.maxScore) > 0.8 ? "bg-[#ecfdf5] text-[#059669]" : "bg-[#fffbeb] text-[#d97706]"
                        )}>
                          {(mark.score / mark.maxScore) > 0.8 ? 'Excellent' : 'On Track'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {marks.length === 0 && <p className="text-center text-[#94a3b8] py-10">No marks recorded yet.</p>}
            </div>
          </section>

          {/* School Resources & Virtual Classes */}
          <section className="glass rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all border border-white/60 relative z-10">
             <h3 className="text-[16px] font-bold text-[#1e293b] flex items-center gap-2 mb-8">
               <Video className="text-[#3b82f6] w-5 h-5" />
               Recent Notes & Resources
             </h3>
             <div className="space-y-4">
               {notes.map((note) => (
                 <div key={note.id} className="flex gap-4 p-4 rounded-xl border border-[#f1f5f9] hover:border-[#e2e8f0] transition-all">
                    <div className="w-10 h-10 bg-[#f1f5f9] rounded-lg flex items-center justify-center shrink-0">
                      <BookOpen className="text-[#64748b] w-5 h-5" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <h4 className="font-bold text-[14px] text-[#1e293b] truncate">{note.title}</h4>
                      <p className="text-[11px] text-[#94a3b8]">{note.type === 'class_link' ? 'Online Class Session' : 'Study Resource'}</p>
                    </div>
                    {note.type === 'class_link' ? (
                      <a 
                        href={note.url} target="_blank" rel="noopener noreferrer"
                        className="bg-[#3b82f6] text-white font-semibold text-[12px] px-4 py-2 rounded-lg hover:bg-blue-600 transition-all self-center"
                      >
                        Join Class
                      </a>
                    ) : (
                      <button className="bg-[#f8fafc] text-[#1e293b] border border-[#e2e8f0] font-semibold text-[12px] px-4 py-2 rounded-lg hover:bg-[#f1f5f9] transition-all self-center">
                        View
                      </button>
                    )}
                 </div>
               ))}
               {notes.length === 0 && <p className="text-center text-[#94a3b8] py-10 font-sans">No recent materials.</p>}
             </div>
          </section>
        </div>
      </main>
    </div>
  );
}
