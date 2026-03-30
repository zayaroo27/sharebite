package com.sharebite.backend.dto;

import com.sharebite.backend.entity.Role;

import java.util.UUID;

public record UserDto(UUID id, String username, String email, Role role, String profileImageUrl) {
}
