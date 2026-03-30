package com.sharebite.backend.dto;

import java.util.UUID;

public record AdminReportUserResponse(
    UUID id,
    String username,
    String displayName,
    String email,
    String role,
    String organisationName
) {}
