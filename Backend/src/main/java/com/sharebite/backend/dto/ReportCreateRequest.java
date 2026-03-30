package com.sharebite.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record ReportCreateRequest(
    @NotBlank String type,
    @NotBlank @Size(max = 500) String reason,
    @Size(max = 4000) String details,
    UUID listingId,
    UUID requestId
) {}
