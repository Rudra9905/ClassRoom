package com.smartclassroom.backend.service;

import com.smartclassroom.backend.dto.chat.ChatMessageRequestDTO;
import com.smartclassroom.backend.exception.ResourceNotFoundException;
import com.smartclassroom.backend.model.ChatMessage;
import com.smartclassroom.backend.model.Classroom;
import com.smartclassroom.backend.model.User;
import com.smartclassroom.backend.repository.ChatMessageRepository;
import com.smartclassroom.backend.repository.ClassroomRepository;
import com.smartclassroom.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final ClassroomRepository classroomRepository;
    private final UserRepository userRepository;

    public ChatMessage postMessage(Long classroomId, Long senderId, ChatMessageRequestDTO request) {
        Classroom classroom = classroomRepository.findById(classroomId)
                .orElseThrow(() -> new ResourceNotFoundException("Classroom not found with id " + classroomId));
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id " + senderId));

        ChatMessage message = ChatMessage.builder()
                .classroom(classroom)
                .sender(sender)
                .content(request.getContent())
                .build();
        return chatMessageRepository.save(message);
    }

    public List<ChatMessage> getRecentMessages(Long classroomId) {
        return chatMessageRepository.findTop50ByClassroomIdOrderByCreatedAtDesc(classroomId);
    }
}
