package com.sharebite.backend.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record MessageResponse(
    UUID id,
    String content,
    LocalDateTime timestamp,
    String senderUsername,
    String senderRole,
    String senderProfileImageUrl
) {}
