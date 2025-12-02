package com.smartclassroom.backend.dto.assignment;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class AssignmentUpdateRequestDTO {

    private String title;

    private String description;

    private LocalDateTime dueDate;

    private Integer maxMarks;

    private String attachmentUrl;
}
