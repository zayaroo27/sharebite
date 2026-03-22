package com.sharebite.backend.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record NotificationResponse(
        UUID id,
        String title,
        String message,
        String type,
        boolean isRead,
        LocalDateTime createdAt
) {
}