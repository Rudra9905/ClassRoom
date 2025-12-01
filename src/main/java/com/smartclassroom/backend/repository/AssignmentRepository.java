package com.smartclassroom.backend.repository;

import com.smartclassroom.backend.model.Assignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AssignmentRepository extends JpaRepository<Assignment, Long> {
    List<Assignment> findByClassroomId(Long classroomId);
}
