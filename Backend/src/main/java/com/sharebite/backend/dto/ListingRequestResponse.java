package com.sharebite.backend.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record ListingRequestResponse(
    UUID requestId,
    UUID listingId,
    String listingTitle,
    String status,
    LocalDateTime requestDate,
    LocalDateTime decisionDate,
    LocalDateTime completedDate,
    LocalDateTime donorCompletedAt,
    LocalDateTime recipientCompletedAt,
    UUID recipientId,
    String recipientName,
    UUID donorId,
    String donorName,
    String recipientProfileImageUrl,
    String donorProfileImageUrl
) {}
