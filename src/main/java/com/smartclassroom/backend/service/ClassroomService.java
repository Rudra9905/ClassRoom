package com.smartclassroom.backend.service;

import com.smartclassroom.backend.dto.classroom.ClassroomCreateRequestDTO;
import com.smartclassroom.backend.dto.classroom.JoinClassroomRequestDTO;
import com.smartclassroom.backend.exception.BadRequestException;
import com.smartclassroom.backend.exception.DuplicateResourceException;
import com.smartclassroom.backend.exception.ResourceNotFoundException;
import com.smartclassroom.backend.model.*;
import com.smartclassroom.backend.repository.ClassroomMemberRepository;
import com.smartclassroom.backend.repository.ClassroomRepository;
import com.smartclassroom.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ClassroomService {

    private final ClassroomRepository classroomRepository;
    private final ClassroomMemberRepository classroomMemberRepository;
    private final UserRepository userRepository;

    private static final SecureRandom RANDOM = new SecureRandom();

    public Classroom createClassroom(Long teacherId, ClassroomCreateRequestDTO request) {
        User teacher = userRepository.findById(teacherId)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found with id " + teacherId));
        if (teacher.getRole() != UserRole.TEACHER) {
            throw new BadRequestException("Only teachers can create classrooms");
        }

        String code = generateClassCode();
        Classroom classroom = Classroom.builder()
                .name(request.getName())
                .description(request.getDescription())
                .code(code)
                .teacher(teacher)
                .build();
        Classroom saved = classroomRepository.save(classroom);

        ClassroomMember teacherMember = ClassroomMember.builder()
                .classroom(saved)
                .user(teacher)
                .roleInClass(ClassroomRole.TEACHER)
                .build();
        classroomMemberRepository.save(teacherMember);
        return saved;
    }

    public List<Classroom> getClassrooms(Long teacherId, Long studentId) {
        if (teacherId != null) {
            return classroomRepository.findByTeacherId(teacherId);
        }
        if (studentId != null) {
            return classroomMemberRepository.findByUserId(studentId).stream()
                    .map(ClassroomMember::getClassroom)
                    .distinct()
                    .toList();
        }
        return classroomRepository.findAll();
    }

    public Classroom getClassroomById(Long id) {
        return classroomRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Classroom not found with id " + id));
    }

    public ClassroomMember joinClassroom(Long userId, JoinClassroomRequestDTO request) {
        Classroom classroom = classroomRepository.findByCode(request.getCode())
                .orElseThrow(() -> new ResourceNotFoundException("Classroom not found for code " + request.getCode()));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id " + userId));

        classroomMemberRepository.findByClassroomIdAndUserId(classroom.getId(), user.getId())
                .ifPresent(cm -> { throw new DuplicateResourceException("User already joined this classroom"); });

        ClassroomRole roleInClass = (user.getRole() == UserRole.TEACHER) ? ClassroomRole.TEACHER : ClassroomRole.STUDENT;

        ClassroomMember member = ClassroomMember.builder()
                .classroom(classroom)
                .user(user)
                .roleInClass(roleInClass)
                .build();

        return classroomMemberRepository.save(member);
    }

    public List<ClassroomMember> getMembers(Long classroomId) {
        classroomRepository.findById(classroomId)
                .orElseThrow(() -> new ResourceNotFoundException("Classroom not found with id " + classroomId));
        return classroomMemberRepository.findByClassroomId(classroomId);
    }

    private String generateClassCode() {
        byte[] buffer = new byte[6];
        RANDOM.nextBytes(buffer);
        String code = Base64.getUrlEncoder().withoutPadding().encodeToString(buffer);
        return code.substring(0, Math.min(8, code.length()));
    }
}
