package com.sharebite.backend.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class ProfileResponse {
    private UUID id;
    private String username;
    private String email;
    private String displayName;
    private String phoneNumber;
    private String organisationName;
    private String role;
    private String status;
    private LocalDateTime createdAt;
}