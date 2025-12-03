package com.smartclassroom.backend.service;

import com.smartclassroom.backend.dto.chat.ChatMessageRequestDTO;
import com.smartclassroom.backend.exception.BadRequestException;
import com.smartclassroom.backend.exception.ResourceNotFoundException;
import com.smartclassroom.backend.model.*;
import com.smartclassroom.backend.repository.ChatMessageRepository;
import com.smartclassroom.backend.repository.ClassroomMemberRepository;
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
    private final ClassroomMemberRepository classroomMemberRepository;

    public ChatMessage postMessage(Long classroomId, Long senderId, ChatMessageRequestDTO request) {
        Classroom classroom = classroomRepository.findById(classroomId)
                .orElseThrow(() -> new ResourceNotFoundException("Classroom not found with id " + classroomId));
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id " + senderId));

        // Verify that the sender is a member of the classroom
        ClassroomMember member = classroomMemberRepository.findByClassroomIdAndUserId(classroomId, senderId)
                .orElseThrow(() -> new BadRequestException("User is not a member of this classroom"));

        ChatMessage message = ChatMessage.builder()
                .classroom(classroom)
                .sender(sender)
                .content(request.getContent())
                .build();
        return chatMessageRepository.save(message);
    }

    public List<ChatMessage> getRecentMessages(Long classroomId, Long userId) {
        // Verify that the user is a member of the classroom
        classroomMemberRepository.findByClassroomIdAndUserId(classroomId, userId)
                .orElseThrow(() -> new BadRequestException("User is not a member of this classroom"));

        return chatMessageRepository.findTop50ByClassroom_IdOrderByCreatedAtAsc(classroomId);
    }

    public void clearMessages(Long classroomId, Long requesterId) {
        ClassroomMember member = classroomMemberRepository.findByClassroomIdAndUserId(classroomId, requesterId)
                .orElseThrow(() -> new BadRequestException("User is not a member of this classroom"));

        if (member.getRoleInClass() != ClassroomRole.TEACHER) {
            throw new BadRequestException("Only teachers can clear the chat history");
        }

        try {
            // Load all messages explicitly and delete them. This avoids issues with
            // derived delete methods if the JPA provider cannot resolve the path.
            var messages = chatMessageRepository.findByClassroom_Id(classroomId);
            chatMessageRepository.deleteAll(messages);
        } catch (Exception ex) {
            throw new BadRequestException("Could not clear chat history. Please try again.");
        }
    }
}
