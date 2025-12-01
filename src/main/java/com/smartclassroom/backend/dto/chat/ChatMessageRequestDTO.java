package com.smartclassroom.backend.dto.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ChatMessageRequestDTO {

    @NotNull
    private Long classroomId;

    @NotBlank
    private String content;
}
