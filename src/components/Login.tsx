import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from './AuthProvider';
import { LogIn, School, UserRound, GraduationCap } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const { profile, setRole } = useAuth();
  const [selectingRole, setSelectingRole] = useState(false);

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const result = await signInWithPopup(auth, provider);
      console.log("Sign-in successful:", result.user);
      setSelectingRole(true);
    } catch (error: any) {
      console.error("Sign-in error code:", error.code);
      console.error("Sign-in error message:", error.message);
      console.error("Full error:", error);
      alert(`Sign-in failed: ${error.message || 'Unknown error'}`);
    }
  };

  const handleRoleSelection = async (role: 'teacher' | 'parent') => {
    await setRole(role);
  };

  if (selectingRole && !profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <School className="text-blue-600 w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome to EduPulse</h2>
          <p className="text-slate-500 mb-8">Please select your role to continue</p>
          
          <div className="grid grid-cols-2 gap-4">
            <button
              id="role-teacher-btn"
              onClick={() => handleRoleSelection('teacher')}
              className="flex flex-col items-center p-6 border-2 border-slate-100 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <UserRound className="w-10 h-10 text-slate-400 group-hover:text-blue-600 mb-3" />
              <span className="font-semibold text-slate-700 group-hover:text-blue-700">Teacher</span>
            </button>
            <button
              id="role-parent-btn"
              onClick={() => handleRoleSelection('parent')}
              className="flex flex-col items-center p-6 border-2 border-slate-100 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-all group"
            >
              <GraduationCap className="w-10 h-10 text-slate-400 group-hover:text-emerald-600 mb-3" />
              <span className="font-semibold text-slate-700 group-hover:text-emerald-700">Parent</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background blobs */}
      <div className="absolute top-0 -left-10 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob"></div>
      <div className="absolute top-0 -right-10 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-10 animate-blob animation-delay-4000"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/5 backdrop-blur-xl p-12 rounded-[2rem] border border-white/10 shadow-2xl max-w-xl w-full relative z-10 text-center"
      >
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
            <School className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">EduPulse</h1>
        </div>

        <h2 className="text-4xl font-extrabold text-white mb-6 leading-tight">
          Academy Management <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Perfected.</span>
        </h2>
        <p className="text-slate-400 text-[16px] mb-12 max-w-md mx-auto leading-relaxed">
          The all-in-one portal for modern educators and parents to monitor, manage, and celebrate student achievement.
        </p>

        <button
          id="google-signin-btn"
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-4 bg-white hover:bg-slate-50 text-[#0f172a] font-bold py-4 px-8 rounded-xl transition-all shadow-xl hover:translate-y-[-2px] active:translate-y-[0px]"
        >
          <LogIn className="w-5 h-5 text-blue-600" />
          Access Portal with Google
        </button>

        <div className="mt-12 pt-8 border-t border-white/5 flex items-center justify-center gap-8 text-[11px] text-slate-500 uppercase tracking-widest font-semibold">
           <span>Attendance</span>
           <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
           <span>Gradebook</span>
           <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
           <span>Resources</span>
        </div>
      </motion.div>
    </div>
  );
}
