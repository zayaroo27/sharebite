package com.sharebite.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record AdminReportReviewRequest(
    @NotBlank @Size(max = 4000) String decisionNote,
    String actionTaken,
    String actionTargetType,
    UUID actionTargetId
) {}
