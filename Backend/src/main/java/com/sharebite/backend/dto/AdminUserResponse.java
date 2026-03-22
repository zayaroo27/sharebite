package com.sharebite.backend.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record AdminUserResponse(
    UUID id,
    String username,
    String email,
    String role,
    String status,
    LocalDateTime createdAt
) {}