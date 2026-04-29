import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  setRole: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const setRole = async (role: UserRole) => {
    if (!user) return;
    try {
      console.log("Setting role...", role);
      const profileData: UserProfile = {
        userId: user.uid,
        name: user.displayName || 'User',
        email: user.email || '',
        role,
        studentIds: []
      };
      await setDoc(doc(db, 'users', user.uid), profileData);
      console.log("Role saved successfully");
      setProfile(profileData);
    } catch (error: any) {
      console.error("Error setting role:", error);
      alert(`Failed to save role: ${error.message || 'Unknown error. Have you enabled Firestore Database in your Firebase console?'}`);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, setRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
