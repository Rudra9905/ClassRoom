package com.smartclassroom.backend.repository;

import com.smartclassroom.backend.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage> findTop50ByClassroomIdOrderByCreatedAtDesc(Long classroomId);
}
