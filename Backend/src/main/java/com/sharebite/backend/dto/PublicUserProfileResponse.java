package com.sharebite.backend.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record PublicUserProfileResponse(
    UUID id,
    String username,
    String displayName,
    String organisationName,
    String role,
    String profileImageUrl,
    LocalDateTime createdAt,
    long listingsCreatedCount,
    long completedDonationsCount,
    long activeListingsCount,
    long requestsMadeCount,
    long successfulPickupsCount
) {}
