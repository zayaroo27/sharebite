package com.sharebite.backend.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record CategoryRequest(
        String name,
        String description
) {
}