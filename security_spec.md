# Security Specification - EduPulse

## Data Invariants
1. A Student must have a valid `classId` and `rollNumber`.
2. Attendance records must be tied to an existing Student.
3. Marks must be tied to an existing Student and have a valid score (0 to maxScore).
4. Only Teachers can create/update Student records, Marks, Attendance, and Notes.
5. Parents can only read data (Students, Attendance, Marks, Notes) related to their children.

## The Dirty Dozen Payloads (Rejection Tests)
1. **Identity Spoofing**: A Parent trying to write to the `marks` collection.
2. **Identity Spoofing**: A User trying to set their own role to 'teacher' in the `users` collection if they are already registered as 'parent'.
3. **Resource Poisoning**: Creating a Student record with a 1MB string as the `rollNumber`.
4. **State Shortcutting**: Updating a Mark record to a score higher than the `maxScore`.
5. **Orphaned Writes**: Creating an Attendance record for a student ID that doesn't exist.
6. **PII Leak**: A Parent trying to `list` all students in the database.
7. **Unauthorized Deletion**: A Student/Parent trying to delete an Attendance record.
8. **Invalid Data**: Creating a Note with an empty title or content.
9. **Timestamp Spoofing**: Setting a future `createdAt` date on a Note.
10. **ID Poisoning**: Using a 500-character junk string as a Student document ID.
11. **Bypassing Validation**: Updating just the `score` field of a Mark without going through the `isValidMark` helper.
12. **Cross-Tenant Access**: Parent A trying to read Attendance data for Student B (who is not their child).

## Implementation Plan
- Use `isValidUser`, `isValidStudent`, `isValidAttendance`, `isValidMark`, `isValidNote` helper functions.
- Enforce `affectedKeys().hasOnly()` for updates.
- Check `getUserData().role` for all sensitive write operations.
- Enforce `request.auth.token.email_verified == true`.
