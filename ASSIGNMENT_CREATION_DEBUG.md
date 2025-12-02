# Assignment Creation Troubleshooting Guide

## Changes Made
1. Added detailed error logging in frontend
2. Added request/response logging in API client
3. Fixed ID type conversion (string → number)
4. Added classroomId to request body

## How to Debug

### Step 1: Refresh the Application
1. **Hard refresh the browser**: Press `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
2. Or clear cache and reload

### Step 2: Open Browser Developer Tools
1. Press `F12` to open Developer Tools
2. Go to the **Console** tab
3. Go to the **Network** tab

### Step 3: Try to Create an Assignment
1. Login as a teacher
2. Go to a classroom
3. Click on "Assignments" tab
4. Click "Create assignment"
5. Fill in the form:
   - Title: "Test Assignment"
   - Description: "Test description"
   - Due Date: Select any future date
   - Max Marks: 100
6. Click "Create"

### Step 4: Check Console Logs

You should see logs like:
```
Creating assignment with: {
  classroomId: "1",
  teacherId: "1",  
  title: "Test Assignment",
  description: "Test description",
  dueDate: "2025-12-10T14:30",
  maxMarks: "100"
}

API Call - createAssignment: {
  url: "/classrooms/1/assignments",
  teacherId: "1",
  payload: {...}
}
```

### Step 5: Check Network Tab

1. Find the POST request to `/api/classrooms/{id}/assignments`
2. Click on it
3. Check:
   - **Status Code**: Should be 201 (Created)
   - **Request Headers**: Check if Authorization header is present
   - **Request Payload**: Should contain title, description, dueDate, maxMarks, classroomId
   - **Response**: Should contain the created assignment data

### Common Issues and Solutions

#### Issue 1: 401 Unauthorized
**Symptoms**: Network tab shows 401 status
**Solution**: 
- Check if you're logged in
- Check if Authorization header is in the request
- Try logging out and logging back in

#### Issue 2: 400 Bad Request
**Symptoms**: Network tab shows 400 status
**Check Response Error**:
```javascript
// In console, you'll see:
Error creating assignment: {...}
Response data: { message: "..." }
Response status: 400
```

**Common causes**:
- Missing required fields (title is required)
- Invalid date format
- Invalid maxMarks (must be a number)

**Solution**:
- Make sure all required fields are filled
- Make sure due date is selected
- Make sure max marks is a valid number

#### Issue 3: 404 Not Found
**Symptoms**: Network tab shows 404 status
**Solution**:
- Backend might not be running
- Check if backend is running on http://localhost:8080
- Check backend console for errors

#### Issue 4: CORS Error
**Symptoms**: Console shows CORS policy error
**Solution**:
- Backend CORS is configured for localhost:5173
- Make sure frontend is running on port 5173
- Restart both frontend and backend

#### Issue 5: Network Error / Cannot Connect
**Symptoms**: "Network Error" in console
**Solution**:
1. Check if backend is running:
   ```powershell
   cd E:\Advance_classroom_project\ClassRoom
   ./mvnw spring-boot:run
   ```
2. Check if it's running on port 8080
3. Try accessing http://localhost:8080/api/classrooms directly in browser

## Manual Testing with curl

Test the API directly:

```bash
# Create assignment
curl -X POST http://localhost:8080/api/classrooms/1/assignments?teacherId=1 \
  -H "Content-Type: application/json" \
  -d '{
    "classroomId": 1,
    "title": "Test Assignment",
    "description": "Test description", 
    "dueDate": "2025-12-10T23:59:00",
    "maxMarks": 100
  }'
```

Expected response (status 201):
```json
{
  "id": 1,
  "classroomId": 1,
  "title": "Test Assignment",
  "description": "Test description",
  "dueDate": "2025-12-10T23:59:00",
  "maxMarks": 100,
  "createdAt": "2025-12-02T16:15:00"
}
```

## Backend Logs to Check

Look for errors in backend console:
- SQL errors (database connection issues)
- Validation errors (DTO validation failed)
- Authentication errors
- NullPointerException

## Database Check

Verify the database is set up:
```sql
-- Check if classroom exists
SELECT * FROM classrooms WHERE id = 1;

-- Check if teacher user exists  
SELECT * FROM users WHERE id = 1 AND role = 'TEACHER';

-- Check assignments table
SELECT * FROM assignments;
```

## Still Not Working?

1. **Check if you have the latest code**:
   ```powershell
   cd frontend
   npm run build
   npm run dev
   ```

2. **Restart backend**:
   ```powershell
   cd E:\Advance_classroom_project\ClassRoom
   ./mvnw clean spring-boot:run
   ```

3. **Check all console logs** and share:
   - Frontend browser console logs
   - Backend terminal logs
   - Network tab request/response details

## Success Indicators

When it works, you should see:
1. ✅ Console log: "API Response: {...}"
2. ✅ Toast notification: "Assignment created"
3. ✅ Assignment appears in the list immediately
4. ✅ Form closes automatically
5. ✅ Network tab shows status 201
