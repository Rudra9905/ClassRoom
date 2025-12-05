# Delete Classroom Feature Implementation

## Models
- [ ] Add `deletedAt` to Classroom.java
- [ ] Add `deletedAt` to ClassroomMember.java
- [ ] Add `deletedAt` to Announcement.java
- [ ] Add `deletedAt` to Assignment.java
- [ ] Add `deletedAt` to AssignmentSubmission.java
- [ ] Add `deletedAt` to ChatMessage.java
- [ ] Create AuditLog.java entity

## Repositories
- [ ] Add soft/hard delete methods to ClassroomRepository.java
- [ ] Add soft/hard delete methods to ClassroomMemberRepository.java
- [ ] Add soft/hard delete methods to AnnouncementRepository.java
- [ ] Add soft/hard delete methods to AssignmentRepository.java
- [ ] Add soft/hard delete methods to AssignmentSubmissionRepository.java
- [ ] Add soft/hard delete methods to ChatMessageRepository.java
- [ ] Create AuditLogRepository.java

## Services
- [ ] Enhance ClassroomService.deleteClassroom() with full logic
- [ ] Add deleteFiles method to FileStorageService.java
- [ ] Add audit logging to ClassroomService
- [ ] Add WebSocket event emission for classroom deletion

## Controller
- [ ] Update ClassroomController.deleteClassroom() endpoint

## Database
- [ ] Create Flyway migration for deleted_at columns and audit_logs table

## Tests
- [ ] Unit tests for ClassroomService.deleteClassroom()
- [ ] Integration test for full deletion flow

## Documentation
- [ ] Update README with API usage and behavior
