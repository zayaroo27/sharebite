package com.sharebite.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record MessageSendRequest(
    @NotBlank String content
) {}