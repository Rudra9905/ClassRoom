package com.smartclassroom.backend.controller;

import com.smartclassroom.backend.dto.assignment.AssignmentCreateRequestDTO;
import com.smartclassroom.backend.dto.assignment.AssignmentResponseDTO;
import com.smartclassroom.backend.model.Assignment;
import com.smartclassroom.backend.service.AssignmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/classrooms/{classroomId}/assignments")
@RequiredArgsConstructor
public class AssignmentController {

    private final AssignmentService assignmentService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AssignmentResponseDTO create(@PathVariable Long classroomId,
                                        @RequestParam("teacherId") Long teacherId,
                                        @Valid @RequestBody AssignmentCreateRequestDTO request) {
        // classroomId from path overrides body classroomId
        request.setClassroomId(classroomId);
        Assignment assignment = assignmentService.createAssignment(classroomId, teacherId, request);
        return toResponse(assignment);
    }

    @GetMapping
    public List<AssignmentResponseDTO> list(@PathVariable Long classroomId) {
        return assignmentService.getAssignmentsForClassroom(classroomId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @GetMapping("/{assignmentId}")
    public AssignmentResponseDTO get(@PathVariable Long classroomId, @PathVariable Long assignmentId) {
        Assignment assignment = assignmentService.getAssignmentById(assignmentId);
        return toResponse(assignment);
    }

    private AssignmentResponseDTO toResponse(Assignment assignment) {
        return AssignmentResponseDTO.builder()
                .id(assignment.getId())
                .classroomId(assignment.getClassroom().getId())
                .title(assignment.getTitle())
                .description(assignment.getDescription())
                .dueDate(assignment.getDueDate())
                .maxMarks(assignment.getMaxMarks())
                .createdAt(assignment.getCreatedAt())
                .build();
    }
}
