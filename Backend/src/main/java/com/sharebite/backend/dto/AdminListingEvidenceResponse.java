package com.sharebite.backend.dto;

import java.time.LocalDate;
import java.util.UUID;

public record AdminListingEvidenceResponse(
    UUID listingId,
    String title,
    String description,
    String categoryName,
    String quantity,
    LocalDate expiryDate,
    String location,
    String imageUrl,
    String status,
    AdminReportUserResponse donor,
    boolean fromSnapshot
) {}
