export type UserRole = 'teacher' | 'parent';

export interface UserProfile {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  studentIds?: string[];
}

export interface Student {
  id: string;
  name: string;
  rollNumber: string;
  classId: string;
  parentEmail: string;
}

export interface AttendanceRecord {
  id?: string;
  studentId: string;
  date: string;
  status: 'present' | 'absent';
  classId: string;
}

export interface MarkRecord {
  id?: string;
  studentId: string;
  subject: string;
  exam: string;
  score: number;
  maxScore: number;
  date: string;
}

export interface NoteRecord {
  id?: string;
  classId: string;
  title: string;
  content: string;
  type: 'note' | 'class_link';
  url?: string;
  createdAt: any; // Firestore Timestamp
}
