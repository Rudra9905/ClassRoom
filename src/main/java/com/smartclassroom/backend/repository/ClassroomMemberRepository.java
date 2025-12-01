package com.smartclassroom.backend.repository;

import com.smartclassroom.backend.model.ClassroomMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ClassroomMemberRepository extends JpaRepository<ClassroomMember, Long> {

    Optional<ClassroomMember> findByClassroomIdAndUserId(Long classroomId, Long userId);

    List<ClassroomMember> findByClassroomId(Long classroomId);

    List<ClassroomMember> findByUserId(Long userId);
}
