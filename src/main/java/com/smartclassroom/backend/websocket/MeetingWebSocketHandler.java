package com.smartclassroom.backend.websocket;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class MeetingWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(MeetingWebSocketHandler.class);

    private final ObjectMapper objectMapper = new ObjectMapper();

    // classroomId -> (sessionId -> participant)
    private final Map<Long, Map<String, Participant>> rooms = new ConcurrentHashMap<>();
    // sessionId -> (classroomId, userId)
    private final Map<String, SessionInfo> sessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        super.afterConnectionClosed(session, status);
        removeSession(session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        JsonNode node = objectMapper.readTree(message.getPayload());
        String type = node.path("type").asText(null);
        if (type == null) {
            log.warn("Received message without type: {}", message.getPayload());
            return;
        }

        switch (type) {
            case "join" -> handleJoin(session, node);
            case "offer", "answer", "ice-candidate" -> handleRelay(node);
            case "raise-hand" -> handleRaiseHand(node);
            case "leave" -> removeSession(session.getId());
            default -> log.warn("Unknown meeting message type: {}", type);
        }
    }

    private void handleJoin(WebSocketSession session, JsonNode node) throws IOException {
        long classroomId = node.path("classroomId").asLong();
        long userId = node.path("fromUserId").asLong();

        Map<String, Participant> room = rooms.computeIfAbsent(classroomId, id -> new ConcurrentHashMap<>());

        // Collect existing participants (before adding this one)
        List<Long> existingUserIds = new ArrayList<>();
        for (Participant p : room.values()) {
            existingUserIds.add(p.userId());
        }

        // Register this participant
        room.put(session.getId(), new Participant(userId, session));
        sessions.put(session.getId(), new SessionInfo(classroomId, userId));

        // Send existing participant list to the new joiner
        ObjectNode response = objectMapper.createObjectNode();
        response.put("type", "existing-participants");
        response.put("classroomId", classroomId);
        ArrayNode arr = response.putArray("participants");
        for (Long existingId : existingUserIds) {
            arr.add(existingId);
        }
        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(response)));

        log.info("User {} joined meeting for classroom {} ({} existing peers)", userId, classroomId, existingUserIds.size());
    }

    private void handleRelay(JsonNode node) throws IOException {
        long classroomId = node.path("classroomId").asLong();
        long toUserId = node.path("toUserId").asLong();

        Map<String, Participant> room = rooms.get(classroomId);
        if (room == null) {
            return;
        }

        // Find target participant by userId
        for (Participant participant : room.values()) {
            if (participant.userId() == toUserId) {
                WebSocketSession targetSession = participant.session();
                if (targetSession.isOpen()) {
                    targetSession.sendMessage(new TextMessage(objectMapper.writeValueAsString(node)));
                }
                break;
            }
        }
    }

    private void handleRaiseHand(JsonNode node) throws IOException {
        long classroomId = node.path("classroomId").asLong();
        Map<String, Participant> room = rooms.get(classroomId);
        if (room == null) {
            return;
        }
        String payload = objectMapper.writeValueAsString(node);
        for (Participant participant : room.values()) {
            WebSocketSession s = participant.session();
            if (s.isOpen()) {
                s.sendMessage(new TextMessage(payload));
            }
        }
    }

    private void removeSession(String sessionId) throws IOException {
        SessionInfo info = sessions.remove(sessionId);
        if (info == null) {
            return;
        }

        Map<String, Participant> room = rooms.get(info.classroomId());
        if (room != null) {
            room.remove(sessionId);
            if (room.isEmpty()) {
                rooms.remove(info.classroomId());
            } else {
                // Notify remaining participants that this user left
                ObjectNode msg = objectMapper.createObjectNode();
                msg.put("type", "participant-left");
                msg.put("classroomId", info.classroomId());
                msg.put("userId", info.userId());
                String payload = objectMapper.writeValueAsString(msg);
                for (Participant participant : room.values()) {
                    WebSocketSession s = participant.session();
                    if (s.isOpen()) {
                        s.sendMessage(new TextMessage(payload));
                    }
                }
            }
        }

        log.info("User {} left meeting for classroom {}", info.userId(), info.classroomId());
    }

    private record Participant(long userId, WebSocketSession session) {}

    private record SessionInfo(long classroomId, long userId) {}
}
