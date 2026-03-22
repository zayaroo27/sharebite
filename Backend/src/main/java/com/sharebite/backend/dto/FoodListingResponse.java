package com.sharebite.backend.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record FoodListingResponse(
    UUID id,
    String title,
    String description,
    String quantity,
    LocalDate expiryDate,
    String location,
    String status,
    LocalDateTime createdAt,
    String donorName,
    String categoryName,
    String imageUrl
) {}