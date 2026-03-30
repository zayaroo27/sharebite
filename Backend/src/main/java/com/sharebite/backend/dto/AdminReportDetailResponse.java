package com.sharebite.backend.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record AdminReportDetailResponse(
    UUID id,
    String type,
    String status,
    String reason,
    String details,
    LocalDateTime createdAt,
    LocalDateTime reviewedAt,
    String reviewedByAdminUsername,
    AdminReportUserResponse reporter,
    AdminListingEvidenceResponse listingEvidence,
    AdminRequestEvidenceResponse requestEvidence,
    boolean canReview
) {}
