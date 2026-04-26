package com.sharebite.backend.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record AdminRequestEvidenceResponse(
    UUID requestId,
    String status,
    LocalDateTime requestDate,
    LocalDateTime decisionDate,
    LocalDateTime completedDate,
    AdminListingEvidenceResponse listing,
    AdminReportUserResponse donor,
    AdminReportUserResponse recipient,
    UUID reportedMessageId,
    List<AdminReportMessageResponse> messages,
    boolean fromSnapshot
) {}
