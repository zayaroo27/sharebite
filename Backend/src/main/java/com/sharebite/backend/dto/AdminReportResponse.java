package com.sharebite.backend.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record AdminReportResponse(
    UUID id,
    String type,
    String status,
    String reason,
    String policyCategory,
    String severity,
    String details,
    UUID listingId,
    String listingTitle,
    UUID requestId,
    UUID reportedMessageId,
    String reporterUsername,
    String reporterRole,
    LocalDateTime createdAt,
    LocalDateTime evidenceCapturedAt,
    LocalDateTime reviewedAt,
    String reviewedByAdminUsername,
    String actionTaken
) {}
