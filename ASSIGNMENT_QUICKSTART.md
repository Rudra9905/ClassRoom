# Assignment Features - Quick Start Guide

## What's Been Implemented

### For Teachers:
1. **View Statistics**: See who submitted, who hasn't, and grading progress
2. **Edit Deadlines**: Change assignment deadlines even after creation
3. **Track Non-Submitted Students**: Get a list of students who haven't submitted
4. **Deadline Enforcement**: Students can't submit after deadline

### For Students:
1. **View All Assignments**: See assignments from all your classes in one place
2. **Filter by Status**: All, Pending (not submitted), Submitted, Graded
3. **Deadline Alerts**: Visual indicators for due soon/overdue assignments
4. **Submission Status**: See your grades and feedback immediately
5. **Deadline Protection**: Can't submit after deadline passes

## Starting the Application

### 1. Start Backend (Terminal 1)
```powershell
./mvnw spring-boot:run
```
The backend will start on `http://localhost:8080`

### 2. Start Frontend (Terminal 2)
```powershell
cd frontend
npm run dev
```
The frontend will start on `http://localhost:5173`

## Testing the Features

### As a Teacher:

1. **Create a Classroom** (if not already done)
   - Navigate to Classes
   - Create new classroom
   - Note the class code

2. **Create an Assignment**
   - Go to your classroom
   - Create a new assignment with a deadline
   - Example: Set deadline for tomorrow

3. **View Assignment Details**
   - Click on the assignment
   - You should see:
     - **Statistics Card** with 4 metrics (Total/Submitted/Not Submitted/Graded)
     - **Edit Deadline Button** next to the due date
     - **Non-Submitted Students List** (if any students haven't submitted)
     - **Submissions Table** with all student submissions

4. **Edit Deadline**
   - Click "Edit deadline" button
   - Change the date/time
   - Click "Save"
   - Deadline updates immediately

5. **View Statistics**
   - The statistics automatically update as students submit
   - Green: Submitted count
   - Orange: Not submitted count
   - Blue: Graded count

### As a Student:

1. **Join Classroom** (if not already joined)
   - Use the class code from teacher
   - Join the classroom

2. **View Assignments**
   - Go to Assignments page
   - You'll see tabs: All, Pending, Submitted, Graded
   - Each shows the count

3. **Check Assignment Status**
   - Assignments show badges:
     - 🟢 "Open" - Can submit
     - 🟡 "Due Soon" - Less than 24 hours
     - 🔴 "Overdue" - Past deadline
     - "Submitted" - Already submitted
     - "Graded" - Teacher graded it

4. **Submit Assignment**
   - Click on a pending assignment
   - If before deadline: Submit form is shown
   - If after deadline: Red message "Deadline has passed"
   - Submit with a URL

5. **View Your Submission**
   - After submitting, you see "Submitted" badge
   - Shows submission date/time
   - When graded, shows your score and feedback

## Testing Deadline Enforcement

### Test Case 1: Before Deadline
1. Teacher creates assignment with deadline tomorrow
2. Student can see assignment in "Pending" tab
3. Student can submit successfully
4. Assignment moves to "Submitted" tab

### Test Case 2: After Deadline
1. Teacher creates assignment with deadline in the past
2. Student sees "Overdue" badge (red)
3. Student clicks on assignment
4. Sees red message: "Deadline has passed"
5. Cannot submit (form is hidden)
6. If student tries to submit via API, gets error

### Test Case 3: Edit Deadline
1. Teacher creates assignment with past deadline
2. Students can't submit
3. Teacher edits deadline to future
4. Students can now submit
5. Statistics update correctly

## API Testing with Postman/curl

### Get Student Assignments
```bash
GET http://localhost:8080/api/assignments/my?studentId=1
```

### Get Assignment Statistics
```bash
GET http://localhost:8080/api/classrooms/1/assignments/1/statistics
```

### Get Non-Submitted Students
```bash
GET http://localhost:8080/api/classrooms/1/assignments/1/non-submitted-students
```

### Update Assignment Deadline
```bash
PUT http://localhost:8080/api/classrooms/1/assignments/1
Content-Type: application/json

{
  "dueDate": "2025-12-10T23:59:00"
}
```

### Try Submit After Deadline (Should Fail)
```bash
POST http://localhost:8080/api/assignments/1/submissions?studentId=1
Content-Type: application/json

{
  "contentUrl": "https://example.com/submission"
}
```
Expected Response: 400 Bad Request with message "Cannot submit assignment after the deadline"

## Common Issues & Solutions

### Issue: Frontend can't connect to backend
**Solution**: Ensure backend is running on port 8080
```powershell
./mvnw spring-boot:run
```

### Issue: "User not found" errors
**Solution**: Make sure you're logged in and user context is set up

### Issue: Statistics showing 0 students
**Solution**: Ensure students have joined the classroom (check ClassroomMember table)

### Issue: Can't see assignments
**Solution**: 
- Teacher: Check if assignments are created for your classroom
- Student: Ensure you've joined the classroom

### Issue: Deadline not enforcing
**Solution**: Check that assignment has a valid dueDate set

## Database Verification

Check if data is correct:

```sql
-- View assignments with deadlines
SELECT id, title, due_date FROM assignments;

-- View classroom members
SELECT * FROM classroom_members;

-- View submissions
SELECT * FROM assignment_submissions;

-- Check statistics
SELECT 
  a.title,
  (SELECT COUNT(*) FROM classroom_members WHERE classroom_id = a.classroom_id AND role_in_class = 'STUDENT') as total_students,
  (SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = a.id) as submitted_count
FROM assignments a;
```

## Features Checklist

### Teacher Features:
- [ ] Can view submission statistics
- [ ] Can see total students count
- [ ] Can see submitted vs not submitted count
- [ ] Can see graded count
- [ ] Can edit assignment deadline
- [ ] Can see list of non-submitted students
- [ ] Students can't submit after deadline

### Student Features:
- [ ] Can view all assignments across classes
- [ ] Can filter by All/Pending/Submitted/Graded
- [ ] Can see deadline status badges
- [ ] Can see "Due Soon" for <24 hours
- [ ] Can see "Overdue" for past deadline
- [ ] Cannot submit after deadline
- [ ] Can see own submission status
- [ ] Can see grade when assigned
- [ ] Can see teacher feedback

## Next Steps

After verifying all features work:

1. ✅ Test with multiple classrooms
2. ✅ Test with multiple students
3. ✅ Test deadline edge cases (exactly at deadline)
4. ✅ Test concurrent submissions
5. ✅ Test grade updates
6. ✅ Test filter combinations

## Support

If you encounter issues:
1. Check console logs (browser F12)
2. Check backend logs in terminal
3. Verify database state
4. Check API responses in Network tab

All backend code compiles ✅
All frontend code builds ✅
All features implemented ✅
Ready for testing! 🚀
