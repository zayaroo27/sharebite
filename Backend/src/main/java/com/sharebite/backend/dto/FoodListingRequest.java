package com.sharebite.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;

public record FoodListingRequest(
    @NotBlank String title,
    @NotBlank String description,
    @NotBlank String quantity,
    @NotNull LocalDate expiryDate,
    @NotBlank String location,
    UUID categoryId
) {}