package com.smartclassroom.backend.service;

import com.smartclassroom.backend.dto.assignment.AssignmentCreateRequestDTO;
import com.smartclassroom.backend.exception.BadRequestException;
import com.smartclassroom.backend.exception.ResourceNotFoundException;
import com.smartclassroom.backend.model.*;
import com.smartclassroom.backend.repository.AssignmentRepository;
import com.smartclassroom.backend.repository.ClassroomRepository;
import com.smartclassroom.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AssignmentService {

    private final AssignmentRepository assignmentRepository;
    private final ClassroomRepository classroomRepository;
    private final UserRepository userRepository;

    public Assignment createAssignment(Long classroomId, Long teacherId, AssignmentCreateRequestDTO request) {
        Classroom classroom = classroomRepository.findById(classroomId)
                .orElseThrow(() -> new ResourceNotFoundException("Classroom not found with id " + classroomId));
        User teacher = userRepository.findById(teacherId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id " + teacherId));

        if (teacher.getRole() != UserRole.TEACHER) {
            throw new BadRequestException("Only teachers can create assignments");
        }

        Assignment assignment = Assignment.builder()
                .classroom(classroom)
                .title(request.getTitle())
                .description(request.getDescription())
                .dueDate(request.getDueDate())
                .maxMarks(request.getMaxMarks())
                .createdBy(teacher)
                .build();
        return assignmentRepository.save(assignment);
    }

    public List<Assignment> getAssignmentsForClassroom(Long classroomId) {
        return assignmentRepository.findByClassroomId(classroomId);
    }

    public Assignment getAssignmentById(Long assignmentId) {
        return assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found with id " + assignmentId));
    }
}
