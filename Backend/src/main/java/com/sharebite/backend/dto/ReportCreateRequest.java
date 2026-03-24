package com.sharebite.backend.dto;

import java.util.UUID;

public record ReportCreateRequest(
    String type,
    String reason,
    String details,
    UUID listingId,
    UUID requestId
) {}
