package com.sharebite.backend.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record AdminReportResponse(
    UUID id,
    String type,
    String status,
    String reason,
    String details,
    UUID listingId,
    String listingTitle,
    UUID requestId,
    String reporterUsername,
    String reporterRole,
    LocalDateTime createdAt,
    LocalDateTime reviewedAt,
    String reviewedByAdminUsername
) {}
