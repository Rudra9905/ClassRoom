package com.smartclassroom.backend.dto.assignment;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AssignmentSubmissionRequestDTO {

    @NotNull
    private Long assignmentId;

    @NotBlank
    private String contentUrl;
}
