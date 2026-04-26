package com.sharebite.backend.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record AdminReportDetailResponse(
    UUID id,
    String type,
    String status,
    String reason,
    String policyCategory,
    String severity,
    String details,
    LocalDateTime createdAt,
    LocalDateTime evidenceCapturedAt,
    LocalDateTime reviewedAt,
    String reviewedByAdminUsername,
    UUID reportedMessageId,
    String reportedMessageExcerpt,
    String decisionNote,
    String actionTaken,
    String actionTargetType,
    UUID actionTargetId,
    LocalDateTime actionTakenAt,
    AdminReportUserResponse reporter,
    AdminListingEvidenceResponse listingEvidence,
    AdminRequestEvidenceResponse requestEvidence,
    AdminListingEvidenceResponse currentListingEvidence,
    AdminRequestEvidenceResponse currentRequestEvidence,
    boolean canReview
) {}
