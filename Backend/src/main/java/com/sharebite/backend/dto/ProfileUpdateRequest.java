package com.sharebite.backend.dto;

import jakarta.validation.constraints.Size;

public record ProfileUpdateRequest(
        @Size(max = 100) String displayName,
        @Size(max = 20) String phoneNumber,
        @Size(max = 150) String organisationName
) {
}
