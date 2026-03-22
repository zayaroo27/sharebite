package com.sharebite.backend.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record ListingRequestCreateResponse(
    UUID requestId,
    UUID listingId,
    String listingTitle,
    String status,
    LocalDateTime requestDate
) {}